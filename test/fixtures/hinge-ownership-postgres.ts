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
// Exercise real lease SQL and cleanup state transitions without a storage API.
await mock.module("@vercel/blob", () => ({
  list: async () => ({ blobs: [], hasMore: false }),
  del: async () => undefined,
  copy: async () => {
    throw new Error("Unexpected blob copy");
  },
  put: async () => {
    throw new Error("Unexpected blob put");
  },
  head: async () => {
    throw new Error("Unexpected external blob request");
  },
}));
const { createHingeProfile, updateHingeProfile } =
  await import("@/server/services/hinge/hinge.service");

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
    await createHingeProfile({
      hingeId,
      userId,
      blobUrl: "https://example.com/export.json",
      verifiedJson: data,
    });
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

  const uploadId = crypto.randomUUID();
  const binding = {
    id: uploadId,
    userId: "guest",
    sessionId: "guest-session",
    dataProvider: "HINGE" as const,
    profileId: legacyId,
    blobUrl: `https://example.com/${uploadId}.json`,
  };
  await db.insert(schema.transientUploadTable).values({
    ...binding,
    expectedPathname: `hinge-data/${legacyId}/${uploadId}/data.json`,
    blobPathname: `hinge-data/${legacyId}/${uploadId}/data.json`,
    uploadedAt: new Date(),
    status: "UPLOADED",
    expiresAt: new Date(Date.now() + 60000),
  });
  // Seed evidence from an earlier CSV export that a JSON replacement must clear.
  await sql`UPDATE hinge_profile SET csv_activity = '{"version":1,"tables":[],"events":[]}' WHERE hinge_id = ${guestId}`;
  const replacement = { ...data, Matches: [], Prompts: [] };
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
  await updateHingeProfile(params);
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
    "CLEANED",
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
  console.log("PostgreSQL re-key and guest replacement regressions passed");
} finally {
  await sql.end();
}
