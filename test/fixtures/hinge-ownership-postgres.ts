// Invoked only by the disposable PostgreSQL runner, never against shared data.
import "../setup";
import assert from "node:assert/strict";
import { mock } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/server/db/schema";
import { sanitizeAnonymizedHingeBlob } from "@/lib/upload/hinge-runtime-schema";
import { deriveHingeProfileId } from "@/lib/upload/hinge-profile-id";
import {
  applyHingeRekey,
  hingeRekeyTarget,
  planHingeRekey,
} from "@/scripts/data-layer/rekey-hinge-profiles";

const connectionString = process.env.HINGE_TEST_DATABASE_URL;
assert.ok(connectionString);
const url = new URL(connectionString);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/swipestats_hinge_regression");
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql, { schema, casing: "snake_case" });
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
await mock.module("@/server/db", () => ({
  db,
  withTransaction: async (callback: (tx: Tx) => Promise<unknown>) =>
    db.transaction(callback),
}));
// Consequential failures: accepted exports disappearing during cleanup/replacement,
// and stale maintenance restoring withdrawn private fields. Static checks and
// mocked database tests cannot prove the transaction, ledger and storage boundary.
const blobs = new Map<string, string>();
const blobOrigin = "https://fixture.public.blob.vercel-storage.com";
let storageWritesUntilFailure = Infinity;
const writtenBlobUrls: string[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  assert.ok(blobs.has(url), `Unexpected network request: ${url}`);
  return new Response(blobs.get(url), {
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;
function metadata(url: string) {
  assert.ok(blobs.has(url), `Missing fixture blob: ${url}`);
  return {
    url,
    pathname: new URL(url).pathname.slice(1),
    contentType: "application/json",
    size: blobs.get(url)!.length,
    uploadedAt: new Date(),
  };
}
await mock.module("@vercel/blob", () => ({
  list: async ({ prefix = "" }: { prefix?: string } = {}) => ({
    blobs: [...blobs.keys()]
      .map(metadata)
      .filter((blob) => blob.pathname.startsWith(prefix)),
    hasMore: false,
  }),
  del: async (urls: string | string[]) => {
    for (const url of Array.isArray(urls) ? urls : [urls]) blobs.delete(url);
  },
  copy: async () => {
    throw new Error("Unexpected blob copy");
  },
  put: async (pathname: string, body: string) => {
    if (storageWritesUntilFailure-- === 0)
      throw new Error("Injected storage write failure");
    const url = `${blobOrigin}/${pathname}`;
    blobs.set(url, body);
    writtenBlobUrls.push(url);
    return metadata(url);
  },
  head: async (url: string) => metadata(url),
}));
const { createHingeProfile, updateHingeProfile } =
  await import("@/server/services/hinge/hinge.service");
const { additiveUpdateHingeProfile, absorbHingeProfileIntoNew } =
  await import("@/server/services/hinge/hinge-additive.service");
const { fetchVerifiedHingeProfileBlob } =
  await import("@/server/services/hinge/hinge-blob.service");
const { cleanupTransientUploadsBatch, registerTransientUploadForProcessing } =
  await import("@/server/services/transient-upload.service");
async function upload(userId: string, profileId: string, json: typeof data) {
  const id = crypto.randomUUID();
  const pathname = `hinge-data/${profileId}/${id}/data.json`;
  const binding = {
    id,
    userId,
    sessionId: `${userId}-session`,
    dataProvider: "HINGE" as const,
    profileId,
    blobUrl: `${blobOrigin}/${pathname}`,
  };
  blobs.set(binding.blobUrl, JSON.stringify(json));
  await db.insert(schema.transientUploadTable).values({
    ...binding,
    expectedPathname: pathname,
    blobPathname: pathname,
    uploadedAt: new Date(),
    status: "UPLOADED",
    expiresAt: new Date(Date.now() + 60000),
  });
  return binding;
}
async function archives(userId: string) {
  return db.query.originalAnonymizedFileTable.findMany({
    where: eq(schema.originalAnonymizedFileTable.userId, userId),
  });
}
async function retrieve(userId: string, hingeId: string, blobUrl: string) {
  const existingProfile = await db.query.hingeProfileTable.findFirst({
    where: eq(schema.hingeProfileTable.hingeId, hingeId),
  });
  return fetchVerifiedHingeProfileBlob(blobUrl, {
    userId,
    hingeId,
    existingProfile,
  });
}
function assertRedacted(json: typeof data) {
  assert.equal(json.Media?.length ?? 0, 0);
  assert.ok(!JSON.stringify(json).includes("Private role"));
  assert.ok(!JSON.stringify(json).includes("Private employer"));
}

const signupTime = "2020-01-01T00:00:00.000Z";
const legacyId = await deriveHingeProfileId(signupTime);
const data = sanitizeAnonymizedHingeBlob({
  User: {
    preferences: {},
    identity: {},
    installs: [],
    account: { signup_time: signupTime, last_seen: "2026-01-01T00:00:00.000Z" },
    profile: {
      age: 30,
      job_title: "Private role",
      workplaces: '["Private employer"]',
    },
  },
  Matches: [
    {
      match: [{ timestamp: "2025-01-01T00:00:00.000Z" }],
      like: [{ timestamp: "2024-12-31T00:00:00.000Z", like: [] }],
      chats: [{ body: "old message", timestamp: "2025-01-02T00:00:00.000Z" }],
    },
  ],
  Media: [{ type: "photo", url: "https://example.com/photo.jpg" }],
  Prompts: [
    {
      type: "text",
      id: 1,
      text: "Old prompt",
      created: "2020-01-01T00:00:00.000Z",
      user_updated: "2020-01-01T00:00:00.000Z",
    },
  ],
});
try {
  await db.insert(schema.userTable).values([
    { id: "guest", isAnonymous: true },
    { id: "registered", isAnonymous: false },
  ]);
  for (const [hingeId, userId] of [
    [legacyId, "guest"],
    ["b".repeat(64), "registered"],
  ] as const) {
    const binding = await upload(userId, hingeId, data);
    await createHingeProfile({
      hingeId,
      userId,
      blobUrl: binding.blobUrl,
      verifiedJson: data,
      transientUpload: binding,
    });
    assert.equal((await archives(userId)).length, 1);
    await cleanupTransientUploadsBatch({ uploadId: binding.id });
    assert.deepEqual(await retrieve(userId, hingeId, binding.blobUrl), data);
    assert.equal(
      (await registerTransientUploadForProcessing(binding)).status,
      "COMMITTED",
    );
    await assert.rejects(
      createHingeProfile({
        hingeId,
        userId,
        blobUrl: binding.blobUrl,
        verifiedJson: data,
        transientUpload: binding,
      }),
      /not available/,
    );
    assert.equal(
      (await archives(userId)).length,
      1,
      "A retry must not duplicate its archive",
    );
  }
  // A complete legacy row without an owner must be preserved too.
  await sql`INSERT INTO hinge_profile SELECT (jsonb_populate_record(NULL::hinge_profile, to_jsonb(p) || jsonb_build_object('hinge_id', ${"c".repeat(64)}::text, 'user_id', NULL))).* FROM hinge_profile p WHERE hinge_id = ${legacyId}`;
  await db
    .insert(schema.customDataTable)
    .values({ id: "custom", userId: "guest", hingeProfileId: legacyId });
  await db.insert(schema.swipeRankProfileTable).values({
    id: "registry",
    sourceProfileUpdatedAt: new Date(),
    dataProvider: "HINGE",
    providerProfileId: legacyId,
    userId: "guest",
  });
  await sql`INSERT INTO ai_output (id, user_id, kind, hinge_profile_id, model, input, output, share_key, created_at, updated_at) VALUES ('ai', 'guest', 'profile_roast', ${legacyId}, 'test', '{}', '{}', 'test-share', now(), now())`;
  await db.insert(schema.attachmentTable).values({
    id: "attachment",
    resourceType: "hinge_data",
    resourceId: legacyId,
    uploadedBy: "guest",
    filename: "data.json",
    originalFilename: "data.json",
    mimeType: "application/json",
    size: 1,
    url: "https://example.com/upload",
  });
  const committedUploadId = crypto.randomUUID();
  await db.insert(schema.transientUploadTable).values({
    id: committedUploadId,
    userId: "guest",
    sessionId: "guest-session",
    dataProvider: "HINGE",
    profileId: legacyId,
    expectedPathname: `hinge-data/${legacyId}/${committedUploadId}/data.json`,
    blobUrl: "https://example.com/committed.json",
    blobPathname: `hinge-data/${legacyId}/${committedUploadId}/data.json`,
    uploadedAt: new Date(),
    status: "COMMITTED",
    resultProfileId: legacyId,
    committedAt: new Date(),
    expiresAt: new Date(Date.now() + 60000),
  });

  const target = await hingeRekeyTarget(connectionString);
  const beforePlan =
    await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p ORDER BY hinge_id`;
  const plan = await planHingeRekey(sql, target);
  assert.equal(plan.rows.length, 3);
  assert.deepEqual(
    await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p ORDER BY hinge_id`,
    beforePlan,
  );
  const stale = structuredClone(plan);
  stale.rows[0]!.ownerId = "wrong-owner";
  await assert.rejects(applyHingeRekey(sql, stale, target));
  assert.deepEqual(
    await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p ORDER BY hinge_id`,
    beforePlan,
  );

  // Inject a postcondition failure after writes have begun. Every change must
  // roll back, including parent ownership and already-moved child references.
  await sql.unsafe(
    `CREATE FUNCTION corrupt_hinge_rekey() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.age_at_upload := NEW.age_at_upload + 1; RETURN NEW; END $$`,
  );
  await sql.unsafe(
    `CREATE TRIGGER test_corrupt_rekey BEFORE INSERT ON hinge_profile FOR EACH ROW EXECUTE FUNCTION corrupt_hinge_rekey()`,
  );
  await assert.rejects(applyHingeRekey(sql, plan, target), /profile contents/);
  assert.deepEqual(
    await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p ORDER BY hinge_id`,
    beforePlan,
  );
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM message WHERE hinge_profile_id = ${legacyId}`
    )[0]!.count,
    1,
  );
  await sql.unsafe("DROP TRIGGER test_corrupt_rekey ON hinge_profile");
  await sql.unsafe("DROP FUNCTION corrupt_hinge_rekey()");

  const result = await applyHingeRekey(sql, plan, target);
  assert.equal(result.rekeyed, 3);
  const guestId = plan.rows.find((row) => row.oldId === legacyId)!.newId;
  for (const table of [
    "match",
    "message",
    "media",
    "hinge_interaction",
    "hinge_prompt",
    "profile_meta",
    "custom_data",
    "ai_output",
  ]) {
    const rows = await sql.unsafe<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM "${table}" WHERE hinge_profile_id = $1`,
      [guestId],
    );
    assert.ok(rows[0]!.count > 0, `${table} retained its rows`);
  }
  assert.equal(
    (
      await sql`SELECT content_raw FROM message WHERE hinge_profile_id = ${guestId}`
    )[0]!.content_raw,
    "old message",
  );
  assert.equal(
    (
      await sql`SELECT provider_profile_id FROM swipe_rank_profile WHERE id = 'registry'`
    )[0]!.provider_profile_id,
    guestId,
  );
  assert.equal(
    (await sql`SELECT resource_id FROM attachment WHERE id = 'attachment'`)[0]!
      .resource_id,
    guestId,
  );
  const lease = await db.query.transientUploadTable.findFirst({
    where: eq(schema.transientUploadTable.id, committedUploadId),
  });
  assert.equal(lease!.profileId, legacyId);
  assert.equal(lease!.resultProfileId, guestId);
  assert.equal((await applyHingeRekey(sql, plan, target)).rekeyed, 0);

  const replacement = { ...data, Matches: [], Prompts: [] };
  const binding = await upload("guest", legacyId, replacement);
  const uploadId = binding.id;
  // Seed evidence from an earlier CSV export that a JSON replacement must clear.
  await sql`UPDATE hinge_profile SET csv_activity = '{"version":1,"tables":[],"events":[]}' WHERE hinge_id = ${guestId}`;
  const params = {
    hingeId: guestId,
    userId: "guest",
    blobUrl: binding.blobUrl,
    verifiedJson: replacement,
    transientUpload: binding,
    consentPhotos: false,
    consentWork: false,
    requireAnonymousOwner: true,
  };
  await db
    .update(schema.userTable)
    .set({ isAnonymous: false })
    .where(eq(schema.userTable.id, "guest"));
  await assert.rejects(updateHingeProfile(params), /Guest account changed/);
  assert.equal(
    (await db.query.transientUploadTable.findFirst({
      where: eq(schema.transientUploadTable.id, uploadId),
    }))!.status,
    "UPLOADED",
  );
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM message WHERE hinge_profile_id = ${guestId}`
    )[0]!.count,
    1,
  );
  await db
    .update(schema.userTable)
    .set({ isAnonymous: true })
    .where(eq(schema.userTable.id, "guest"));
  const beforeReplacement =
    await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p WHERE hinge_id = ${guestId}`;
  const beforeLease =
    await sql`SELECT to_jsonb(t) AS row FROM transient_upload t WHERE id = ${uploadId}`;
  storageWritesUntilFailure = 0;
  await assert.rejects(
    updateHingeProfile(params),
    /Injected storage write failure/,
  );
  storageWritesUntilFailure = Infinity;
  assert.deepEqual(
    await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p WHERE hinge_id = ${guestId}`,
    beforeReplacement,
  );
  assert.deepEqual(
    await sql`SELECT to_jsonb(t) AS row FROM transient_upload t WHERE id = ${uploadId}`,
    beforeLease,
  );
  assert.equal((await archives("guest")).length, 1);
  // A failure after source redaction and archive insertion must roll back DB
  // writes without destroying the old source or the retriable new upload.
  await sql.unsafe(
    `CREATE FUNCTION fail_hinge_replace() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected DB rollback'; END $$`,
  );
  await sql.unsafe(
    `CREATE TRIGGER test_fail_replace BEFORE UPDATE ON hinge_profile FOR EACH ROW EXECUTE FUNCTION fail_hinge_replace()`,
  );
  await assert.rejects(updateHingeProfile(params), (error: unknown) => {
    assert.ok(error instanceof Error && error.cause instanceof Error);
    assert.match(error.cause.message, /Injected DB rollback/);
    return true;
  });
  await sql.unsafe("DROP TRIGGER test_fail_replace ON hinge_profile");
  await sql.unsafe("DROP FUNCTION fail_hinge_replace()");
  assert.deepEqual(
    await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p WHERE hinge_id = ${guestId}`,
    beforeReplacement,
  );
  assert.deepEqual(
    await sql`SELECT to_jsonb(t) AS row FROM transient_upload t WHERE id = ${uploadId}`,
    beforeLease,
  );
  assert.equal((await archives("guest")).length, 1);
  assert.ok(blobs.has(binding.blobUrl));
  const oldSource = (await archives("guest"))[0]!.blobUrl!;
  assert.equal((await retrieve("guest", guestId, oldSource)).Matches.length, 1);
  await updateHingeProfile(params);
  assert.equal(
    (await archives("guest")).length,
    2,
    "Replacement retains both source versions",
  );
  for (const file of await archives("guest")) {
    assertRedacted(await retrieve("guest", guestId, file.blobUrl!));
  }
  assert.equal((await retrieve("guest", guestId, oldSource)).Matches.length, 1);
  await cleanupTransientUploadsBatch({ uploadId });
  assert.ok(blobs.has(binding.blobUrl));
  for (const table of [
    "match",
    "message",
    "media",
    "hinge_interaction",
    "hinge_prompt",
  ]) {
    const rows = await sql.unsafe<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM "${table}" WHERE hinge_profile_id = $1`,
      [guestId],
    );
    assert.equal(rows[0]!.count, 0, `${table} was replaced, not appended`);
  }
  const replaced = await db.query.hingeProfileTable.findFirst({
    where: eq(schema.hingeProfileTable.hingeId, guestId),
  });
  assert.equal(replaced!.csvActivity, null);
  assert.equal(replaced!.jobTitle, "");
  assert.equal(
    (await db.query.transientUploadTable.findFirst({
      where: eq(schema.transientUploadTable.id, uploadId),
    }))!.status,
    "COMMITTED",
  );
  assert.equal(
    (await db.query.userTable.findFirst({
      where: eq(schema.userTable.id, "guest"),
    }))!.isAnonymous,
    true,
  );
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM custom_data WHERE hinge_profile_id = ${guestId}`
    )[0]!.count,
    1,
  );
  // A stale admin request fetched before withdrawal must obey current policy
  // and the retained source re-read under the mutation locks.
  await updateHingeProfile({
    hingeId: guestId,
    userId: "guest",
    blobUrl: binding.blobUrl,
    verifiedJson: data,
    consentPhotos: true,
    consentWork: true,
  });
  const replayed = await db.query.hingeProfileTable.findFirst({
    where: eq(schema.hingeProfileTable.hingeId, guestId),
  });
  assert.equal(replayed!.jobTitle, "");
  for (const table of [
    "match",
    "message",
    "hinge_interaction",
    "hinge_prompt",
  ]) {
    const rows = await sql.unsafe<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM "${table}" WHERE hinge_profile_id = $1`,
      [guestId],
    );
    assert.equal(
      rows[0]!.count,
      0,
      `${table} must come from the retained source, not stale admin input`,
    );
  }
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM media WHERE hinge_profile_id = ${guestId}`
    )[0]!.count,
    0,
  );
  assert.equal((await archives("guest")).length, 2);
  const foreignSource = (await archives("registered"))[0]!.blobUrl!;
  await assert.rejects(
    updateHingeProfile({
      hingeId: guestId,
      userId: "guest",
      blobUrl: foreignSource,
      verifiedJson: data,
    }),
    /retained source owned/,
  );
  assert.equal((await archives("guest")).length, 2);

  // A new grant applies to the new revision, never to old withdrawn bytes
  // returned by a stale storage cache during maintenance.
  const regranted = await upload("guest", guestId, data);
  await updateHingeProfile({
    hingeId: guestId,
    userId: "guest",
    blobUrl: regranted.blobUrl,
    transientUpload: regranted,
    verifiedJson: data,
    consentPhotos: true,
    consentWork: true,
  });
  assert.equal(
    (await retrieve("guest", guestId, regranted.blobUrl)).Media?.length,
    1,
  );
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM media WHERE hinge_profile_id = ${guestId}`
    )[0]!.count,
    1,
  );
  // Clock skew must not turn an old withdrawn revision into the current grant.
  await sql`UPDATE original_anonymized_file SET created_at = now() + interval '1 day' WHERE blob_url = ${oldSource}`;
  const newestByTimestamp =
    await sql`SELECT blob_url FROM original_anonymized_file WHERE user_id = 'guest' ORDER BY created_at DESC, id DESC LIMIT 1`;
  assert.equal(newestByTimestamp[0]!.blob_url, oldSource);
  blobs.set(oldSource, JSON.stringify(data));
  const staleHistory = await retrieve("guest", guestId, oldSource);
  assert.equal(
    staleHistory.Media?.length,
    1,
    "The storage mock must actually return stale private bytes",
  );
  await updateHingeProfile({
    hingeId: guestId,
    userId: "guest",
    blobUrl: oldSource,
    verifiedJson: staleHistory,
    consentPhotos: true,
    consentWork: true,
  });
  assertRedacted(await retrieve("guest", guestId, oldSource));
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM media WHERE hinge_profile_id = ${guestId}`
    )[0]!.count,
    0,
  );
  assert.equal(
    (await archives("guest")).length,
    3,
    "Replaying history must not create another revision",
  );

  // The actual latest grant remains replayable even when an older row sorts
  // first, and replaying that older row must not change acceptance identity.
  await updateHingeProfile({
    hingeId: guestId,
    userId: "guest",
    blobUrl: regranted.blobUrl,
    verifiedJson: data,
  });
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM media WHERE hinge_profile_id = ${guestId}`
    )[0]!.count,
    1,
    "Latest accepted source retains its granted photos during replay",
  );

  // Withdrawing another category later must not revive previously withdrawn
  // photos in old revisions, even after the new photo grant above.
  blobs.set(oldSource, JSON.stringify(data));
  const withdrawWork = await upload("guest", guestId, data);
  await updateHingeProfile({
    hingeId: guestId,
    userId: "guest",
    blobUrl: withdrawWork.blobUrl,
    transientUpload: withdrawWork,
    verifiedJson: data,
    consentPhotos: true,
    consentWork: false,
  });
  assertRedacted(await retrieve("guest", guestId, oldSource));
  const currentSource = await retrieve("guest", guestId, withdrawWork.blobUrl);
  assert.equal(
    currentSource.Media?.length,
    1,
    "Current photo consent remains granted",
  );
  assert.ok(!JSON.stringify(currentSource).includes("Private role"));
  assert.ok(!JSON.stringify(currentSource).includes("Private employer"));

  const registeredId = plan.rows.find(
    (row) => row.ownerId === "registered",
  )!.newId;
  const added = await upload("registered", registeredId, data);
  await additiveUpdateHingeProfile({
    hingeId: registeredId,
    userId: "registered",
    blobUrl: added.blobUrl,
    transientUpload: added,
    verifiedJson: data,
  });
  assert.equal((await archives("registered")).length, 2);
  const nextData = structuredClone(data);
  nextData.User.account.signup_time = "2021-01-01T00:00:00.000Z";
  const nextId = await deriveHingeProfileId(nextData.User.account.signup_time);
  const merged = await upload("registered", nextId, nextData);
  await absorbHingeProfileIntoNew({
    oldHingeId: registeredId,
    newHingeId: nextId,
    userId: "registered",
    blobUrl: merged.blobUrl,
    transientUpload: merged,
    verifiedJson: nextData,
  });
  assert.equal((await archives("registered")).length, 3);
  assert.deepEqual(
    await retrieve("registered", nextId, merged.blobUrl),
    nextData,
  );
  for (const file of await archives("registered"))
    assert.ok(blobs.has(file.blobUrl!));
  // A provider can fail midway through historical redaction. Completed privacy
  // writes may remain, but no accepted revision or DB activity may be lost.
  const withdrawingData = { ...nextData, Matches: [], Prompts: [] };
  const withdrawing = await upload("registered", nextId, withdrawingData);
  const withdrawalParams = {
    hingeId: nextId,
    userId: "registered",
    blobUrl: withdrawing.blobUrl,
    transientUpload: withdrawing,
    verifiedJson: withdrawingData,
    consentPhotos: false,
    consentWork: false,
  };
  async function retainedDatabaseState() {
    const activity: Record<string, unknown> = {};
    for (const table of [
      "match",
      "message",
      "media",
      "hinge_interaction",
      "hinge_prompt",
      "profile_meta",
    ]) {
      activity[table] = await sql.unsafe(
        `SELECT to_jsonb(p) AS row FROM "${table}" p WHERE hinge_profile_id = $1 ORDER BY to_jsonb(p)::text`,
        [nextId],
      );
    }
    return {
      activity,
      profile:
        await sql`SELECT to_jsonb(p) AS row FROM hinge_profile p WHERE hinge_id = ${nextId}`,
      lease:
        await sql`SELECT to_jsonb(p) AS row FROM transient_upload p WHERE id = ${withdrawing.id}`,
      sources:
        await sql`SELECT to_jsonb(p) AS row FROM original_anonymized_file p WHERE user_id = 'registered' ORDER BY id`,
    };
  }
  const stateBeforePartialFailure = await retainedDatabaseState();
  const historicalSources = (await archives("registered")).map(
    (file) => file.blobUrl!,
  );
  const writesBeforePartialFailure = writtenBlobUrls.length;
  // New source succeeds, first historical source succeeds, second history fails.
  storageWritesUntilFailure = 2;
  await assert.rejects(
    updateHingeProfile(withdrawalParams),
    /Injected storage write failure/,
  );
  storageWritesUntilFailure = Infinity;
  assert.deepEqual(await retainedDatabaseState(), stateBeforePartialFailure);
  const completedWrites = writtenBlobUrls.slice(writesBeforePartialFailure);
  assert.equal(completedWrites.length, 2);
  assert.equal(completedWrites[0], withdrawing.blobUrl);
  assert.ok(historicalSources.includes(completedWrites[1]!));
  assertRedacted(JSON.parse(blobs.get(completedWrites[1]!)!) as typeof data);
  for (const url of [...historicalSources, withdrawing.blobUrl])
    assert.ok(blobs.has(url), "A partial failure must not delete any source");
  await updateHingeProfile(withdrawalParams);
  const sourcesAfterRetry = await archives("registered");
  assert.equal(sourcesAfterRetry.length, historicalSources.length + 1);
  for (const url of historicalSources)
    assert.ok(sourcesAfterRetry.some((file) => file.blobUrl === url));
  for (const file of sourcesAfterRetry)
    assertRedacted(JSON.parse(blobs.get(file.blobUrl!)!) as typeof data);
  assert.equal(
    (await registerTransientUploadForProcessing(withdrawing)).status,
    "COMMITTED",
  );
  console.log(
    "PostgreSQL re-key, archive retention, rollback, replay privacy, and guest replacement regressions passed",
  );
} finally {
  globalThis.fetch = originalFetch;
  await sql.end();
}
