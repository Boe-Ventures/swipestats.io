import { and, eq, inArray, sql } from "drizzle-orm";
import { formatDistance } from "date-fns";

import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { normalizeTinderUsageDateKey } from "@/lib/profile.utils";
import { assertTinderProfileIdMatchesExport } from "@/lib/upload/tinder-profile-id";
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
  type MediaInsert,
  type Message,
  type MessageInsert,
  type TinderUsage,
  type TinderUsageInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { computeProfileMeta } from "./meta.service";
import {
  computeTinderMatchDerivedMetrics,
  createMessagesAndMatches,
  type TinderMatchDerivedMetrics,
} from "./messages.service";
import { transformTinderJsonToProfile } from "./transform.service";
import {
  assertTinderDataMatchesConsent,
  loadVerifiedAnonymizedTinderData,
  tinderBirthDatesMatch,
} from "./validation.service";
import {
  createUsageRecords,
  getTinderUsageMetricPresence,
  type TinderUsageMetricPresence,
} from "./usage.service";
import {
  type TinderProfileResult,
  transformTinderPhotosToMedia,
} from "./profile.service";
import {
  lockTinderProfileUploadInTx,
  lockTinderSwipeRankMutationsInTx,
  purgeTinderSwipeRankProfilesInTx,
  scheduleTinderSwipeRankRefresh,
} from "../swipe-rank/lifecycle.service";
import { invalidatePublicSwipeRankCache } from "../swipe-rank/public-cache";
import {
  cleanupCommittedTransientUpload,
  lockTransientUploadForMutationInTx,
  markTransientUploadCommittedInTx,
  type TransientUploadBinding,
} from "../transient-upload.service";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

type TinderCreateDateSnapshot = {
  createDate: Date;
  createDateSource: "PROVIDER" | "INFERRED_FROM_USAGE" | null;
};

type TinderCreateDateCandidate = {
  createDate: Date;
  createDateSource?: "PROVIDER" | "INFERRED_FROM_USAGE" | null;
};

/** Keep a stronger stored signup claim when a later export only infers one. */
export function reconcileTinderCreateDateSnapshot(
  existing: TinderCreateDateSnapshot,
  incoming: TinderCreateDateCandidate,
): TinderCreateDateSnapshot {
  if (incoming.createDateSource === "PROVIDER") {
    return { createDate: incoming.createDate, createDateSource: "PROVIDER" };
  }
  if (
    existing.createDateSource === "INFERRED_FROM_USAGE" &&
    incoming.createDateSource === "INFERRED_FROM_USAGE"
  ) {
    return {
      createDate: incoming.createDate,
      createDateSource: "INFERRED_FROM_USAGE",
    };
  }

  // REVIEW(provider assumption): an inferred earliest-usage date is weaker
  // evidence than a provider signup timestamp. Legacy null provenance is also
  // intentionally preserved because we cannot prove how that date originated.
  return existing;
}

/**
 * Helper: Upsert usage records in transaction
 * REVIEW(provider assumption): A category included in a newer Tinder export
 * is complete for each touched day. A category omitted from the export is
 * unknown and must retain the previously stored value.
 * Returns the count of inserted or materially changed records.
 */
export function mergeTinderUsageRow(
  existing: TinderUsage | undefined,
  incoming: TinderUsageInsert,
  presence: TinderUsageMetricPresence,
): TinderUsageInsert {
  if (!existing) return incoming;

  const swipeLikes = presence.swipeLikes
    ? incoming.swipeLikes
    : existing.swipeLikes;
  const swipePasses = presence.swipePasses
    ? incoming.swipePasses
    : existing.swipePasses;
  const swipeSuperLikes = presence.superLikes
    ? incoming.swipeSuperLikes
    : existing.swipeSuperLikes;
  const matches = presence.matches ? incoming.matches : existing.matches;
  const messagesSent = presence.messagesSent
    ? incoming.messagesSent
    : existing.messagesSent;
  const messagesReceived = presence.messagesReceived
    ? incoming.messagesReceived
    : existing.messagesReceived;
  const swipesCombined = swipeLikes + swipePasses;
  if (swipesCombined > POSTGRES_INTEGER_MAX) {
    throw new Error(
      "Merged Tinder likes plus passes exceed the database integer range.",
    );
  }

  return {
    ...incoming,
    swipeLikes,
    swipePasses,
    swipeSuperLikes,
    matches,
    messagesSent,
    messagesReceived,
    swipesCombined,
    matchRate: swipeLikes > 0 ? matches / swipeLikes : 0,
    likeRate: swipesCombined > 0 ? swipeLikes / swipesCombined : 0,
    messagesSentRate:
      messagesSent + messagesReceived > 0
        ? messagesSent / (messagesSent + messagesReceived)
        : 0,
    responseRate: messagesReceived > 0 ? messagesSent / messagesReceived : 0,
    engagementRate:
      incoming.appOpens > 0
        ? (swipeLikes + swipePasses + messagesSent) / incoming.appOpens
        : 0,
  };
}

export function planTinderMediaReconciliation(
  existingUrls: Iterable<string>,
  incoming: MediaInsert[],
  consentPhotos: boolean,
): {
  removeExisting: boolean;
  rowsToInsert: MediaInsert[];
  hasPhotosAfter: boolean;
} {
  if (!consentPhotos) {
    return { removeExisting: true, rowsToInsert: [], hasPhotosAfter: false };
  }

  const knownUrls = new Set(existingUrls);
  const rowsToInsert = incoming.filter((photo) => {
    if (knownUrls.has(photo.url)) return false;
    knownUrls.add(photo.url);
    return true;
  });
  return {
    removeExisting: false,
    rowsToInsert,
    hasPhotosAfter: knownUrls.size > 0,
  };
}

/**
 * Resolve touched usage rows by Tinder's canonical calendar-day key before any
 * mutation occurs. Legacy SWIPESTATS_3 rows can use an ISO timestamp as their
 * primary-key component; merging against only the new `YYYY-MM-DD` key would
 * discard omitted metrics when that legacy row is deleted.
 *
 * REVIEW(provider assumption): Different raw usage keys that normalize to the
 * same Tinder calendar day are ambiguous source buckets. Refuse the upload
 * instead of guessing whether they are duplicates or should be summed.
 */
export function planTinderUsageReconciliation(
  existingRows: TinderUsage[],
  newUsage: TinderUsageInsert[],
  presence: TinderUsageMetricPresence,
): {
  rowsToUpsert: TinderUsageInsert[];
  legacyDateKeysToDelete: string[];
} {
  const incomingByCanonicalDate = new Map<string, TinderUsageInsert>();

  for (const row of newUsage) {
    const canonicalDate = normalizeTinderUsageDateKey(row.dateStampRaw);
    if (incomingByCanonicalDate.has(canonicalDate)) {
      throw new Error(
        `Multiple incoming Tinder usage keys resolve to ${canonicalDate}`,
      );
    }
    incomingByCanonicalDate.set(canonicalDate, {
      ...row,
      dateStampRaw: canonicalDate,
      dateStamp: new Date(`${canonicalDate}T00:00:00.000Z`),
    });
  }

  const existingByCanonicalDate = new Map<string, TinderUsage[]>();
  for (const row of existingRows) {
    const canonicalDate = normalizeTinderUsageDateKey(row.dateStampRaw);
    if (!incomingByCanonicalDate.has(canonicalDate)) continue;

    const rowsForDay = existingByCanonicalDate.get(canonicalDate) ?? [];
    rowsForDay.push(row);
    existingByCanonicalDate.set(canonicalDate, rowsForDay);
  }

  const legacyDateKeysToDelete: string[] = [];
  const rowsToUpsert = [...incomingByCanonicalDate.entries()].map(
    ([canonicalDate, incoming]) => {
      const existingForDay = existingByCanonicalDate.get(canonicalDate) ?? [];
      if (existingForDay.length > 1) {
        const rawKeys = existingForDay
          .map((row) => row.dateStampRaw)
          .sort((a, b) => a.localeCompare(b));
        throw new Error(
          `Multiple stored Tinder usage keys resolve to ${canonicalDate}: ${rawKeys.join(", ")}`,
        );
      }

      const existing = existingForDay[0];
      if (existing && existing.dateStampRaw !== canonicalDate) {
        legacyDateKeysToDelete.push(existing.dateStampRaw);
      }
      return mergeTinderUsageRow(existing, incoming, presence);
    },
  );

  return { rowsToUpsert, legacyDateKeysToDelete };
}

async function upsertUsageRecordsInTx(
  tx: TransactionClient,
  tinderId: string,
  newUsage: TinderUsageInsert[],
  presence: TinderUsageMetricPresence,
): Promise<number> {
  if (newUsage.length === 0) {
    return 0;
  }

  // Load full touched candidates before removing any legacy raw key. The
  // planner needs those values to preserve categories omitted by this export.
  const existingRows = await tx.query.tinderUsageTable.findMany({
    where: eq(tinderUsageTable.tinderProfileId, tinderId),
  });
  const { rowsToUpsert, legacyDateKeysToDelete } =
    planTinderUsageReconciliation(existingRows, newUsage, presence);

  if (legacyDateKeysToDelete.length > 0) {
    await tx
      .delete(tinderUsageTable)
      .where(
        and(
          eq(tinderUsageTable.tinderProfileId, tinderId),
          inArray(tinderUsageTable.dateStampRaw, legacyDateKeysToDelete),
        ),
      );
  }

  const mergedUsage = rowsToUpsert;

  let usageInserted = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < mergedUsage.length; i += BATCH_SIZE) {
    const batch = mergedUsage.slice(i, i + BATCH_SIZE);
    const changedRows = await tx
      .insert(tinderUsageTable)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          tinderUsageTable.dateStampRaw,
          tinderUsageTable.tinderProfileId,
        ],
        set: {
          // Newer export has most complete data - just overwrite
          dateStamp: sql`excluded.date_stamp`,
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
        setWhere: sql`
          ROW(
            app_opens,
            swipe_likes,
            swipe_passes,
            swipe_super_likes,
            matches,
            messages_sent,
            messages_received,
            swipes_combined,
            match_rate,
            like_rate,
            messages_sent_rate,
            response_rate,
            engagement_rate,
            user_age_this_day,
            date_stamp
          ) IS DISTINCT FROM ROW(
            excluded.app_opens,
            excluded.swipe_likes,
            excluded.swipe_passes,
            excluded.swipe_super_likes,
            excluded.matches,
            excluded.messages_sent,
            excluded.messages_received,
            excluded.swipes_combined,
            excluded.match_rate,
            excluded.like_rate,
            excluded.messages_sent_rate,
            excluded.response_rate,
            excluded.engagement_rate,
            excluded.user_age_this_day,
            excluded.date_stamp
          )
        `,
      })
      .returning({ dateStampRaw: tinderUsageTable.dateStampRaw });
    usageInserted += changedRows.length;
  }

  return usageInserted;
}

/**
 * Keep the profile-level observed range aligned with the union of every usage
 * row retained across additive uploads. New exports can be narrower than an
 * older export; overwriting the profile range would otherwise hide valid rows
 * from legacy all-time consumers.
 */
async function syncObservedUsageRangeInTx(
  tx: TransactionClient,
  tinderId: string,
): Promise<void> {
  await tx.execute(sql`
    UPDATE tinder_profile AS profile
    SET
      first_day_on_app = bounds.first_day,
      last_day_on_app = bounds.last_day,
      days_in_profile_period =
        (bounds.last_day::date - bounds.first_day::date) + 1,
      age_at_last_usage = extract(
        year FROM age(bounds.last_day::date, profile.birth_date::date)
      )::int
    FROM (
      SELECT
        min(left(date_stamp_raw, 10)::date)::timestamp AS first_day,
        max(left(date_stamp_raw, 10)::date)::timestamp AS last_day
      FROM tinder_usage
      WHERE tinder_profile_id = ${tinderId}
    ) AS bounds
    WHERE profile.tinder_id = ${tinderId}
      AND bounds.first_day IS NOT NULL
      AND bounds.last_day IS NOT NULL
  `);
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
  consentPhotos?: boolean;
  consentWork?: boolean;
  consumeBlob?: boolean;
  verifiedTinderJson?: AnonymizedTinderDataJSON;
  transientUpload?: TransientUploadBinding;
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  const anonymizedTinderJson =
    data.verifiedTinderJson ??
    (await loadVerifiedAnonymizedTinderData(
      data.blobUrl,
      data.newTinderId,
      {
        photos: data.consentPhotos ?? true,
        work: data.consentWork ?? true,
      },
      { consume: data.consumeBlob ?? false },
    ));
  if (data.verifiedTinderJson) {
    await assertTinderProfileIdMatchesExport(
      data.newTinderId,
      data.verifiedTinderJson,
    );
    assertTinderDataMatchesConsent(data.verifiedTinderJson, {
      photos: data.consentPhotos ?? true,
      work: data.consentWork ?? true,
    });
  }

  console.log(
    `\n🔄 Cross-account merge: ${data.oldTinderId} → ${data.newTinderId}`,
  );
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(anonymizedTinderJson);
  const jsonSizeMB = (
    Buffer.byteLength(jsonString, "utf8") /
    1024 /
    1024
  ).toFixed(2);
  console.log(`   JSON size: ${jsonSizeMB} MB`);

  const profile = await withTransaction(async (tx) => {
    await lockTransientUploadForMutationInTx(tx, data.transientUpload);
    await lockTinderSwipeRankMutationsInTx(tx);
    // Cross-account merges touch two profile identities. Sort the lock keys so
    // concurrent merges cannot deadlock while moving rows between accounts.
    for (const tinderId of [data.oldTinderId, data.newTinderId].sort((a, b) =>
      a.localeCompare(b),
    )) {
      await lockTinderProfileUploadInTx(tx, tinderId);
    }
    await syncObservedUsageRangeInTx(tx, data.oldTinderId);
    // 1. Get old profile to compute combined date range
    const fetchOldStart = Date.now();
    const oldProfile = await tx.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, data.oldTinderId),
    });

    if (!oldProfile) {
      throw new Error(`Old profile not found: ${data.oldTinderId}`);
    }
    if (oldProfile.userId !== data.userId) {
      throw new Error(
        "Cross-account merge rejected: the source profile is no longer owned by this user.",
      );
    }
    const existingTargetProfile = await tx.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, data.newTinderId),
      columns: { tinderId: true },
    });
    if (existingTargetProfile) {
      throw new Error(
        "Cross-account merge rejected: the target profile already exists.",
      );
    }
    if (
      !tinderBirthDatesMatch(
        oldProfile.birthDate,
        anonymizedTinderJson.User.birth_date,
      )
    ) {
      throw new Error(
        "Cross-account merge rejected: the incoming export has a different birth date.",
      );
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

    // REVIEW(provider assumption): account replacement is represented as two
    // sequential, non-overlapping usage histories. If Tinder can keep two
    // accounts active on the same calendar day, that case needs an explicit
    // account-membership model rather than silently merging their day buckets.
    // Until then, quarantine overlapping ranges instead of adding their counts.
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
      .set({
        tinderProfileId: data.newTinderId,
        // REVIEW(provider assumption): Tinder match IDs are account-local.
        // Namespace transferred rows so a later export from the new account
        // cannot collide with an unrelated match from the absorbed account.
        tinderMatchId: sql`
          CASE
            WHEN ${matchTable.tinderMatchId} IS NULL THEN NULL
            ELSE ${`legacy:${data.oldTinderId}:`} || ${matchTable.tinderMatchId}
          END
        `,
      })
      .where(eq(matchTable.tinderProfileId, data.oldTinderId));

    await tx
      .update(messageTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(messageTable.tinderProfileId, data.oldTinderId));

    const oldMedia = await tx.query.mediaTable.findMany({
      where: eq(mediaTable.tinderProfileId, data.oldTinderId),
      columns: { url: true },
    });
    const mediaPlan = planTinderMediaReconciliation(
      oldMedia.map((media) => media.url),
      transformTinderPhotosToMedia(
        anonymizedTinderJson.Photos,
        data.newTinderId,
      ),
      data.consentPhotos ?? true,
    );
    if (mediaPlan.removeExisting) {
      await tx
        .delete(mediaTable)
        .where(eq(mediaTable.tinderProfileId, data.oldTinderId));
    } else {
      await tx
        .update(mediaTable)
        .set({ tinderProfileId: data.newTinderId })
        .where(eq(mediaTable.tinderProfileId, data.oldTinderId));
    }

    await tx
      .update(customDataTable)
      .set({ tinderProfileId: data.newTinderId })
      .where(eq(customDataTable.tinderProfileId, data.oldTinderId));

    console.log(
      `   ✓ Transferred all data to new profile (${Date.now() - transferStart}ms)`,
    );

    // 6. Delete old profile and its provider-specific analytical subject in
    // the same transaction. Live facts and per-person frozen edition entries
    // cascade from the SwipeRank registry row.
    const deleteStart = Date.now();
    await purgeTinderSwipeRankProfilesInTx(tx, [data.oldTinderId]);
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
      getTinderUsageMetricPresence(anonymizedTinderJson.Usage),
    );
    await syncObservedUsageRangeInTx(tx, data.newTinderId);
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

    const retainedMatchOrders = await tx
      .select({ order: matchTable.order })
      .from(matchTable)
      .where(eq(matchTable.tinderProfileId, data.newTinderId));
    let nextMatchOrder =
      retainedMatchOrders.reduce(
        (highest, match) => Math.max(highest, match.order),
        -1,
      ) + 1;
    // REVIEW(provider assumption): the Messages collection has no match-event
    // timestamp. Because cross-account ranges are required to be sequential,
    // append the newer account's provider order after every retained old-account
    // record instead of allowing both zero-based sequences to collide.
    for (const match of matchesInput) {
      match.order = nextMatchOrder++;
    }

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
    const photosInput = mediaPlan.rowsToInsert;
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
      blobUrl: null, // Verified upload blobs are transient and consumed.
      userId: data.userId,
    });

    if (!insertedProfile) {
      throw new Error(`Failed to insert profile: ${data.newTinderId}`);
    }

    await markTransientUploadCommittedInTx(
      tx,
      data.transientUpload,
      data.newTinderId,
    );

    return {
      profile: insertedProfile,
      matchCount: matchesInput.length,
      messageCount: messagesInput.length,
      photoCount: photosInput.length,
      hasPhotos: mediaPlan.hasPhotosAfter,
      usageDays: newUsage.length,
    };
  });

  const totalTime = Date.now() - startTime;
  invalidatePublicSwipeRankCache();
  scheduleTinderSwipeRankRefresh([data.newTinderId]);
  await cleanupCommittedTransientUpload(data.transientUpload?.id);
  console.log(
    `\n✅ Cross-account merge complete: ${data.oldTinderId} → ${data.newTinderId}`,
  );
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  return {
    profile: profile.profile,
    metrics: {
      processingTimeMs: totalTime,
      // Deltas: a merge absorbs a whole other account, so this is all the data
      // it brought in.
      matchCount: profile.matchCount,
      messageCount: profile.messageCount,
      photoCount: profile.photoCount,
      usageDays: profile.usageDays,
      hasPhotos: profile.hasPhotos,
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
  consentPhotos?: boolean;
  consentWork?: boolean;
  consumeBlob?: boolean;
  verifiedTinderJson?: AnonymizedTinderDataJSON;
  /** ID already bound to verifiedTinderJson when retaining a historical ID. */
  verifiedTinderId?: string;
  transientUpload?: TransientUploadBinding;
}): Promise<TinderProfileResult> {
  const startTime = Date.now();

  const anonymizedTinderJson =
    data.verifiedTinderJson ??
    (await loadVerifiedAnonymizedTinderData(
      data.blobUrl,
      data.tinderId,
      {
        photos: data.consentPhotos ?? true,
        work: data.consentWork ?? true,
      },
      { consume: data.consumeBlob ?? false },
    ));
  if (data.verifiedTinderJson) {
    await assertTinderProfileIdMatchesExport(
      data.verifiedTinderId ?? data.tinderId,
      data.verifiedTinderJson,
    );
    assertTinderDataMatchesConsent(data.verifiedTinderJson, {
      photos: data.consentPhotos ?? true,
      work: data.consentWork ?? true,
    });
  }

  console.log(`\n📊 Additive update for profile: ${data.tinderId}`);
  console.log(`   User ID: ${data.userId}`);

  const jsonString = JSON.stringify(anonymizedTinderJson);
  const jsonSizeMB = (
    Buffer.byteLength(jsonString, "utf8") /
    1024 /
    1024
  ).toFixed(2);

  const profile = await withTransaction(async (tx) => {
    await lockTransientUploadForMutationInTx(tx, data.transientUpload);
    await lockTinderSwipeRankMutationsInTx(tx);
    await lockTinderProfileUploadInTx(tx, data.tinderId);
    const existingIdentity = await tx.query.tinderProfileTable.findFirst({
      where: and(
        eq(tinderProfileTable.tinderId, data.tinderId),
        eq(tinderProfileTable.userId, data.userId),
      ),
      columns: {
        createDate: true,
        createDateSource: true,
      },
    });
    if (!existingIdentity) {
      throw new Error(
        `Failed to update profile ${data.tinderId}: ownership changed before processing.`,
      );
    }

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
    const createDateSnapshot = reconcileTinderCreateDateSnapshot(
      existingIdentity,
      profileData,
    );

    const updateStart = Date.now();
    const [updatedProfile] = await tx
      .update(tinderProfileTable)
      .set({
        ...profileData,
        ...createDateSnapshot,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tinderProfileTable.tinderId, data.tinderId),
          eq(tinderProfileTable.userId, data.userId),
        ),
      )
      .returning();
    if (!updatedProfile) {
      throw new Error(
        `Failed to update profile ${data.tinderId}: ownership changed before processing.`,
      );
    }
    console.log(
      `   ✓ Profile metadata updated (${Date.now() - updateStart}ms)`,
    );

    // Reconcile optional media independently from activity. A false consent
    // flag is a withdrawal and removes prior rows; otherwise additive uploads
    // retain historical photos while inserting newly observed URLs once.
    const existingMedia = await tx.query.mediaTable.findMany({
      where: eq(mediaTable.tinderProfileId, data.tinderId),
      columns: { url: true },
    });
    const mediaPlan = planTinderMediaReconciliation(
      existingMedia.map((media) => media.url),
      transformTinderPhotosToMedia(anonymizedTinderJson.Photos, data.tinderId),
      data.consentPhotos ?? true,
    );
    const newPhotosInput = mediaPlan.rowsToInsert;
    let removedPhotoCount = 0;
    if (mediaPlan.removeExisting) {
      const removedMedia = await tx
        .delete(mediaTable)
        .where(eq(mediaTable.tinderProfileId, data.tinderId))
        .returning({ id: mediaTable.id });
      removedPhotoCount = removedMedia.length;
    } else {
      if (newPhotosInput.length > 0) {
        await tx.insert(mediaTable).values(newPhotosInput);
      }
    }

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
      getTinderUsageMetricPresence(anonymizedTinderJson.Usage),
    );
    await syncObservedUsageRangeInTx(tx, data.tinderId);
    console.log(
      `   ✓ Usage upserted: ${usageInserted} records (${Date.now() - usageStart}ms)`,
    );

    // 3. Insert new matches and merge newly exported messages into known ones
    const matchStart = Date.now();
    const { matchesInput, messagesInput } = createMessagesAndMatches(
      anonymizedTinderJson.Messages,
      data.tinderId,
    );

    // Fetch the existing outgoing rows needed for multiset reconciliation.
    const existingMatches = await tx.query.matchTable.findMany({
      where: eq(matchTable.tinderProfileId, data.tinderId),
      columns: { id: true, tinderMatchId: true, order: true },
      with: {
        messages: {
          columns: {
            id: true,
            sentDate: true,
            sentDateRaw: true,
            to: true,
            contentRaw: true,
            type: true,
            gifUrl: true,
            messageType: true,
            order: true,
            timeSinceLastMessage: true,
            timeSinceLastMessageRelative: true,
          },
        },
      },
    });

    const {
      matchesToInsert,
      messagesToInsert,
      matchesToUpdate,
      messagesToUpdate,
    } = reconcileTinderMatches(existingMatches, matchesInput, messagesInput);

    for (const message of messagesToUpdate) {
      await tx
        .update(messageTable)
        .set(message.metrics)
        .where(eq(messageTable.id, message.id));
    }

    for (const match of matchesToUpdate) {
      await tx
        .update(matchTable)
        .set(match.metrics)
        .where(eq(matchTable.id, match.id));
    }

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
      `   ✓ Matches merged: ${matchesToInsert.length} new matches, ${matchesToUpdate.length} refreshed matches, ${messagesToInsert.length} messages (${Date.now() - matchStart}ms)`,
    );

    // Check if this was an idempotent update (no new data)
    if (
      usageInserted === 0 &&
      matchesToInsert.length === 0 &&
      messagesToInsert.length === 0 &&
      removedPhotoCount === 0 &&
      newPhotosInput.length === 0
    ) {
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
      blobUrl: null, // Verified upload blobs are transient and consumed.
      userId: data.userId,
    });

    await markTransientUploadCommittedInTx(
      tx,
      data.transientUpload,
      data.tinderId,
    );

    return {
      profile: updatedProfile,
      matchCount: matchesToInsert.length,
      messageCount: messagesToInsert.length,
      photoCount: newPhotosInput.length,
      hasPhotos: mediaPlan.hasPhotosAfter,
      usageDays: newUsage.length,
      // Same export re-uploaded: nothing new merged in.
      isNoOp:
        usageInserted === 0 &&
        matchesToInsert.length === 0 &&
        messagesToInsert.length === 0 &&
        removedPhotoCount === 0 &&
        newPhotosInput.length === 0,
    };
  });

  const totalTime = Date.now() - startTime;
  scheduleTinderSwipeRankRefresh([data.tinderId]);
  await cleanupCommittedTransientUpload(data.transientUpload?.id);
  console.log(`\n✅ Additive update complete for ${data.tinderId}`);
  console.log(
    `⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`,
  );

  return {
    profile: profile.profile,
    isNoOp: profile.isNoOp,
    metrics: {
      processingTimeMs: totalTime,
      // Deltas: what THIS upload added (an update reports the change, not totals).
      matchCount: profile.matchCount,
      messageCount: profile.messageCount,
      photoCount: profile.photoCount,
      usageDays: profile.usageDays,
      hasPhotos: profile.hasPhotos,
      jsonSizeMB: parseFloat(jsonSizeMB),
    },
  };
}

type ExistingTinderMessage = Pick<
  Message,
  | "id"
  | "sentDate"
  | "sentDateRaw"
  | "contentRaw"
  | "type"
  | "gifUrl"
  | "messageType"
  | "order"
  | "timeSinceLastMessage"
  | "timeSinceLastMessageRelative"
>;

type ExistingTinderMatch = {
  id: string;
  tinderMatchId: string | null;
  order: number;
  messages: ExistingTinderMessage[];
};

function tinderMessageFingerprint(
  message: ExistingTinderMessage | MessageInsert,
): string {
  // REVIEW(provider assumption): Tinder supplies no stable message ID. We
  // treat equal timestamp/content/type occurrences as the same outgoing
  // message and retain multiplicity. `to` is deliberately excluded because it
  // is a provider-local match reference that can be reindexed across exports,
  // not message identity. Edited or deleted messages remain as historical rows
  // because a later export may be a truncated view.
  return JSON.stringify([
    message.sentDate.getTime(),
    message.contentRaw,
    message.type ?? null,
    message.gifUrl ?? null,
    message.messageType,
  ]);
}

/** Merge a newer Tinder export without dropping old or repeated messages. */
export function reconcileTinderMatches(
  existingMatches: ExistingTinderMatch[],
  newMatches: MatchInsert[],
  newMessages: MessageInsert[],
): {
  matchesToInsert: MatchInsert[];
  messagesToInsert: MessageInsert[];
  matchesToUpdate: Array<{
    id: string;
    metrics: TinderMatchDerivedMetrics;
  }>;
  messagesToUpdate: Array<{
    id: string;
    metrics: Pick<
      MessageInsert,
      "order" | "timeSinceLastMessage" | "timeSinceLastMessageRelative"
    >;
  }>;
} {
  const newMessagesByMatchId = new Map<string, MessageInsert[]>();
  for (const message of newMessages) {
    const messages = newMessagesByMatchId.get(message.matchId) ?? [];
    messages.push(message);
    newMessagesByMatchId.set(message.matchId, messages);
  }

  const existingByTinderMatchId = new Map<string, ExistingTinderMatch>();
  for (const match of existingMatches) {
    if (
      match.tinderMatchId &&
      !existingByTinderMatchId.has(match.tinderMatchId)
    ) {
      existingByTinderMatchId.set(match.tinderMatchId, match);
    }
  }

  const matchesToInsert: MatchInsert[] = [];
  const messagesToInsert: MessageInsert[] = [];
  const matchesToUpdate: Array<{
    id: string;
    metrics: TinderMatchDerivedMetrics;
  }> = [];
  const messagesToUpdate: Array<{
    id: string;
    metrics: Pick<
      MessageInsert,
      "order" | "timeSinceLastMessage" | "timeSinceLastMessageRelative"
    >;
  }> = [];
  let nextMatchOrder =
    existingMatches.reduce(
      (highest, match) => Math.max(highest, match.order),
      -1,
    ) + 1;

  for (const newMatch of newMatches) {
    const existingMatch = newMatch.tinderMatchId
      ? existingByTinderMatchId.get(newMatch.tinderMatchId)
      : undefined;
    const matchMessages = newMessagesByMatchId.get(newMatch.id) ?? [];

    if (!existingMatch) {
      // REVIEW(provider assumption): Tinder does not expose a match timestamp
      // here, but its export order is stable enough to preserve relative order.
      // Append newly observed records after the retained sequence so additive
      // exports never create duplicate zero-based display positions.
      matchesToInsert.push({ ...newMatch, order: nextMatchOrder++ });
      messagesToInsert.push(...matchMessages);
      continue;
    }

    const existingFingerprintCounts = new Map<string, number>();
    for (const message of existingMatch.messages) {
      const fingerprint = tinderMessageFingerprint(message);
      existingFingerprintCounts.set(
        fingerprint,
        (existingFingerprintCounts.get(fingerprint) ?? 0) + 1,
      );
    }

    const additionalMessages: MessageInsert[] = [];
    for (const message of matchMessages) {
      const fingerprint = tinderMessageFingerprint(message);
      const existingCount = existingFingerprintCounts.get(fingerprint) ?? 0;
      if (existingCount > 0) {
        existingFingerprintCounts.set(fingerprint, existingCount - 1);
      } else {
        additionalMessages.push({
          ...message,
          matchId: existingMatch.id,
        });
      }
    }

    if (additionalMessages.length === 0) continue;

    const additionalMessageIds = new Set(
      additionalMessages.map((message) => message.id),
    );
    const sequencedMessages = [
      ...existingMatch.messages,
      ...additionalMessages,
    ].sort(
      (left, right) =>
        left.sentDate.getTime() - right.sentDate.getTime() ||
        left.id.localeCompare(right.id),
    );

    for (const [order, message] of sequencedMessages.entries()) {
      const previous = sequencedMessages[order - 1];
      const timeSinceLastMessage = previous
        ? Math.floor(
            (message.sentDate.getTime() - previous.sentDate.getTime()) / 1000,
          )
        : 0;
      const timeSinceLastMessageRelative = previous
        ? formatDistance(previous.sentDate, message.sentDate)
        : null;
      const metrics = {
        order,
        timeSinceLastMessage,
        timeSinceLastMessageRelative,
      };

      if (additionalMessageIds.has(message.id)) {
        const inserted = message as MessageInsert;
        messagesToInsert.push({ ...inserted, ...metrics });
      } else {
        const existing = message as ExistingTinderMessage;
        if (
          existing.order !== order ||
          existing.timeSinceLastMessage !== timeSinceLastMessage ||
          existing.timeSinceLastMessageRelative !== timeSinceLastMessageRelative
        ) {
          messagesToUpdate.push({ id: existing.id, metrics });
        }
      }
    }
    matchesToUpdate.push({
      id: existingMatch.id,
      metrics: computeTinderMatchDerivedMetrics([
        ...existingMatch.messages,
        ...additionalMessages,
      ]),
    });
  }

  return {
    matchesToInsert,
    messagesToInsert,
    matchesToUpdate,
    messagesToUpdate,
  };
}
