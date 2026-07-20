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
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import {
  getEarliestHingeAccountSignup,
  getForwardHingeAccountMergePeriod,
} from "@/lib/hinge/account-period";
import { fetchVerifiedHingeBlob } from "./hinge-blob.service";
import { transformHingeJsonToProfile } from "./hinge-transform.service";
import { createHingeMessagesAndMatches } from "./hinge-messages.service";
import { createHingeProfileMeta } from "./hinge-meta.service";
import {
  transformHingePromptsForDb,
  type HingeProfileResult,
} from "./hinge.service";
import {
  appendHingeCrossAccountMatchOrders,
  prepareHingeAdditiveRows,
  getHingeMatchTimestampIdentity,
  type ExistingMatchByMatchedAt,
  type InteractionBackfill,
  type MatchBackfill,
  type MessageBackfill,
  type MessageSequenceUpdate,
} from "./hinge-additive-rows";
import { filterHingeJsonByConsent } from "@/lib/utils/filterHingePayload";
import {
  lockHingeProfileUploadsInTx,
  lockHingeProviderMutationsInTx,
} from "./hinge-upload-lock";
import { transformHingeMediaToDb } from "./hinge-media.service";
import { shouldApplyHingeProfileSnapshot } from "./hinge-profile-snapshot";
import { hingeProfileOwnedBy } from "./hinge-ownership";
import {
  cleanupCommittedTransientUpload,
  lockTransientUploadForMutationInTx,
  markTransientUploadCommittedInTx,
  type TransientUploadBinding,
} from "../transient-upload.service";

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
    throw new Error(`Failed to fetch profile for meta computation: ${hingeId}`);
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

async function refreshExistingHingeRows(
  tx: TransactionClient,
  matchBackfills: MatchBackfill[],
  messageBackfills: MessageBackfill[],
  messageSequenceUpdates: MessageSequenceUpdate[],
  interactionBackfills: InteractionBackfill[],
): Promise<{
  matchCount: number;
  messageCount: number;
  interactionCount: number;
}> {
  let matchCount = 0;
  let messageCount = 0;
  let interactionCount = 0;

  for (const { id, row: match } of matchBackfills) {
    await tx
      .update(matchTable)
      .set({
        order: match.order,
        totalMessageCount: match.totalMessageCount,
        textCount: match.textCount,
        gifCount: match.gifCount,
        gestureCount: match.gestureCount,
        otherMessageTypeCount: match.otherMessageTypeCount,
        initialMessageAt: match.initialMessageAt,
        lastMessageAt: match.lastMessageAt,
        responseTimeMedianSeconds: match.responseTimeMedianSeconds,
        conversationDurationDays: match.conversationDurationDays,
        messageImbalanceRatio: match.messageImbalanceRatio,
        longestGapHours: match.longestGapHours,
        didMatchReply: match.didMatchReply,
        lastMessageFrom: match.lastMessageFrom,
        like: match.like,
        likedAt: match.likedAt,
        weMet: match.weMet,
      })
      .where(eq(matchTable.id, id));
    matchCount++;
  }

  for (const { id, row: message } of messageBackfills) {
    await tx
      .update(messageTable)
      .set({
        messageType: message.messageType,
        to: message.to,
        sentDateRaw: message.sentDateRaw,
        content: message.content,
        charCount: message.charCount,
        contentRaw: message.contentRaw,
        type: message.type,
        gifUrl: message.gifUrl,
        order: message.order,
        timeSinceLastMessage: message.timeSinceLastMessage,
        timeSinceLastMessageRelative: message.timeSinceLastMessageRelative,
      })
      .where(eq(messageTable.id, id));
    messageCount++;
  }

  for (const { id, metrics } of messageSequenceUpdates) {
    await tx.update(messageTable).set(metrics).where(eq(messageTable.id, id));
    messageCount++;
  }

  for (const { id, row: interaction } of interactionBackfills) {
    await tx
      .update(hingeInteractionTable)
      .set({
        matchId: interaction.matchId ?? null,
        threadOrigin: interaction.threadOrigin,
        threadState: interaction.threadState,
      })
      .where(eq(hingeInteractionTable.id, id));
    interactionCount++;
  }

  return { matchCount, messageCount, interactionCount };
}

/**
 * Same-account additive: Merge new data into existing Hinge profile
 * Used when user uploads newer export of same hingeId
 *
 * Flow:
 * 1. Update profile metadata (demographics, preferences, etc.)
 * 2. Pair existing matches by timestamp and multiplicity; insert the remainder
 * 3. Insert new matches + their messages
 * 4. Merge interactions with occurrence-aware timestamp deduplication
 * 5. Replace prompts (delete old, insert new - represents current state)
 * 6. Merge media, or delete prior photos when consent is withdrawn
 * 7. Recompute ProfileMeta from all matches/interactions
 * 8. Store original file
 */
export async function additiveUpdateHingeProfile(data: {
  hingeId: string;
  blobUrl: string;
  userId: string;
  timezone?: string;
  country?: string;
  consentPhotos?: boolean;
  consentWork?: boolean;
  consumeBlob?: boolean;
  verifiedJson?: AnonymizedHingeDataJSON;
  transientUpload?: TransientUploadBinding;
}): Promise<HingeProfileResult> {
  const startTime = Date.now();

  console.log(`\n📊 Additive update for Hinge profile: ${data.hingeId}`);
  console.log(`   User ID: ${data.userId}`);

  // Fetch JSON from blob storage
  const fetchStart = Date.now();
  const verifiedHingeJson =
    data.verifiedJson ??
    (await fetchVerifiedHingeBlob(data.blobUrl, data.hingeId, {
      consume: data.consumeBlob ?? false,
    }));
  const anonymizedHingeJson = filterHingeJsonByConsent(verifiedHingeJson, {
    sharePhotos: data.consentPhotos ?? true,
    shareWorkInfo: data.consentWork ?? true,
  });
  console.log(`   ✓ Blob fetched (${Date.now() - fetchStart}ms)`);

  const jsonString = JSON.stringify(anonymizedHingeJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);

  const result = await withTransaction(async (tx) => {
    await lockTransientUploadForMutationInTx(tx, data.transientUpload);
    await lockHingeProviderMutationsInTx(tx);
    await lockHingeProfileUploadsInTx(tx, [data.hingeId]);
    // 1. Update profile metadata
    const transformStart = Date.now();
    const profileData = transformHingeJsonToProfile(anonymizedHingeJson, {
      hingeId: data.hingeId,
      userId: data.userId,
      timezone: data.timezone,
      country: data.country,
    });
    const existingProfileState = await tx.query.hingeProfileTable.findFirst({
      where: hingeProfileOwnedBy(data.hingeId, data.userId),
      columns: {
        createDate: true,
        firstAccountCreateDate: true,
        lastSeenAt: true,
        workplaces: true,
        workplacesDisplayed: true,
        jobTitle: true,
        jobTitleDisplayed: true,
      },
    });
    if (!existingProfileState) {
      throw new Error(
        `Failed to update Hinge profile ${data.hingeId}: ownership changed before processing.`,
      );
    }
    const firstAccountCreateDate = getEarliestHingeAccountSignup(
      existingProfileState,
      profileData.createDate,
    );
    const applyCurrentSnapshot = shouldApplyHingeProfileSnapshot(
      existingProfileState.lastSeenAt,
      profileData.lastSeenAt!,
    );
    const profilePrivacyChanged =
      data.consentWork === false &&
      ((existingProfileState.workplaces?.length ?? 0) > 0 ||
        existingProfileState.workplacesDisplayed ||
        existingProfileState.jobTitle.length > 0 ||
        existingProfileState.jobTitleDisplayed);
    console.log(
      `   ✓ Profile data transformed (${Date.now() - transformStart}ms)`,
    );

    const updateStart = Date.now();
    const [updatedProfile] = await tx
      .update(hingeProfileTable)
      .set({
        ...(applyCurrentSnapshot
          ? profileData
          : data.consentWork === false
            ? {
                workplaces: [],
                workplacesDisplayed: false,
                jobTitle: "",
                jobTitleDisplayed: false,
              }
            : {}),
        firstAccountCreateDate,
        updatedAt: new Date(),
      })
      .where(hingeProfileOwnedBy(data.hingeId, data.userId))
      .returning();
    if (!updatedProfile) {
      throw new Error(
        `Failed to update Hinge profile ${data.hingeId}: ownership changed before processing.`,
      );
    }
    console.log(
      `   ✓ Profile metadata updated (${Date.now() - updateStart}ms)`,
    );

    // 2. Process new matches and messages
    const matchStart = Date.now();
    const { interactionsInput, matchesInput, messagesInput } =
      createHingeMessagesAndMatches(anonymizedHingeJson.Matches, data.hingeId);

    // Fetch existing match timestamps for deduplication
    const existingMatches = await tx.query.matchTable.findMany({
      where: eq(matchTable.hingeProfileId, data.hingeId),
      columns: {
        id: true,
        matchedAt: true,
        order: true,
        like: true,
        match: true,
        likedAt: true,
        weMet: true,
      },
      orderBy: (matches, { asc }) => [asc(matches.order)],
    });
    const existingMatchesByMatchedAt: ExistingMatchByMatchedAt = new Map();
    for (const match of existingMatches) {
      const key = getHingeMatchTimestampIdentity(match);
      if (!key) continue;
      const ids = existingMatchesByMatchedAt.get(key) ?? [];
      ids.push({
        id: match.id,
        like: match.like,
        match: match.match,
        likedAt: match.likedAt,
        matchedAt: match.matchedAt,
        weMet: match.weMet,
      });
      existingMatchesByMatchedAt.set(key, ids);
    }
    const existingMessages = await tx.query.messageTable.findMany({
      where: eq(messageTable.hingeProfileId, data.hingeId),
      columns: {
        id: true,
        matchId: true,
        sentDate: true,
        sentDateRaw: true,
        messageType: true,
        contentRaw: true,
        order: true,
        timeSinceLastMessage: true,
        timeSinceLastMessageRelative: true,
      },
      orderBy: (messages, { asc }) => [asc(messages.id)],
    });

    const existingInteractions = await tx.query.hingeInteractionTable.findMany({
      where: eq(hingeInteractionTable.hingeProfileId, data.hingeId),
      columns: {
        id: true,
        type: true,
        timestamp: true,
        timestampRaw: true,
        matchId: true,
        comment: true,
        threadOrigin: true,
        threadState: true,
      },
      orderBy: (interactions, { asc }) => [asc(interactions.id)],
    });

    const {
      matchesToInsert,
      messagesToInsert,
      interactionsToInsert,
      matchBackfills,
      messageBackfills,
      messageSequenceUpdates,
      interactionBackfills,
      matchEvidenceConflicts,
    } = prepareHingeAdditiveRows(
      existingMatchesByMatchedAt,
      existingMessages,
      existingInteractions,
      matchesInput,
      messagesInput,
      interactionsInput,
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
    if (matchEvidenceConflicts.length > 0) {
      console.warn("Hinge additive evidence conflicts", matchEvidenceConflicts);
    }

    // 3. Process new interactions (additive - historical events)
    const interactionStart = Date.now();
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

    const backfillStart = Date.now();
    const refreshed = await refreshExistingHingeRows(
      tx,
      matchBackfills,
      messageBackfills,
      messageSequenceUpdates,
      interactionBackfills,
    );
    console.log(
      `   ✓ Existing rows refreshed: ${refreshed.matchCount} matches, ${refreshed.messageCount} messages, ${refreshed.interactionCount} interactions (${Date.now() - backfillStart}ms)`,
    );

    // 4. Replace prompts only when prompts.json was actually included.
    // REVIEW(provider assumption): a Hinge export can omit optional sidecars;
    // omission is not evidence that the user's current prompt set is empty.
    const promptStart = Date.now();
    let promptsInput: ReturnType<typeof transformHingePromptsForDb> = [];
    if (anonymizedHingeJson.Prompts !== undefined) {
      await tx
        .delete(hingePromptTable)
        .where(eq(hingePromptTable.hingeProfileId, data.hingeId));

      promptsInput = transformHingePromptsForDb(
        anonymizedHingeJson.Prompts,
        data.hingeId,
      );
      if (promptsInput.length > 0) {
        await tx.insert(hingePromptTable).values(promptsInput);
      }
    }
    console.log(
      anonymizedHingeJson.Prompts === undefined
        ? `   ✓ Prompts preserved (sidecar omitted) (${Date.now() - promptStart}ms)`
        : `   ✓ Prompts replaced: ${promptsInput.length} (${Date.now() - promptStart}ms)`,
    );

    // 5. Merge media, or honor a later withdrawal by deleting prior rows.
    const mediaStart = Date.now();
    let removedPhotoCount = 0;
    let existingPhotoCount = 0;
    let newMediaInput: ReturnType<typeof transformHingeMediaToDb> = [];

    if (data.consentPhotos === false) {
      const removedMedia = await tx
        .delete(mediaTable)
        .where(eq(mediaTable.hingeProfileId, data.hingeId))
        .returning({ id: mediaTable.id });
      removedPhotoCount = removedMedia.length;
    } else {
      const existingMedia = await tx.query.mediaTable.findMany({
        where: eq(mediaTable.hingeProfileId, data.hingeId),
        columns: { url: true },
      });
      existingPhotoCount = existingMedia.length;
      const existingMediaUrls = new Set(
        existingMedia.map((media) => media.url),
      );

      newMediaInput = transformHingeMediaToDb(
        anonymizedHingeJson.Media ?? [],
        data.hingeId,
      ).filter((media) => !existingMediaUrls.has(media.url));

      if (newMediaInput.length > 0) {
        await tx.insert(mediaTable).values(newMediaInput);
      }
    }
    console.log(
      `   ✓ Media reconciled: ${newMediaInput.length} new, ${removedPhotoCount} removed (${Date.now() - mediaStart}ms)`,
    );

    // 6. Recompute profile meta
    const metaStart = Date.now();
    await recomputeHingeProfileMetaInTx(tx, data.hingeId);
    console.log(`   ✓ Profile meta recomputed (${Date.now() - metaStart}ms)`);

    // 7. Store original file reference (blob URL only)
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "HINGE",
      swipestatsVersion: "SWIPESTATS_4",
      file: null, // No longer storing raw JSON
      blobUrl: null, // Verified upload blobs are transient and consumed.
      userId: data.userId,
    });

    // Check if this was an idempotent update (no new data)
    if (
      matchesToInsert.length === 0 &&
      messagesToInsert.length === 0 &&
      interactionsToInsert.length === 0 &&
      removedPhotoCount === 0 &&
      newMediaInput.length === 0 &&
      !profilePrivacyChanged
    ) {
      console.log(
        `   ℹ️  No new data detected - upload was idempotent (same file re-uploaded)`,
      );
    }

    await markTransientUploadCommittedInTx(
      tx,
      data.transientUpload,
      data.hingeId,
    );

    return {
      profile: updatedProfile,
      matchCount: matchesToInsert.length,
      messageCount: messagesToInsert.length,
      interactionCount: interactionsToInsert.length,
      photoCount: newMediaInput.length,
      hasPhotos: existingPhotoCount + newMediaInput.length > 0,
      promptCount: promptsInput.length,
      // Same export re-uploaded: nothing new merged in.
      isNoOp:
        matchesToInsert.length === 0 &&
        messagesToInsert.length === 0 &&
        interactionsToInsert.length === 0 &&
        removedPhotoCount === 0 &&
        newMediaInput.length === 0 &&
        !profilePrivacyChanged,
    };
  });
  await cleanupCommittedTransientUpload(data.transientUpload?.id);

  const totalTime = Date.now() - startTime;
  console.log(`\n✅ Additive update complete for Hinge ${data.hingeId}`);
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  return {
    profile: result.profile,
    isNoOp: result.isNoOp,
    metrics: {
      processingTimeMs: totalTime,
      matchCount: result.matchCount,
      messageCount: result.messageCount,
      photoCount: result.photoCount,
      promptCount: result.promptCount,
      interactionCount: result.interactionCount,
      hasPhotos: result.hasPhotos,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

/**
 * Cross-account merge: Absorb old Hinge profile's data into new profile
 * Used when user uploads JSON with different hingeId than existing profile
 *
 * Flow:
 * 1. Fetch old profile
 * 2. Temporarily set old profile's userId to NULL (frees unique constraint)
 * 3. Transform and prepare new profile data
 * 4. Insert new profile with combined date range (userId is now free!)
 * 5. Transfer all matches/messages/interactions from old → new profile ID
 * 6. Delete old profile (cascade handles profileMeta, prompts)
 * 7. Insert new matches/messages (no dedup - different accounts)
 * 8. Insert new interactions
 * 9. Insert new prompts
 * 10. Insert new media
 * 11. Recompute ProfileMeta
 * 12. Store original file
 */
export async function absorbHingeProfileIntoNew(data: {
  oldHingeId: string;
  newHingeId: string;
  blobUrl: string;
  userId: string;
  timezone?: string;
  country?: string;
  consentPhotos?: boolean;
  consentWork?: boolean;
  consumeBlob?: boolean;
  verifiedJson?: AnonymizedHingeDataJSON;
  transientUpload?: TransientUploadBinding;
}): Promise<HingeProfileResult> {
  const startTime = Date.now();

  console.log(
    `\n🔄 Cross-account merge: ${data.oldHingeId} → ${data.newHingeId}`,
  );
  console.log(`   User ID: ${data.userId}`);

  // Fetch JSON from blob storage
  const fetchStart = Date.now();
  const verifiedHingeJson =
    data.verifiedJson ??
    (await fetchVerifiedHingeBlob(data.blobUrl, data.newHingeId, {
      consume: data.consumeBlob ?? false,
    }));
  const anonymizedHingeJson = filterHingeJsonByConsent(verifiedHingeJson, {
    sharePhotos: data.consentPhotos ?? true,
    shareWorkInfo: data.consentWork ?? true,
  });
  console.log(`   ✓ Blob fetched (${Date.now() - fetchStart}ms)`);

  const jsonString = JSON.stringify(anonymizedHingeJson);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
  console.log(`   JSON size: ${jsonSizeMB} MB`);

  const result = await withTransaction(async (tx) => {
    await lockTransientUploadForMutationInTx(tx, data.transientUpload);
    await lockHingeProviderMutationsInTx(tx);
    await lockHingeProfileUploadsInTx(tx, [data.oldHingeId, data.newHingeId]);
    // 1. Get old profile for reference
    const fetchOldStart = Date.now();
    const oldProfile = await tx.query.hingeProfileTable.findFirst({
      where: hingeProfileOwnedBy(data.oldHingeId, data.userId),
    });

    if (!oldProfile) {
      throw new Error(
        `Cross-account merge rejected: source profile ${data.oldHingeId} was not found for this user; ownership may have changed before processing.`,
      );
    }
    const existingTargetProfile = await tx.query.hingeProfileTable.findFirst({
      where: eq(hingeProfileTable.hingeId, data.newHingeId),
      columns: { hingeId: true },
    });
    if (existingTargetProfile) {
      throw new Error(
        `Cross-account merge rejected: target profile ${data.newHingeId} already exists.`,
      );
    }
    console.log(`   ✓ Fetched old profile (${Date.now() - fetchOldStart}ms)`);

    // 2. Temporarily clear userId on old profile to free unique constraint
    const unlinkStart = Date.now();
    const [unlinkedProfile] = await tx
      .update(hingeProfileTable)
      .set({ userId: null })
      .where(hingeProfileOwnedBy(data.oldHingeId, data.userId))
      .returning({ hingeId: hingeProfileTable.hingeId });
    if (!unlinkedProfile) {
      throw new Error(
        `Cross-account merge rejected: source profile ${data.oldHingeId} ownership changed before it could be unlinked.`,
      );
    }
    console.log(
      `   ✓ Unlinked old profile from user (${Date.now() - unlinkStart}ms)`,
    );

    // 3. Transform and prepare new profile data
    const transformStart = Date.now();
    const newProfileData = transformHingeJsonToProfile(anonymizedHingeJson, {
      hingeId: data.newHingeId,
      userId: data.userId,
      timezone: data.timezone,
      country: data.country,
    });

    const accountPeriod = getForwardHingeAccountMergePeriod(
      oldProfile,
      newProfileData.createDate,
    );

    console.log(`   ✓ Profile transformed (${Date.now() - transformStart}ms)`);

    // 4. Insert new profile (userId is now free!)
    const profileStart = Date.now();
    const [insertedProfile] = await tx
      .insert(hingeProfileTable)
      .values({
        ...newProfileData,
        // Keep the new/current account signup for the next order check while
        // separately retaining the earliest signup across absorbed history.
        ...accountPeriod,
      })
      .returning();
    if (!insertedProfile) {
      throw new Error(`Failed to insert profile: ${data.newHingeId}`);
    }
    console.log(`   ✓ New profile inserted (${Date.now() - profileStart}ms)`);

    // 5. Transfer all data from old → new profile ID
    const transferStart = Date.now();

    await tx
      .update(matchTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(matchTable.hingeProfileId, data.oldHingeId));

    await tx
      .update(messageTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(messageTable.hingeProfileId, data.oldHingeId));

    await tx
      .update(hingeInteractionTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(hingeInteractionTable.hingeProfileId, data.oldHingeId));

    let transferredPhotoCount = 0;
    let transferredPromptCount = 0;
    if (data.consentPhotos === false) {
      await tx
        .delete(mediaTable)
        .where(eq(mediaTable.hingeProfileId, data.oldHingeId));
    } else {
      const transferredMedia = await tx
        .update(mediaTable)
        .set({ hingeProfileId: data.newHingeId })
        .where(eq(mediaTable.hingeProfileId, data.oldHingeId))
        .returning({ id: mediaTable.id });
      transferredPhotoCount = transferredMedia.length;
    }

    await tx
      .update(customDataTable)
      .set({ hingeProfileId: data.newHingeId })
      .where(eq(customDataTable.hingeProfileId, data.oldHingeId));

    // Preserve historical prompts across an account-history merge when the
    // new upload omitted prompts.json. If the sidecar is present, its current
    // state replaces the old account's rows after the old profile is deleted.
    if (anonymizedHingeJson.Prompts === undefined) {
      const transferredPrompts = await tx
        .update(hingePromptTable)
        .set({ hingeProfileId: data.newHingeId })
        .where(eq(hingePromptTable.hingeProfileId, data.oldHingeId))
        .returning({ id: hingePromptTable.id });
      transferredPromptCount = transferredPrompts.length;
    }

    console.log(
      `   ✓ Transferred all data to new profile (${Date.now() - transferStart}ms)`,
    );

    // 6. Delete old profile (cascade will handle profileMeta, prompts)
    const deleteStart = Date.now();
    const deletedProfiles = await tx
      .delete(hingeProfileTable)
      .where(eq(hingeProfileTable.hingeId, data.oldHingeId))
      .returning({ hingeId: hingeProfileTable.hingeId });
    if (deletedProfiles.length !== 1) {
      throw new Error(
        `Cross-account merge failed: source profile ${data.oldHingeId} disappeared before deletion.`,
      );
    }
    console.log(`   ✓ Deleted old profile (${Date.now() - deleteStart}ms)`);

    // 7. Insert new matches + messages (NO dedup - different accounts have different match semantics)
    const matchStart = Date.now();
    const { interactionsInput, matchesInput, messagesInput } =
      createHingeMessagesAndMatches(
        anonymizedHingeJson.Matches,
        data.newHingeId,
      );

    const retainedMatchOrders = await tx
      .select({ order: matchTable.order })
      .from(matchTable)
      .where(eq(matchTable.hingeProfileId, data.newHingeId));
    const rebasedMatchesInput = appendHingeCrossAccountMatchOrders(
      retainedMatchOrders.map((match) => match.order),
      matchesInput,
    );

    if (rebasedMatchesInput.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < rebasedMatchesInput.length; i += BATCH_SIZE) {
        const batch = rebasedMatchesInput.slice(i, i + BATCH_SIZE);
        await tx.insert(matchTable).values(batch);
      }
      console.log(
        `   ✓ ${rebasedMatchesInput.length} new matches inserted (${Date.now() - matchStart}ms)`,
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

    // 8. Insert new interactions
    if (interactionsInput.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < interactionsInput.length; i += BATCH_SIZE) {
        const batch = interactionsInput.slice(i, i + BATCH_SIZE);
        await tx.insert(hingeInteractionTable).values(batch);
      }
      console.log(`   ✓ ${interactionsInput.length} new interactions inserted`);
    }

    // 9. Insert prompts
    const promptsStart = Date.now();
    const promptsInput = transformHingePromptsForDb(
      anonymizedHingeJson.Prompts ?? [],
      data.newHingeId,
    );
    if (promptsInput.length > 0) {
      await tx.insert(hingePromptTable).values(promptsInput);
      console.log(
        `   ✓ ${promptsInput.length} prompts inserted (${Date.now() - promptsStart}ms)`,
      );
    }

    // 10. Insert new photos
    const photosStart = Date.now();
    const retainedMedia = await tx.query.mediaTable.findMany({
      where: eq(mediaTable.hingeProfileId, data.newHingeId),
      columns: { url: true },
    });
    const retainedMediaUrls = new Set(retainedMedia.map((media) => media.url));
    const photosInput = transformHingeMediaToDb(
      anonymizedHingeJson.Media ?? [],
      data.newHingeId,
    ).filter((media) => !retainedMediaUrls.has(media.url));
    if (photosInput.length > 0) {
      await tx.insert(mediaTable).values(photosInput);
      console.log(
        `   ✓ ${photosInput.length} photos inserted (${Date.now() - photosStart}ms)`,
      );
    }

    // 11. Recompute profile meta with all combined data
    const metaStart = Date.now();
    await recomputeHingeProfileMetaInTx(tx, data.newHingeId);
    console.log(`   ✓ Profile meta computed (${Date.now() - metaStart}ms)`);

    // 12. Store original file reference (blob URL only)
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "HINGE",
      swipestatsVersion: "SWIPESTATS_4",
      file: null, // No longer storing raw JSON
      blobUrl: null, // Verified upload blobs are transient and consumed.
      userId: data.userId,
    });

    await markTransientUploadCommittedInTx(
      tx,
      data.transientUpload,
      data.newHingeId,
    );

    return {
      profile: insertedProfile,
      matchCount: matchesInput.length,
      messageCount: messagesInput.length,
      interactionCount: interactionsInput.length,
      photoCount: photosInput.length,
      hasPhotos: transferredPhotoCount + photosInput.length > 0,
      promptCount: transferredPromptCount + promptsInput.length,
    };
  });
  await cleanupCommittedTransientUpload(data.transientUpload?.id);

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
      hasPhotos: result.hasPhotos,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}
