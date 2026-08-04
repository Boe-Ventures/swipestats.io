import type { SwipeRankPeriodKind } from "@/server/db/schema";

/**
 * v1 intentionally preserves the product's established Tinder definition:
 * total matches reported for a period divided by outgoing swipe likes.
 */
export const SWIPE_RANK_METRIC_VERSION = "tinder-match-yield-v1";

/**
 * One provider-wide lock serializes source mutations, registry/fact builds,
 * purges, and snapshots. Metric versions share the profile registry, so a
 * version-specific lock would still allow a deletion race across versions.
 */
export function swipeRankBuildLockName(dataProvider: string) {
  return `swipe-rank:${dataProvider}`;
}

/** Fixed half-open sentinel used by every ALL_TIME fact and snapshot. */
export const SWIPE_RANK_ALL_TIME_START = "0001-01-01";
export const SWIPE_RANK_ALL_TIME_END = "9999-01-01";

export const SWIPE_RANK_PERIOD_KINDS = [
  "MONTH",
  "QUARTER",
  "YEAR",
  "ALL_TIME",
] as const satisfies readonly SwipeRankPeriodKind[];

export const SWIPE_RANK_QUALITY_FLAGS = [
  "MATCH_YIELD_OVER_ONE",
  "MATCHES_WITH_ZERO_LIKES",
  "PROFILE_RANGE_EXCLUDES_USAGE",
] as const;

export type SwipeRankQualityFlag = (typeof SWIPE_RANK_QUALITY_FLAGS)[number];
