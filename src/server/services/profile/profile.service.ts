import { eq } from "drizzle-orm";

import type {
  AnonymizedTinderDataJSON,
  TinderPhoto,
} from "@/lib/interfaces/TinderDataJSON";
import type { PromptEntry } from "@/lib/interfaces/HingeDataJSON";
import { withTransaction, db } from "@/server/db";
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
  type HingePromptInsert,
  type MediaInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { computeProfileMeta } from "./meta.service";
import { createMessagesAndMatches } from "./messages.service";
import { transformTinderJsonToProfile } from "./transform.service";
import { createUsageRecords } from "./usage.service";

/**
 * Result type returned from Tinder profile creation/update operations
 * Contains the profile and metrics for analytics tracking
 */
export type TinderProfileResult = {
  profile: TinderProfile;
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
    await tx
      .update(tinderProfileTable)
      .set({ userId: newUserId })
      .where(eq(tinderProfileTable.tinderId, tinderId));

    console.log(`   ✓ Profile ownership transferred`);

    // Transfer original files for this profile
    // Note: We need to identify files by checking if they contain this tinderId
    // Since originalAnonymizedFileTable doesn't have a direct tinderId column,
    // we'll transfer all files from the old user to avoid orphaning data
    const originalFiles = await tx.query.originalAnonymizedFileTable.findMany({
      where: eq(originalAnonymizedFileTable.userId, oldUserId),
    });

    if (originalFiles.length > 0) {
      await tx
        .update(originalAnonymizedFileTable)
        .set({ userId: newUserId })
        .where(eq(originalAnonymizedFileTable.userId, oldUserId));

      console.log(`   ✓ Transferred ${originalFiles.length} original file(s)`);
    }

    // Check if old user has any remaining profiles
    const remainingProfiles = await tx.query.tinderProfileTable.findMany({
      where: eq(tinderProfileTable.userId, oldUserId),
    });

    // Clean up orphaned anonymous user if they have no other data
    if (remainingProfiles.length === 0) {
      await tx.delete(userTable).where(eq(userTable.id, oldUserId));
      console.log(`   ✓ Deleted orphaned anonymous user ${oldUserId}`);
    }
  });

  console.log(`✅ Profile ownership transfer complete`);
}

/**
 * Transform Tinder photos to database media insert format
 * Handles both old format (string URLs) and new format (TinderPhoto objects)
 */
export function transformTinderPhotosToMedia(
  photos: string[] | TinderPhoto[],
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
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  console.log(`\n🚀 Starting profile creation for ${data.tinderId}`);
  console.log(`   User ID: ${data.userId}`);
  console.log(`   Blob URL: ${data.blobUrl}`);
  console.log(`   Timezone: ${data.timezone ?? "not provided"}`);
  console.log(`   Country: ${data.country ?? "not provided"}`);

  // 1. Fetch JSON from blob storage
  const fetchStart = Date.now();
  console.log(`\n📥 [1/6] Fetching Tinder data from blob storage...`);
  const { fetchBlobJson } = await import("../blob.service");
  const anonymizedTinderJson = await fetchBlobJson<AnonymizedTinderDataJSON>(
    data.blobUrl,
  );
  console.log(`✅ Blob fetched in ${Date.now() - fetchStart}ms`);

  // Log JSON size
  const jsonString = JSON.stringify(anonymizedTinderJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
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
    // Insert original file reference (blob URL only - no raw JSON)
    const fileStart = Date.now();
    const fileId = createId("oaf");
    await tx.insert(originalAnonymizedFileTable).values({
      id: fileId,
      dataProvider: "TINDER",
      swipestatsVersion: "SWIPESTATS_4",
      file: null, // No longer storing raw JSON
      blobUrl: data.blobUrl,
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

    return profile!;
  });

  console.log(`\n✅ Transaction completed in ${Date.now() - txStart}ms`);

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

  return {
    profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: matchesInput.length,
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
    await tx
      .delete(tinderProfileTable)
      .where(eq(tinderProfileTable.tinderId, tinderId));
  });

  console.log(`✅ Profile reset complete: ${tinderId}\n`);
}

/**
 * Transform Hinge prompt entries to database insert format
 * Converts poll-type prompts with options arrays to comma-separated strings
 *
 * @param prompts - Array of prompt entries from Hinge data export
 * @param hingeProfileId - The Hinge profile ID to associate prompts with
 * @returns Array of prompt inserts ready for database insertion
 *
 * @example
 * const promptInserts = transformHingePromptsForDb(hingeData.Prompts, hingeProfileId);
 * await tx.insert(hingePromptTable).values(promptInserts);
 */
export function transformHingePromptsForDb(
  prompts: PromptEntry[],
  hingeProfileId: string,
): HingePromptInsert[] {
  return prompts.map((prompt) => ({
    id: createId("hpr"),
    type: prompt.type,
    prompt: prompt.prompt,
    answerText: prompt.text ?? null,
    answerOptions: prompt.options ? prompt.options.join(", ") : null,
    createdPromptAt: new Date(prompt.created),
    updatedPromptAt: new Date(prompt.user_updated),
    hingeProfileId: hingeProfileId,
  }));
}
