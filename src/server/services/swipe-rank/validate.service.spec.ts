import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { assembleSwipeRankValidationResult } =
  await import("./validate.service");

const clean = {
  metricVersion: "tinder-match-yield-v1",
  closedBefore: "2026-08-01",
  profiles: 10_484,
  facts: 213_163,
  duplicateFacts: 0,
  unsupportedPeriodFacts: 0,
  openPeriodFacts: 0,
  rawMonthMismatches: 0,
  rateInputMismatches: 0,
  qualityFlagMismatches: 0,
  registryDescriptorMismatches: 0,
};

describe("SwipeRank closed-season validation contract", () => {
  test("accepts a populated closed-season fact layer", () => {
    expect(assembleSwipeRankValidationResult(clean)).toEqual({
      ...clean,
      valid: true,
    });
  });

  test("rejects unsupported periods and open facts", () => {
    expect(
      assembleSwipeRankValidationResult({
        ...clean,
        unsupportedPeriodFacts: 1,
      }).valid,
    ).toBeFalse();
    expect(
      assembleSwipeRankValidationResult({ ...clean, openPeriodFacts: 1 }).valid,
    ).toBeFalse();
  });

  test("rejects an empty or source-divergent fact layer", () => {
    expect(
      assembleSwipeRankValidationResult({ ...clean, facts: 0 }).valid,
    ).toBeFalse();
    expect(
      assembleSwipeRankValidationResult({
        ...clean,
        rawMonthMismatches: 1,
      }).valid,
    ).toBeFalse();
  });
});
