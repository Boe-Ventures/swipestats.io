import type { SwipeRankPeriodKind } from "@/server/db/schema";

export const SWIPE_RANK_ELIGIBILITY_VERSION = "swipe-rank-eligibility-v1";

export interface SwipeRankEligibilityThreshold {
  minimumRateDenominator: number;
  minimumActiveDays: number;
}

export const SWIPE_RANK_ELIGIBILITY_V1 = {
  MONTH: { minimumRateDenominator: 100, minimumActiveDays: 5 },
} as const;

export function getSwipeRankEligibility(
  periodKind: SwipeRankPeriodKind,
): SwipeRankEligibilityThreshold {
  if (periodKind !== "MONTH") {
    throw new Error("SwipeRank eligibility exists for monthly seasons only.");
  }
  return SWIPE_RANK_ELIGIBILITY_V1.MONTH;
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
