import { and, eq, sql } from "drizzle-orm";

import type { TinderPhotoData } from "@/lib/interfaces/TinderDataJSON";
import { withTransaction, db, type TransactionClient } from "@/server/db";
import {
  matchTable,
  mediaTable,
  messageTable,
  originalAnonymizedFileTable,
  profileMetaTable,
  tinderProfileTable,
  tinderUsageTable,
  userTable,
  type TinderProfile,
  type MediaInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { canDeleteClaimedAnonymousUser } from "./claim-ownership";
import { computeProfileMeta } from "./meta.service";
import { createMessagesAndMatches } from "./messages.service";
import { transformTinderJsonToProfile } from "./transform.service";
import { loadVerifiedAnonymizedTinderData } from "./validation.service";
import { createUsageRecords } from "./usage.service";
import {
  lockTinderProfileUploadInTx,
  lockTinderSwipeRankMutationsInTx,
  purgeTinderSwipeRankProfilesInTx,
  scheduleTinderSwipeRankRefresh,
  transferTinderSwipeRankOwnershipInTx,
} from "../swipe-rank/lifecycle.service";
import { invalidatePublicSwipeRankCache } from "../swipe-rank/public-cache";
import {
  cleanupCommittedTransientUpload,
  lockTransientUploadForMutationInTx,
  markTransientUploadCommittedInTx,
  type TransientUploadBinding,
} from "../transient-upload.service";

interface RemainingAnonymousUserDataRow extends Record<string, unknown> {
  has_remaining_data: boolean;
}

/**
 * Account/session rows are intentionally absent: those are authentication
 * internals that should cascade when an otherwise-empty anonymous user is
 * removed. Every product/provider ownership edge is checked so claiming one
 * Tinder profile cannot cascade unrelated anonymous-session data.
 */
async function hasRemainingAnonymousUserData(
  tx: TransactionClient,
  userId: string,
): Promise<boolean | undefined> {
  const result = await tx.execute<RemainingAnonymousUserDataRow>(sql`
    SELECT
      EXISTS (SELECT 1 FROM tinder_profile WHERE user_id = ${userId})
      OR EXISTS (SELECT 1 FROM hinge_profile WHERE user_id = ${userId})
      OR EXISTS (SELECT 1 FROM raya_profile WHERE user_id = ${userId})
      OR EXISTS (SELECT 1 FROM swipe_rank_profile WHERE user_id = ${userId})
      OR EXISTS (SELECT 1 FROM event WHERE user_id = ${userId})
      OR EXISTS (SELECT 1 FROM custom_data WHERE user_id = ${userId})
      OR EXISTS (
        SELECT 1 FROM original_anonymized_file WHERE user_id = ${userId}
      )
      OR EXISTS (SELECT 1 FROM purchase WHERE user_id = ${userId})
      OR EXISTS (SELECT 1 FROM post WHERE created_by_id = ${userId})
      OR EXISTS (SELECT 1 FROM attachment WHERE uploaded_by = ${userId})
      OR EXISTS (SELECT 1 FROM profile_comparison WHERE user_id = ${userId})
      OR EXISTS (
        SELECT 1 FROM profile_comparison_feedback WHERE author_id = ${userId}
      )
      OR EXISTS (SELECT 1 FROM ai_output WHERE user_id = ${userId})
      AS has_remaining_data
  `);

  return result.rows[0]?.has_remaining_data;
}

/**
 * Result type returned from Tinder profile creation/update operations
 * Contains the profile and metrics for analytics tracking
 */
export type TinderProfileResult = {
  profile: TinderProfile;
  /**
   * True when an additive re-upload added no new matches or messages — i.e. the
   * same export uploaded again. The router uses this to suppress the no-op
   * `tinder_profile_updated` event. Undefined for creates/merges (always real).
   */
  isNoOp?: boolean;
  metrics: {
    processingTimeMs: number;
    matchCount: number;
    messageCount: number;
    photoCount: number;
    usageDays: number;
    hasPhotos: boolean;
    jsonSizeMB: number;
  };
};

/**
 * Get a Tinder profile by tinderId
 */
export async function getTinderProfile(
  tinderId: string,
): Promise<TinderProfile | null> {
  const result = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
  });
  return result ?? null;
}

/**
 * Get a Tinder profile with user information by tinderId
 * Used to check ownership and anonymous status
 */
export async function getTinderProfileWithUser(tinderId: string): Promise<
  | (TinderProfile & {
      user: { id: string; isAnonymous: boolean | null } | null;
    })
  | null
> {
  const result = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    with: {
      user: {
        columns: {
          id: true,
          isAnonymous: true,
        },
      },
    },
  });
  return result ?? null;
}

/**
 * Transfer ownership of a Tinder profile from one user to another
 * This is used when an anonymous user's profile is claimed by another user
 * Only works if the old user is anonymous (safety check)
 */
export async function transferProfileOwnership(
  tinderId: string,
  oldUserId: string,
  newUserId: string,
): Promise<void> {
  console.log(`\n🔄 Transferring profile ownership: ${tinderId}`);
  console.log(`   From user: ${oldUserId}`);
  console.log(`   To user: ${newUserId}`);

  await withTransaction(async (tx) => {
    await lockTinderSwipeRankMutationsInTx(tx);
    await lockTinderProfileUploadInTx(tx, tinderId);
    // Verify old user is anonymous (safety check)
    const oldUser = await tx.query.userTable.findFirst({
      where: eq(userTable.id, oldUserId),
    });

    if (!oldUser?.isAnonymous) {
      throw new Error(
        `Cannot transfer profile: old user ${oldUserId} is not anonymous`,
      );
    }

    // Transfer profile ownership
    const transferredProfiles = await tx
      .update(tinderProfileTable)
      .set({ userId: newUserId })
      .where(
        and(
          eq(tinderProfileTable.tinderId, tinderId),
          eq(tinderProfileTable.userId, oldUserId),
        ),
      )
      .returning({ tinderId: tinderProfileTable.tinderId });

    if (transferredProfiles.length !== 1) {
      throw new Error(
        `Cannot transfer profile ${tinderId}: it is no longer owned by anonymous user ${oldUserId}`,
      );
    }

    await transferTinderSwipeRankOwnershipInTx(tx, {
      providerProfileId: tinderId,
      fromUserId: oldUserId,
      toUserId: newUserId,
    });

    console.log(`   ✓ Profile ownership transferred`);

    // The table has no profile ID, but the one-profile-per-provider invariant
    // lets us safely transfer this account's Tinder references. Never move
    // Hinge/Raya uploads when only the Tinder profile was claimed.
    const originalFiles = await tx.query.originalAnonymizedFileTable.findMany({
      where: and(
        eq(originalAnonymizedFileTable.userId, oldUserId),
        eq(originalAnonymizedFileTable.dataProvider, "TINDER"),
      ),
    });

    if (originalFiles.length > 0) {
      await tx
        .update(originalAnonymizedFileTable)
        .set({ userId: newUserId })
        .where(
          and(
            eq(originalAnonymizedFileTable.userId, oldUserId),
            eq(originalAnonymizedFileTable.dataProvider, "TINDER"),
          ),
        );

      console.log(`   ✓ Transferred ${originalFiles.length} original file(s)`);
    }

    // Clean up only a genuinely empty anonymous account. Checking every
    // product ownership edge prevents this user deletion from cascading a
    // Hinge/Raya upload, comparison, purchase, artifact, or other saved data.
    const hasRemainingData = await hasRemainingAnonymousUserData(tx, oldUserId);
    if (canDeleteClaimedAnonymousUser(hasRemainingData)) {
      await tx.delete(userTable).where(eq(userTable.id, oldUserId));
      console.log(`   ✓ Deleted orphaned anonymous user ${oldUserId}`);
    } else {
      console.log(
        `   ℹ Kept anonymous user ${oldUserId}; it still owns other data`,
      );
    }
  });

  invalidatePublicSwipeRankCache();
  // A claim can commit even if the subsequent additive upload fails. Refresh
  // ownership now; a successful additive update will schedule a second refresh
  // for the changed usage facts.
  scheduleTinderSwipeRankRefresh([tinderId]);
  console.log(`✅ Profile ownership transfer complete`);
}

/**
 * Transform Tinder photos to database media insert format
 * Handles both old format (string URLs) and allowlisted photo objects.
 */
export function transformTinderPhotosToMedia(
  photos: string[] | TinderPhotoData[],
  tinderProfileId: string,
): MediaInsert[] {
  if (!Array.isArray(photos) || photos.length === 0) {
    return [];
  }

  return photos.map((photo) => {
    if (typeof photo === "string") {
      // Old format: just URL strings
      return {
        id: createId("media"),
        type: "photo",
        url: photo,
        prompt: null,
        caption: null,
        fromSoMe: null,
        tinderProfileId,
        hingeProfileId: null,
      };
    } else {
      // New format: TinderPhoto objects with metadata
      return {
        id: createId("media"),
        type: photo.type || "photo",
        url: photo.url,
        prompt: photo.prompt_text || null,
        caption: null,
        fromSoMe: null,
        tinderProfileId,
        hingeProfileId: null,
      };
    }
  });
}

/**
 * Create a new Tinder profile from blob storage
 * This is the main orchestrator that coordinates all profile creation steps
 */
export async function createTinderProfile(data: {
  tinderId: string;
  blobUrl: string;
  userId: string;
  timezone?: string;
  country?: string;
  consentPhotos?: boolean;
  consentWork?: boolean;
  consumeBlob?: boolean;
  transientUpload?: TransientUploadBinding;
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  console.log(`\n🚀 Starting profile creation for ${data.tinderId}`);
  console.log(`   User ID: ${data.userId}`);
  console.log(`   Timezone: ${data.timezone ?? "not provided"}`);
  console.log(`   Country: ${data.country ?? "not provided"}`);

  // 1. Fetch JSON from blob storage
  const fetchStart = Date.now();
  console.log(`\n📥 [1/6] Fetching Tinder data from blob storage...`);
  const anonymizedTinderJson = await loadVerifiedAnonymizedTinderData(
    data.blobUrl,
    data.tinderId,
    {
      photos: data.consentPhotos ?? true,
      work: data.consentWork ?? true,
    },
    { consume: data.consumeBlob ?? false },
  );
  console.log(`✅ Blob fetched in ${Date.now() - fetchStart}ms`);

  // Log JSON size
  const jsonString = JSON.stringify(anonymizedTinderJson);
  const jsonSizeMB = (
    Buffer.byteLength(jsonString, "utf8") /
    1024 /
    1024
  ).toFixed(2);
  console.log(`   JSON size: ${jsonSizeMB} MB`);

  // 2. Transform JSON data to database format
  const transformStart = Date.now();
  console.log(`\n🔄 [2/6] Transforming profile data...`);
  const profileData = transformTinderJsonToProfile(anonymizedTinderJson, {
    tinderId: data.tinderId,
    userId: data.userId,
    timezone: data.timezone,
    country: data.country,
  });
  console.log(`✅ Profile transformed in ${Date.now() - transformStart}ms`);
  console.log(`   Gender: ${profileData.gender}`);
  console.log(`   Age: ${profileData.ageAtUpload}`);
  console.log(`   Location: ${profileData.city}, ${profileData.region}`);
  console.log(
    `   Period: ${profileData.firstDayOnApp.toISOString().split("T")[0]} to ${profileData.lastDayOnApp.toISOString().split("T")[0]} (${profileData.daysInProfilePeriod} days)`,
  );

  // 3. Create usage records
  const usageStart = Date.now();
  console.log(`\n📊 [3/6] Creating usage records...`);
  const userBirthDate = new Date(anonymizedTinderJson.User.birth_date);
  const usageData = createUsageRecords(
    anonymizedTinderJson,
    data.tinderId,
    userBirthDate,
  );
  console.log(
    `✅ Created ${usageData.length} usage records in ${Date.now() - usageStart}ms`,
  );

  // 4. Create messages and matches
  const messagesStart = Date.now();
  console.log(`\n💬 [4/6] Processing messages and matches...`);
  const result = createMessagesAndMatches(
    anonymizedTinderJson.Messages,
    data.tinderId,
  );
  const matchesInput = result.matchesInput;
  const messagesInput = result.messagesInput;
  console.log(`✅ Processed in ${Date.now() - messagesStart}ms`);
  console.log(`   Matches: ${matchesInput.length}`);
  console.log(`   Messages: ${messagesInput.length}`);

  // 5. Log photo count
  const photoCount = Array.isArray(anonymizedTinderJson.Photos)
    ? anonymizedTinderJson.Photos.length
    : 0;
  console.log(`\n📷 [5/6] Photos ready for insert: ${photoCount}`);

  // 6. Execute transaction to insert all data
  const txStart = Date.now();
  console.log(`\n💾 [6/6] Starting database transaction...`);
  const profile = await withTransaction(async (tx) => {
    await lockTransientUploadForMutationInTx(tx, data.transientUpload);
    await lockTinderSwipeRankMutationsInTx(tx);
    await lockTinderProfileUploadInTx(tx, data.tinderId);
    // Insert original file reference (blob URL only - no raw JSON)
    const fileStart = Date.now();
    const fileId = createId("oaf");
    await tx.insert(originalAnonymizedFileTable).values({
      id: fileId,
      dataProvider: "TINDER",
      swipestatsVersion: "SWIPESTATS_4",
      file: null, // No longer storing raw JSON
      blobUrl: null, // Verified upload blobs are transient and consumed.
      userId: data.userId,
    });
    console.log(
      `   ✓ Original file reference stored (${Date.now() - fileStart}ms, ID: ${fileId})`,
    );

    // Insert profile
    const profileStart = Date.now();
    const [profile] = await tx
      .insert(tinderProfileTable)
      .values(profileData)
      .returning();
    console.log(`   ✓ Profile inserted (${Date.now() - profileStart}ms)`);

    // Insert photos/media (respects consent - Photos will be empty array if filtered)
    const photosInput = transformTinderPhotosToMedia(
      anonymizedTinderJson.Photos,
      data.tinderId,
    );
    if (photosInput.length > 0) {
      const photosInsertStart = Date.now();
      await tx.insert(mediaTable).values(photosInput);
      console.log(
        `   ✓ ${photosInput.length} photos inserted (${Date.now() - photosInsertStart}ms)`,
      );
    } else {
      console.log(`   ✓ No photos to insert (user may not have consented)`);
    }

    // Bulk insert usage in batches (prevents timeout on large datasets)
    if (usageData.length > 0) {
      const usageInsertStart = Date.now();
      const BATCH_SIZE = 500; // Insert 500 records at a time

      for (let i = 0; i < usageData.length; i += BATCH_SIZE) {
        const batch = usageData.slice(i, i + BATCH_SIZE);
        await tx.insert(tinderUsageTable).values(batch);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(usageData.length / BATCH_SIZE);
        console.log(
          `   ✓ Batch ${batchNum}/${totalBatches}: ${batch.length} records inserted`,
        );
      }

      console.log(
        `   ✓ ${usageData.length} usage records inserted (${Date.now() - usageInsertStart}ms)`,
      );
    }

    // Bulk insert matches in batches
    if (matchesInput.length > 0) {
      const matchesInsertStart = Date.now();
      const BATCH_SIZE = 500;

      for (let i = 0; i < matchesInput.length; i += BATCH_SIZE) {
        const batch = matchesInput.slice(i, i + BATCH_SIZE);
        await tx.insert(matchTable).values(batch);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(matchesInput.length / BATCH_SIZE);
        console.log(
          `   ✓ Batch ${batchNum}/${totalBatches}: ${batch.length} matches inserted`,
        );
      }

      console.log(
        `   ✓ ${matchesInput.length} matches inserted (${Date.now() - matchesInsertStart}ms)`,
      );
    }

    // Bulk insert messages in batches
    if (messagesInput.length > 0) {
      const messagesInsertStart = Date.now();
      const BATCH_SIZE = 1000; // Messages can be batched more aggressively

      for (let i = 0; i < messagesInput.length; i += BATCH_SIZE) {
        const batch = messagesInput.slice(i, i + BATCH_SIZE);
        await tx.insert(messageTable).values(batch);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(messagesInput.length / BATCH_SIZE);
        console.log(
          `   ✓ Batch ${batchNum}/${totalBatches}: ${batch.length} messages inserted`,
        );
      }

      console.log(
        `   ✓ ${messagesInput.length} messages inserted (${Date.now() - messagesInsertStart}ms)`,
      );
    }

    // Fetch profile with all related data for meta computation
    const fetchStart = Date.now();
    console.log(`\n📊 Computing profile metadata...`);
    const fullProfile = await tx.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, data.tinderId),
      with: {
        usage: true,
        matches: {
          with: {
            messages: true,
          },
        },
      },
    });
    console.log(
      `   ✓ Profile fetched with relations (${Date.now() - fetchStart}ms)`,
    );

    if (!fullProfile) {
      throw new Error(
        `Failed to fetch profile after creation: ${data.tinderId}`,
      );
    }

    // Compute and insert profile meta (simplified schema)
    const metaComputeStart = Date.now();
    const profileMeta = computeProfileMeta(fullProfile);
    console.log(`   ✓ Metadata computed (${Date.now() - metaComputeStart}ms)`);

    const metaInsertStart = Date.now();
    await tx.insert(profileMetaTable).values({
      ...profileMeta,
      id: createId("pmeta"),
      tinderProfileId: data.tinderId,
      hingeProfileId: null,
    });
    console.log(
      `   ✓ Profile meta inserted (${Date.now() - metaInsertStart}ms)`,
    );

    await markTransientUploadCommittedInTx(
      tx,
      data.transientUpload,
      data.tinderId,
    );
    return profile!;
  });

  console.log(`\n✅ Transaction completed in ${Date.now() - txStart}ms`);

  // The source transaction is already committed. Ranking is deliberately
  // deferred and internally guarded so it can never turn a successful upload
  // into a reported failure.
  scheduleTinderSwipeRankRefresh([data.tinderId]);
  await cleanupCommittedTransientUpload(data.transientUpload?.id);

  // Compute metrics for analytics
  const totalTime = Date.now() - startTime;
  const photosInput = transformTinderPhotosToMedia(
    anonymizedTinderJson.Photos,
    data.tinderId,
  );

  console.log(`\n🎉 Profile creation complete for ${data.tinderId}`);
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`,
  );
  console.log(`────────────────────────────────────────\n`);

  // Use Usage.matches (daily aggregates) for match count — this is the
  // authoritative source. Messages.length only counts conversation records,
  // which can be 0 even when the user has matches (e.g. unmatched before messaging).
  const usageMatchTotal = Object.values(
    anonymizedTinderJson.Usage.matches ?? {},
  ).reduce((sum, v) => sum + v, 0);

  return {
    profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: usageMatchTotal,
      messageCount: messagesInput.length,
      photoCount: photosInput.length,
      usageDays: usageData.length,
      hasPhotos: photosInput.length > 0,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Admin function to completely reset/delete a Tinder profile
 * Removes all profile data including usage, matches, messages, photos, and metadata
 * Useful for testing or when user explicitly wants a clean slate
 *
 * @param tinderId - The Tinder profile ID to reset
 */
export async function resetTinderProfile(tinderId: string): Promise<void> {
  console.log(`\n🗑️  Resetting profile: ${tinderId}`);

  await withTransaction(async (tx) => {
    await lockTinderSwipeRankMutationsInTx(tx);
    await lockTinderProfileUploadInTx(tx, tinderId);
    // Delete in order: messages → matches → usage → media → profileMeta → profile
    // messages first because they have onDelete: "restrict" on matchId
    await tx
      .delete(messageTable)
      .where(eq(messageTable.tinderProfileId, tinderId));
    await tx.delete(matchTable).where(eq(matchTable.tinderProfileId, tinderId));
    await tx
      .delete(tinderUsageTable)
      .where(eq(tinderUsageTable.tinderProfileId, tinderId));
    await tx.delete(mediaTable).where(eq(mediaTable.tinderProfileId, tinderId));
    await tx
      .delete(profileMetaTable)
      .where(eq(profileMetaTable.tinderProfileId, tinderId));
    await purgeTinderSwipeRankProfilesInTx(tx, [tinderId]);
    // The stats roast (ai_output.tinderProfileId FK, onDelete cascade) goes when
    // the profile row below is deleted — no explicit delete needed.
    await tx
      .delete(tinderProfileTable)
      .where(eq(tinderProfileTable.tinderId, tinderId));
  });

  invalidatePublicSwipeRankCache();
  console.log(`✅ Profile reset complete: ${tinderId}\n`);
}
