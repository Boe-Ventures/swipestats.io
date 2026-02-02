import { eq, sql } from "drizzle-orm";

import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { withTransaction, db } from "@/server/db";
import {
  matchTable,
  mediaTable,
  messageTable,
  originalAnonymizedFileTable,
  profileMetaTable,
  tinderProfileTable,
  tinderUsageTable,
  customDataTable,
  type TinderProfile,
  type TinderUsageInsert,
  type MatchInsert,
  type MessageInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { computeProfileMeta } from "./meta.service";
import { createMessagesAndMatches } from "./messages.service";
import { transformTinderJsonToProfile } from "./transform.service";
import { createUsageRecords } from "./usage.service";
import type { TinderProfileResult } from "./profile.service";

/**
 * Cross-account merge: Absorb old profile's data into new profile
 * Used when user uploads JSON with different tinderId than existing profile
 *
 * Flow:
 * 1. Transfer all usage/matches/messages from old profile to new tinderId
 * 2. Delete old profile
 * 3. Create new profile with combined date range
 * 4. Upsert new usage data
 * 5. Insert new matches/messages
 * 6. Recompute profile meta
 */
export async function absorbProfileIntoNew(data: {
  oldTinderId: string;
  newTinderId: string;
  anonymizedTinderJson: AnonymizedTinderDataJSON;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  console.log(
    `\n🔄 Cross-account merge: ${data.oldTinderId} → ${data.newTinderId}`,
  );
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(data.anonymizedTinderJson);
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

    // 2. Transfer all usage records from old → new profile ID
    const transferStart = Date.now();
    await tx
      .update(tinderUsageTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(tinderUsageTable.tinderProfileId, data.oldTinderId));

    // 3. Transfer all matches from old → new profile ID
    await tx
      .update(matchTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(matchTable.tinderProfileId, data.oldTinderId));

    // 4. Transfer all messages from old → new profile ID
    await tx
      .update(messageTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(messageTable.tinderProfileId, data.oldTinderId));

    // 5. Transfer media
    await tx
      .update(mediaTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(mediaTable.tinderProfileId, data.oldTinderId));

    // 6. Transfer custom data (if exists)
    await tx
      .update(customDataTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(customDataTable.tinderProfileId, data.oldTinderId));

    console.log(
      `   ✓ Transferred all data to new profile (${Date.now() - transferStart}ms)`,
    );

    // 7. Delete old profile (cascade will handle profileMeta, jobs, schools)
    const deleteStart = Date.now();
    await tx
      .delete(tinderProfileTable)
      .where(eq(tinderProfileTable.tinderId, data.oldTinderId));
    console.log(`   ✓ Deleted old profile (${Date.now() - deleteStart}ms)`);

    // 8. Transform and prepare new profile data
    const transformStart = Date.now();
    const userBirthDate = new Date(data.anonymizedTinderJson.User.birth_date);
    const newProfileData = transformTinderJsonToProfile(
      data.anonymizedTinderJson,
      {
        tinderId: data.newTinderId,
        userId: data.userId,
        timezone: data.timezone,
        country: data.country,
      },
    );

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

    console.log(`   ✓ Profile transformed (${Date.now() - transformStart}ms)`);
    console.log(
      `   Combined date range: ${combinedFirstDay.toISOString().split("T")[0]} → ${combinedLastDay.toISOString().split("T")[0]} (${combinedDaysInPeriod} days)`,
    );

    // 9. Insert new profile with combined date range
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

    // 10. Upsert new usage records (may overlap with transferred data)
    const usageStart = Date.now();
    const newUsage = createUsageRecords(
      data.anonymizedTinderJson,
      data.newTinderId,
      userBirthDate,
    );
    const upsertStats = await upsertUsageRecords(
      tx,
      data.newTinderId,
      newUsage,
    );
    console.log(
      `   ✓ Usage upserted: ${upsertStats.inserted} inserted, ${upsertStats.updated} updated (${Date.now() - usageStart}ms)`,
    );

    // 11. Insert new matches + messages (NO dedup - different accounts have different match semantics)
    // tinderMatchId "1" in account A is a different person than tinderMatchId "1" in account B
    const matchStart = Date.now();
    const { matchesInput, messagesInput } = createMessagesAndMatches(
      data.anonymizedTinderJson.Messages,
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

    // 12. Insert photos
    const photosStart = Date.now();
    const photosArray = data.anonymizedTinderJson.Photos;
    if (Array.isArray(photosArray) && photosArray.length > 0) {
      const photosInput = photosArray.map((photo) => {
        if (typeof photo === "string") {
          return {
            id: createId("media"),
            type: "photo",
            url: photo,
            prompt: null,
            caption: null,
            fromSoMe: null,
            tinderProfileId: data.newTinderId,
            hingeProfileId: null,
          };
        } else {
          return {
            id: createId("media"),
            type: photo.type || "photo",
            url: photo.url,
            prompt: photo.prompt_text || null,
            caption: null,
            fromSoMe: null,
            tinderProfileId: data.newTinderId,
            hingeProfileId: null,
          };
        }
      });
      await tx.insert(mediaTable).values(photosInput);
      console.log(
        `   ✓ ${photosInput.length} photos inserted (${Date.now() - photosStart}ms)`,
      );
    }

    // 13. Recompute profile meta with all combined data
    const metaStart = Date.now();
    const fullProfile = await tx.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, data.newTinderId),
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
      throw new Error(`Failed to fetch merged profile: ${data.newTinderId}`);
    }

    const profileMeta = computeProfileMeta(fullProfile);
    await tx.insert(profileMetaTable).values({
      ...profileMeta,
      id: createId("pmeta"),
      tinderProfileId: data.newTinderId,
      hingeProfileId: null,
    });
    console.log(`   ✓ Profile meta computed (${Date.now() - metaStart}ms)`);

    // 14. Store original file
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "TINDER",
      swipestatsVersion: "SWIPESTATS_4",
      file: data.anonymizedTinderJson as unknown as Record<string, unknown>,
      blobUrl: null,
      userId: data.userId,
    });

    return insertedProfile!;
  });

  const totalTime = Date.now() - startTime;
  console.log(
    `\n✅ Cross-account merge complete: ${data.oldTinderId} → ${data.newTinderId}`,
  );
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  return {
    profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: 0, // TODO: Could compute actual counts
      messageCount: 0,
      photoCount: 0,
      usageDays: 0,
      hasPhotos: false,
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
 * 2. Upsert usage records (take max for overlapping dates)
 * 3. Merge matches by tinderMatchId (add new messages to existing matches)
 * 4. Recompute profile meta
 */
export async function additiveUpdateProfile(data: {
  tinderId: string;
  anonymizedTinderJson: AnonymizedTinderDataJSON;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  console.log(`\n📊 Additive update for profile: ${data.tinderId}`);
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(data.anonymizedTinderJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);

  const profile = await withTransaction(async (tx) => {
    // 1. Update profile metadata (bio, settings, etc.)
    const transformStart = Date.now();
    const profileData = transformTinderJsonToProfile(
      data.anonymizedTinderJson,
      {
        tinderId: data.tinderId,
        userId: data.userId,
        timezone: data.timezone,
        country: data.country,
      },
    );
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

    // 2. Upsert usage records
    const usageStart = Date.now();
    const userBirthDate = new Date(data.anonymizedTinderJson.User.birth_date);
    const newUsage = createUsageRecords(
      data.anonymizedTinderJson,
      data.tinderId,
      userBirthDate,
    );
    const upsertStats = await upsertUsageRecords(tx, data.tinderId, newUsage);
    console.log(
      `   ✓ Usage upserted: ${upsertStats.inserted} inserted, ${upsertStats.updated} updated (${Date.now() - usageStart}ms)`,
    );

    // 3. Merge matches by tinderMatchId
    const matchStart = Date.now();
    const { matchesInput, messagesInput } = createMessagesAndMatches(
      data.anonymizedTinderJson.Messages,
      data.tinderId,
    );
    const mergeStats = await mergeMatchesByTinderMatchId(
      tx,
      data.tinderId,
      matchesInput,
      messagesInput,
    );
    console.log(
      `   ✓ Matches merged: ${mergeStats.matchesAdded} added, ${mergeStats.matchesUpdated} updated, ${mergeStats.messagesAdded} messages added (${Date.now() - matchStart}ms)`,
    );

    // Check if this was an idempotent update (no new data)
    if (
      upsertStats.inserted === 0 &&
      mergeStats.matchesAdded === 0 &&
      mergeStats.messagesAdded === 0
    ) {
      console.log(
        `   ℹ️  No new data detected - upload was idempotent (same file re-uploaded)`,
      );
    }

    // 4. Delete old profile meta and recompute
    const metaStart = Date.now();
    await tx
      .delete(profileMetaTable)
      .where(eq(profileMetaTable.tinderProfileId, data.tinderId));

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

    if (!fullProfile) {
      throw new Error(`Failed to fetch profile after update: ${data.tinderId}`);
    }

    const profileMeta = computeProfileMeta(fullProfile);
    await tx.insert(profileMetaTable).values({
      ...profileMeta,
      id: createId("pmeta"),
      tinderProfileId: data.tinderId,
      hingeProfileId: null,
    });
    console.log(`   ✓ Profile meta recomputed (${Date.now() - metaStart}ms)`);

    // 5. Store original file
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "TINDER",
      swipestatsVersion: "SWIPESTATS_4",
      file: data.anonymizedTinderJson as unknown as Record<string, unknown>,
      blobUrl: null,
      userId: data.userId,
    });

    return updatedProfile!;
  });

  const totalTime = Date.now() - startTime;
  console.log(`\n✅ Additive update complete for ${data.tinderId}`);
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  return {
    profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: 0,
      messageCount: 0,
      photoCount: 0,
      usageDays: 0,
      hasPhotos: false,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Upsert usage records - takes max of each metric for overlapping dates
 * Returns count of inserted and updated records
 */
async function upsertUsageRecords(
  tx: any,
  tinderId: string,
  newUsage: TinderUsageInsert[],
): Promise<{ inserted: number; updated: number }> {
  if (newUsage.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  // Batch upserts in chunks of 500
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  let totalUpdated = 0;

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
          appOpens: sql`GREATEST(${tinderUsageTable.appOpens}, excluded.app_opens)`,
          swipeLikes: sql`GREATEST(${tinderUsageTable.swipeLikes}, excluded.swipe_likes)`,
          swipePasses: sql`GREATEST(${tinderUsageTable.swipePasses}, excluded.swipe_passes)`,
          swipeSuperLikes: sql`GREATEST(${tinderUsageTable.swipeSuperLikes}, excluded.swipe_super_likes)`,
          matches: sql`GREATEST(${tinderUsageTable.matches}, excluded.matches)`,
          messagesSent: sql`GREATEST(${tinderUsageTable.messagesSent}, excluded.messages_sent)`,
          messagesReceived: sql`GREATEST(${tinderUsageTable.messagesReceived}, excluded.messages_received)`,
          swipesCombined: sql`GREATEST(${tinderUsageTable.swipesCombined}, excluded.swipes_combined)`,
          matchRate: sql`excluded.match_rate`,
          likeRate: sql`excluded.like_rate`,
          messagesSentRate: sql`excluded.messages_sent_rate`,
          responseRate: sql`excluded.response_rate`,
          engagementRate: sql`excluded.engagement_rate`,
          userAgeThisDay: sql`excluded.user_age_this_day`,
        },
      });

    // Approximate counts (we don't know which were inserts vs updates)
    totalInserted += batch.length;
  }

  return { inserted: totalInserted, updated: 0 };
}

/**
 * Merge matches by tinderMatchId - add new matches and update existing ones with more messages
 * Returns count of matches added, updated, and messages added
 */
async function mergeMatchesByTinderMatchId(
  tx: any,
  tinderId: string,
  newMatches: MatchInsert[],
  newMessages: MessageInsert[],
): Promise<{
  matchesAdded: number;
  matchesUpdated: number;
  messagesAdded: number;
}> {
  if (newMatches.length === 0) {
    return { matchesAdded: 0, matchesUpdated: 0, messagesAdded: 0 };
  }

  // Get existing matches
  const existing = await tx.query.matchTable.findMany({
    where: eq(matchTable.tinderProfileId, tinderId),
    columns: {
      id: true,
      tinderMatchId: true,
      totalMessageCount: true,
    },
  });

  type ExistingMatch = {
    id: string;
    tinderMatchId: string | null;
    totalMessageCount: number | null;
  };

  const existingMap = new Map<string | null, ExistingMatch>(
    existing.map((m: ExistingMatch) => [
      m.tinderMatchId,
      {
        id: m.id,
        tinderMatchId: m.tinderMatchId,
        totalMessageCount: m.totalMessageCount,
      },
    ]),
  );

  // Group messages by their match's tinderMatchId
  const messagesByTinderMatchId = new Map<string, MessageInsert[]>();
  for (const message of newMessages) {
    const match = newMatches.find((m) => m.id === message.matchId);
    if (match && match.tinderMatchId) {
      const messages = messagesByTinderMatchId.get(match.tinderMatchId) || [];
      messages.push(message);
      messagesByTinderMatchId.set(match.tinderMatchId, messages);
    }
  }

  let matchesAdded = 0;
  let matchesUpdated = 0;
  let messagesAdded = 0;

  for (const newMatch of newMatches) {
    // Skip matches without tinderMatchId
    if (!newMatch.tinderMatchId) {
      continue;
    }

    const existingMatch = existingMap.get(newMatch.tinderMatchId);

    if (!existingMatch) {
      // New match - insert with all messages
      const [inserted] = await tx
        .insert(matchTable)
        .values(newMatch)
        .returning();

      const matchMessages =
        messagesByTinderMatchId.get(newMatch.tinderMatchId) || [];
      if (matchMessages.length > 0) {
        // Update message matchId to point to our new DB id
        const messagesToInsert = matchMessages.map((m) => ({
          ...m,
          matchId: inserted.id,
        }));

        const BATCH_SIZE = 1000;
        for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
          const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
          await tx.insert(messageTable).values(batch);
        }

        messagesAdded += matchMessages.length;
      }

      matchesAdded++;
    } else if (
      existingMatch &&
      existingMatch.totalMessageCount !== null &&
      newMatch.totalMessageCount > existingMatch.totalMessageCount
    ) {
      // More messages - add only the new ones
      const matchMessages =
        messagesByTinderMatchId.get(newMatch.tinderMatchId) || [];

      // Fetch existing messages to find the max order
      const existingMessages = await tx.query.messageTable.findMany({
        where: eq(messageTable.matchId, existingMatch.id),
        columns: { order: true },
      });

      const existingMaxOrder = Math.max(
        ...existingMessages.map((m: any) => m.order),
        -1,
      );

      // Filter to only truly new messages
      const newMessagesOnly = matchMessages.filter(
        (m) => m.order > existingMaxOrder,
      );

      if (newMessagesOnly.length > 0) {
        const messagesToInsert = newMessagesOnly.map((m) => ({
          ...m,
          matchId: existingMatch.id,
        }));

        const BATCH_SIZE = 1000;
        for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
          const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
          await tx.insert(messageTable).values(batch);
        }

        messagesAdded += newMessagesOnly.length;

        // Update match metadata
        await tx
          .update(matchTable)
          .set({
            totalMessageCount: newMatch.totalMessageCount,
            lastMessageAt: newMatch.lastMessageAt,
            textCount: newMatch.textCount,
            gifCount: newMatch.gifCount,
            gestureCount: newMatch.gestureCount,
            otherMessageTypeCount: newMatch.otherMessageTypeCount,
          })
          .where(eq(matchTable.id, existingMatch.id));

        matchesUpdated++;
      }
    }
    // else: existing has same or more messages - skip
  }

  return { matchesAdded, matchesUpdated, messagesAdded };
}
