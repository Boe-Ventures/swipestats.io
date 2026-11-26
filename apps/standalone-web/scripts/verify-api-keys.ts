// Protect credential disclosure, cross-account access and revocation. Existing
// OAuth/upload tests and static types do not exercise the API-key auth path.
// Also protects Love Stories scopes, cross-account links and stale/replayed writes
// across the JSON MCP boundary, which browser/domain tests do not exercise.
// This real HTTP check uses only disposable users on the isolated experiment.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import postgres from "postgres";
import type { DomainClient } from "../src/server/domains/router";

assert.equal(process.env.EXPERIMENT_MODE, "1");
assert.equal(
  new URL(process.env.DATABASE_URL!).hostname,
  "ep-super-hill-ag6qwuno-pooler.c-2.eu-central-1.aws.neon.tech",
);
assert.equal(
  new URL(process.env.DATABASE_URL_UNPOOLED!).hostname,
  "ep-super-hill-ag6qwuno.c-2.eu-central-1.aws.neon.tech",
);
const base = process.env.EXPERIMENT_BASE_URL ?? "http://localhost:3200";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const sql = postgres(process.env.DATABASE_URL_UNPOOLED!, { max: 1 });
const users: string[] = [];
function client(headers: Record<string, string> = {}): DomainClient {
  return createORPCClient(
    new RPCLink({ url: "/api/domain", origin: base, headers }),
  );
}
async function denied(fn: () => Promise<unknown>, code: string) {
  await assert.rejects(
    fn,
    (error: unknown) =>
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === code,
  );
}
async function account(guest = false) {
  const nonce = randomUUID().replaceAll("-", "");
  const response = await fetch(
    base + (guest ? "/api/auth/sign-in/anonymous" : "/api/auth/sign-up/email"),
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify(
        guest
          ? {}
          : {
              name: "Fictional API key QA",
              email: `key-${nonce}@example.invalid`,
              username: `key_${nonce.slice(0, 16)}`,
              password: randomUUID(),
            },
      ),
    },
  );
  assert.equal(response.status, 200, "Disposable account creation failed");
  const body = (await response.json()) as { user: { id: string } };
  users.push(body.user.id);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(cookie);
  return { id: body.user.id, cookie, api: client({ cookie }) };
}
async function mcp(
  key: string,
  options: {
    header?: "x-api-key" | "authorization";
    cookie?: string;
    method?: string;
    params?: object;
  } = {},
) {
  const header = options.header ?? "authorization";
  const response = await fetch(base + "/api/mcp", {
    method: "POST",
    headers: {
      [header]: header === "authorization" ? `Bearer ${key}` : key,
      ...(options.cookie ? { cookie: options.cookie } : {}),
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: options.method ?? "tools/list",
      params: options.params ?? {},
    }),
  });
  const raw = await response.text();
  const payload =
    raw.startsWith("event:") || raw.startsWith("data:")
      ? raw
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6)
      : raw;
  return {
    status: response.status,
    body: payload
      ? (JSON.parse(payload) as {
          result?: {
            tools?: {
              name: string;
              annotations?: {
                readOnlyHint?: boolean;
                destructiveHint?: boolean;
              };
              inputSchema?: { properties?: Record<string, unknown> };
            }[];
            content?: { text: string }[];
            isError?: boolean;
            structuredContent?: { result: unknown };
          };
        })
      : null,
  };
}
async function invoke(key: string, name: string, input: object = {}) {
  return mcp(key, { method: "tools/call", params: { name, arguments: input } });
}
async function success<T>(
  key: string,
  name: string,
  input: object = {},
): Promise<T> {
  const response = await invoke(key, name, input);
  assert.equal(response.status, 200);
  assert.notEqual(
    response.body?.result?.isError,
    true,
    JSON.stringify(response.body),
  );
  assert.ok(response.body?.result?.structuredContent, "Expected a tool result");
  return response.body.result.structuredContent.result as T;
}
async function rejected(
  key: string,
  name: string,
  input: object = {},
  message?: string,
) {
  const response = await invoke(key, name, input);
  assert.ok(
    response.body?.result?.isError ||
      (response.body && "error" in response.body),
    "Tool must reject",
  );
  if (message) assert.ok(JSON.stringify(response.body).includes(message));
}
try {
  await denied(() => client().apiKeys.list(), "UNAUTHORIZED");
  const a = await account();
  const b = await account();
  const guest = await account(true);
  await denied(
    () => guest.api.apiKeys.create({ name: "Forbidden guest key" }),
    "FORBIDDEN",
  );
  // Catch plugin defaults silently turning an explicit never expiry into 90 days.
  for (const expiresInDays of [null, undefined, 365] as const) {
    const before = Date.now();
    const lifetimeKey = await a.api.apiKeys.create({
      name: "Disposable lifetime check",
      expiresInDays,
    });
    const [row] = await sql<{ expiresAt: Date | null }[]>`
      select expires_at as "expiresAt" from apikey where id=${lifetimeKey.id}`;
    assert.ok(row);
    if (expiresInDays === null) {
      assert.equal(lifetimeKey.expiresAt, null);
      assert.equal(row.expiresAt, null);
      assert.equal(
        (await a.api.apiKeys.list()).find((item) => item.id === lifetimeKey.id)
          ?.expiresAt,
        null,
      );
    } else {
      const expiry = lifetimeKey.expiresAt!.getTime();
      const lifetime = (expiresInDays ?? 90) * 86400000;
      assert.ok(expiry >= before + lifetime && expiry <= Date.now() + lifetime);
      assert.equal(row.expiresAt?.getTime(), expiry);
    }
    const defaultTools = await mcp(lifetimeKey.key);
    assert.equal(defaultTools.status, 200);
    assert.equal(defaultTools.body?.result?.tools?.length, 19);
    await a.api.apiKeys.revoke({ id: lifetimeKey.id });
    assert.equal((await mcp(lifetimeKey.key)).status, 401);
  }
  const key = await a.api.apiKeys.create({
    name: "Disposable MCP check",
    expiresInDays: 30,
  });
  assert.ok(key.key.startsWith("swipestats_"));
  // Existing analytics-only grants keep their original permissions.
  await sql`update apikey set permissions=${JSON.stringify({ swipestats: ["read"] })} where id=${key.id}`;
  const [stored] = await sql<
    { key: string; permissions: string }[]
  >`select key, permissions from apikey where id=${key.id}`;
  assert.ok(stored && stored.key !== key.key, "Key must be hashed at rest");
  assert.deepEqual(JSON.parse(stored.permissions), { swipestats: ["read"] });
  const listed = await a.api.apiKeys.list();
  assert.ok(listed.some((item) => item.id === key.id));
  assert.ok(!JSON.stringify(listed).includes(key.key));
  assert.ok(!JSON.stringify(listed).includes(stored.key));
  assert.equal((await b.api.apiKeys.list()).length, 0);
  await denied(() => b.api.apiKeys.revoke({ id: key.id }), "NOT_FOUND");
  const tools = await mcp(key.key);
  assert.equal(tools.status, 200);
  assert.deepEqual(tools.body?.result?.tools?.map((tool) => tool.name).sort(), [
    "getMySwipeRankSummary",
    "getSubscriptionStatus",
    "listMyProfiles",
  ]);
  assert.equal((await mcp(key.key, { header: "x-api-key" })).status, 200);
  await sql`update "user" set swipestats_tier='PLUS' where id=${b.id}`;
  const billing = await mcp(key.key, {
    cookie: b.cookie,
    method: "tools/call",
    params: { name: "getSubscriptionStatus", arguments: {} },
  });
  assert.equal(billing.status, 200);
  assert.equal(billing.body?.result?.isError, undefined);
  assert.deepEqual(
    billing.body?.result?.structuredContent?.result,
    JSON.parse(JSON.stringify(await a.api.billing.getStatus())),
  );
  await denied(
    () => client({ authorization: `Bearer ${key.key}` }).user.me(),
    "UNAUTHORIZED",
  );
  await denied(
    () =>
      client({ "x-api-key": key.key }).apiKeys.create({
        name: "No key chaining",
      }),
    "UNAUTHORIZED",
  );
  const bypass = await fetch(base + "/api/auth/api-key/create", {
    method: "POST",
    headers: {
      cookie: a.cookie,
      origin: base,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Bypass",
      permissions: { swipestats: ["all"] },
    }),
  });
  assert.equal(bypass.status, 404);
  assert.equal((await mcp("swipestats_invalid")).status, 401);
  await sql`update apikey set enabled=false where id=${key.id}`;
  assert.equal((await mcp(key.key)).status, 401);
  await sql`update apikey set enabled=true where id=${key.id}`;
  const expired = await a.api.apiKeys.create({ name: "Expiry check" });
  await sql`update apikey set expires_at=now()-interval '1 minute' where id=${expired.id}`;
  assert.equal((await mcp(expired.key)).status, 401);
  await sql`update apikey set permissions='{}' where id=${key.id}`;
  assert.equal((await mcp(key.key)).status, 401);
  await sql`update apikey set permissions=${stored.permissions} where id=${key.id}`;
  await sql`update "user" set banned=true where id=${a.id}`;
  assert.equal((await mcp(key.key)).status, 401);
  await denied(
    () => a.api.apiKeys.create({ name: "Banned owner" }),
    "FORBIDDEN",
  );
  await sql`update "user" set banned=false, is_anonymous=true where id=${a.id}`;
  assert.equal((await mcp(key.key)).status, 401);
  await sql`update "user" set is_anonymous=false where id=${a.id}`;
  await sql`update apikey set rate_limit_max=1, request_count=1, last_request=now() where id=${key.id}`;
  assert.equal((await mcp(key.key)).status, 429);
  await sql`update apikey set rate_limit_max=120, request_count=0 where id=${key.id}`;
  assert.equal((await mcp(key.key)).status, 200);
  const reader = await a.api.apiKeys.create({
    name: "Story reader",
    loveStoriesAccess: "read",
  });
  const writer = await a.api.apiKeys.create({
    name: "Story writer",
  });
  const foreign = await b.api.loveStories.person.create({
    displayName: "Foreign fictional person",
    requestId: randomUUID(),
  });
  const readTools = (await mcp(reader.key)).body?.result?.tools ?? [];
  const writeTools = (await mcp(writer.key)).body?.result?.tools ?? [];
  assert.equal(readTools.length, 9);
  assert.equal(writeTools.length, 19);
  assert.ok(readTools.every((tool) => tool.annotations?.readOnlyHint));
  assert.equal(
    writeTools.find((tool) => tool.name === "deleteLoveStoryPerson")
      ?.annotations?.destructiveHint,
    true,
  );
  await rejected(key.key, "listLoveStoryPeople");
  await rejected(reader.key, "createLoveStoryPerson", {
    displayName: "Denied",
    requestId: randomUUID(),
  });
  type RecordVersion = { id: string; version: number };
  const payload = {
    displayName: "Fictional River",
    requestId: randomUUID(),
    firstContactAt: "2026-11-01T18:00:00+07:00",
  };
  const person = await success<RecordVersion & { firstContactAt: string }>(
    writer.key,
    "createLoveStoryPerson",
    payload,
  );
  assert.equal(person.firstContactAt, "2026-11-01T11:00:00.000Z");
  assert.equal(
    (await success<RecordVersion>(writer.key, "createLoveStoryPerson", payload))
      .id,
    person.id,
  );
  await rejected(
    writer.key,
    "createLoveStoryPerson",
    { ...payload, displayName: "Changed" },
    "CONFLICT",
  );
  await rejected(writer.key, "getLoveStoryPerson", { id: foreign.id });
  await rejected(writer.key, "updateLoveStoryPerson", {
    id: foreign.id,
    version: foreign.version,
    changes: { displayName: "Denied" },
  });
  const updated = await success<RecordVersion>(
    writer.key,
    "updateLoveStoryPerson",
    {
      id: person.id,
      version: person.version,
      changes: { occupation: "Email marketing", firstContactAt: null },
    },
  );
  await rejected(
    writer.key,
    "updateLoveStoryPerson",
    {
      id: person.id,
      version: person.version,
      changes: { occupation: "Stale" },
    },
    "CONFLICT",
  );
  const dm = await success<RecordVersion & { occurredAt: string }>(
    writer.key,
    "createLoveStoryEncounter",
    {
      requestId: randomUUID(),
      personId: person.id,
      kind: "message",
      medium: "messaging",
      platform: "Instagram",
      occurredAt: "2026-11-02T19:00:00+07:00",
    },
  );
  assert.equal(dm.occurredAt, "2026-11-02T12:00:00.000Z");
  const undated = await success<RecordVersion>(
    writer.key,
    "createLoveStoryEncounter",
    { requestId: randomUUID(), personId: person.id, kind: "call" },
  );
  await success(writer.key, "reorderLoveStoryEncounters", {
    personId: person.id,
    items: [
      { id: undated.id, version: undated.version },
      { id: dm.id, version: dm.version },
    ],
  });
  const encounters = await success<RecordVersion[]>(
    reader.key,
    "listLoveStoryEncounters",
    { personId: person.id },
  );
  assert.deepEqual(
    encounters.map((item) => item.id),
    [undated.id, dm.id],
  );
  const dmUpdated = await success<RecordVersion>(
    writer.key,
    "updateLoveStoryEncounter",
    {
      id: dm.id,
      version: encounters[1]!.version,
      changes: {
        occurredAt: null,
        mapUrl: "https://maps.google.com/?q=fictional",
      },
    },
  );
  await rejected(writer.key, "createLoveStoryEntry", {
    requestId: randomUUID(),
    body: "Denied link",
    sourceKind: "typed",
    personIds: [foreign.id],
  });
  const entry = await success<RecordVersion>(
    writer.key,
    "createLoveStoryEntry",
    {
      requestId: randomUUID(),
      body: "Original fictional dictation",
      sourceKind: "transcript",
      personIds: [person.id],
      encounterIds: [dm.id],
    },
  );
  const editedEntry = await success<RecordVersion>(
    writer.key,
    "updateLoveStoryEntry",
    {
      id: entry.id,
      version: entry.version,
      changes: { body: "Revised fictional reflection" },
    },
  );
  const readEntry = await success<{ originalBody: string }>(
    reader.key,
    "getLoveStoryEntry",
    { id: entry.id },
  );
  assert.equal(readEntry.originalBody, "Original fictional dictation");
  assert.equal(
    (
      await success<unknown[]>(reader.key, "listLoveStoryEntries", {
        personId: person.id,
      })
    ).length,
    1,
  );
  assert.equal(
    (await success<unknown[]>(reader.key, "listLoveStoryPeople")).length,
    1,
  );
  const exported = await success<{ people: { id: string }[] }>(
    reader.key,
    "exportLoveStories",
  );
  assert.deepEqual(
    exported.people.map((item) => item.id),
    [person.id],
  );
  await sql`update apikey set permissions=${JSON.stringify({ swipestats: ["read"], loveStories: ["read"] })} where id=${writer.id}`;
  await rejected(writer.key, "deleteLoveStoryEntry", {
    id: entry.id,
    version: editedEntry.version,
  });
  await sql`update apikey set permissions=${JSON.stringify({ swipestats: ["read"], loveStories: ["read", "write"] })} where id=${writer.id}`;
  await success(writer.key, "deleteLoveStoryEntry", {
    id: entry.id,
    version: editedEntry.version,
  });
  await success(writer.key, "deleteLoveStoryEncounter", {
    id: dm.id,
    version: dmUpdated.version,
  });
  await success(writer.key, "deleteLoveStoryPerson", {
    id: person.id,
    version: updated.version,
  });
  assert.equal(
    (
      await a.api.loveStories.encounter
        .list({ personId: foreign.id })
        .catch(() => [])
    ).length,
    0,
  );
  await a.api.apiKeys.revoke({ id: writer.id });
  assert.equal((await invoke(writer.key, "listLoveStoryPeople")).status, 401);
  await a.api.apiKeys.revoke({ id: key.id });
  assert.equal((await mcp(key.key)).status, 401);
  const cascading = await b.api.apiKeys.create({ name: "Cascade check" });
  await sql`delete from "user" where id=${b.id}`;
  assert.equal(
    (await sql`select id from apikey where id=${cascading.id}`).length,
    0,
  );
  assert.equal((await mcp(cascading.key)).status, 401);
  console.log(
    "PASS: hashed keys, safe listing, owner isolation, both headers, no session escalation, scoped permissions, never/default/finite expiry, default write access, disabled/banned/guest owners, rate limits, revocation, deletion cascade, Love Stories scope isolation, JSON dates, all 16 tools, original wording, stale edits and replay safety",
  );
} finally {
  for (const id of users) await sql`delete from "user" where id=${id}`;
  await sql.end();
}
