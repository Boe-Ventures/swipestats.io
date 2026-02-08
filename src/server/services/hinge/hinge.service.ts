import { eq } from "drizzle-orm";
import type {
  AnonymizedHingeDataJSON,
  HingeMedia,
  PromptEntry,
} from "@/lib/interfaces/HingeDataJSON";
import { withTransaction, db } from "@/server/db";
import {
  hingeProfileTable,
  matchTable,
  mediaTable,
  messageTable,
  hingePromptTable,
  hingeInteractionTable,
  originalAnonymizedFileTable,
  profileMetaTable,
  type HingeProfile,
  type HingePromptInsert,
  type MediaInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { transformHingeJsonToProfile } from "./hinge-transform.service";
import { createHingeMessagesAndMatches } from "./hinge-messages.service";
import { createHingeProfileMeta } from "./hinge-meta.service";

/**
 * Result type returned from Hinge profile creation/update operations
 * Contains the profile and metrics for analytics tracking
 */
export type HingeProfileResult = {
  profile: HingeProfile;
  metrics: {
    processingTimeMs: number;
    matchCount: number;
    messageCount: number;
    photoCount: number;
    promptCount: number;
    interactionCount: number;
    hasPhotos: boolean;
    jsonSizeMB: number;
  };
};

/**
 * Get a Hinge profile by hingeId
 */
export async function getHingeProfile(hingeId: string) {
  return db.query.hingeProfileTable.findFirst({
    where: eq(hingeProfileTable.hingeId, hingeId),
  });
}

/**
 * Get a Hinge profile with user information for ownership checks
 */
export async function getHingeProfileWithUser(hingeId: string) {
  return db.query.hingeProfileTable.findFirst({
    where: eq(hingeProfileTable.hingeId, hingeId),
    with: {
      user: {
        columns: {
          isAnonymous: true,
        },
      },
    },
  });
}

/**
 * Transfer profile ownership from one user to another
 * Used when claiming an anonymous user's profile
 */
export async function transferHingeProfileOwnership(
  hingeId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  console.log(
    `🔀 Transferring Hinge profile ${hingeId} from ${fromUserId} to ${toUserId}`,
  );

  await db
    .update(hingeProfileTable)
    .set({ userId: toUserId })
    .where(eq(hingeProfileTable.hingeId, hingeId));

  console.log(`✅ Profile ownership transferred successfully`);
}

/**
 * Transform Hinge media to database media insert format
 */
function transformHingeMediaToDb(
  media: HingeMedia[],
  hingeProfileId: string,
): MediaInsert[] {
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
 * Create a new Hinge profile from blob storage
 * This is the main orchestrator that coordinates all profile creation steps
 */
export async function createHingeProfile(data: {
  hingeId: string;
  blobUrl: string;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<HingeProfileResult> {
  const startTime = Date.now();

  console.log(`\n🚀 Starting Hinge profile creation for ${data.hingeId}`);
  console.log(`   User ID: ${data.userId}`);
  console.log(`   Blob URL: ${data.blobUrl}`);
  console.log(`   Timezone: ${data.timezone ?? "not provided"}`);
  console.log(`   Country: ${data.country ?? "not provided"}`);

  // 1. Fetch JSON from blob storage
  const fetchStart = Date.now();
  console.log(`\n📥 [1/6] Fetching Hinge data from blob storage...`);
  const { fetchBlobJson } = await import("../blob.service");
  const anonymizedHingeJson = await fetchBlobJson<AnonymizedHingeDataJSON>(
    data.blobUrl,
  );
  console.log(`✅ Blob fetched in ${Date.now() - fetchStart}ms`);

  // Log JSON size
  const jsonString = JSON.stringify(anonymizedHingeJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
  console.log(`   JSON size: ${jsonSizeMB} MB`);

  // 2. Transform JSON data to database format
  const transformStart = Date.now();
  console.log(`\n🔄 [2/6] Transforming profile data...`);
  const profileData = transformHingeJsonToProfile(anonymizedHingeJson, {
    hingeId: data.hingeId,
    userId: data.userId,
    timezone: data.timezone,
    country: data.country,
  });
  console.log(`✅ Profile transformed in ${Date.now() - transformStart}ms`);
  console.log(`   Gender: ${profileData.gender}`);
  console.log(`   Age: ${profileData.ageAtUpload}`);
  console.log(`   Location: ${profileData.country}`);

  // 3. Create interactions, matches, and messages
  const messagesStart = Date.now();
  console.log(`\n💬 [3/6] Processing conversations...`);
  const result = createHingeMessagesAndMatches(
    anonymizedHingeJson.Matches,
    data.hingeId,
  );
  const interactionsInput = result.interactionsInput;
  const matchesInput = result.matchesInput;
  const messagesInput = result.messagesInput;
  console.log(`✅ Processed in ${Date.now() - messagesStart}ms`);

  // 4. Transform prompts
  const promptsStart = Date.now();
  console.log(`\n📝 [4/6] Processing prompts...`);
  const promptsInput = transformHingePromptsForDb(
    anonymizedHingeJson.Prompts,
    data.hingeId,
  );
  console.log(
    `✅ Processed ${promptsInput.length} prompts in ${Date.now() - promptsStart}ms`,
  );

  // 5. Log photo count
  const photoCount = Array.isArray(anonymizedHingeJson.Media)
    ? anonymizedHingeJson.Media.length
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
      dataProvider: "HINGE",
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
      .insert(hingeProfileTable)
      .values(profileData)
      .returning();
    console.log(`   ✓ Profile inserted (${Date.now() - profileStart}ms)`);

    // Insert photos/media (respects consent - Media will be empty array if filtered)
    const mediaInput = transformHingeMediaToDb(
      anonymizedHingeJson.Media ?? [],
      data.hingeId,
    );
    if (mediaInput.length > 0) {
      const mediaInsertStart = Date.now();
      await tx.insert(mediaTable).values(mediaInput);
      console.log(
        `   ✓ ${mediaInput.length} photos inserted (${Date.now() - mediaInsertStart}ms)`,
      );
    } else {
      console.log(`   ✓ No photos to insert (user may not have consented)`);
    }

    // Bulk insert matches
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

    // Bulk insert messages
    if (messagesInput.length > 0) {
      const messagesInsertStart = Date.now();
      const BATCH_SIZE = 1000;

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

    // Insert prompts
    if (promptsInput.length > 0) {
      const promptsInsertStart = Date.now();
      await tx.insert(hingePromptTable).values(promptsInput);
      console.log(
        `   ✓ ${promptsInput.length} prompts inserted (${Date.now() - promptsInsertStart}ms)`,
      );
    }

    // Insert interactions (likes, rejects, unmatches)
    if (interactionsInput.length > 0) {
      const interactionsInsertStart = Date.now();
      const BATCH_SIZE = 1000;

      for (let i = 0; i < interactionsInput.length; i += BATCH_SIZE) {
        const batch = interactionsInput.slice(i, i + BATCH_SIZE);
        await tx.insert(hingeInteractionTable).values(batch);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(interactionsInput.length / BATCH_SIZE);
        console.log(
          `   ✓ Batch ${batchNum}/${totalBatches}: ${batch.length} interactions inserted`,
        );
      }

      console.log(
        `   ✓ ${interactionsInput.length} interactions inserted (${Date.now() - interactionsInsertStart}ms)`,
      );
    }

    // Fetch profile with all related data for meta computation
    const fetchStart = Date.now();
    console.log(`\n📊 Computing profile metadata...`);
    const fullProfile = await tx.query.hingeProfileTable.findFirst({
      where: eq(hingeProfileTable.hingeId, data.hingeId),
      with: {
        matches: {
          with: {
            messages: true,
          },
        },
        interactions: true,
      },
    });
    console.log(
      `   ✓ Profile fetched with relations (${Date.now() - fetchStart}ms)`,
    );

    if (!fullProfile) {
      throw new Error(
        `Failed to fetch profile after creation: ${data.hingeId}`,
      );
    }

    // Compute and insert profile meta
    const metaComputeStart = Date.now();
    const meta = createHingeProfileMeta(fullProfile);
    console.log(`   ✓ Metadata computed (${Date.now() - metaComputeStart}ms)`);

    const metaInsertStart = Date.now();
    await tx.insert(profileMetaTable).values({
      ...meta,
      id: createId("pmeta"),
      tinderProfileId: null,
      hingeProfileId: data.hingeId,
    });
    console.log(`   ✓ Metadata inserted (${Date.now() - metaInsertStart}ms)`);

    return profile!;
  });

  console.log(`\n✅ Transaction completed in ${Date.now() - txStart}ms`);

  // Compute metrics for analytics
  const totalTime = Date.now() - startTime;
  const mediaInput = transformHingeMediaToDb(
    anonymizedHingeJson.Media ?? [],
    data.hingeId,
  );

  console.log(`\n🎉 Hinge profile creation complete for ${data.hingeId}`);
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
      photoCount: mediaInput.length,
      promptCount: promptsInput.length,
      interactionCount: interactionsInput.length,
      hasPhotos: mediaInput.length > 0,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Update an existing Hinge profile from blob storage
 * Replaces all profile data including photos, matches, messages, prompts, and interactions
 */
export async function updateHingeProfile(data: {
  hingeId: string;
  blobUrl: string;
  userId: string;
  timezone?: string;
  country?: string;
}): Promise<HingeProfileResult> {
  const startTime = Date.now();

  console.log(`\n🔄 Starting Hinge profile update for ${data.hingeId}`);
  console.log(`   User ID: ${data.userId}`);
  console.log(`   Blob URL: ${data.blobUrl}`);

  // Fetch JSON from blob storage
  const fetchStart = Date.now();
  console.log(`\n📥 Fetching Hinge data from blob storage...`);
  const { fetchBlobJson } = await import("../blob.service");
  const anonymizedHingeJson = await fetchBlobJson<AnonymizedHingeDataJSON>(
    data.blobUrl,
  );
  console.log(`✅ Blob fetched in ${Date.now() - fetchStart}ms`);

  // Log JSON size
  const jsonString = JSON.stringify(anonymizedHingeJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);

  // 1. Transform JSON data to database format
  const transformStart = Date.now();
  console.log(`\n🔄 [1/5] Transforming profile data...`);
  const profileData = transformHingeJsonToProfile(anonymizedHingeJson, {
    hingeId: data.hingeId,
    userId: data.userId,
    timezone: data.timezone,
    country: data.country,
  });
  console.log(`✅ Profile transformed in ${Date.now() - transformStart}ms`);

  // 2. Create interactions, matches, and messages
  const messagesStart = Date.now();
  console.log(`\n💬 [2/5] Processing conversations...`);
  const result = createHingeMessagesAndMatches(
    anonymizedHingeJson.Matches,
    data.hingeId,
  );
  const interactionsInput = result.interactionsInput;
  const matchesInput = result.matchesInput;
  const messagesInput = result.messagesInput;
  console.log(`✅ Processed in ${Date.now() - messagesStart}ms`);

  // 3. Transform prompts
  const promptsStart = Date.now();
  console.log(`\n📝 [3/5] Processing prompts...`);
  const promptsInput = transformHingePromptsForDb(
    anonymizedHingeJson.Prompts,
    data.hingeId,
  );
  console.log(
    `✅ Processed ${promptsInput.length} prompts in ${Date.now() - promptsStart}ms`,
  );

  // 4. Log photo count
  const photoCount = Array.isArray(anonymizedHingeJson.Media)
    ? anonymizedHingeJson.Media.length
    : 0;
  console.log(`\n📷 [4/5] Photos ready for insert: ${photoCount}`);

  // 5. Execute transaction to update all data
  const txStart = Date.now();
  console.log(`\n💾 [5/5] Starting database transaction...`);
  const profile = await withTransaction(async (tx) => {
    // Delete old related data
    console.log(
      `   ✓ Deleting old matches, messages, prompts, interactions, photos, and metadata...`,
    );
    const deleteStart = Date.now();

    await tx
      .delete(matchTable)
      .where(eq(matchTable.hingeProfileId, data.hingeId));
    await tx
      .delete(hingePromptTable)
      .where(eq(hingePromptTable.hingeProfileId, data.hingeId));
    await tx
      .delete(hingeInteractionTable)
      .where(eq(hingeInteractionTable.hingeProfileId, data.hingeId));
    await tx
      .delete(mediaTable)
      .where(eq(mediaTable.hingeProfileId, data.hingeId));
    await tx
      .delete(profileMetaTable)
      .where(eq(profileMetaTable.hingeProfileId, data.hingeId));

    console.log(`   ✓ Old data deleted (${Date.now() - deleteStart}ms)`);

    // Update profile
    const profileStart = Date.now();
    const [profile] = await tx
      .update(hingeProfileTable)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(hingeProfileTable.hingeId, data.hingeId))
      .returning();
    console.log(`   ✓ Profile updated (${Date.now() - profileStart}ms)`);

    // Insert photos/media (respects consent - Media will be empty array if filtered)
    const mediaInput = transformHingeMediaToDb(
      anonymizedHingeJson.Media ?? [],
      data.hingeId,
    );
    if (mediaInput.length > 0) {
      const mediaInsertStart = Date.now();
      await tx.insert(mediaTable).values(mediaInput);
      console.log(
        `   ✓ ${mediaInput.length} photos inserted (${Date.now() - mediaInsertStart}ms)`,
      );
    } else {
      console.log(`   ✓ No photos to insert (user may not have consented)`);
    }

    // Bulk insert matches
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

    // Bulk insert messages
    if (messagesInput.length > 0) {
      const messagesInsertStart = Date.now();
      const BATCH_SIZE = 1000;

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

    // Insert prompts
    if (promptsInput.length > 0) {
      const promptsInsertStart = Date.now();
      await tx.insert(hingePromptTable).values(promptsInput);
      console.log(
        `   ✓ ${promptsInput.length} prompts inserted (${Date.now() - promptsInsertStart}ms)`,
      );
    }

    // Insert interactions
    if (interactionsInput.length > 0) {
      const interactionsInsertStart = Date.now();
      const BATCH_SIZE = 1000;

      for (let i = 0; i < interactionsInput.length; i += BATCH_SIZE) {
        const batch = interactionsInput.slice(i, i + BATCH_SIZE);
        await tx.insert(hingeInteractionTable).values(batch);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(interactionsInput.length / BATCH_SIZE);
        console.log(
          `   ✓ Batch ${batchNum}/${totalBatches}: ${batch.length} interactions inserted`,
        );
      }

      console.log(
        `   ✓ ${interactionsInput.length} interactions inserted (${Date.now() - interactionsInsertStart}ms)`,
      );
    }

    // Fetch profile with all related data for meta computation
    const fetchStart = Date.now();
    console.log(`\n📊 Computing profile metadata...`);
    const fullProfile = await tx.query.hingeProfileTable.findFirst({
      where: eq(hingeProfileTable.hingeId, data.hingeId),
      with: {
        matches: {
          with: {
            messages: true,
          },
        },
        interactions: true,
      },
    });
    console.log(
      `   ✓ Profile fetched with relations (${Date.now() - fetchStart}ms)`,
    );

    if (!fullProfile) {
      throw new Error(`Failed to fetch profile after update: ${data.hingeId}`);
    }

    // Compute and insert profile meta
    const metaComputeStart = Date.now();
    const meta = createHingeProfileMeta(fullProfile);
    console.log(`   ✓ Metadata computed (${Date.now() - metaComputeStart}ms)`);

    const metaInsertStart = Date.now();
    await tx.insert(profileMetaTable).values({
      ...meta,
      id: createId("pmeta"),
      tinderProfileId: null,
      hingeProfileId: data.hingeId,
    });
    console.log(`   ✓ Metadata inserted (${Date.now() - metaInsertStart}ms)`);

    return profile!;
  });

  console.log(`\n✅ Transaction completed in ${Date.now() - txStart}ms`);

  // Compute metrics for analytics
  const totalTime = Date.now() - startTime;
  const mediaInput = transformHingeMediaToDb(
    anonymizedHingeJson.Media ?? [],
    data.hingeId,
  );

  console.log(`\n🎉 Hinge profile update complete for ${data.hingeId}`);
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
      photoCount: mediaInput.length,
      promptCount: promptsInput.length,
      interactionCount: interactionsInput.length,
      hasPhotos: mediaInput.length > 0,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Transform Hinge prompt entries to database insert format.
 * Skips entries with missing required fields (prompt text, type, dates).
 */
export function transformHingePromptsForDb(
  prompts: PromptEntry[],
  hingeProfileId: string,
): HingePromptInsert[] {
  return prompts
    .filter((prompt) => {
      // Skip prompts missing required fields that would violate NOT NULL constraints
      if (!prompt.type || !prompt.prompt) return false;
      const created = prompt.created ? new Date(prompt.created) : null;
      const updated = prompt.user_updated
        ? new Date(prompt.user_updated)
        : null;
      if (!created || isNaN(created.getTime())) return false;
      if (!updated || isNaN(updated.getTime())) return false;
      return true;
    })
    .map((prompt) => ({
      id: createId("hpr"),
      type: prompt.type,
      prompt: prompt.prompt!, // guaranteed by .filter() above
      answerText: prompt.text ?? null,
      answerOptions: prompt.options ? prompt.options.join(", ") : null,
      createdPromptAt: new Date(prompt.created),
      updatedPromptAt: new Date(prompt.user_updated),
      hingeProfileId: hingeProfileId,
    }));
}
