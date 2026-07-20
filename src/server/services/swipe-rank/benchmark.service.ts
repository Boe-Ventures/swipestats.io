import { sql, type SQL } from "drizzle-orm";

import { areCountriesEquivalent } from "@/lib/swipe-rank/country";
import { db } from "@/server/db";
import type { Gender } from "@/server/db/schema";

import {
  SWIPE_RANK_ELIGIBILITY_VERSION,
  evaluateSwipeRankEligibility,
  getSwipeRankEligibility,
} from "./eligibility";
import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import { swipeRankCountryFilterSql } from "./country-filter";
import { assertAlignedPeriod, type SwipeRankPeriodBounds } from "./periods";
import type { SwipeRankFilters } from "./product.service";
import { completedFullSwipeRankBuildSql } from "./readiness";

type NumericDatabaseValue = number | string | null;

/** Prevent descriptor probes from revealing distributions for tiny cohorts. */
export const SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE = 25;

export interface SwipeRankPercentiles {
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  sampleSize: number | null;
  suppressed: boolean;
}

export interface SwipeRankComparisonPlacement {
  rank: number | null;
  tieCount: number | null;
  fieldSize: number | null;
  percentile: number | null;
  includedInCohort: boolean;
  isHypothetical: boolean;
  suppressed: boolean;
}

export interface SwipeRankBenchmarkInput {
  providerProfileId: string;
  period: SwipeRankPeriodBounds;
  filters?: SwipeRankFilters;
}

interface BenchmarkRow extends Record<string, unknown> {
  profile_id: string;
  provider_profile_id: string;
  gender: Gender | null;
  interested_in: Gender | null;
  city: string | null;
  region: string | null;
  country: string | null;
  age_in_period: NumericDatabaseValue;
  match_rate_numerator: NumericDatabaseValue;
  match_rate_denominator: NumericDatabaseValue;
  like_rate_numerator: NumericDatabaseValue;
  like_rate_denominator: NumericDatabaseValue;
  match_rate: NumericDatabaseValue;
  like_rate: NumericDatabaseValue;
  swipes_per_active_day: NumericDatabaseValue;
  active_days: NumericDatabaseValue;
  observed_days: NumericDatabaseValue;
  quality_flags: string[] | null;
  has_quality_anomaly: boolean | null;
  is_swipe_rank_excluded: boolean;
  target_computed_at: Date | string | null;
  cohort_as_of: Date | string | null;
  cohort_size: NumericDatabaseValue;
  match_rate_sample_size: NumericDatabaseValue;
  like_rate_sample_size: NumericDatabaseValue;
  swipes_per_active_day_sample_size: NumericDatabaseValue;
  match_rate_p10: NumericDatabaseValue;
  match_rate_p25: NumericDatabaseValue;
  match_rate_p50: NumericDatabaseValue;
  match_rate_p75: NumericDatabaseValue;
  match_rate_p90: NumericDatabaseValue;
  like_rate_p10: NumericDatabaseValue;
  like_rate_p25: NumericDatabaseValue;
  like_rate_p50: NumericDatabaseValue;
  like_rate_p75: NumericDatabaseValue;
  like_rate_p90: NumericDatabaseValue;
  swipes_per_active_day_p10: NumericDatabaseValue;
  swipes_per_active_day_p25: NumericDatabaseValue;
  swipes_per_active_day_p50: NumericDatabaseValue;
  swipes_per_active_day_p75: NumericDatabaseValue;
  swipes_per_active_day_p90: NumericDatabaseValue;
  match_rate_greater_count: NumericDatabaseValue;
  match_rate_equal_count: NumericDatabaseValue;
  match_rate_at_or_below_count: NumericDatabaseValue;
  like_rate_greater_count: NumericDatabaseValue;
  like_rate_equal_count: NumericDatabaseValue;
  like_rate_at_or_below_count: NumericDatabaseValue;
  swipes_per_active_day_greater_count: NumericDatabaseValue;
  swipes_per_active_day_equal_count: NumericDatabaseValue;
  swipes_per_active_day_at_or_below_count: NumericDatabaseValue;
}

function numberOrZero(value: NumericDatabaseValue): number {
  return value === null ? 0 : Number(value);
}

function nullableNumber(value: NumericDatabaseValue): number | null {
  return value === null ? null : Number(value);
}

function asDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

function comparisonFilterSql(filters: SwipeRankFilters): SQL {
  const conditions: SQL[] = [];

  if (filters.gender) {
    conditions.push(sql`srp.gender = ${filters.gender}`);
  }
  if (filters.interestedIn) {
    conditions.push(sql`srp.interested_in = ${filters.interestedIn}`);
  }
  if (filters.ageMin !== undefined) {
    conditions.push(sql`fact.age_in_period >= ${filters.ageMin}`);
  }
  if (filters.ageMax !== undefined) {
    conditions.push(sql`fact.age_in_period <= ${filters.ageMax}`);
  }
  if (filters.country) {
    conditions.push(
      swipeRankCountryFilterSql(sql`srp.country`, filters.country),
    );
  }
  if (filters.region) {
    conditions.push(sql`lower(srp.region) = lower(${filters.region})`);
  }
  if (filters.city) {
    conditions.push(sql`lower(srp.city) = lower(${filters.city})`);
  }

  return conditions.length === 0
    ? sql``
    : sql`AND ${sql.join(conditions, sql` AND `)}`;
}

function sameText(left: string | null, right: string): boolean {
  return left?.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

/** Pure mirror of the SQL dimension filter, used to explain target inclusion. */
export function matchesSwipeRankBenchmarkFilters(
  target: {
    gender: Gender | null;
    interestedIn: Gender | null;
    ageInPeriod: number | null;
    country: string | null;
    region: string | null;
    city: string | null;
  },
  filters: SwipeRankFilters,
): boolean {
  if (filters.gender && target.gender !== filters.gender) return false;
  if (filters.interestedIn && target.interestedIn !== filters.interestedIn) {
    return false;
  }
  if (
    filters.ageMin !== undefined &&
    (target.ageInPeriod === null || target.ageInPeriod < filters.ageMin)
  ) {
    return false;
  }
  if (
    filters.ageMax !== undefined &&
    (target.ageInPeriod === null || target.ageInPeriod > filters.ageMax)
  ) {
    return false;
  }
  if (
    filters.country &&
    (target.country === null ||
      !areCountriesEquivalent(target.country, filters.country))
  ) {
    return false;
  }
  if (filters.region && !sameText(target.region, filters.region)) return false;
  if (filters.city && !sameText(target.city, filters.city)) return false;
  return true;
}

export function buildSwipeRankComparisonPlacement(input: {
  value: number | null;
  fieldSize: number;
  greaterCount: number;
  equalCount: number;
  atOrBelowCount: number;
  includedInCohort: boolean;
  targetEligible: boolean;
  suppress?: boolean;
}): SwipeRankComparisonPlacement {
  const suppressed =
    Boolean(input.suppress) ||
    input.fieldSize < SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE;
  const canPlace =
    !suppressed &&
    input.targetEligible &&
    input.value !== null &&
    input.fieldSize > 0;

  if (!canPlace) {
    return {
      rank: null,
      tieCount: null,
      fieldSize: suppressed ? null : input.fieldSize,
      percentile: null,
      includedInCohort: input.includedInCohort,
      isHypothetical: !input.includedInCohort,
      suppressed,
    };
  }

  return {
    rank: input.greaterCount + 1,
    tieCount: input.equalCount,
    fieldSize: input.fieldSize,
    percentile: (input.atOrBelowCount / input.fieldSize) * 100,
    includedInCohort: input.includedInCohort,
    isHypothetical: !input.includedInCohort,
    suppressed: false,
  };
}

function percentiles(
  values: readonly NumericDatabaseValue[],
  sampleSize: NumericDatabaseValue,
  suppress = false,
): SwipeRankPercentiles {
  const exactSampleSize = numberOrZero(sampleSize);
  const suppressed =
    suppress || exactSampleSize < SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE;

  return {
    p10: suppressed ? null : nullableNumber(values[0] ?? null),
    p25: suppressed ? null : nullableNumber(values[1] ?? null),
    p50: suppressed ? null : nullableNumber(values[2] ?? null),
    p75: suppressed ? null : nullableNumber(values[3] ?? null),
    p90: suppressed ? null : nullableNumber(values[4] ?? null),
    sampleSize: suppressed ? null : exactSampleSize,
    suppressed,
  };
}

/** Assemble the stable owner API contract separately from the database query. */
export function assembleSwipeRankBenchmark(
  input: SwipeRankBenchmarkInput,
  row: BenchmarkRow,
) {
  const filters = input.filters ?? {};
  const threshold = getSwipeRankEligibility(input.period.kind);
  const targetEligibility = evaluateSwipeRankEligibility({
    periodKind: input.period.kind,
    rateDenominator: numberOrZero(row.match_rate_denominator),
    activeDays: numberOrZero(row.active_days),
  });
  const targetRankEligible =
    targetEligibility.eligible && !row.is_swipe_rank_excluded;
  const targetDimensions = {
    gender: row.gender,
    interestedIn: row.interested_in,
    ageInPeriod: nullableNumber(row.age_in_period),
    country: row.country,
    region: row.region,
    city: row.city,
  };
  const matchesFilters = matchesSwipeRankBenchmarkFilters(
    targetDimensions,
    filters,
  );
  const includedInCohort = targetRankEligible && matchesFilters;
  const cohortSize = numberOrZero(row.cohort_size);
  const insufficientSample =
    cohortSize < SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE;
  const metricSampleSizes = {
    matchYield: numberOrZero(row.match_rate_sample_size),
    likeRate: numberOrZero(row.like_rate_sample_size),
    swipesPerActiveDay: numberOrZero(row.swipes_per_active_day_sample_size),
  };
  const targetValues = {
    matchYield: nullableNumber(row.match_rate),
    likeRate: nullableNumber(row.like_rate),
    swipesPerActiveDay: nullableNumber(row.swipes_per_active_day),
  };

  return {
    metricVersion: SWIPE_RANK_METRIC_VERSION,
    eligibilityVersion: SWIPE_RANK_ELIGIBILITY_VERSION,
    minimumPrivateSampleSize: SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE,
    insufficientSample,
    period: input.period,
    filters,
    eligibility: threshold,
    cohort: {
      sampleSize: insufficientSample ? null : cohortSize,
      asOf: asDate(row.cohort_as_of),
      metrics: {
        matchYield: percentiles(
          [
            row.match_rate_p10,
            row.match_rate_p25,
            row.match_rate_p50,
            row.match_rate_p75,
            row.match_rate_p90,
          ],
          row.match_rate_sample_size,
          insufficientSample,
        ),
        likeRate: percentiles(
          [
            row.like_rate_p10,
            row.like_rate_p25,
            row.like_rate_p50,
            row.like_rate_p75,
            row.like_rate_p90,
          ],
          row.like_rate_sample_size,
          insufficientSample,
        ),
        swipesPerActiveDay: percentiles(
          [
            row.swipes_per_active_day_p10,
            row.swipes_per_active_day_p25,
            row.swipes_per_active_day_p50,
            row.swipes_per_active_day_p75,
            row.swipes_per_active_day_p90,
          ],
          row.swipes_per_active_day_sample_size,
          insufficientSample,
        ),
      },
    },
    target: {
      profileId: row.profile_id,
      providerProfileId: row.provider_profile_id,
      ...targetDimensions,
      matchRateNumerator: numberOrZero(row.match_rate_numerator),
      matchRateDenominator: numberOrZero(row.match_rate_denominator),
      likeRateNumerator: numberOrZero(row.like_rate_numerator),
      likeRateDenominator: numberOrZero(row.like_rate_denominator),
      activeDays: numberOrZero(row.active_days),
      observedDays: numberOrZero(row.observed_days),
      values: targetValues,
      eligibility: targetEligibility,
      rankEligible: targetRankEligible,
      excludedFromSwipeRank: row.is_swipe_rank_excluded,
      matchesFilters,
      includedInCohort,
      qualityFlags: row.quality_flags ?? [],
      hasQualityAnomaly: row.has_quality_anomaly ?? false,
      computedAt: asDate(row.target_computed_at),
      placements: {
        matchYield: buildSwipeRankComparisonPlacement({
          value: targetValues.matchYield,
          fieldSize: metricSampleSizes.matchYield,
          greaterCount: numberOrZero(row.match_rate_greater_count),
          equalCount: numberOrZero(row.match_rate_equal_count),
          atOrBelowCount: numberOrZero(row.match_rate_at_or_below_count),
          includedInCohort,
          targetEligible: targetRankEligible,
          suppress:
            metricSampleSizes.matchYield <
            SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE,
        }),
        likeRate: buildSwipeRankComparisonPlacement({
          value: targetValues.likeRate,
          fieldSize: metricSampleSizes.likeRate,
          greaterCount: numberOrZero(row.like_rate_greater_count),
          equalCount: numberOrZero(row.like_rate_equal_count),
          atOrBelowCount: numberOrZero(row.like_rate_at_or_below_count),
          includedInCohort,
          targetEligible: targetRankEligible,
          suppress:
            metricSampleSizes.likeRate <
            SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE,
        }),
        swipesPerActiveDay: buildSwipeRankComparisonPlacement({
          value: targetValues.swipesPerActiveDay,
          fieldSize: metricSampleSizes.swipesPerActiveDay,
          greaterCount: numberOrZero(row.swipes_per_active_day_greater_count),
          equalCount: numberOrZero(row.swipes_per_active_day_equal_count),
          atOrBelowCount: numberOrZero(
            row.swipes_per_active_day_at_or_below_count,
          ),
          includedInCohort,
          targetEligible: targetRankEligible,
          suppress:
            metricSampleSizes.swipesPerActiveDay <
            SWIPE_RANK_BENCHMARK_MINIMUM_SAMPLE_SIZE,
        }),
      },
    },
  };
}

/**
 * Period-correct comparison distributions for one owned Tinder profile.
 *
 * The target fact is selected independently of the comparison filter, so an
 * owner can compare against any descriptor-defined eligible field without
 * losing their own values or hypothetical placement.
 */
export async function getTinderSwipeRankBenchmark(
  input: SwipeRankBenchmarkInput,
) {
  assertAlignedPeriod(input.period);
  const filters = input.filters ?? {};
  const filterSql = comparisonFilterSql(filters);
  const threshold = getSwipeRankEligibility(input.period.kind);

  const result = await db.execute<BenchmarkRow>(sql`
    WITH target_profile AS (
      SELECT srp.*
      FROM swipe_rank_profile srp
      WHERE srp.data_provider = 'TINDER'
        AND srp.provider_profile_id = ${input.providerProfileId}
        AND srp.is_synthetic = false
    ),
    period_field AS (
      SELECT
        fact.*,
        srp.provider_profile_id,
        srp.gender,
        srp.interested_in,
        srp.city,
        srp.region,
        srp.country
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
      JOIN swipe_rank_build build
        ON build.id = fact.build_id
       AND build.status = 'COMPLETE'
      WHERE srp.data_provider = 'TINDER'
        AND srp.is_synthetic = false
        AND fact.metric_version = ${SWIPE_RANK_METRIC_VERSION}
        AND ${completedFullSwipeRankBuildSql(
          "TINDER",
          SWIPE_RANK_METRIC_VERSION,
        )}
        AND fact.period_kind = ${input.period.kind}
        AND fact.period_start = ${input.period.start}::date
        AND fact.period_end = ${input.period.end}::date
    ),
    target_fact AS (
      SELECT field.*
      FROM period_field field
      JOIN target_profile target ON target.id = field.profile_id
    ),
    eligible AS (
      SELECT fact.*
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
      JOIN swipe_rank_build build
        ON build.id = fact.build_id
       AND build.status = 'COMPLETE'
      WHERE srp.data_provider = 'TINDER'
        AND srp.is_synthetic = false
        AND srp.is_swipe_rank_excluded = false
        AND fact.metric_version = ${SWIPE_RANK_METRIC_VERSION}
        AND ${completedFullSwipeRankBuildSql(
          "TINDER",
          SWIPE_RANK_METRIC_VERSION,
        )}
        AND fact.period_kind = ${input.period.kind}
        AND fact.period_start = ${input.period.start}::date
        AND fact.period_end = ${input.period.end}::date
        AND fact.match_rate IS NOT NULL
        AND fact.match_rate_denominator >= ${threshold.minimumRateDenominator}
        AND fact.active_days >= ${threshold.minimumActiveDays}
        ${filterSql}
    ),
    distribution AS (
      SELECT
        count(*)::bigint AS cohort_size,
        count(match_rate)::bigint AS match_rate_sample_size,
        count(like_rate)::bigint AS like_rate_sample_size,
        count(swipes_per_active_day)::bigint
          AS swipes_per_active_day_sample_size,
        max(computed_at) AS cohort_as_of,
        percentile_cont(0.1) WITHIN GROUP (ORDER BY match_rate)
          AS match_rate_p10,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY match_rate)
          AS match_rate_p25,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY match_rate)
          AS match_rate_p50,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY match_rate)
          AS match_rate_p75,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY match_rate)
          AS match_rate_p90,
        percentile_cont(0.1) WITHIN GROUP (ORDER BY like_rate)
          AS like_rate_p10,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY like_rate)
          AS like_rate_p25,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY like_rate)
          AS like_rate_p50,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY like_rate)
          AS like_rate_p75,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY like_rate)
          AS like_rate_p90,
        percentile_cont(0.1) WITHIN GROUP (ORDER BY swipes_per_active_day)
          AS swipes_per_active_day_p10,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY swipes_per_active_day)
          AS swipes_per_active_day_p25,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY swipes_per_active_day)
          AS swipes_per_active_day_p50,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY swipes_per_active_day)
          AS swipes_per_active_day_p75,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY swipes_per_active_day)
          AS swipes_per_active_day_p90
      FROM eligible
    ),
    target_placement AS (
      SELECT
        count(*) FILTER (
          WHERE eligible.match_rate > target.match_rate
        )::bigint AS match_rate_greater_count,
        count(*) FILTER (
          WHERE eligible.match_rate = target.match_rate
        )::bigint AS match_rate_equal_count,
        count(*) FILTER (
          WHERE eligible.match_rate <= target.match_rate
        )::bigint AS match_rate_at_or_below_count,
        count(*) FILTER (
          WHERE eligible.like_rate > target.like_rate
        )::bigint AS like_rate_greater_count,
        count(*) FILTER (
          WHERE eligible.like_rate = target.like_rate
        )::bigint AS like_rate_equal_count,
        count(*) FILTER (
          WHERE eligible.like_rate <= target.like_rate
        )::bigint AS like_rate_at_or_below_count,
        count(*) FILTER (
          WHERE eligible.swipes_per_active_day > target.swipes_per_active_day
        )::bigint AS swipes_per_active_day_greater_count,
        count(*) FILTER (
          WHERE eligible.swipes_per_active_day = target.swipes_per_active_day
        )::bigint AS swipes_per_active_day_equal_count,
        count(*) FILTER (
          WHERE eligible.swipes_per_active_day <= target.swipes_per_active_day
        )::bigint AS swipes_per_active_day_at_or_below_count
      FROM eligible
      CROSS JOIN target_fact target
    )
    SELECT
      target.id AS profile_id,
      target.provider_profile_id,
      target.gender,
      target.interested_in,
      target.city,
      target.region,
      target.country,
      target_fact.age_in_period,
      target_fact.match_rate_numerator,
      target_fact.match_rate_denominator,
      target_fact.like_rate_numerator,
      target_fact.like_rate_denominator,
      target_fact.match_rate,
      target_fact.like_rate,
      target_fact.swipes_per_active_day,
      target_fact.active_days,
      target_fact.observed_days,
      target_fact.quality_flags,
      target_fact.has_quality_anomaly,
      target.is_swipe_rank_excluded,
      target_fact.computed_at AS target_computed_at,
      distribution.*,
      placement.*
    FROM target_profile target
    JOIN target_fact ON true
    CROSS JOIN distribution
    LEFT JOIN target_placement placement ON true
  `);

  const row = result.rows[0];
  if (!row) {
    throw new Error(
      `No ${input.period.kind} SwipeRank fact exists for Tinder profile ${input.providerProfileId}.`,
    );
  }

  return assembleSwipeRankBenchmark(input, row);
}
