import { and, desc, eq } from "drizzle-orm";

import { db, withTransaction } from "@/server/db";
import { swipeRankProfileTable } from "@/server/db/schema";

import { invalidatePublicSwipeRankCache } from "./public-cache";
import { lockTinderSwipeRankPolicyInTx } from "./lifecycle.service";

const MAX_EXCLUSION_REASON_LENGTH = 500;
const MAX_EXCLUSION_ACTOR_LENGTH = 200;

export interface SetSwipeRankExclusionInput {
  providerProfileId: string;
  excluded: boolean;
  reason?: string;
  actor: string;
}

export interface NormalizedSwipeRankExclusionInput {
  providerProfileId: string;
  excluded: boolean;
  reason: string | null;
  actor: string;
}

export function normalizeSwipeRankExclusionInput(
  input: SetSwipeRankExclusionInput,
): NormalizedSwipeRankExclusionInput {
  const providerProfileId = input.providerProfileId.trim();
  const actor = input.actor.trim();
  const reason = input.reason?.trim() ?? "";

  if (!providerProfileId) {
    throw new Error("A Tinder profile ID is required.");
  }
  if (!actor || actor.length > MAX_EXCLUSION_ACTOR_LENGTH) {
    throw new Error(
      `SwipeRank exclusion actor must be 1–${MAX_EXCLUSION_ACTOR_LENGTH} characters.`,
    );
  }
  if (
    input.excluded &&
    (reason.length < 3 || reason.length > MAX_EXCLUSION_REASON_LENGTH)
  ) {
    throw new Error(
      `SwipeRank exclusion reason must be 3–${MAX_EXCLUSION_REASON_LENGTH} characters.`,
    );
  }

  return {
    providerProfileId,
    excluded: input.excluded,
    reason: input.excluded ? reason : null,
    actor,
  };
}

/**
 * The one write path for admin and CLI/agent moderation. Facts are retained;
 * the profile is removed from every live ranking field until restored.
 */
export async function setTinderSwipeRankExclusion(
  input: SetSwipeRankExclusionInput,
) {
  const normalized = normalizeSwipeRankExclusionInput(input);
  const now = new Date();
  const updated = await withTransaction(async (tx) => {
    await lockTinderSwipeRankPolicyInTx(tx);
    return tx
      .update(swipeRankProfileTable)
      .set(
        normalized.excluded
          ? {
              isSwipeRankExcluded: true,
              swipeRankExclusionReason: normalized.reason,
              swipeRankExcludedAt: now,
              swipeRankExcludedBy: normalized.actor,
              updatedAt: now,
            }
          : {
              isSwipeRankExcluded: false,
              swipeRankExclusionReason: null,
              swipeRankExcludedAt: null,
              swipeRankExcludedBy: null,
              updatedAt: now,
            },
      )
      .where(
        and(
          eq(swipeRankProfileTable.dataProvider, "TINDER"),
          eq(
            swipeRankProfileTable.providerProfileId,
            normalized.providerProfileId,
          ),
          eq(swipeRankProfileTable.isSynthetic, false),
        ),
      )
      .returning({
        profileId: swipeRankProfileTable.id,
        providerProfileId: swipeRankProfileTable.providerProfileId,
        excluded: swipeRankProfileTable.isSwipeRankExcluded,
        reason: swipeRankProfileTable.swipeRankExclusionReason,
        excludedAt: swipeRankProfileTable.swipeRankExcludedAt,
        excludedBy: swipeRankProfileTable.swipeRankExcludedBy,
      });
  });

  const result = updated[0];
  if (!result) {
    throw new Error(
      `Tinder profile ${normalized.providerProfileId} is not registered for SwipeRank.`,
    );
  }

  invalidatePublicSwipeRankCache();
  return result;
}

/** Current exclusions for the private admin control panel and CLI review. */
export async function listTinderSwipeRankExclusions() {
  return db
    .select({
      profileId: swipeRankProfileTable.id,
      providerProfileId: swipeRankProfileTable.providerProfileId,
      gender: swipeRankProfileTable.gender,
      interestedIn: swipeRankProfileTable.interestedIn,
      reason: swipeRankProfileTable.swipeRankExclusionReason,
      excludedAt: swipeRankProfileTable.swipeRankExcludedAt,
      excludedBy: swipeRankProfileTable.swipeRankExcludedBy,
    })
    .from(swipeRankProfileTable)
    .where(
      and(
        eq(swipeRankProfileTable.dataProvider, "TINDER"),
        eq(swipeRankProfileTable.isSynthetic, false),
        eq(swipeRankProfileTable.isSwipeRankExcluded, true),
      ),
    )
    .orderBy(desc(swipeRankProfileTable.swipeRankExcludedAt));
}
