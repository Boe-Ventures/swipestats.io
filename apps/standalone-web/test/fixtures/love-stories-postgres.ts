// The disposable PostgreSQL runner applies the real migrations. These checks
// catch FK cascade data loss, cross-owner merges and partially committed moves,
// which the upload tests and static checks do not exercise.
import "../setup";
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { mock } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/server/db/schema";

const connectionString = process.env.LOVE_STORIES_TEST_DATABASE_URL;
assert.ok(connectionString);
const url = new URL(connectionString);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/swipestats_love_stories_regression");
const sql = postgres(connectionString, { max: 3, onnotice: () => undefined });
const db = drizzle(sql, {
  schema: {
    ...schema,
    user: schema.userTable,
    session: schema.sessionTable,
    account: schema.accountTable,
    verification: schema.verificationTable,
    apikey: schema.apiKeyTable,
    jwks: schema.jwksTable,
    oauthClient: schema.oauthClientTable,
    oauthAccessToken: schema.oauthAccessTokenTable,
    oauthRefreshToken: schema.oauthRefreshTokenTable,
    oauthConsent: schema.oauthConsentTable,
  },
  casing: "snake_case",
});
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
await mock.module("@/server/db", () => ({
  db,
  withTransaction: (callback: (tx: Tx) => Promise<unknown>) =>
    db.transaction(callback),
}));
await mock.module("server-only", () => ({}));
const { loveStoriesService: service, transferLoveStoriesInTx } =
  await import("@/server/services/love-stories/service");
const { connectorContext, swipeStatsMcpHandler } =
  await import("@/server/mcp/server");
const { withTransaction } = await import("@/server/db");
const page = { limit: 100, offset: 0 };
async function denied(fn: () => Promise<unknown>, code?: string) {
  await assert.rejects(fn, (e: unknown) => {
    if (!code) return e instanceof Error;
    return !!e && typeof e === "object" && "code" in e && e.code === code;
  });
}
try {
  await db.insert(schema.userTable).values([
    {
      id: "voice-owner",
      email: "voice-owner@example.invalid",
      name: "Fictional Owner",
      emailVerified: true,
    },
    {
      id: "voice-other",
      email: "voice-other@example.invalid",
      name: "Fictional Other",
      emailVerified: true,
    },
  ]);
  const owner = "voice-owner";
  // Self-profile isolation, optimistic concurrency, export and account lifecycle.
  // Static checks cannot catch data loss or cross-owner leakage in these transactions.
  assert.equal(await service.getSelfProfile(owner), null);
  const self = await service.updateSelfProfile(owner, {
    version: null,
    changes: {
      nationalityCodes: ["NO"],
      backgroundGroups: ["white"],
      backgroundSource: "self_described",
      eyeColor: "green",
      heightCategory: "tall",
      tattooCoverage: "not_recalled",
    },
  });
  assert.equal(await service.getSelfProfile("voice-other"), null);
  await denied(
    () =>
      service.updateSelfProfile(owner, {
        version: null,
        changes: { eyeColor: "blue" },
      }),
    "CONFLICT",
  );
  const changed = await service.updateSelfProfile(owner, {
    version: self.version,
    changes: { originCountryCode: "NO", additionalOriginCountryCodes: ["ES"] },
  });
  assert.equal(changed.eyeColor, "green");
  assert.equal(changed.heightCategory, "tall");
  assert.equal(changed.tattooCoverage, "not_recalled");
  assert.equal(changed.heightCm, null);
  await denied(
    () =>
      service.updateSelfProfile(owner, {
        version: self.version,
        changes: { eyeColor: "blue" },
      }),
    "CONFLICT",
  );
  await denied(
    () =>
      service.updateSelfProfile(owner, {
        version: changed.version,
        changes: { additionalOriginCountryCodes: ["NO"] },
      }),
    "BAD_REQUEST",
  );
  assert.deepEqual(
    (await service.exportData(owner)).selfProfile?.nationalityCodes,
    ["NO"],
  );
  assert.equal((await service.exportData("voice-other")).selfProfile, null);
  await db.insert(schema.userTable).values([
    { id: "profile-transfer-from", email: "from@example.invalid" },
    { id: "profile-transfer-to", email: "to@example.invalid" },
    { id: "profile-transfer-empty", email: "empty@example.invalid" },
  ]);
  await service.updateSelfProfile("profile-transfer-from", {
    version: null,
    changes: {
      eyeColor: "green",
      eyeColorNotes: "Green in daylight",
      originCity: "Bergen",
      originCountryCode: "NO",
      heightCm: 180,
      backgroundGroups: ["white"],
      backgroundSource: "self_described",
    },
  });
  await service.updateSelfProfile("profile-transfer-to", {
    version: null,
    changes: {
      eyeColor: "brown",
      originCountryCode: "US",
      backgroundGroups: ["east_asian"],
      backgroundSource: "my_impression",
    },
  });
  await withTransaction((tx) =>
    transferLoveStoriesInTx(tx, "profile-transfer-from", "profile-transfer-to"),
  );
  assert.equal(await service.getSelfProfile("profile-transfer-from"), null);
  const moved = await service.getSelfProfile("profile-transfer-to");
  assert.equal(moved?.eyeColor, "brown");
  assert.equal(moved?.eyeColorNotes, null);
  assert.equal(moved?.originCity, null);
  assert.equal(moved?.originCountryCode, "US");
  assert.equal(moved?.heightCm, 180);
  assert.equal(moved?.backgroundSource, "my_impression");
  const transferExport = await service.exportData("profile-transfer-to");
  assert.ok(
    transferExport.entries.some((e) => e.originalBody.includes('"green"')),
  );
  await withTransaction((tx) =>
    transferLoveStoriesInTx(
      tx,
      "profile-transfer-to",
      "profile-transfer-empty",
    ),
  );
  assert.equal(
    (await service.getSelfProfile("profile-transfer-empty"))?.eyeColor,
    "brown",
  );
  await db
    .delete(schema.userTable)
    .where(eq(schema.userTable.id, "profile-transfer-empty"));
  assert.equal(await service.getSelfProfile("profile-transfer-empty"), null);
  const keep = await service.createPerson(owner, {
    requestId: randomUUID(),
    displayName: "Mira",
    summary: "Current account",
    workArrangement: "in_office",
    backgroundGroups: ["east_asian"],
    backgroundSource: "told_to_me",
    aliases: ["M"],
  });
  const source = await service.createPerson(owner, {
    requestId: randomUUID(),
    displayName: "Mira from the cafe",
    aliases: ["Cafe friend"],
    summary: "Earlier feelings worth keeping",
    occupation: "Designer",
    backgroundGroups: ["white"],
    backgroundSource: "my_impression",
    eyeColor: "hazel",
    heightCategory: "average",
    tattooCoverage: "light",
    workArrangement: "remote",
    remoteRegion: "worldwide",
  });
  const foreign = await service.createPerson("voice-other", {
    requestId: randomUUID(),
    displayName: "Mira",
    aliases: ["Cafe friend"],
  });
  const found = await service.listPeople(owner, {
    ...page,
    query: "CAFE FRIEND",
  });
  assert.deepEqual(
    found.map((p) => p.id),
    [source.id],
  );
  assert.equal(
    (await service.listPeople(owner, { ...page, query: "%" })).length,
    0,
  );

  const first = await service.createEncounter(owner, {
    requestId: randomUUID(),
    personId: keep.id,
    kind: "date",
    reflection: "I felt hopeful",
  });
  const second = await service.createEncounter(owner, {
    requestId: randomUUID(),
    personId: source.id,
    kind: "call",
  });
  const third = await service.createEncounter(owner, {
    requestId: randomUUID(),
    personId: source.id,
    kind: "date",
    timeContext: {
      precision: "relative",
      relativeToEncounterId: second.id,
      offsetDays: 2,
    },
  });
  const journal = await service.createEntry(owner, {
    requestId: randomUUID(),
    sourceKind: "summary",
    body: "A detailed account of what happened and how I felt.",
    personIds: [keep.id, source.id],
    encounterIds: [second.id, third.id],
  });
  // File imports preserve exact text and remain replayable after the file expires.
  const transcript =
    "# A walk\r\n\r\nI felt hopeful, but I am unsure of the date. 🙂  ";
  const importInput = {
    requestId: randomUUID(),
    fileUrl:
      "https://fixture.private.blob.vercel-storage.com/walk.md?signature=fixture",
    personIds: [keep.id],
    encounterIds: [first.id],
  };
  const beforeImportFetch = globalThis.fetch;
  let importFetches = 0;
  globalThis.fetch = (async () => {
    importFetches++;
    return new Response(transcript, {
      headers: { "content-type": "text/markdown" },
    });
  }) as unknown as typeof fetch;
  try {
    const imported = await service.importTranscript(owner, importInput);
    assert.equal(imported.characterCount, transcript.length);
    const saved = await service.getEntry(owner, imported.id);
    assert.equal(saved.body, transcript);
    assert.equal(saved.originalBody, transcript);
    assert.equal(saved.sourceKind, "transcript");
    assert.deepEqual(saved.personIds, [keep.id]);
    assert.deepEqual(saved.encounterIds, [first.id]);
    await service.updateEntry(owner, {
      id: saved.id,
      version: saved.version,
      changes: { body: "Cleaned transcript" },
    });
    assert.equal(
      (await service.getEntry(owner, saved.id)).originalBody,
      transcript,
    );
    globalThis.fetch = (async () => {
      throw new Error("File expired");
    }) as unknown as typeof fetch;
    assert.equal(
      (await service.importTranscript(owner, importInput)).id,
      saved.id,
    );
    assert.equal(importFetches, 1);
    await denied(
      () =>
        service.importTranscript(owner, {
          ...importInput,
          title: "Changed retry",
        }),
      "CONFLICT",
    );
    await denied(() => service.getEntry("voice-other", saved.id), "NOT_FOUND");
    globalThis.fetch = (async () =>
      new Response(transcript)) as unknown as typeof fetch;
    const entriesBefore = (await service.listEntries(owner, page)).length;
    await denied(
      () =>
        service.importTranscript(owner, {
          ...importInput,
          requestId: randomUUID(),
          personIds: [foreign.id],
        }),
      "NOT_FOUND",
    );
    assert.equal(
      (await service.listEntries(owner, page)).length,
      entriesBefore,
    );
  } finally {
    globalThis.fetch = beforeImportFetch;
  }
  const input = {
    keep: { id: keep.id, version: keep.version },
    merge: { id: source.id, version: source.version },
  };
  await denied(
    () =>
      service.mergePeople(owner, {
        ...input,
        merge: { id: foreign.id, version: foreign.version },
      }),
    "NOT_FOUND",
  );
  await denied(
    () => service.mergePeople(owner, { keep: input.keep, merge: input.keep }),
    "BAD_REQUEST",
  );
  await denied(
    () =>
      service.mergePeople(owner, {
        ...input,
        keep: { ...input.keep, version: 99 },
      }),
    "CONFLICT",
  );
  await denied(
    () =>
      service.mergePeople(owner, {
        ...input,
        merge: { ...input.merge, version: 99 },
      }),
    "CONFLICT",
  );

  // A failure at the final delete must roll back moved children, links and notes.
  await sql.unsafe(
    `CREATE FUNCTION fail_test_merge() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected merge failure'; END $$`,
  );
  await sql.unsafe(
    `CREATE TRIGGER fail_test_merge BEFORE DELETE ON love_person FOR EACH ROW EXECUTE FUNCTION fail_test_merge()`,
  );
  await denied(() => service.mergePeople(owner, input));
  assert.equal((await service.getPerson(owner, keep.id)).version, keep.version);
  assert.equal(
    (await service.listEncounters(owner, { ...page, personId: source.id }))
      .length,
    2,
  );
  assert.equal((await service.listEntries(owner, page)).length, 2);
  assert.equal(
    (await service.getEntry(owner, journal.id)).version,
    journal.version,
  );
  await sql.unsafe("DROP TRIGGER fail_test_merge ON love_person");

  const result = await service.mergePeople(owner, input);
  const mergedProfile = await service.getPerson(owner, keep.id);
  assert.deepEqual(mergedProfile.backgroundGroups, ["east_asian"]);
  assert.equal(mergedProfile.backgroundSource, "told_to_me");
  assert.equal(mergedProfile.eyeColor, "hazel");
  assert.equal(mergedProfile.heightCategory, "average");
  assert.equal(mergedProfile.tattooCoverage, "light");
  assert.equal(result.person.summary, "Current account");
  assert.equal(result.person.occupation, "Designer");
  assert.equal(result.person.workArrangement, "in_office");
  assert.equal(result.person.remoteRegion, null);
  assert.ok(result.person.aliases?.includes("Cafe friend"));
  assert.equal(result.movedEncounters, 2);
  await denied(() => service.getPerson(owner, source.id), "NOT_FOUND");
  assert.equal(
    (await service.getPerson("voice-other", foreign.id)).displayName,
    "Mira",
  );
  const encounters = await service.listEncounters(owner, {
    ...page,
    personId: keep.id,
  });
  assert.deepEqual(
    encounters.map((e) => e.id),
    [first.id, second.id, third.id],
  );
  assert.deepEqual(
    encounters.map((e) => e.position),
    [0, 1, 2],
  );
  assert.equal(encounters[2]!.timeContext?.relativeToEncounterId, second.id);
  await denied(
    () =>
      service.updateEncounter(owner, {
        id: second.id,
        version: second.version,
        changes: { reflection: "stale" },
      }),
    "CONFLICT",
  );
  const saved = await service.getEntry(owner, journal.id);
  assert.deepEqual(saved.personIds, [keep.id]);
  assert.deepEqual(saved.encounterIds.sort(), [second.id, third.id].sort());
  assert.equal(saved.body, saved.originalBody);
  assert.ok(result.preservedNotesEntryId);
  assert.match(
    (await service.getEntry(owner, result.preservedNotesEntryId)).body,
    /Earlier feelings worth keeping/,
  );

  // One current OAuth account grant drives the actual MCP tool inventory/calls.
  await db.insert(schema.oauthClientTable).values({
    id: "voice-client",
    clientId: "voice-client",
    redirectUris: ["https://example.invalid/callback"],
    scopes: ["swipestats:all"],
  });
  await db.insert(schema.oauthConsentTable).values({
    id: "voice-consent",
    clientId: "voice-client",
    userId: owner,
    scopes: ["swipestats:all"],
  });
  const full = {
    token: "fixture",
    clientId: "voice-client",
    scopes: ["swipestats:all"],
    extra: { userId: owner },
  };
  await connectorContext(full, "loveStories:write");
  async function mcp(
    authInfo: typeof full,
    method: string,
    params: Record<string, unknown> = {},
  ) {
    const response = await swipeStatsMcpHandler.fetch(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      }),
      { authInfo },
    );
    const body = await response.text();
    assert.equal(response.status, 200, body);
    const data =
      body.startsWith("event:") || body.startsWith("data:")
        ? body
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .at(-1)!
        : body;
    return JSON.parse(data) as {
      result: {
        tools?: { name: string }[];
        isError?: boolean;
        structuredContent?: { result: { id: string } };
      };
    };
  }
  const inventory = await mcp(full, "tools/list");
  assert.equal(inventory.result.tools?.length, 23);
  assert.ok(
    inventory.result.tools?.some(
      (tool) => tool.name === "mergeLoveStoryPeople",
    ),
  );
  const read = { ...full, scopes: ["swipestats:read"] };
  assert.equal((await mcp(read, "tools/list")).result.tools?.length, 3);
  await denied(() => connectorContext(read, "loveStories:write"));
  const selfRead = await mcp(full, "tools/call", {
    name: "getLoveStorySelfProfile",
    arguments: {},
  });
  assert.ok(!selfRead.result.isError);
  const selfSaved = await mcp(full, "tools/call", {
    name: "updateLoveStorySelfProfile",
    arguments: {
      version: changed.version,
      changes: { eyeColor: null, heightCategory: null, tattooCoverage: null },
    },
  });
  assert.ok(!selfSaved.result.isError);
  assert.equal((await service.getSelfProfile(owner))?.eyeColor, null);
  assert.equal((await service.getSelfProfile(owner))?.heightCategory, null);
  assert.equal((await service.getSelfProfile(owner))?.tattooCoverage, null);
  const badBackground = await mcp(full, "tools/call", {
    name: "updateLoveStorySelfProfile",
    arguments: {
      version: changed.version + 1,
      changes: { backgroundGroups: ["invented_category"] },
    },
  });
  assert.ok(badBackground.result.isError);
  const badHeight = await mcp(full, "tools/call", {
    name: "updateLoveStorySelfProfile",
    arguments: {
      version: changed.version + 1,
      changes: { heightCategory: "invented_category" },
    },
  });
  assert.ok(badHeight.result.isError);
  const badTattoo = await mcp(full, "tools/call", {
    name: "updateLoveStorySelfProfile",
    arguments: {
      version: changed.version + 1,
      changes: { tattooCoverage: "many" },
    },
  });
  assert.ok(badTattoo.result.isError);
  const foreignSelf = await mcp(full, "tools/call", {
    name: "updateLoveStorySelfProfile",
    arguments: {
      userId: "voice-other",
      version: null,
      changes: { eyeColor: "blue" },
    },
  });
  assert.ok(foreignSelf.result.isError);
  const captured = await mcp(full, "tools/call", {
    name: "createLoveStoryEntry",
    arguments: {
      requestId: randomUUID(),
      body: "The walk brought back mixed feelings, and I am unsure which month this happened.",
      sourceKind: "summary",
      personIds: [keep.id],
    },
  });
  assert.ok(!captured.result.isError);
  assert.ok(captured.result.structuredContent?.result.id);
  await db
    .update(schema.oauthConsentTable)
    .set({ scopes: ["swipestats:read"] })
    .where(eq(schema.oauthConsentTable.id, "voice-consent"));
  await denied(() => connectorContext(full, "loveStories:write"));
  await db
    .delete(schema.oauthConsentTable)
    .where(eq(schema.oauthConsentTable.id, "voice-consent"));
  await denied(() => connectorContext(full));

  // Exercise real registration, consent, PKCE exchange, JWT verification and
  // refresh using the same auth/MCP handlers as production, on fictional data.
  const { auth } = await import("@/server/better-auth");
  const { POST: mcpRoute } = await import("@/app/api/mcp/route");
  const base = "http://localhost:3000";
  const sessionToken = randomUUID();
  await db.insert(schema.sessionTable).values({
    id: "voice-session",
    userId: owner,
    token: sessionToken,
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
    .update(sessionToken)
    .digest("base64");
  const cookie = `better-auth.session_token=${encodeURIComponent(`${sessionToken}.${signature}`)}`;
  const registeredResponse = await auth.handler(
    new Request(`${base}/api/auth/oauth2/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Fictional walk client",
        redirect_uris: [`${base}/callback`],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    }),
  );
  const registered = (await registeredResponse.json()) as {
    client_id: string;
    scope: string;
  };
  assert.ok(registeredResponse.ok, JSON.stringify(registered));
  assert.ok(registered.scope.includes("swipestats:all"));
  assert.ok(!registered.scope.includes("swipestats:read"));
  const verifier = randomUUID() + randomUUID();
  const query = new URLSearchParams({
    client_id: registered.client_id,
    redirect_uri: `${base}/callback`,
    response_type: "code",
    scope: "swipestats:all offline_access",
    resource: `${base}/api/mcp`,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    state: "fixture-state",
  });
  async function redirect(response: Response) {
    const location = response.headers.get("location");
    if (location) return location;
    const json = (await response.json()) as {
      url?: string;
      redirect_uri?: string;
    };
    assert.ok(json.url ?? json.redirect_uri, JSON.stringify(json));
    return (json.url ?? json.redirect_uri)!;
  }
  const authorize = await auth.handler(
    new Request(`${base}/api/auth/oauth2/authorize?${query}`, {
      headers: { cookie },
    }),
  );
  const consentUrl = new URL(await redirect(authorize), base);
  assert.equal(consentUrl.pathname, "/consent");
  const consentResponse = await auth.handler(
    new Request(`${base}/api/auth/oauth2/consent`, {
      method: "POST",
      headers: { cookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({
        accept: true,
        oauth_query: consentUrl.search.slice(1),
      }),
    }),
  );
  const callback = new URL(await redirect(consentResponse), base);
  assert.equal(callback.searchParams.get("state"), "fixture-state");
  const code = callback.searchParams.get("code");
  assert.ok(code);
  async function tokenRequest(params: Record<string, string>) {
    const response = await auth.handler(
      new Request(`${base}/api/auth/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
      }),
    );
    const json = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      scope: string;
    };
    assert.ok(response.ok, JSON.stringify(json));
    assert.ok(json.access_token);
    return json;
  }
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    client_id: registered.client_id,
    redirect_uri: `${base}/callback`,
    code,
    code_verifier: verifier,
    resource: `${base}/api/mcp`,
  });
  assert.ok(tokens.refresh_token);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const request = new Request(input);
    assert.equal(request.url, `${base}/api/auth/jwks`);
    return auth.handler(request);
  }) as unknown as typeof fetch;
  try {
    async function authenticatedCall(token: string) {
      return mcpRoute(
        new Request(`${base}/api/mcp`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "createLoveStoryEntry",
              arguments: {
                requestId: randomUUID(),
                sourceKind: "summary",
                body: "Captured through a real OAuth grant.",
                personIds: [keep.id],
              },
            },
          }),
        }),
      );
    }
    const response = await authenticatedCall(tokens.access_token);
    assert.equal(response.status, 200, await response.clone().text());
    assert.ok(!(await response.text()).includes('"isError":true'));
    const refreshed = await tokenRequest({
      grant_type: "refresh_token",
      client_id: registered.client_id,
      refresh_token: tokens.refresh_token,
      resource: `${base}/api/mcp`,
    });
    assert.equal((await authenticatedCall(refreshed.access_token)).status, 200);
    await db
      .delete(schema.oauthConsentTable)
      .where(eq(schema.oauthConsentTable.clientId, registered.client_id));
    assert.equal((await authenticatedCall(refreshed.access_token)).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log(
    "PASS: person merge preserves ownership, notes, ordering and links atomically; OAuth MCP inventory, summary/transcript capture and revocation verified",
  );
} finally {
  await sql.end();
}
