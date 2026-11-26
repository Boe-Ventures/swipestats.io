/**
 * v1 intentionally preserves the product's established Tinder definition:
 * total matches reported for a period divided by outgoing swipe likes.
 */
export const SWIPE_RANK_METRIC_VERSION = "tinder-match-yield-v1";

/**
 * One provider-wide lock serializes monthly builds, canonical repair jobs,
 * destructive purges, and snapshots. Metric versions share the profile
 * registry, so a version-specific lock would allow deletion races.
 */
export function swipeRankBuildLockName(dataProvider: string) {
  return `swipe-rank:${dataProvider}`;
}

export const SWIPE_RANK_PERIOD_KINDS = ["MONTH"] as const;

export const SWIPE_RANK_QUALITY_FLAGS = [
  "MATCH_YIELD_OVER_ONE",
  "MATCHES_WITH_ZERO_LIKES",
  "PROFILE_RANGE_EXCLUDES_USAGE",
] as const;

export type SwipeRankQualityFlag = (typeof SWIPE_RANK_QUALITY_FLAGS)[number];
