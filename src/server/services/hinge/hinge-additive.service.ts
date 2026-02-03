import { eq } from "drizzle-orm";

import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import { withTransaction, type TransactionClient } from "@/server/db";
import {
  hingeProfileTable,
  hingeInteractionTable,
  hingePromptTable,
  matchTable,
  messageTable,
  mediaTable,
  profileMetaTable,
  originalAnonymizedFileTable,
  customDataTable,
  type MatchInsert,
  type MessageInsert,
  type HingeInteractionInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { transformHingeJsonToProfile } from "./hinge-transform.service";
import { createHingeMessagesAndMatches } from "./hinge-messages.service";
import { createHingeProfileMeta } from "./hinge-meta.service";
import { transformHingePromptsForDb } from "../profile/profile.service";
import type { HingeProfileResult } from "./hinge.service";

/**
 * Transform Hinge media to database media insert format
 */
function transformHingeMediaToDb(
  media: { type?: string; url: string; prompt?: string | null }[],
  hingeProfileId: string,
) {
  if (!Array.isArray(media) || media.length === 0) {
    return [];
  }

  return media.map((m) => ({
    id: createId("media"),
    type: m.type || "photo",
    url: m.url,
    prompt: m.prompt || null,
    caption: null,
    fromSoMe: null,
    hingeProfileId,
    tinderProfileId: null,
  }));
}

/**
 * Helper: Recompute profile meta in transaction
 */
async function recomputeHingeProfileMetaInTx(
  tx: TransactionClient,
  hingeId: string,
): Promise<void> {
  // Delete old profile meta
  await tx
    .delete(profileMetaTable)
    .where(eq(profileMetaTable.hingeProfileId, hingeId));

  // Fetch profile with all relations
  const fullProfile = await tx.query.hingeProfileTable.findFirst({
    where: eq(hingeProfileTable.hingeId, hingeId),
    with: {
      matches: {
        with: {
          messages: true,
        },
      },
      interactions: true,
    },
  });

  if (!fullProfile) {
    throw new Error(
      `Failed to fetch profile for meta computation: ${hingeId}`,
    );
  }

  // Compute and insert new meta
  const profileMeta = createHingeProfileMeta(fullProfile);
  await tx.insert(profileMetaTable).values({
    ...profileMeta,
    id: createId("pmeta"),
    tinderProfileId: null,
    hingeProfileId: hingeId,
  });
}

/**
 * Filter out matches that already exist by their matchId (nanoid)
 * For Hinge, matches don't have a stable external ID like Tinder's tinderMatchId,
 * so we use timestamp-based deduplication.
 */
function filterNewHingeMatches(
  existingMatchTimestamps: Set<number>,
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
    // Skip if this match already exists (by matchedAt timestamp)
    if (match.matchedAt && existingMatchTimestamps.has(match.matchedAt.getTime())) {
      continue;
    }

    // New match - include it and all its messages
    matchesToInsert.push(match);
    const matchMessages = messagesByMatchId.get(match.id) || [];
    messagesToInsert.push(...matchMessages);
  }

  return { matchesToInsert, messagesToInsert };
}

/**
 * Filter out interactions that already exist by timestamp
 */
function filterNewHingeInteractions(
  existingTimestamps: Set<number>,
  newInteractions: HingeInteractionInsert[],
): HingeInteractionInsert[] {
  return newInteractions.filter(
    (interaction) => !existingTimestamps.has(interaction.timestamp.getTime()),
  );
}

/**
 * Same-account additive: Merge new data into existing Hinge profile
 * Used when user uploads newer export of same hingeId
 *
 * Flow:
 * 1. Update profile metadata (demographics, preferences, etc.)
 * 2. Filter to only NEW matches (by matchedAt timestamp)
 * 3. Insert new matches + their messages
 * 4. Insert new interactions (LIKE_SENT, REJECT, UNMATCH) - use timestamp dedup
 * 5. Replace prompts (delete old, insert new - represents current state)
 * 6. Merge media (insert new photos, keep existing)
 * 7. Recompute ProfileMeta from all matches/interactions
 * 8. Store original file
 */
export async function additiveUpdateHingeProfile(data: {
  hingeId: string;
  anonymizedHingeJson: AnonymizedHingeDataJSON;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<HingeProfileResult> {
  const startTime = Date.now();

  console.log(`\n📊 Additive update for Hinge profile: ${data.hingeId}`);
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(data.anonymizedHingeJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);

  const result = await withTransaction(async (tx) => {
    // 1. Update profile metadata
    const transformStart = Date.now();
    const profileData = transformHingeJsonToProfile(data.anonymizedHingeJson, {
      hingeId: data.hingeId,
      userId: data.userId,
      timezone: data.timezone,
      country: data.country,
    });
    console.log(
      `   ✓ Profile data transformed (${Date.now() - transformStart}ms)`,
    );

    const updateStart = Date.now();
    const [updatedProfile] = await tx
      .update(hingeProfileTable)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(hingeProfileTable.hingeId, data.hingeId))
      .returning();
    console.log(
      `   ✓ Profile metadata updated (${Date.now() - updateStart}ms)`,
    );

    // 2. Process new matches and messages
    const matchStart = Date.now();
    const { interactionsInput, matchesInput, messagesInput } =
      createHingeMessagesAndMatches(
        data.anonymizedHingeJson.Matches,
        data.hingeId,
      );

    // Fetch existing match timestamps for deduplication
    const existingMatches = await tx.query.matchTable.findMany({
      where: eq(matchTable.hingeProfileId, data.hingeId),
      columns: { matchedAt: true },
    });
    const existingMatchTimestamps = new Set(
      existingMatches
        .map((m) => m.matchedAt?.getTime())
        .filter((t): t is number => t !== undefined),
    );

    // Filter to only new matches
    const { matchesToInsert, messagesToInsert } = filterNewHingeMatches(
      existingMatchTimestamps,
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

    // 3. Process new interactions (additive - historical events)
    const interactionStart = Date.now();
    const existingInteractions = await tx.query.hingeInteractionTable.findMany({
      where: eq(hingeInteractionTable.hingeProfileId, data.hingeId),
      columns: { timestamp: true },
    });
    const existingInteractionTimestamps = new Set(
      existingInteractions.map((i) => i.timestamp.getTime()),
    );

    const interactionsToInsert = filterNewHingeInteractions(
      existingInteractionTimestamps,
      interactionsInput,
    );

    if (interactionsToInsert.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < interactionsToInsert.length; i += BATCH_SIZE) {
        const batch = interactionsToInsert.slice(i, i + BATCH_SIZE);
        await tx.insert(hingeInteractionTable).values(batch);
      }
    }
    console.log(
      `   ✓ Interactions merged: ${interactionsToInsert.length} new (${Date.now() - interactionStart}ms)`,
    );

    // 4. Replace prompts (current profile state)
    const promptStart = Date.now();
    await tx
      .delete(hingePromptTable)
      .where(eq(hingePromptTable.hingeProfileId, data.hingeId));

    const promptsInput = transformHingePromptsForDb(
      data.anonymizedHingeJson.Prompts,
      data.hingeId,
    );
    if (promptsInput.length > 0) {
      await tx.insert(hingePromptTable).values(promptsInput);
    }
    console.log(
      `   ✓ Prompts replaced: ${promptsInput.length} (${Date.now() - promptStart}ms)`,
    );

    // 5. Merge media (add new, keep existing)
    const mediaStart = Date.now();
    const existingMedia = await tx.query.mediaTable.findMany({
      where: eq(mediaTable.hingeProfileId, data.hingeId),
      columns: { url: true },
    });
    const existingMediaUrls = new Set(existingMedia.map((m) => m.url));

    const newMediaInput = transformHingeMediaToDb(
      data.anonymizedHingeJson.Media ?? [],
      data.hingeId,
    ).filter((m) => !existingMediaUrls.has(m.url));

    if (newMediaInput.length > 0) {
      await tx.insert(mediaTable).values(newMediaInput);
    }
    console.log(
      `   ✓ Media merged: ${newMediaInput.length} new photos (${Date.now() - mediaStart}ms)`,
    );

    // 6. Recompute profile meta
    const metaStart = Date.now();
    await recomputeHingeProfileMetaInTx(tx, data.hingeId);
    console.log(`   ✓ Profile meta recomputed (${Date.now() - metaStart}ms)`);

    // 7. Store original file
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "HINGE",
      swipestatsVersion: "SWIPESTATS_4",
      file: data.anonymizedHingeJson as unknown as Record<string, unknown>,
      blobUrl: null,
      userId: data.userId,
    });

    // Check if this was an idempotent update (no new data)
    if (
      matchesToInsert.length === 0 &&
      messagesToInsert.length === 0 &&
      interactionsToInsert.length === 0
    ) {
      console.log(
        `   ℹ️  No new data detected - upload was idempotent (same file re-uploaded)`,
      );
    }

    if (!updatedProfile) {
      throw new Error(`Failed to update profile: ${data.hingeId}`);
    }

    return {
      profile: updatedProfile,
      matchCount: matchesToInsert.length,
      messageCount: messagesToInsert.length,
      interactionCount: interactionsToInsert.length,
      photoCount: newMediaInput.length,
      promptCount: promptsInput.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(`\n✅ Additive update complete for Hinge ${data.hingeId}`);
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  return {
    profile: result.profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: result.matchCount,
      messageCount: result.messageCount,
      photoCount: result.photoCount,
      promptCount: result.promptCount,
      interactionCount: result.interactionCount,
      hasPhotos: result.photoCount > 0,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Cross-account merge: Absorb old Hinge profile's data into new profile
 * Used when user uploads JSON with different hingeId than existing profile
 *
 * Flow:
 * 1. Transfer all matches/messages/interactions from old profile to new hingeId
 * 2. Transfer media and custom data
 * 3. Delete old profile (cascade handles profileMeta, prompts)
 * 4. Create new profile with combined date range
 * 5. Insert new matches/messages (no dedup - different accounts)
 * 6. Insert new prompts + media
 * 7. Recompute ProfileMeta
 * 8. Store original file
 */
export async function absorbHingeProfileIntoNew(data: {
  oldHingeId: string;
  newHingeId: string;
  anonymizedHingeJson: AnonymizedHingeDataJSON;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<HingeProfileResult> {
  const startTime = Date.now();

  console.log(
    `\n🔄 Cross-account merge: ${data.oldHingeId} → ${data.newHingeId}`,
  );
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(data.anonymizedHingeJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
  console.log(`   JSON size: ${jsonSizeMB} MB`);

  const result = await withTransaction(async (tx) => {
    // 1. Get old profile for reference
    const fetchOldStart = Date.now();
    const oldProfile = await tx.query.hingeProfileTable.findFirst({
      where: eq(hingeProfileTable.hingeId, data.oldHingeId),
    });

    if (!oldProfile) {
      throw new Error(`Old profile not found: ${data.oldHingeId}`);
    }
    console.log(`   ✓ Fetched old profile (${Date.now() - fetchOldStart}ms)`);

    // 2. Transfer all data from old → new profile ID
    const transferStart = Date.now();

    // Transfer matches (messages cascade automatically via foreign key)
    await tx
      .update(matchTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(matchTable.hingeProfileId, data.oldHingeId));

    // Transfer messages explicitly (in case they reference old profile directly)
    await tx
      .update(messageTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(messageTable.hingeProfileId, data.oldHingeId));

    // Transfer interactions
    await tx
      .update(hingeInteractionTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(hingeInteractionTable.hingeProfileId, data.oldHingeId));

    // Transfer media
    await tx
      .update(mediaTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(mediaTable.hingeProfileId, data.oldHingeId));

    // Transfer custom data (if exists)
    await tx
      .update(customDataTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(customDataTable.hingeProfileId, data.oldHingeId));

    console.log(
      `   ✓ Transferred all data to new profile (${Date.now() - transferStart}ms)`,
    );

    // 3. Delete old profile (cascade will handle profileMeta, prompts)
    const deleteStart = Date.now();
    await tx
      .delete(hingeProfileTable)
      .where(eq(hingeProfileTable.hingeId, data.oldHingeId));
    console.log(`   ✓ Deleted old profile (${Date.now() - deleteStart}ms)`);

    // 4. Transform and prepare new profile data
    const transformStart = Date.now();
    const newProfileData = transformHingeJsonToProfile(
      data.anonymizedHingeJson,
      {
        hingeId: data.newHingeId,
        userId: data.userId,
        timezone: data.timezone,
        country: data.country,
      },
    );

    // Use the earlier createDate between old and new profiles
    const combinedCreateDate =
      oldProfile.createDate < newProfileData.createDate
        ? oldProfile.createDate
        : newProfileData.createDate;

    console.log(`   ✓ Profile transformed (${Date.now() - transformStart}ms)`);

    // 5. Insert new profile
    const profileStart = Date.now();
    const [insertedProfile] = await tx
      .insert(hingeProfileTable)
      .values({
        ...newProfileData,
        createDate: combinedCreateDate,
      })
      .returning();
    console.log(`   ✓ New profile inserted (${Date.now() - profileStart}ms)`);

    // 6. Insert new matches + messages (NO dedup - different accounts have different match semantics)
    const matchStart = Date.now();
    const { interactionsInput, matchesInput, messagesInput } =
      createHingeMessagesAndMatches(
        data.anonymizedHingeJson.Matches,
        data.newHingeId,
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

    // 7. Insert new interactions
    if (interactionsInput.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < interactionsInput.length; i += BATCH_SIZE) {
        const batch = interactionsInput.slice(i, i + BATCH_SIZE);
        await tx.insert(hingeInteractionTable).values(batch);
      }
      console.log(`   ✓ ${interactionsInput.length} new interactions inserted`);
    }

    // 8. Insert prompts
    const promptsStart = Date.now();
    const promptsInput = transformHingePromptsForDb(
      data.anonymizedHingeJson.Prompts,
      data.newHingeId,
    );
    if (promptsInput.length > 0) {
      await tx.insert(hingePromptTable).values(promptsInput);
      console.log(
        `   ✓ ${promptsInput.length} prompts inserted (${Date.now() - promptsStart}ms)`,
      );
    }

    // 9. Insert new photos
    const photosStart = Date.now();
    const photosInput = transformHingeMediaToDb(
      data.anonymizedHingeJson.Media ?? [],
      data.newHingeId,
    );
    if (photosInput.length > 0) {
      await tx.insert(mediaTable).values(photosInput);
      console.log(
        `   ✓ ${photosInput.length} photos inserted (${Date.now() - photosStart}ms)`,
      );
    }

    // 10. Recompute profile meta with all combined data
    const metaStart = Date.now();
    await recomputeHingeProfileMetaInTx(tx, data.newHingeId);
    console.log(`   ✓ Profile meta computed (${Date.now() - metaStart}ms)`);

    // 11. Store original file
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "HINGE",
      swipestatsVersion: "SWIPESTATS_4",
      file: data.anonymizedHingeJson as unknown as Record<string, unknown>,
      blobUrl: null,
      userId: data.userId,
    });

    if (!insertedProfile) {
      throw new Error(`Failed to insert profile: ${data.newHingeId}`);
    }

    return {
      profile: insertedProfile,
      matchCount: matchesInput.length,
      messageCount: messagesInput.length,
      interactionCount: interactionsInput.length,
      photoCount: photosInput.length,
      promptCount: promptsInput.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(
    `\n✅ Cross-account merge complete: ${data.oldHingeId} → ${data.newHingeId}`,
  );
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  return {
    profile: result.profile,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: result.matchCount,
      messageCount: result.messageCount,
      photoCount: result.photoCount,
      promptCount: result.promptCount,
      interactionCount: result.interactionCount,
      hasPhotos: result.photoCount > 0,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}
