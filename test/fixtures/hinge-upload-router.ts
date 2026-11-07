// Run in a subprocess so router module mocks cannot affect other test files.
import "../setup";
import assert from "node:assert/strict";
import { mock } from "bun:test";
import { initTRPC } from "@trpc/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { deriveHingeProfileId } from "@/lib/upload/hinge-profile-id";
import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import type { TransientUploadBinding } from "@/server/services/transient-upload.service";

type Profile = {
  hingeId: string;
  userId: string;
  createDate: Date;
  birthDate: Date;
};
const profiles = new Map<string, Profile>();
const writes: { operation: string; hingeId: string; userId: string }[] = [];
const blobs = new Map<string, unknown>();
const leases = new Map<
  string,
  TransientUploadBinding & { resultProfileId?: string }
>();
const fakeDb = {
  query: {
    hingeProfileTable: {
      findFirst: async ({ where }: { where: SQL }) => {
        const query = new PgDialect().sqlToQuery(where);
        if (query.sql.includes('"userId"')) {
          return [...profiles.values()].find(
            (p) => p.userId === query.params[0],
          );
        }
        assert.match(query.sql, /"hingeId" = \$1/);
        return profiles.get(String(query.params[0]));
      },
    },
  },
};
const t = initTRPC
  .context<{
    db: typeof fakeDb;
    session: { user: { id: string }; session: { id: string } } | null;
    headers: Headers;
  }>()
  .create();
await mock.module("@/server/api/trpc", () => ({
  publicProcedure: t.procedure,
}));
await mock.module("@/server/services/blob.service", () => ({
  fetchBlobJson: async (url: string) => {
    assert.ok(blobs.has(url), "retry must not refetch a cleaned blob");
    return blobs.get(url);
  },
}));
await mock.module("@/server/services/user/location.service", () => ({
  uploadLocation: () => ({}),
  captureUploadLocation: async () => undefined,
}));
await mock.module("@/server/services/analytics.service", () => ({
  trackServerEvent: () => undefined,
}));
await mock.module("@/server/clients/posthog.client", () => ({
  captureException: async () => undefined,
}));
await mock.module("@/server/services/hinge/hinge-comparison.service", () => ({
  getHingeComparisonProfile: async () => null,
}));
await mock.module("@/server/services/transient-upload.service", () => ({
  registerTransientUploadForProcessing: async (
    binding: TransientUploadBinding,
  ) => {
    const lease = leases.get(binding.id);
    assert.ok(lease);
    for (const key of Object.keys(
      binding,
    ) as (keyof TransientUploadBinding)[]) {
      assert.equal(binding[key], lease[key]);
    }
    return {
      ...lease,
      status: lease.resultProfileId ? "COMMITTED" : "PROCESSING",
    };
  },
  cleanupCommittedTransientUpload: async (id: string) => {
    const lease = leases.get(id);
    assert.ok(lease);
    blobs.delete(lease.blobUrl);
  },
}));
type Upload = {
  hingeId: string;
  userId: string;
  verifiedJson: AnonymizedHingeDataJSON;
  transientUpload: TransientUploadBinding;
};
function save(operation: string, input: Upload) {
  const existing = profiles.get(input.hingeId);
  if (operation === "create") assert.equal(existing, undefined);
  else assert.equal(existing?.userId, input.userId);
  const profile = {
    hingeId: input.hingeId,
    userId: input.userId,
    createDate: new Date(input.verifiedJson.User.account.signup_time),
    birthDate: new Date("1990-01-01"),
  };
  profiles.set(profile.hingeId, profile);
  writes.push({ operation, hingeId: profile.hingeId, userId: profile.userId });
  const lease = leases.get(input.transientUpload.id)!;
  lease.resultProfileId = profile.hingeId;
  return { profile, metrics: {} };
}
await mock.module("@/server/services/hinge/hinge.service", () => ({
  createHingeProfile: async (input: Upload) => save("create", input),
  getHingeProfileWithUser: async (id: string) => profiles.get(id),
}));
await mock.module("@/server/services/hinge/hinge-additive.service", () => ({
  additiveUpdateHingeProfile: async (input: Upload) => save("update", input),
  absorbHingeProfileIntoNew: async (
    input: Upload & { oldHingeId: string; newHingeId: string },
  ) => {
    assert.equal(profiles.get(input.oldHingeId)?.userId, input.userId);
    const result = save("create", { ...input, hingeId: input.newHingeId });
    profiles.delete(input.oldHingeId);
    return result;
  },
}));
const { hingeProfileRouter } =
  await import("@/server/api/routers/hingeProfileRouter");
const router = t.router(hingeProfileRouter);
const caller = (userId: string | null) =>
  router.createCaller({
    db: fakeDb,
    headers: new Headers(),
    session: userId
      ? { user: { id: userId }, session: { id: `session-${userId}` } }
      : null,
  });
const signupTime = "2020-01-01T00:00:00.000Z";
const legacyId = await deriveHingeProfileId(signupTime);
const original = {
  hingeId: legacyId,
  userId: "old-guest",
  createDate: new Date(signupTime),
  birthDate: new Date("1990-01-01"),
};
profiles.set(legacyId, original);
async function upload(userId: string, signup = signupTime) {
  const uploadId = crypto.randomUUID();
  const blobUrl = `https://test.example/${uploadId}.json`;
  const hingeId = await deriveHingeProfileId(signup);
  blobs.set(blobUrl, {
    User: {
      preferences: {},
      identity: {},
      account: { signup_time: signup, last_seen: "2026-01-01T00:00:00.000Z" },
      installs: [],
      profile: { age: 30 },
    },
    Matches: [],
    Prompts: [],
  });
  leases.set(uploadId, {
    id: uploadId,
    userId,
    sessionId: `session-${userId}`,
    profileId: hingeId,
    blobUrl,
    dataProvider: "HINGE",
  });
  return {
    uploadId,
    blobUrl,
    hingeId,
    consentPhotos: false,
    consentWork: false,
  };
}
const contextInput = { hingeId: legacyId, signupTime };
assert.equal(
  (await caller(null).getUploadContext(contextInput)).scenario,
  "new_user",
);
assert.equal(
  (await caller("registered").getUploadContext(contextInput)).scenario,
  "new_profile",
);
assert.equal(
  (await caller("registered").getUploadContext(contextInput)).targetProfile,
  null,
);
await assert.rejects(
  caller(null).createProfile(await upload("registered")),
  /Session required/,
);

// An abandoned guest or unrelated export with the same timestamp cannot block
// a fresh import, and its stored rows must never become the write destination.
const request = await upload("registered");
const first = await caller("registered").createProfile(request);
const second = await caller("another-person").create(
  await upload("another-person"),
);
assert.notEqual(first.hingeId, legacyId);
assert.notEqual(second.hingeId, first.hingeId);
assert.deepEqual(profiles.get(legacyId), original);
assert.equal(writes.filter((w) => w.hingeId === legacyId).length, 0);
assert.equal(
  (await caller("registered").getUploadContext(contextInput)).scenario,
  "same_hingeId",
);
assert.deepEqual(
  await caller("registered").updateProfile(await upload("registered")),
  first,
);
assert.deepEqual(
  await caller("registered").createProfile(await upload("registered")),
  first,
);
// The ledger keeps the transport ID and stored result ID separate on retry.
blobs.delete(request.blobUrl);
const beforeRetry = writes.length;
assert.deepEqual(await caller("registered").createProfile(request), first);
assert.equal(writes.length, beforeRetry);

// Preserve both legacy links and v3 links when the authenticated guest is
// converted to a registered owner. Account transfer itself is tested separately.
assert.equal(
  (await caller("old-guest").update(await upload("old-guest"))).hingeId,
  legacyId,
);
profiles.get(second.hingeId)!.userId = "converted";
assert.equal(
  (await caller("converted").updateProfile(await upload("converted"))).hingeId,
  second.hingeId,
);
assert.equal(
  (await caller("converted").getUploadContext(contextInput)).scenario,
  "same_hingeId",
);

const beforeInvalid = writes.length;
const forged = await upload("registered");
const lease = leases.get(forged.uploadId)!;
forged.hingeId = "f".repeat(64);
lease.profileId = forged.hingeId;
await assert.rejects(
  caller("registered").createProfile(forged),
  /does not match/,
);
await assert.rejects(
  caller("unrelated").updateProfile(await upload("unrelated")),
  /Profile not found/,
);
await assert.rejects(
  caller("registered").updateProfile(
    await upload("registered", "2021-01-01T00:00:00.000Z"),
  ),
  /different Hinge account/,
);
await assert.rejects(
  caller("registered").mergeAccounts(
    await upload("registered", "2019-01-01T00:00:00.000Z"),
  ),
  /older Hinge account/,
);
assert.equal(writes.length, beforeInvalid);

// Forward account merges also choose an owner-scoped destination even if a
// different user already imported that signup timestamp under a legacy ID.
const nextSignup = "2021-01-01T00:00:00.000Z";
const occupiedId = await deriveHingeProfileId(nextSignup);
const occupied = {
  ...original,
  hingeId: occupiedId,
  userId: "foreign-owner",
  createDate: new Date(nextSignup),
};
profiles.set(occupiedId, occupied);
const merged = await caller("registered").mergeAccounts(
  await upload("registered", nextSignup),
);
assert.notEqual(merged.hingeId, occupiedId);
assert.deepEqual(profiles.get(occupiedId), occupied);
assert.equal(profiles.get(first.hingeId), undefined);
assert.equal(
  (
    await caller("registered").updateProfile(
      await upload("registered", nextSignup),
    )
  ).hingeId,
  merged.hingeId,
);
// Maintenance must continue to accept stored IDs, including a v3 ID whose
// original guest owner has changed, while rejecting a different export/owner.
const { fetchVerifiedHingeProfileBlob } =
  await import("@/server/services/hinge/hinge-blob.service");
const maintenanceUpload = await upload("converted");
const maintenanceTarget = {
  hingeId: second.hingeId,
  userId: "converted",
  existingProfile: profiles.get(second.hingeId),
};
await fetchVerifiedHingeProfileBlob(
  maintenanceUpload.blobUrl,
  maintenanceTarget,
);
await assert.rejects(
  fetchVerifiedHingeProfileBlob(maintenanceUpload.blobUrl, {
    ...maintenanceTarget,
    userId: "foreign",
  }),
  /another user's Hinge profile/,
);
const wrongMaintenanceUpload = await upload("converted", nextSignup);
await assert.rejects(
  fetchVerifiedHingeProfileBlob(
    wrongMaintenanceUpload.blobUrl,
    maintenanceTarget,
  ),
  /does not match/,
);
console.log("Hinge upload router ownership regressions passed");
