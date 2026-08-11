import { describe, expect, test } from "bun:test";

import {
  evaluateSwipeRankEligibility,
  getSwipeRankEligibility,
} from "./eligibility";

describe("SwipeRank eligibility v1", () => {
  test("uses first-class thresholds for every supported period", () => {
    expect(getSwipeRankEligibility("MONTH")).toEqual({
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
    });
    expect(() => getSwipeRankEligibility("QUARTER")).toThrow(
      "monthly seasons only",
    );
  });

  test("requires both the denominator and active-day minimum", () => {
    expect(
      evaluateSwipeRankEligibility({
        periodKind: "MONTH",
        rateDenominator: 100,
        activeDays: 5,
      }),
    ).toMatchObject({
      eligible: true,
      denominatorEligible: true,
      activeDaysEligible: true,
    });

    expect(
      evaluateSwipeRankEligibility({
        periodKind: "MONTH",
        rateDenominator: 99,
        activeDays: 5,
      }),
    ).toMatchObject({ eligible: false, denominatorEligible: false });

    expect(
      evaluateSwipeRankEligibility({
        periodKind: "MONTH",
        rateDenominator: 100,
        activeDays: 4,
      }),
    ).toMatchObject({ eligible: false, activeDaysEligible: false });
  });
});
