// Only the disposable runner invokes this fixture. Never use shared data.
import "../setup";
import assert from "node:assert/strict";
import { mock } from "bun:test";
import { initTRPC } from "@trpc/server";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/server/db/schema";
import { deriveTinderProfileIdFromExport } from "@/lib/upload/tinder-profile-id";
import { parseAnonymizedTinderData } from "@/server/services/profile/validation.service";
import { resolveTinderUploadTarget } from "@/server/services/profile/tinder-upload-target";

// Consequential failures: a repeated export taking another guest's history or
// purchases, conversion losing its public ID, and rejected merges deleting data.
// Existing pure planners and static checks do not exercise SQL transactions.
const connectionString = process.env.TINDER_TEST_DATABASE_URL;
assert.ok(connectionString);
const url = new URL(connectionString);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/swipestats_tinder_regression");
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql, { schema, casing: "snake_case" });
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
await mock.module("@/server/db", () => ({
  db,
  withTransaction: (callback: (tx: Tx) => Promise<unknown>) =>
    db.transaction(callback),
}));
await mock.module("@/server/services/swipe-rank/public-cache", () => ({
  invalidatePublicSwipeRankCache: () => undefined,
}));
const blobs = new Map<string, string>();
const blobOrigin = "https://fixture.public.blob.vercel-storage.com";
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
  assert.ok(blobs.has(url));
  return {
    url,
    pathname: new URL(url).pathname.slice(1),
    contentType: "application/json",
    size: blobs.get(url)!.length,
    uploadedAt: new Date(),
  };
}
await mock.module("@vercel/blob", () => ({
  list: async () => ({
    blobs: [...blobs.keys()].map(metadata),
    hasMore: false,
  }),
  del: async (urls: string | string[]) => {
    for (const url of Array.isArray(urls) ? urls : [urls]) blobs.delete(url);
  },
  copy: async () => {
    throw new Error("Unexpected blob copy");
  },
  head: async (url: string) => metadata(url),
  put: async (path: string, body: string) => {
    const url = `${blobOrigin}/${path}`;
    blobs.set(url, body);
    return metadata(url);
  },
}));
const t = initTRPC
  .context<{
    db: typeof db;
    session: {
      user: { id: string; isAnonymous: boolean };
      session: { id: string };
    } | null;
    headers: Headers;
  }>()
  .create();
await mock.module("@/server/api/trpc", () => ({
  publicProcedure: t.procedure,
}));
await mock.module("@/server/services/analytics.service", () => ({
  trackServerEvent: () => undefined,
}));
await mock.module("@/server/clients/posthog.client", () => ({
  captureException: async () => undefined,
}));
await mock.module("@/server/services/user/location.service", () => ({
  uploadLocation: () => ({}),
  captureUploadLocation: async () => undefined,
}));
await mock.module("@/lib/admin-request-auth", () => ({
  isAdminRequestAuthorized: async () => true,
}));
const { profileRouter } = await import("@/server/api/routers/profileRouter");
const router = t.router(profileRouter);
const caller = (userId: string | null, isAnonymous = false) =>
  router.createCaller({
    db,
    headers: new Headers(),
    session: userId
      ? {
          user: { id: userId, isAnonymous },
          session: { id: `${userId}-session` },
        }
      : null,
  });
const { createTinderProfile, replaceTinderProfileRevision } =
  await import("@/server/services/profile/profile.service");
const { additiveUpdateProfile, absorbProfileIntoNew } =
  await import("@/server/services/profile/additive.service");
const { transferAnonymousUserData } =
  await import("@/server/services/anonymous.service");
const { cleanupTransientUploadsBatch, registerTransientUploadForProcessing } =
  await import("@/server/services/transient-upload.service");
const data = parseAnonymizedTinderData({
  User: {
    birth_date: "1995-01-01T00:00:00.000Z",
    create_date: "2020-01-01T00:00:00.000Z",
    active_time: "2025-02-01T00:00:00.000Z",
    gender: "M",
    gender_filter: "F",
    interested_in: "F",
    instagram: false,
    spotify: false,
    jobs: [
      {
        company: { displayed: true, name: "Private employer" },
        title: { displayed: true, name: "Private role" },
      },
    ],
  },
  Usage: {
    app_opens: { "2025-01-01": 1, "2025-02-01": 2 },
    swipes_likes: { "2025-01-01": 2 },
    swipes_passes: {},
    matches: {},
    messages_sent: {},
    messages_received: {},
  },
  Messages: [
    {
      match_id: "Match 1",
      messages: [
        {
          to: 1,
          message: "retained message",
          sent_date: "2025-01-01T12:00:00.000Z",
        },
      ],
    },
  ],
  Photos: ["https://example.com/private-photo.jpg"],
});
async function upload(userId: string, json = data) {
  const profileId = await deriveTinderProfileIdFromExport(json);
  const id = crypto.randomUUID();
  const pathname = `tinder-data/${profileId}/${id}/data.json`;
  const binding = {
    id,
    userId,
    sessionId: `${userId}-session`,
    dataProvider: "TINDER" as const,
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
  return {
    userId,
    blobUrl: binding.blobUrl,
    verifiedTinderId: profileId,
    verifiedTinderJson: json,
    transientUpload: binding,
  };
}
async function target(userId: string, json = data) {
  return (
    await resolveTinderUploadTarget({
      userId,
      birthDate: json.User.birth_date,
      createDate: json.User.create_date,
    })
  ).tinderId;
}
async function profile(tinderId: string) {
  return db.query.tinderProfileTable.findFirst({
    where: eq(schema.tinderProfileTable.tinderId, tinderId),
  });
}
async function state() {
  const result: Record<string, unknown> = {};
  for (const table of [
    "user",
    "tinder_profile",
    "match",
    "message",
    "tinder_usage",
    "media",
    "job",
    "purchase",
    "original_anonymized_file",
    "transient_upload",
  ])
    result[table] = await sql.unsafe(
      `SELECT to_jsonb(p) AS row FROM "${table}" p ORDER BY to_jsonb(p)::text`,
    );
  return result;
}
async function assertCommitted(
  params: Awaited<ReturnType<typeof upload>>,
  id: string,
) {
  const lease = await registerTransientUploadForProcessing(
    params.transientUpload,
  );
  assert.equal(lease.status, "COMMITTED");
  assert.equal(lease.resultProfileId, id);
  await cleanupTransientUploadsBatch({ uploadId: params.transientUpload.id });
  assert.ok(blobs.has(params.blobUrl), "Accepted archives survive cleanup");
}
try {
  await db.insert(schema.userTable).values([
    { id: "old-guest", isAnonymous: true },
    { id: "new-guest", isAnonymous: true, role: "admin", name: "Guest name" },
    { id: "registered", isAnonymous: false },
    {
      id: "converted",
      isAnonymous: false,
      name: "Registered name",
      role: "user",
      banned: true,
      banReason: "Synthetic existing restriction",
      swipestatsTier: "PLUS",
      subscriptionProviderId: "synthetic-subscription",
    },
    { id: "legacy-owner", isAnonymous: true },
  ]);
  const oldUpload = await upload("old-guest");
  const oldId = target("old-guest");
  const old = await createTinderProfile({
    ...oldUpload,
    tinderId: await oldId,
  });
  await db.insert(schema.purchaseTable).values({
    id: "old-purchase",
    userId: "old-guest",
    tinderProfileId: old.profile.tinderId,
  });
  const oldState = await state();
  const newUpload = await upload("new-guest");
  const fresh = await createTinderProfile({
    ...newUpload,
    tinderId: await target("new-guest"),
  });
  const registeredUpload = await upload("registered");
  const registered = await createTinderProfile({
    ...registeredUpload,
    tinderId: await target("registered"),
  });
  assert.equal(
    new Set([
      old.profile.tinderId,
      fresh.profile.tinderId,
      registered.profile.tinderId,
    ]).size,
    3,
  );
  assert.notEqual(fresh.profile.tinderId, newUpload.verifiedTinderId);
  const currentState = await state();
  for (const table of ["purchase", "original_anonymized_file", "message"]) {
    for (const row of oldState[table] as unknown[])
      assert.ok(
        (currentState[table] as unknown[]).some(
          (candidate) => JSON.stringify(candidate) === JSON.stringify(row),
        ),
        `${table} keeps the old guest's rows`,
      );
  }
  for (const [params, id] of [
    [oldUpload, old.profile.tinderId],
    [newUpload, fresh.profile.tinderId],
    [registeredUpload, registered.profile.tinderId],
  ] as const)
    await assertCommitted(params, id);

  // Genuine conversion retains the ID, archive and purchases without downgrading paid access.
  await db.insert(schema.purchaseTable).values({
    id: "new-purchase",
    userId: "new-guest",
    tinderProfileId: fresh.profile.tinderId,
  });
  await sql`INSERT INTO ai_output (id, user_id, kind, scope, tinder_profile_id, model, input, output, share_key, created_at, updated_at) VALUES ('converted-ai', 'new-guest', 'profile_roast', 'conversion', ${fresh.profile.tinderId}, 'fixture', '{}', '{}', 'conversion-share', now(), now())`;
  await transferAnonymousUserData("new-guest", "converted");
  assert.equal(
    (await sql`SELECT user_id FROM ai_output WHERE id = 'converted-ai'`)[0]!
      .user_id,
    "converted",
  );
  assert.equal((await profile(fresh.profile.tinderId))!.userId, "converted");
  const converted = await db.query.userTable.findFirst({
    where: eq(schema.userTable.id, "converted"),
  });
  assert.equal(converted!.name, "Registered name");
  assert.equal(converted!.role, "user");
  assert.equal(converted!.banned, true);
  assert.equal(converted!.banReason, "Synthetic existing restriction");
  assert.equal(converted!.swipestatsTier, "PLUS");
  assert.equal(converted!.subscriptionProviderId, "synthetic-subscription");
  assert.equal(
    (await db.query.purchaseTable.findFirst({
      where: eq(schema.purchaseTable.id, "new-purchase"),
    }))!.userId,
    "converted",
  );
  assert.equal(
    (await db.query.originalAnonymizedFileTable.findFirst({
      where: eq(schema.originalAnonymizedFileTable.blobUrl, newUpload.blobUrl),
    }))!.userId,
    "converted",
  );
  const convertedTarget = await resolveTinderUploadTarget({
    userId: "converted",
    birthDate: "1995-01-01T12:00:00Z",
    createDate: "2020-01-01T01:00:00+01:00",
    existingProfile: await profile(fresh.profile.tinderId),
  });
  assert.equal(convertedTarget.tinderId, fresh.profile.tinderId);
  const repeat = await upload("converted");
  assert.equal(
    (
      await additiveUpdateProfile({
        ...repeat,
        tinderId: convertedTarget.tinderId,
      })
    ).profile.tinderId,
    fresh.profile.tinderId,
  );
  await assertCommitted(repeat, fresh.profile.tinderId);

  // Legacy owned IDs survive exact identity matching too.
  const legacyUpload = await upload("legacy-owner");
  await sql`INSERT INTO tinder_profile SELECT (jsonb_populate_record(NULL::tinder_profile, to_jsonb(p) || jsonb_build_object('tinder_id', ${legacyUpload.verifiedTinderId}::text, 'user_id', 'legacy-owner'))).* FROM tinder_profile p WHERE tinder_id = ${old.profile.tinderId}`;
  const legacyTarget = await resolveTinderUploadTarget({
    userId: "legacy-owner",
    birthDate: data.User.birth_date,
    createDate: data.User.create_date,
    existingProfile: await profile(legacyUpload.verifiedTinderId),
  });
  assert.equal(legacyTarget.tinderId, legacyUpload.verifiedTinderId);
  const legacyRepeat = await upload("legacy-owner");
  assert.equal(
    (
      await additiveUpdateProfile({
        ...legacyRepeat,
        tinderId: legacyTarget.tinderId,
      })
    ).profile.tinderId,
    legacyTarget.tinderId,
  );

  // Wrong identity must fail before replacement, additive writes or merge writes.
  for (const field of ["birth_date", "create_date"] as const) {
    const mismatch = structuredClone(data);
    mismatch.User[field] =
      field === "birth_date" ? "1995-01-02T00:00:00Z" : "2020-01-01T00:00:01Z";
    const params = await upload("converted", mismatch);
    const before = await state();
    await assert.rejects(
      additiveUpdateProfile({ ...params, tinderId: fresh.profile.tinderId }),
      /different Tinder account/,
    );
    await assert.rejects(
      replaceTinderProfileRevision({
        ...params,
        tinderId: fresh.profile.tinderId,
      }),
      /different Tinder account/,
    );
    assert.deepEqual(await state(), before);
  }
  // A forged stored target cannot make a valid export write into another owner.
  const spoofed = await upload("converted");
  const beforeSpoof = await state();
  await assert.rejects(
    createTinderProfile({ ...spoofed, tinderId: old.profile.tinderId }),
    /target does not match/,
  );
  assert.deepEqual(await state(), beforeSpoof);

  // An active guest subscription cannot be silently detached from its billing
  // provider; two paid accounts cannot be folded together either.
  await db.insert(schema.userTable).values([
    {
      id: "billing-guest",
      isAnonymous: true,
      subscriptionProviderId: "synthetic-guest-subscription",
    },
    {
      id: "lifetime-guest",
      isAnonymous: true,
      swipestatsTier: "ELITE",
      isLifetime: true,
    },
    { id: "free-destination", isAnonymous: false },
  ]);
  for (const [source, destination] of [
    ["billing-guest", "free-destination"],
    ["lifetime-guest", "converted"],
    ["lifetime-guest", "free-destination"],
    ["registered", "free-destination"],
    ["old-guest", "lifetime-guest"],
    ["old-guest", "old-guest"],
  ] as const) {
    const before = await state();
    await assert.rejects(transferAnonymousUserData(source, destination));
    assert.deepEqual(await state(), before);
  }
  const collisionBefore = await state();
  await assert.rejects(transferAnonymousUserData("old-guest", "registered"));
  assert.deepEqual(
    await state(),
    collisionBefore,
    "Conversion collision must roll back all product and billing rows",
  );

  const redacted = structuredClone(data);
  redacted.Photos = [];
  redacted.User.jobs = [];
  const consentUpload = await upload("converted", redacted);
  await additiveUpdateProfile({
    ...consentUpload,
    tinderId: fresh.profile.tinderId,
    consentPhotos: false,
    consentWork: false,
  });
  for (const table of ["media", "job"])
    assert.equal(
      (
        await sql.unsafe(
          `SELECT count(*)::int AS count FROM "${table}" WHERE tinder_profile_id = $1`,
          [fresh.profile.tinderId],
        )
      )[0]!.count,
      0,
    );
  await assertCommitted(consentUpload, fresh.profile.tinderId);

  const next = structuredClone(redacted);
  next.User.create_date = "2026-01-01T00:00:00Z";
  next.Usage = {
    app_opens: { "2026-02-01": 1 },
    swipes_likes: {},
    swipes_passes: {},
    matches: {},
    messages_sent: {},
    messages_received: {},
  };
  next.Messages = [];
  for (const invalid of ["birth", "overlap"] as const) {
    const json = structuredClone(next);
    if (invalid === "birth") json.User.birth_date = "1995-02-01T00:00:00Z";
    else json.Usage = data.Usage;
    const params = await upload("converted", json);
    const before = await state();
    await assert.rejects(
      absorbProfileIntoNew({
        ...params,
        oldTinderId: fresh.profile.tinderId,
        newTinderId: await target("converted", json),
      }),
      invalid === "birth" ? /different birth date/ : /overlap/,
    );
    assert.deepEqual(await state(), before);
  }
  // Source-linked paid/history artifacts must move before the old profile's
  // cascading deletion, even when no incoming export contains those artifacts.
  await db.insert(schema.tinderExportRevisionTable).values({
    id: "private-revision",
    tinderProfileId: fresh.profile.tinderId,
    blobUrl: consentUpload.blobUrl,
    blobPathname: "private/retained/data.json",
    blobEtag: "fixture-etag",
    contentSha256: "a".repeat(64),
    contentLength: 1,
    swipestatsVersion: "SWIPESTATS_4",
  });
  await sql`INSERT INTO ai_output (id, user_id, kind, tinder_profile_id, model, input, output, share_key, created_at, updated_at) VALUES ('retained-ai', 'converted', 'profile_roast', ${fresh.profile.tinderId}, 'fixture', '{}', '{}', 'synthetic-share', now(), now())`;
  const replacement = await upload("converted", redacted);
  assert.equal(
    (
      await replaceTinderProfileRevision({
        ...replacement,
        tinderId: fresh.profile.tinderId,
        consentPhotos: false,
        consentWork: false,
      })
    ).profile.tinderId,
    fresh.profile.tinderId,
  );
  assert.equal(
    (await db.query.purchaseTable.findFirst({
      where: eq(schema.purchaseTable.id, "new-purchase"),
    }))!.tinderProfileId,
    fresh.profile.tinderId,
  );
  assert.equal(
    (
      await sql`SELECT tinder_profile_id FROM ai_output WHERE id = 'retained-ai'`
    )[0]!.tinder_profile_id,
    fresh.profile.tinderId,
  );
  await assertCommitted(replacement, fresh.profile.tinderId);
  await db.insert(schema.schoolTable).values({
    schoolId: "school",
    name: "Retained school",
    displayed: true,
    tinderProfileId: fresh.profile.tinderId,
  });
  const nextUpload = await upload("converted", next);
  const nextId = await target("converted", next);
  assert.equal(
    (
      await absorbProfileIntoNew({
        ...nextUpload,
        oldTinderId: fresh.profile.tinderId,
        newTinderId: nextId,
      })
    ).profile.tinderId,
    nextId,
  );
  assert.equal(
    (
      await sql`SELECT count(*)::int AS count FROM message WHERE tinder_profile_id = ${nextId}`
    )[0]!.count,
    1,
  );
  assert.equal(
    (await db.query.purchaseTable.findFirst({
      where: eq(schema.purchaseTable.id, "new-purchase"),
    }))!.tinderProfileId,
    nextId,
  );
  for (const table of ["tinder_export_revision", "school", "ai_output"]) {
    assert.equal(
      (
        await sql.unsafe(
          `SELECT count(*)::int AS count FROM "${table}" WHERE tinder_profile_id = $1`,
          [nextId],
        )
      )[0]!.count,
      table === "ai_output" ? 2 : 1,
      `${table} survives profile merge`,
    );
  }
  await assertCommitted(nextUpload, nextId);
  // Exercise actual router entry points and the former global-fingerprint block.
  await db.insert(schema.userTable).values([
    { id: "router-owner", isAnonymous: false },
    { id: "router-legacy", isAnonymous: false },
  ]);
  const contextInput = {
    tinderId: legacyUpload.verifiedTinderId,
    birthDate: data.User.birth_date,
    createDate: data.User.create_date,
  };
  assert.equal(
    (await caller(null).getUploadContext(contextInput)).scenario,
    "new_user",
  );
  const initialContext =
    await caller("router-owner").getUploadContext(contextInput);
  assert.equal(initialContext.scenario, "new_profile");
  assert.equal(initialContext.targetProfile, null);
  const foreignBefore = await profile(legacyUpload.verifiedTinderId);
  const routerUpload = await upload("router-owner");
  const request = {
    tinderId: routerUpload.verifiedTinderId,
    uploadId: routerUpload.transientUpload.id,
    blobUrl: routerUpload.blobUrl,
  };
  const routerCreated = await caller("router-owner").createProfile(request);
  assert.notEqual(routerCreated.tinderId, request.tinderId);
  assert.equal(routerCreated.tinderId, await target("router-owner"));
  assert.deepEqual(await profile(legacyUpload.verifiedTinderId), foreignBefore);
  const beforeRetry = await state();
  assert.equal(
    (await caller("router-owner").createProfile(request)).tinderId,
    routerCreated.tinderId,
  );
  assert.deepEqual(await state(), beforeRetry);
  assert.equal(
    (await caller("router-owner").getUploadContext(contextInput)).scenario,
    "same_tinderId",
  );

  const equivalent = structuredClone(data);
  equivalent.User.create_date = "2019-12-31T19:00:00-05:00";
  const aliasUpload = await upload("router-owner", equivalent);
  const aliasRequest = {
    tinderId: aliasUpload.verifiedTinderId,
    uploadId: aliasUpload.transientUpload.id,
    blobUrl: aliasUpload.blobUrl,
  };
  assert.equal(
    (await caller("router-owner").updateProfile(aliasRequest)).tinderId,
    routerCreated.tinderId,
  );
  assert.equal(
    (await caller("router-owner").mergeAccounts(aliasRequest)).tinderId,
    routerCreated.tinderId,
  );

  const mismatched = structuredClone(data);
  mismatched.User.birth_date = "1994-01-01T00:00:00.000Z";
  const mismatchUpload = await upload("router-owner", mismatched);
  const mismatchRequest = {
    tinderId: mismatchUpload.verifiedTinderId,
    uploadId: mismatchUpload.transientUpload.id,
    blobUrl: mismatchUpload.blobUrl,
  };
  const priorProfile = await profile(routerCreated.tinderId);
  await assert.rejects(
    caller("router-owner").updateProfile(mismatchRequest),
    /different Tinder account/,
  );
  await assert.rejects(
    caller("router-owner").mergeAccounts(mismatchRequest),
    /different birth date/,
  );
  assert.deepEqual(await profile(routerCreated.tinderId), priorProfile);

  const legacyRouterUpload = await upload("router-legacy");
  const legacyRouterResult = await caller("router-legacy").create({
    tinderId: legacyRouterUpload.verifiedTinderId,
    uploadId: legacyRouterUpload.transientUpload.id,
    blobUrl: legacyRouterUpload.blobUrl,
  });
  assert.ok("profile" in legacyRouterResult);
  assert.equal(
    legacyRouterResult.profile.tinderId,
    await target("router-legacy"),
  );
  assert.deepEqual(await profile(legacyUpload.verifiedTinderId), foreignBefore);
  // Authorized maintenance must understand scoped IDs and reject destructive
  // legacy merges before changing protected source history.
  const { POST: replay } =
    await import("@/app/api/admin/reprocess-from-blob/route");
  const replayResponse = await replay(
    new Request("http://localhost/api/admin/reprocess-from-blob", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "tinder",
        profileId: routerCreated.tinderId,
        userId: "router-owner",
        blobUrl: routerUpload.blobUrl,
      }),
    }),
  );
  assert.equal(replayResponse.status, 200);
  assert.equal(
    ((await replayResponse.json()) as { profileId: string }).profileId,
    routerCreated.tinderId,
  );
  const { POST: adminMerge } =
    await import("@/app/api/admin/merge-profiles/route");
  const beforeAdminMerge = await state();
  const mergeResponse = await adminMerge(
    new Request(
      `http://localhost/api/admin/merge-profiles?oldTinderId=${old.profile.tinderId}&newTinderId=${routerCreated.tinderId}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          oldTinderId: old.profile.tinderId,
          newTinderId: routerCreated.tinderId,
        }),
      },
    ),
  );
  assert.equal(mergeResponse.status, 409);
  assert.deepEqual(await state(), beforeAdminMerge);
  console.log(
    "PostgreSQL Tinder router, owner isolation, conversion, identity, consent, rollback, merge and archive regressions passed",
  );
} finally {
  globalThis.fetch = originalFetch;
  await sql.end();
}
