// Exercise ownership and OAuth against the isolated experiment only.
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import postgres from "postgres";
import { chromium } from "@playwright/test";
import type { DomainClient } from "../src/server/domains/router";

type SignupResponse = { user: { id: string } };
type OAuthRedirect = { url?: string; redirect_uri?: string };
type Metadata = {
  registration_endpoint: string;
  authorization_endpoint: string;
  token_endpoint: string;
};
type Tokens = { access_token: string; refresh_token?: string };
type McpBody = {
  result: {
    tools: Array<{ name: string }>;
    isError?: boolean;
    content: Array<{ text: string }>;
  };
};
const base = process.env.EXPERIMENT_BASE_URL ?? "http://localhost:3200";
assert.equal(process.env.EXPERIMENT_MODE, "1");
assert.ok(
  process.env.DATABASE_URL?.includes("ep-twilight-waterfall-agv8azxs"),
  "Refusing a non-experiment database",
);
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const sql = postgres(
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  { max: 1 },
);
const nonce = randomBytes(6).toString("hex");
const userIds: string[] = [];
let oauthClientId: string | undefined;
const report: Record<string, unknown> = {};
function client(cookie = ""): DomainClient {
  return createORPCClient(
    new RPCLink({
      url: "/api/domain",
      origin: base,
      headers: { cookie },
    }),
  );
}
async function deny(fn: () => Promise<unknown>, code: string) {
  await assert.rejects(
    fn,
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === code,
  );
}
async function signup(label: string) {
  const response = await fetch(base + "/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({
      name: `Experiment ${label}`,
      email: `experiment-${label}-${nonce}@example.invalid`,
      username: `experiment_${label}_${nonce}`,
      password: randomBytes(18).toString("hex"),
    }),
  });
  const data = (await response.json()) as SignupResponse;
  assert.equal(response.status, 200, JSON.stringify(data));
  userIds.push(data.user.id);
  const cookie = response.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  assert.ok(cookie);
  return { id: data.user.id, cookie, api: client(cookie) };
}
async function mcp(token: string, method: string, params: object = {}) {
  const response = await fetch(base + "/api/mcp", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const raw = await response.text();
  const text =
    raw.startsWith("event:") || raw.startsWith("data:")
      ? raw
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6)
      : raw;
  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as McpBody,
  };
}
try {
  const anonymous = client();
  await deny(() => anonymous.user.me(), "UNAUTHORIZED");
  const a = await signup("river");
  const b = await signup("sage");
  const own = await a.api.user.getUploadedProfiles();
  assert.equal(own.tinder.length, 0);
  assert.equal(own.hinge.length, 0);
  const event = await a.api.event.create({
    name: `Experiment walk ${nonce}`,
    type: "TRIP",
    startDate: new Date("2026-11-01T12:00:00Z"),
  });
  const events = await a.api.event.list();
  assert.ok(events.some((e) => e.id === event.id));
  assert.ok(events[0]?.startDate instanceof Date);
  assert.ok(!(await b.api.event.list()).some((e) => e.id === event.id));
  await deny(() => b.api.event.delete({ id: event.id }), "NOT_FOUND");
  await deny(() => a.api.admin.listRecentProfiles({ limit: 10 }), "FORBIDDEN");
  const [foreign] = await sql<
    { tinder_id: string }[]
  >`select tinder_id from tinder_profile where user_id is not null and user_id <> ${a.id} limit 1`;
  if (foreign)
    await deny(
      () => a.api.swipeRank.summary({ tinderId: foreign.tinder_id }),
      "FORBIDDEN",
    );
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addCookies(
      a.cookie.split("; ").map((cookie) => {
        const split = cookie.indexOf("=");
        return {
          name: cookie.slice(0, split),
          value: cookie.slice(split + 1),
          url: base,
        };
      }),
    );
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    for (const path of ["/app/dashboard", "/app/account"]) {
      const response = await page.goto(base + path, {
        waitUntil: "networkidle",
      });
      assert.equal(response?.status(), 200);
      assert.equal(new URL(page.url()).pathname, path);
    }
    assert.deepEqual(pageErrors, []);
    report.authenticatedBrowserPages = 2;
  } finally {
    await browser.close();
  }
  report.ownership = true;
  report.dateSerialization = true;
  report.adminBoundary = true;
  await deny(
    () => a.api.promptSuggest.suggest({ columnId: "fictional", mode: "full" }),
    "FORBIDDEN",
  );
  report.paidAiBoundary = true;
  const metadata = (await (
    await fetch(base + "/.well-known/oauth-authorization-server")
  ).json()) as Metadata;
  const registration = await fetch(metadata.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Experiment verifier",
      redirect_uris: [base + "/experiment/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "openid profile offline_access swipestats:read",
    }),
  });
  const registered = (await registration.json()) as { client_id: string };
  assert.ok(registration.ok, JSON.stringify(registered));
  oauthClientId = registered.client_id;
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorize = new URL(metadata.authorization_endpoint);
  authorize.search = new URLSearchParams({
    client_id: oauthClientId,
    redirect_uri: base + "/experiment/callback",
    response_type: "code",
    scope: "openid profile offline_access swipestats:read",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: nonce,
    resource: base + "/api/mcp",
  }).toString();
  const authorization = await fetch(authorize, {
    headers: { cookie: a.cookie },
    redirect: "manual",
  });
  let location = authorization.headers.get("location");
  if (!location) {
    const data = (await authorization.json()) as OAuthRedirect;
    location = data.url ?? data.redirect_uri ?? null;
  }
  assert.ok(location?.includes("/consent?"), "Authorization must show consent");
  const consent = await fetch(base + "/api/auth/oauth2/consent", {
    method: "POST",
    headers: {
      cookie: a.cookie,
      origin: base,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      accept: true,
      oauth_query: new URL(location!, base).search.slice(1),
    }),
    redirect: "manual",
  });
  let redirect = consent.headers.get("location");
  if (!redirect) {
    const data = (await consent.json()) as OAuthRedirect;
    redirect = data.url ?? data.redirect_uri ?? null;
    assert.ok(redirect, JSON.stringify(data));
  }
  const callback = new URL(redirect, base);
  assert.equal(callback.searchParams.get("state"), nonce);
  const code = callback.searchParams.get("code");
  assert.ok(code);
  const exchange = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: oauthClientId,
      redirect_uri: base + "/experiment/callback",
      code: code,
      code_verifier: verifier,
      resource: base + "/api/mcp",
    }),
  });
  const tokens = (await exchange.json()) as Tokens;
  assert.ok(exchange.ok, "Token exchange failed");
  assert.ok(tokens.access_token);
  const init = await mcp(tokens.access_token, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "experiment-verifier", version: "1.0" },
  });
  assert.equal(init.status, 200, JSON.stringify(init.body));
  const listed = await mcp(tokens.access_token, "tools/list");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.result.tools.length, 3);
  const result = await mcp(tokens.access_token, "tools/call", {
    name: "listMyProfiles",
    arguments: {},
  });
  assert.ok(!result.body.result.isError, JSON.stringify(result.body));
  const profileResult = JSON.parse(result.body.result.content[0]!.text) as {
    tinder: unknown[];
  };
  assert.equal(profileResult.tinder.length, 0);
  if (foreign) {
    const denied = await mcp(tokens.access_token, "tools/call", {
      name: "getMySwipeRankSummary",
      arguments: { tinderId: foreign.tinder_id },
    });
    assert.equal(denied.body.result.isError, true);
  }
  assert.equal((await mcp("invalid", "tools/list")).status, 401);
  await b.api.connections.revoke({ clientId: oauthClientId });
  assert.equal(
    (await mcp(tokens.access_token, "tools/list")).status,
    200,
    "Another user cannot revoke your grant",
  );
  await a.api.connections.revoke({ clientId: oauthClientId });
  assert.equal(
    (await mcp(tokens.access_token, "tools/list")).status,
    401,
    "Disconnect must immediately reject existing JWTs",
  );
  report.oauthPkceConsent = true;
  report.mcpTools = 3;
  report.mcpAccountIsolation = true;
  report.disconnect = true;
  const spec = (await (await fetch(base + "/api/rpc/openapi.json")).json()) as {
    paths: Record<string, unknown>;
  };
  assert.equal(Object.keys(spec.paths).length, 145);
  report.openapiOperations = 145;
  await a.api.event.delete({ id: event.id });
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (oauthClientId)
    await sql`delete from oauth_client where client_id=${oauthClientId}`;
  for (const id of userIds) await sql`delete from "user" where id=${id}`;
  await sql.end();
}
