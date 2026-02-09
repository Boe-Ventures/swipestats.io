import { eq, sql } from "drizzle-orm";

import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { withTransaction, type TransactionClient } from "@/server/db";
import {
  matchTable,
  mediaTable,
  messageTable,
  originalAnonymizedFileTable,
  profileMetaTable,
  tinderProfileTable,
  tinderUsageTable,
  customDataTable,
  type MatchInsert,
  type MessageInsert,
  type TinderUsageInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { computeProfileMeta } from "./meta.service";
import { createMessagesAndMatches } from "./messages.service";
import { transformTinderJsonToProfile } from "./transform.service";
import { createUsageRecords } from "./usage.service";
import {
  type TinderProfileResult,
  transformTinderPhotosToMedia,
} from "./profile.service";

/**
 * Helper: Upsert usage records in transaction
 * Newer exports always have the most complete data - just overwrite on conflict
 * Returns the count of records processed
 */
async function upsertUsageRecordsInTx(
  tx: TransactionClient,
  tinderId: string,
  newUsage: TinderUsageInsert[],
): Promise<number> {
  if (newUsage.length === 0) {
    return 0;
  }

  let usageInserted = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < newUsage.length; i += BATCH_SIZE) {
    const batch = newUsage.slice(i, i + BATCH_SIZE);
    await tx
      .insert(tinderUsageTable)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          tinderUsageTable.dateStampRaw,
          tinderUsageTable.tinderProfileId,
        ],
        set: {
          // Newer export has most complete data - just overwrite
          appOpens: sql`excluded.app_opens`,
          swipeLikes: sql`excluded.swipe_likes`,
          swipePasses: sql`excluded.swipe_passes`,
          swipeSuperLikes: sql`excluded.swipe_super_likes`,
          matches: sql`excluded.matches`,
          messagesSent: sql`excluded.messages_sent`,
          messagesReceived: sql`excluded.messages_received`,
          swipesCombined: sql`excluded.swipes_combined`,
          matchRate: sql`excluded.match_rate`,
          likeRate: sql`excluded.like_rate`,
          messagesSentRate: sql`excluded.messages_sent_rate`,
          responseRate: sql`excluded.response_rate`,
          engagementRate: sql`excluded.engagement_rate`,
          userAgeThisDay: sql`excluded.user_age_this_day`,
        },
      });
    usageInserted += batch.length;
  }

  return usageInserted;
}

/**
 * Helper: Recompute profile meta in transaction
 * Fetches profile with relations, computes meta, and inserts/updates
 */
async function recomputeProfileMetaInTx(
  tx: TransactionClient,
  tinderId: string,
): Promise<void> {
  // Delete old profile meta
  await tx
    .delete(profileMetaTable)
    .where(eq(profileMetaTable.tinderProfileId, tinderId));

  // Fetch profile with all relations
  const fullProfile = await tx.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    with: {
      usage: true,
      matches: {
        with: {
          messages: true,
        },
      },
    },
  });

  if (!fullProfile) {
    throw new Error(
      `Failed to fetch profile for meta computation: ${tinderId}`,
    );
  }

  // Compute and insert new meta
  const profileMeta = computeProfileMeta(fullProfile);
  await tx.insert(profileMetaTable).values({
    ...profileMeta,
    id: createId("pmeta"),
    tinderProfileId: tinderId,
    hingeProfileId: null,
  });
}

/**
 * Cross-account merge: Absorb old profile's data into new profile
 * Used when user uploads JSON with different tinderId than existing profile
 *
 * Flow:
 * 1. Fetch old profile
 * 2. Temporarily set old profile's userId to NULL (frees unique constraint)
 * 3. Transform and prepare new profile data
 * 4. Insert new profile with combined date range (userId is now free!)
 * 5. Transfer all usage/matches/messages from old → new profile ID
 * 6. Delete old profile
 * 7. Upsert new usage data
 * 8. Insert new matches/messages
 * 9. Insert photos
 * 10. Recompute profile meta
 * 11. Store original file reference
 */
export async function absorbProfileIntoNew(data: {
  oldTinderId: string;
  newTinderId: string;
  blobUrl: string;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  // Fetch JSON from blob storage
  const { fetchBlobJson } = await import("../blob.service");
  const anonymizedTinderJson = await fetchBlobJson<AnonymizedTinderDataJSON>(
    data.blobUrl,
  );

  console.log(
    `\n🔄 Cross-account merge: ${data.oldTinderId} → ${data.newTinderId}`,
  );
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(anonymizedTinderJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
  console.log(`   JSON size: ${jsonSizeMB} MB`);

  const profile = await withTransaction(async (tx) => {
    // 1. Get old profile to compute combined date range
    const fetchOldStart = Date.now();
    const oldProfile = await tx.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, data.oldTinderId),
    });

    if (!oldProfile) {
      throw new Error(`Old profile not found: ${data.oldTinderId}`);
    }
    console.log(`   ✓ Fetched old profile (${Date.now() - fetchOldStart}ms)`);
    console.log(
      `   Old profile range: ${oldProfile.firstDayOnApp.toISOString().split("T")[0]} → ${oldProfile.lastDayOnApp.toISOString().split("T")[0]}`,
    );

    // 2. Temporarily clear userId on old profile to free unique constraint
    const unlinkStart = Date.now();
    await tx
      .update(tinderProfileTable)
      .set({ userId: null })
      .where(eq(tinderProfileTable.tinderId, data.oldTinderId));
    console.log(
      `   ✓ Unlinked old profile from user (${Date.now() - unlinkStart}ms)`,
    );

    // 3. Transform and prepare new profile data
    const transformStart = Date.now();
    const userBirthDate = new Date(anonymizedTinderJson.User.birth_date);
    const newProfileData = transformTinderJsonToProfile(anonymizedTinderJson, {
      tinderId: data.newTinderId,
      userId: data.userId,
      timezone: data.timezone,
      country: data.country,
    });
    console.log(`   ✓ Profile transformed (${Date.now() - transformStart}ms)`);
    console.log(
      `   New profile range: ${newProfileData.firstDayOnApp.toISOString().split("T")[0]} → ${newProfileData.lastDayOnApp.toISOString().split("T")[0]}`,
    );

    // Validate no overlap in date ranges
    // Old account should end before new account starts
    if (oldProfile.lastDayOnApp >= newProfileData.firstDayOnApp) {
      const overlapDays = Math.floor(
        (oldProfile.lastDayOnApp.getTime() -
          newProfileData.firstDayOnApp.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      throw new Error(
        `Date range overlap detected: Old account ends ${oldProfile.lastDayOnApp.toISOString().split("T")[0]}, ` +
          `new account starts ${newProfileData.firstDayOnApp.toISOString().split("T")[0]} ` +
          `(${overlapDays + 1} days overlap). Cross-account merges require sequential, non-overlapping date ranges.`,
      );
    }

    // Compute combined date range
    const combinedFirstDay =
      oldProfile.firstDayOnApp < newProfileData.firstDayOnApp
        ? oldProfile.firstDayOnApp
        : newProfileData.firstDayOnApp;

    const combinedLastDay =
      oldProfile.lastDayOnApp > newProfileData.lastDayOnApp
        ? oldProfile.lastDayOnApp
        : newProfileData.lastDayOnApp;

    const combinedDaysInPeriod =
      Math.floor(
        (combinedLastDay.getTime() - combinedFirstDay.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    console.log(`   ✓ Date ranges validated (no overlap)`);
    console.log(
      `   Combined date range: ${combinedFirstDay.toISOString().split("T")[0]} → ${combinedLastDay.toISOString().split("T")[0]} (${combinedDaysInPeriod} days)`,
    );

    // 4. Insert new profile with combined date range (userId is now free!)
    const profileStart = Date.now();
    const [insertedProfile] = await tx
      .insert(tinderProfileTable)
      .values({
        ...newProfileData,
        firstDayOnApp: combinedFirstDay,
        lastDayOnApp: combinedLastDay,
        daysInProfilePeriod: combinedDaysInPeriod,
      })
      .returning();
    console.log(`   ✓ New profile inserted (${Date.now() - profileStart}ms)`);

    // 5. Transfer all data from old → new profile ID
    const transferStart = Date.now();
    await tx
      .update(tinderUsageTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(tinderUsageTable.tinderProfileId, data.oldTinderId));

    await tx
      .update(matchTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(matchTable.tinderProfileId, data.oldTinderId));

    await tx
      .update(messageTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(messageTable.tinderProfileId, data.oldTinderId));

    await tx
      .update(mediaTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(mediaTable.tinderProfileId, data.oldTinderId));

    await tx
      .update(customDataTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(customDataTable.tinderProfileId, data.oldTinderId));

    console.log(
      `   ✓ Transferred all data to new profile (${Date.now() - transferStart}ms)`,
    );

    // 6. Delete old profile (cascade will handle profileMeta, jobs, schools)
    const deleteStart = Date.now();
    await tx
      .delete(tinderProfileTable)
      .where(eq(tinderProfileTable.tinderId, data.oldTinderId));
    console.log(`   ✓ Deleted old profile (${Date.now() - deleteStart}ms)`);

    // 7. Upsert new usage records (may overlap with transferred data)
    const usageStart = Date.now();
    const newUsage = createUsageRecords(
      anonymizedTinderJson,
      data.newTinderId,
      userBirthDate,
    );
    const usageInserted = await upsertUsageRecordsInTx(
      tx,
      data.newTinderId,
      newUsage,
    );
    console.log(
      `   ✓ Usage upserted: ${usageInserted} records (${Date.now() - usageStart}ms)`,
    );

    // 8. Insert new matches + messages (NO dedup - different accounts have different match semantics)
    // tinderMatchId "1" in account A is a different person than tinderMatchId "1" in account B
    const matchStart = Date.now();
    const { matchesInput, messagesInput } = createMessagesAndMatches(
      anonymizedTinderJson.Messages,
      data.newTinderId,
    );

    if (matchesInput.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < matchesInput.length; i += BATCH_SIZE) {
        const batch = matchesInput.slice(i, i + BATCH_SIZE);
        await tx.insert(matchTable).values(batch);
      }
      console.log(
        `   ✓ ${matchesInput.length} new matches inserted (${Date.now() - matchStart}ms)`,
      );
    }

    if (messagesInput.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < messagesInput.length; i += BATCH_SIZE) {
        const batch = messagesInput.slice(i, i + BATCH_SIZE);
        await tx.insert(messageTable).values(batch);
      }
      console.log(`   ✓ ${messagesInput.length} new messages inserted`);
    }

    // 9. Insert photos
    const photosStart = Date.now();
    const photosInput = transformTinderPhotosToMedia(
      anonymizedTinderJson.Photos,
      data.newTinderId,
    );
    if (photosInput.length > 0) {
      await tx.insert(mediaTable).values(photosInput);
      console.log(
        `   ✓ ${photosInput.length} photos inserted (${Date.now() - photosStart}ms)`,
      );
    }

    // 10. Recompute profile meta with all combined data
    const metaStart = Date.now();
    await recomputeProfileMetaInTx(tx, data.newTinderId);
    console.log(`   ✓ Profile meta computed (${Date.now() - metaStart}ms)`);

    // 11. Store original file reference
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "TINDER",
      swipestatsVersion: "SWIPESTATS_4",
      file: null, // No longer storing raw JSON
      blobUrl: data.blobUrl,
      userId: data.userId,
    });

    if (!insertedProfile) {
      throw new Error(`Failed to insert profile: ${data.newTinderId}`);
    }

    return {
      profile: insertedProfile,
      messageCount: messagesInput.length,
      photoCount: photosInput.length,
      usageDays: newUsage.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(
    `\n✅ Cross-account merge complete: ${data.oldTinderId} → ${data.newTinderId}`,
  );
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  const usageMatchTotal = Object.values(
    anonymizedTinderJson.Usage.matches,
  ).reduce((sum, v) => sum + v, 0);

  return {
    profile: profile.profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: usageMatchTotal,
      messageCount: profile.messageCount,
      photoCount: profile.photoCount,
      usageDays: profile.usageDays,
      hasPhotos: profile.photoCount > 0,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Same-account additive: Merge new data into existing profile
 * Used when user uploads newer export of same tinderId
 *
 * Flow:
 * 1. Update profile metadata
 * 2. Upsert usage records (newer export always has most complete data)
 * 3. Insert only NEW matches (matches are frozen in time)
 * 4. Recompute profile meta
 */
export async function additiveUpdateProfile(data: {
  tinderId: string;
  blobUrl: string;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  // Fetch JSON from blob storage
  const { fetchBlobJson } = await import("../blob.service");
  const anonymizedTinderJson = await fetchBlobJson<AnonymizedTinderDataJSON>(
    data.blobUrl,
  );

  console.log(`\n📊 Additive update for profile: ${data.tinderId}`);
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(anonymizedTinderJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);

  const profile = await withTransaction(async (tx) => {
    // 1. Update profile metadata (bio, settings, etc.)
    const transformStart = Date.now();
    const profileData = transformTinderJsonToProfile(anonymizedTinderJson, {
      tinderId: data.tinderId,
      userId: data.userId,
      timezone: data.timezone,
      country: data.country,
    });
    console.log(
      `   ✓ Profile data transformed (${Date.now() - transformStart}ms)`,
    );

    const updateStart = Date.now();
    const [updatedProfile] = await tx
      .update(tinderProfileTable)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(tinderProfileTable.tinderId, data.tinderId))
      .returning();
    console.log(
      `   ✓ Profile metadata updated (${Date.now() - updateStart}ms)`,
    );

    // 2. Upsert usage records (newer export always has most complete data)
    const usageStart = Date.now();
    const userBirthDate = new Date(anonymizedTinderJson.User.birth_date);
    const newUsage = createUsageRecords(
      anonymizedTinderJson,
      data.tinderId,
      userBirthDate,
    );
    const usageInserted = await upsertUsageRecordsInTx(
      tx,
      data.tinderId,
      newUsage,
    );
    console.log(
      `   ✓ Usage upserted: ${usageInserted} records (${Date.now() - usageStart}ms)`,
    );

    // 3. Get existing matches and filter to only insert NEW matches
    const matchStart = Date.now();
    const { matchesInput, messagesInput } = createMessagesAndMatches(
      anonymizedTinderJson.Messages,
      data.tinderId,
    );

    // Fetch existing tinderMatchIds
    const existingMatches = await tx.query.matchTable.findMany({
      where: eq(matchTable.tinderProfileId, data.tinderId),
      columns: { tinderMatchId: true },
    });
    const existingTinderMatchIds = new Set(
      existingMatches
        .map((m) => m.tinderMatchId)
        .filter((id): id is string => id !== null),
    );

    // Filter to only new matches (matches are frozen in time - never updated)
    const { matchesToInsert, messagesToInsert } = filterNewMatches(
      existingTinderMatchIds,
      matchesInput,
      messagesInput,
    );

    // Insert new matches in batches
    if (matchesToInsert.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < matchesToInsert.length; i += BATCH_SIZE) {
        const batch = matchesToInsert.slice(i, i + BATCH_SIZE);
        await tx.insert(matchTable).values(batch);
      }
    }

    // Insert new messages in batches
    if (messagesToInsert.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
        const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
        await tx.insert(messageTable).values(batch);
      }
    }

    console.log(
      `   ✓ Matches merged: ${matchesToInsert.length} new matches, ${messagesToInsert.length} messages (${Date.now() - matchStart}ms)`,
    );

    // Check if this was an idempotent update (no new data)
    if (matchesToInsert.length === 0 && messagesToInsert.length === 0) {
      console.log(
        `   ℹ️  No new data detected - upload was idempotent (same file re-uploaded)`,
      );
    }

    // 4. Recompute profile meta
    const metaStart = Date.now();
    await recomputeProfileMetaInTx(tx, data.tinderId);
    console.log(`   ✓ Profile meta recomputed (${Date.now() - metaStart}ms)`);

    // 5. Store original file reference
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "TINDER",
      swipestatsVersion: "SWIPESTATS_4",
      file: null, // No longer storing raw JSON
      blobUrl: data.blobUrl,
      userId: data.userId,
    });

    if (!updatedProfile) {
      throw new Error(`Failed to update profile: ${data.tinderId}`);
    }

    return {
      profile: updatedProfile,
      messageCount: messagesToInsert.length,
      usageDays: newUsage.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(`\n✅ Additive update complete for ${data.tinderId}`);
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  const usageMatchTotal = Object.values(
    anonymizedTinderJson.Usage.matches,
  ).reduce((sum, v) => sum + v, 0);

  return {
    profile: profile.profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: usageMatchTotal,
      messageCount: profile.messageCount,
      photoCount: 0, // Additive updates don't add photos
      usageDays: profile.usageDays,
      hasPhotos: false, // Not tracked in additive updates
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Pure utility: Filter out matches that already exist
 * Matches are frozen in time - we only add NEW matches, never update existing ones
 * Returns only the matches (and their messages) that don't exist yet
 */
function filterNewMatches(
  existingTinderMatchIds: Set<string>,
  newMatches: MatchInsert[],
  newMessages: MessageInsert[],
): {
  matchesToInsert: MatchInsert[];
  messagesToInsert: MessageInsert[];
} {
  // Group messages by their match's ID for quick lookup
  const messagesByMatchId = new Map<string, MessageInsert[]>();
  for (const message of newMessages) {
    const messages = messagesByMatchId.get(message.matchId) || [];
    messages.push(message);
    messagesByMatchId.set(message.matchId, messages);
  }

  const matchesToInsert: MatchInsert[] = [];
  const messagesToInsert: MessageInsert[] = [];

  for (const match of newMatches) {
    // Skip if this match already exists (by tinderMatchId)
    if (
      match.tinderMatchId &&
      existingTinderMatchIds.has(match.tinderMatchId)
    ) {
      continue;
    }

    // New match - include it and all its messages
    matchesToInsert.push(match);
    const matchMessages = messagesByMatchId.get(match.id) || [];
    messagesToInsert.push(...matchMessages);
  }

  return { matchesToInsert, messagesToInsert };
}
