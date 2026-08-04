import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { assembleSwipeRankValidationResult } =
  await import("./validate.service");

const cleanComponents = {
  profiles: 10_484,
  facts: 337_443,
  monthFacts: 213_163,
  quarterFacts: 78_619,
  yearFacts: 35_177,
  allTimeFacts: 10_484,
  duplicateFacts: 0,
  invalidAllTimeSentinels: 0,
  rollupMismatches: 0,
  rawMonthMismatches: 0,
  rawAllTimeMismatches: 0,
  rateInputMismatches: 0,
  overOneMissingFlag: 0,
  overOneFlagWithoutCondition: 0,
  zeroLikeMissingFlag: 0,
  zeroLikeFlagWithoutCondition: 0,
  profileRangeFlagMismatches: 0,
  unknownQualityFlags: 0,
  registryDescriptorMismatches: 0,
  staleFacts: 0,
  sourceGenerationMismatches: 0,
};

describe("SwipeRank validation result contract", () => {
  test("a populated layer with every parity check clean is valid", () => {
    expect(
      assembleSwipeRankValidationResult(
        "tinder-match-yield-v1",
        cleanComponents,
      ),
    ).toEqual({
      metricVersion: "tinder-match-yield-v1",
      ...cleanComponents,
      snapshotSourceCurrent: true,
      valid: true,
    });
  });

  test("a newer source generation does not invalidate clean scoped facts", () => {
    const result = assembleSwipeRankValidationResult("tinder-match-yield-v1", {
      ...cleanComponents,
      sourceGenerationMismatches: 1,
    });
    expect(result.snapshotSourceCurrent).toBeFalse();
    expect(result.valid).toBeTrue();
  });

  test("rollup mismatch counts are reported as their combined total", () => {
    const result = assembleSwipeRankValidationResult("tinder-match-yield-v1", {
      ...cleanComponents,
      rollupMismatches: 3,
    });
    expect(result.rollupMismatches).toBe(3);
    expect(result.valid).toBeFalse();
  });

  test("an empty fact layer is invalid even when no mismatch exists", () => {
    expect(
      assembleSwipeRankValidationResult("tinder-match-yield-v1", {
        ...cleanComponents,
        profiles: 0,
        facts: 0,
        monthFacts: 0,
        quarterFacts: 0,
        yearFacts: 0,
        allTimeFacts: 0,
      }).valid,
    ).toBeFalse();
  });
});
