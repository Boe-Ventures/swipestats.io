import { describe, expect, test } from "bun:test";
process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
const { assembleSwipeRankBenchmark } = await import("./benchmark.service");
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
  is_swipe_rank_excluded: false,
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
});
