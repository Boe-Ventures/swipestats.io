import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  assembleSwipeRankBenchmark,
  buildSwipeRankComparisonPlacement,
  matchesSwipeRankBenchmarkFilters,
} = await import("./benchmark.service");

const benchmarkRow: Parameters<typeof assembleSwipeRankBenchmark>[1] = {
  profile_id: "srp_target",
  provider_profile_id: "target",
  gender: "MALE",
  interested_in: "FEMALE",
  city: "Oslo",
  region: "Oslo",
  country: "Norway",
  age_in_period: 33,
  match_rate_numerator: 125,
  match_rate_denominator: 100,
  like_rate_numerator: 100,
  like_rate_denominator: 500,
  match_rate: 1.25,
  like_rate: 0.2,
  swipes_per_active_day: 100,
  active_days: 5,
  observed_days: 20,
  quality_flags: ["MATCH_RATE_OVER_ONE"],
  has_quality_anomaly: true,
  target_computed_at: "2026-07-02T12:00:00.000Z",
  cohort_as_of: "2026-07-03T12:00:00.000Z",
  cohort_size: 25,
  match_rate_sample_size: 25,
  like_rate_sample_size: 25,
  swipes_per_active_day_sample_size: 25,
  match_rate_p10: 0.05,
  match_rate_p25: 0.1,
  match_rate_p50: 0.2,
  match_rate_p75: 0.5,
  match_rate_p90: 1.4,
  like_rate_p10: 0.1,
  like_rate_p25: 0.15,
  like_rate_p50: 0.2,
  like_rate_p75: 0.25,
  like_rate_p90: 0.3,
  swipes_per_active_day_p10: 10,
  swipes_per_active_day_p25: 25,
  swipes_per_active_day_p50: 50,
  swipes_per_active_day_p75: 75,
  swipes_per_active_day_p90: 90,
  match_rate_greater_count: 5,
  match_rate_equal_count: 0,
  match_rate_at_or_below_count: 20,
  like_rate_greater_count: 10,
  like_rate_equal_count: 2,
  like_rate_at_or_below_count: 15,
  swipes_per_active_day_greater_count: 0,
  swipes_per_active_day_equal_count: 0,
  swipes_per_active_day_at_or_below_count: 25,
};

const benchmarkInput = {
  providerProfileId: "target",
  period: {
    kind: "MONTH" as const,
    start: "2026-06-01",
    end: "2026-07-01",
  },
  filters: { gender: "FEMALE" as const, interestedIn: "MALE" as const },
};

describe("SwipeRank benchmark service contract", () => {
  test("matches dynamic age and location dimensions without case sensitivity", () => {
    const target = {
      gender: "MALE" as const,
      interestedIn: "FEMALE" as const,
      ageInPeriod: 33,
      country: "Norway",
      region: "Oslo",
      city: "Oslo",
    };

    expect(
      matchesSwipeRankBenchmarkFilters(target, {
        gender: "MALE",
        interestedIn: "FEMALE",
        ageMin: 30,
        ageMax: 35,
        country: "norway",
        city: "OSLO",
      }),
    ).toBeTrue();
    expect(
      matchesSwipeRankBenchmarkFilters(target, { ageMin: 34 }),
    ).toBeFalse();
    expect(
      matchesSwipeRankBenchmarkFilters(
        { ...target, ageInPeriod: null },
        { ageMax: 35 },
      ),
    ).toBeFalse();
  });

  test("matches equivalent country code and country name forms", () => {
    const target = {
      gender: "MALE" as const,
      interestedIn: "FEMALE" as const,
      ageInPeriod: 33,
      country: "NO",
      region: "Oslo",
      city: "Oslo",
    };

    expect(
      matchesSwipeRankBenchmarkFilters(target, { country: "Norway" }),
    ).toBeTrue();
    expect(
      matchesSwipeRankBenchmarkFilters(
        { ...target, country: "UK" },
        { country: "GB" },
      ),
    ).toBeTrue();
    expect(
      matchesSwipeRankBenchmarkFilters(target, { country: "Sweden" }),
    ).toBeFalse();
  });

  test("places an eligible target against a filtered cohort it is not in", () => {
    expect(
      buildSwipeRankComparisonPlacement({
        value: 1.25,
        fieldSize: 25,
        greaterCount: 5,
        equalCount: 0,
        atOrBelowCount: 20,
        includedInCohort: false,
        targetEligible: true,
      }),
    ).toEqual({
      rank: 6,
      tieCount: 0,
      fieldSize: 25,
      percentile: 80,
      includedInCohort: false,
      isHypothetical: true,
      suppressed: false,
    });
  });

  test("keeps source-backed yields above 100% and period-correct target values", () => {
    const result = assembleSwipeRankBenchmark(benchmarkInput, benchmarkRow);

    expect(result.target.values.matchYield).toBe(1.25);
    expect(result.target.hasQualityAnomaly).toBeTrue();
    expect(result.target.eligibility.eligible).toBeTrue();
    expect(result.target.matchesFilters).toBeFalse();
    expect(result.target.includedInCohort).toBeFalse();
    expect(result.target.placements.matchYield).toMatchObject({
      rank: 6,
      percentile: 80,
      isHypothetical: true,
      suppressed: false,
    });
    expect(result.cohort.metrics.matchYield.p90).toBe(1.4);
    expect(result.cohort.sampleSize).toBe(25);
    expect(result.insufficientSample).toBeFalse();
    expect(result.minimumPrivateSampleSize).toBe(25);
  });

  test("suppresses distributions and placements below the private sample floor", () => {
    const result = assembleSwipeRankBenchmark(benchmarkInput, {
      ...benchmarkRow,
      cohort_size: 24,
      match_rate_sample_size: 24,
      like_rate_sample_size: 24,
      swipes_per_active_day_sample_size: 24,
    });

    expect(result.insufficientSample).toBeTrue();
    expect(result.minimumPrivateSampleSize).toBe(25);
    expect(result.cohort.sampleSize).toBeNull();
    expect(result.target.values.matchYield).toBe(1.25);
    expect(result.cohort.metrics.matchYield).toEqual({
      p10: null,
      p25: null,
      p50: null,
      p75: null,
      p90: null,
      sampleSize: null,
      suppressed: true,
    });
    expect(result.cohort.metrics.likeRate.p50).toBeNull();
    expect(result.cohort.metrics.swipesPerActiveDay.p90).toBeNull();
    expect(result.target.placements.matchYield).toMatchObject({
      rank: null,
      tieCount: null,
      percentile: null,
      fieldSize: null,
      suppressed: true,
    });
  });

  test("does not expose a suppressed placement field size", () => {
    expect(
      buildSwipeRankComparisonPlacement({
        value: 0.4,
        fieldSize: 7,
        greaterCount: 1,
        equalCount: 1,
        atOrBelowCount: 6,
        includedInCohort: true,
        targetEligible: true,
        suppress: true,
      }),
    ).toEqual({
      rank: null,
      tieCount: null,
      fieldSize: null,
      percentile: null,
      includedInCohort: true,
      isHypothetical: false,
      suppressed: true,
    });
  });

  test("suppresses a metric whose contributing sample is below the floor", () => {
    const result = assembleSwipeRankBenchmark(benchmarkInput, {
      ...benchmarkRow,
      cohort_size: 25,
      like_rate_sample_size: 24,
    });

    expect(result.insufficientSample).toBeFalse();
    expect(result.cohort.sampleSize).toBe(25);
    expect(result.cohort.metrics.matchYield.suppressed).toBeFalse();
    expect(result.cohort.metrics.matchYield.sampleSize).toBe(25);
    expect(result.cohort.metrics.likeRate).toMatchObject({
      p50: null,
      sampleSize: null,
      suppressed: true,
    });
    expect(result.target.placements.likeRate).toMatchObject({
      rank: null,
      fieldSize: null,
      percentile: null,
      suppressed: true,
    });
    expect(result.target.values.likeRate).toBe(0.2);
  });

  test("does not assign a placement when the target misses eligibility", () => {
    expect(
      buildSwipeRankComparisonPlacement({
        value: 0.4,
        fieldSize: 100,
        greaterCount: 10,
        equalCount: 1,
        atOrBelowCount: 90,
        includedInCohort: false,
        targetEligible: false,
      }),
    ).toMatchObject({
      rank: null,
      percentile: null,
      fieldSize: 100,
    });
  });
});
