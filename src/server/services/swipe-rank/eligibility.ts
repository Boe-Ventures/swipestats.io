import type { SwipeRankPeriodKind } from "@/server/db/schema";

export const SWIPE_RANK_ELIGIBILITY_VERSION = "swipe-rank-eligibility-v1";

export interface SwipeRankEligibilityThreshold {
  minimumRateDenominator: number;
  minimumActiveDays: number;
}

export const SWIPE_RANK_ELIGIBILITY_V1 = {
  MONTH: { minimumRateDenominator: 100, minimumActiveDays: 5 },
  QUARTER: { minimumRateDenominator: 250, minimumActiveDays: 15 },
  YEAR: { minimumRateDenominator: 500, minimumActiveDays: 40 },
  ALL_TIME: { minimumRateDenominator: 1_000, minimumActiveDays: 40 },
} as const satisfies Record<SwipeRankPeriodKind, SwipeRankEligibilityThreshold>;

export function getSwipeRankEligibility(
  periodKind: SwipeRankPeriodKind,
): SwipeRankEligibilityThreshold {
  return SWIPE_RANK_ELIGIBILITY_V1[periodKind];
}

export function evaluateSwipeRankEligibility(input: {
  periodKind: SwipeRankPeriodKind;
  rateDenominator: number;
  activeDays: number;
}) {
  const threshold = getSwipeRankEligibility(input.periodKind);
  const denominatorEligible =
    input.rateDenominator >= threshold.minimumRateDenominator;
  const activeDaysEligible = input.activeDays >= threshold.minimumActiveDays;

  return {
    ...threshold,
    denominatorEligible,
    activeDaysEligible,
    eligible: denominatorEligible && activeDaysEligible,
  };
}
