import { sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";
import type { Gender, SwipeRankPeriodKind } from "@/server/db/schema";

import {
  SWIPE_RANK_ELIGIBILITY_V1,
  SWIPE_RANK_ELIGIBILITY_VERSION,
  evaluateSwipeRankEligibility,
  getSwipeRankEligibility,
} from "./eligibility";
import {
  SWIPE_RANK_METRIC_VERSION,
  SWIPE_RANK_PERIOD_KINDS,
} from "./constants";
import { swipeRankCountryFilterSql } from "./country-filter";
import { assertAlignedPeriod, type SwipeRankPeriodBounds } from "./periods";
import { getSwipeRankFromFacts } from "./rank.service";
import { completedFullSwipeRankBuildSql } from "./readiness";

export interface SwipeRankFilters {
  gender?: Gender;
  interestedIn?: Gender;
  ageMin?: number;
  ageMax?: number;
  country?: string;
  region?: string;
  city?: string;
}

interface LatestPeriodRow extends Record<string, unknown> {
  period_kind: SwipeRankPeriodKind;
  period_start: string;
  period_end: string;
  computed_at: Date | string;
}

interface AvailablePeriodRow extends LatestPeriodRow {
  total_fact_count: number | string;
  eligible_count: number | string;
}

interface ProfilePeriodRow extends LatestPeriodRow {
  gender: Gender | null;
  interested_in: Gender | null;
  is_swipe_rank_excluded: boolean;
  match_rate_denominator: number | string | null;
  active_days: number | string;
}

interface LeaderboardSummaryRow extends Record<string, unknown> {
  total_fact_count: number | string;
  eligible_count: number | string;
  as_of: Date | string | null;
}

interface LeaderboardRow extends Record<string, unknown> {
  profile_id: string;
  provider_profile_id: string;
  gender: Gender | null;
  interested_in: Gender | null;
  city: string | null;
  region: string | null;
  country: string | null;
  age_in_period: number | string | null;
  match_rate_numerator: number | string;
  match_rate_denominator: number | string;
  match_rate: number | string;
  active_days: number | string;
  observed_days: number | string;
  quality_flags: string[] | null;
  has_quality_anomaly: boolean;
  computed_at: Date | string;
  rank: number | string;
  tie_count: number | string;
  field_size: number | string;
}

function asNumber(value: number | string | null): number {
  return value === null ? 0 : Number(value);
}

function asNullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function dimensionFilterSql(filters: SwipeRankFilters): SQL {
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

function periodEligibilitySql(): SQL {
  return sql`
    fact.match_rate IS NOT NULL
    AND fact.match_rate_denominator >= CASE fact.period_kind
      WHEN 'MONTH' THEN ${SWIPE_RANK_ELIGIBILITY_V1.MONTH.minimumRateDenominator}
      WHEN 'QUARTER' THEN ${SWIPE_RANK_ELIGIBILITY_V1.QUARTER.minimumRateDenominator}
      WHEN 'YEAR' THEN ${SWIPE_RANK_ELIGIBILITY_V1.YEAR.minimumRateDenominator}
      WHEN 'ALL_TIME' THEN ${SWIPE_RANK_ELIGIBILITY_V1.ALL_TIME.minimumRateDenominator}
    END::bigint
    AND fact.active_days >= CASE fact.period_kind
      WHEN 'MONTH' THEN ${SWIPE_RANK_ELIGIBILITY_V1.MONTH.minimumActiveDays}
      WHEN 'QUARTER' THEN ${SWIPE_RANK_ELIGIBILITY_V1.QUARTER.minimumActiveDays}
      WHEN 'YEAR' THEN ${SWIPE_RANK_ELIGIBILITY_V1.YEAR.minimumActiveDays}
      WHEN 'ALL_TIME' THEN ${SWIPE_RANK_ELIGIBILITY_V1.ALL_TIME.minimumActiveDays}
    END::integer
  `;
}

function fixedPeriodEligibilitySql(periodKind: SwipeRankPeriodKind): SQL {
  const threshold = getSwipeRankEligibility(periodKind);
  return sql`
    fact.match_rate IS NOT NULL
    AND fact.match_rate_denominator >= ${threshold.minimumRateDenominator}
    AND fact.active_days >= ${threshold.minimumActiveDays}
  `;
}

async function latestPeriodsForProfile(providerProfileId: string) {
  const inventory = await listTinderSwipeRankProfilePeriods(providerProfileId);
  const byKind = new Map<
    SwipeRankPeriodKind,
    (typeof inventory.periods)[number]
  >();
  for (const item of inventory.periods) {
    if (!byKind.has(item.period.kind)) byKind.set(item.period.kind, item);
  }
  return SWIPE_RANK_PERIOD_KINDS.flatMap((kind) => {
    const available = byKind.get(kind);
    return available ? [available] : [];
  });
}

/** Every fact-backed season available to one owned Tinder profile. */
export async function listTinderSwipeRankProfilePeriods(
  providerProfileId: string,
) {
  const result = await db.execute<ProfilePeriodRow>(sql`
    SELECT
      fact.period_kind,
      fact.period_start::text,
      fact.period_end::text,
      fact.computed_at,
      srp.gender,
      srp.interested_in,
      srp.is_swipe_rank_excluded,
      fact.match_rate_denominator,
      fact.active_days
    FROM swipe_rank_period_fact fact
    JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
    JOIN swipe_rank_build build
      ON build.id = fact.build_id
     AND build.status = 'COMPLETE'
    WHERE srp.data_provider = 'TINDER'
      AND srp.provider_profile_id = ${providerProfileId}
      AND srp.is_synthetic = false
      AND fact.metric_version = ${SWIPE_RANK_METRIC_VERSION}
      AND ${completedFullSwipeRankBuildSql("TINDER", SWIPE_RANK_METRIC_VERSION)}
    ORDER BY
      CASE fact.period_kind
        WHEN 'MONTH' THEN 1
        WHEN 'QUARTER' THEN 2
        WHEN 'YEAR' THEN 3
        WHEN 'ALL_TIME' THEN 4
      END,
      fact.period_start DESC,
      fact.computed_at DESC
  `);

  return {
    metricKey: "MATCH_YIELD" as const,
    metricLabel: "Match yield" as const,
    metricVersion: SWIPE_RANK_METRIC_VERSION,
    eligibilityVersion: SWIPE_RANK_ELIGIBILITY_VERSION,
    periods: result.rows.map((row) => {
      const period = {
        kind: row.period_kind,
        start: row.period_start,
        end: row.period_end,
      } satisfies SwipeRankPeriodBounds;
      const eligibility = evaluateSwipeRankEligibility({
        periodKind: period.kind,
        rateDenominator: asNumber(row.match_rate_denominator),
        activeDays: asNumber(row.active_days),
      });
      return {
        period: {
          ...period,
        },
        asOf: asDate(row.computed_at),
        gender: row.gender,
        interestedIn: row.interested_in,
        excludedFromSwipeRank: row.is_swipe_rank_excluded,
        eligibility,
        rankEligible: eligibility.eligible && !row.is_swipe_rank_excluded,
      };
    }),
  };
}

/** Exact selected-season placement for one owner. */
export async function getTinderSwipeRankPlacement(
  providerProfileId: string,
  period: SwipeRankPeriodBounds,
) {
  const threshold = getSwipeRankEligibility(period.kind);
  const fact = await getSwipeRankFromFacts({
    dataProvider: "TINDER",
    providerProfileId,
    period,
    ...threshold,
  });
  const eligibility = evaluateSwipeRankEligibility({
    periodKind: period.kind,
    rateDenominator: fact.matchRateDenominator,
    activeDays: fact.activeDays,
  });
  return {
    ...fact,
    asOf: fact.computedAt,
    eligibility,
    rankEligible: eligibility.eligible && !fact.excludedFromSwipeRank,
  };
}

/** Owner-facing latest period summary backed by exact live fact rankings. */
export async function getTinderSwipeRankSummary(providerProfileId: string) {
  const availablePeriods = await latestPeriodsForProfile(providerProfileId);
  const periods = await Promise.all(
    availablePeriods.map(async ({ period, asOf }) => {
      const placement = await getTinderSwipeRankPlacement(
        providerProfileId,
        period,
      );
      return { ...placement, asOf };
    }),
  );

  return {
    metricKey: "MATCH_YIELD" as const,
    metricLabel: "Match yield" as const,
    metricVersion: SWIPE_RANK_METRIC_VERSION,
    eligibilityVersion: SWIPE_RANK_ELIGIBILITY_VERSION,
    periods,
  };
}

/** Period inventory for the private admin explorer. */
export async function listAdminSwipeRankPeriods(
  filters: SwipeRankFilters = {},
) {
  const filterSql = dimensionFilterSql(filters);
  const eligibleSql = periodEligibilitySql();
  const result = await db.execute<AvailablePeriodRow>(sql`
    SELECT
      fact.period_kind,
      fact.period_start::text,
      fact.period_end::text,
      max(fact.computed_at) AS computed_at,
      count(*)::bigint AS total_fact_count,
      count(*) FILTER (WHERE ${eligibleSql})::bigint AS eligible_count
    FROM swipe_rank_period_fact fact
    JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
    JOIN swipe_rank_build build
      ON build.id = fact.build_id
     AND build.status = 'COMPLETE'
    WHERE srp.data_provider = 'TINDER'
      AND srp.is_synthetic = false
      AND srp.is_swipe_rank_excluded = false
      AND fact.metric_version = ${SWIPE_RANK_METRIC_VERSION}
      AND ${completedFullSwipeRankBuildSql("TINDER", SWIPE_RANK_METRIC_VERSION)}
      ${filterSql}
    GROUP BY fact.period_kind, fact.period_start, fact.period_end
    ORDER BY
      CASE fact.period_kind
        WHEN 'MONTH' THEN 1
        WHEN 'QUARTER' THEN 2
        WHEN 'YEAR' THEN 3
        WHEN 'ALL_TIME' THEN 4
      END,
      fact.period_start DESC
  `);

  return {
    metricKey: "MATCH_YIELD" as const,
    metricLabel: "Match yield" as const,
    metricVersion: SWIPE_RANK_METRIC_VERSION,
    eligibilityVersion: SWIPE_RANK_ELIGIBILITY_VERSION,
    periods: result.rows.map((row) => ({
      period: {
        kind: row.period_kind,
        start: row.period_start,
        end: row.period_end,
      } satisfies SwipeRankPeriodBounds,
      asOf: asDate(row.computed_at),
      totalFactCount: asNumber(row.total_fact_count),
      eligibleCount: asNumber(row.eligible_count),
      eligibility: getSwipeRankEligibility(row.period_kind),
    })),
  };
}

export interface AdminSwipeRankLeaderboardInput {
  period: SwipeRankPeriodBounds;
  filters?: SwipeRankFilters;
  page: number;
  limit: number;
}

/** Exact, filter-aware private leaderboard for admin exploration. */
export async function getAdminSwipeRankLeaderboard(
  input: AdminSwipeRankLeaderboardInput,
) {
  assertAlignedPeriod(input.period);
  const filters = input.filters ?? {};
  const filterSql = dimensionFilterSql(filters);
  const eligibleSql = fixedPeriodEligibilitySql(input.period.kind);
  const offset = (input.page - 1) * input.limit;

  const [summaryResult, entriesResult] = await Promise.all([
    db.execute<LeaderboardSummaryRow>(sql`
      SELECT
        count(*)::bigint AS total_fact_count,
        count(*) FILTER (WHERE ${eligibleSql})::bigint AS eligible_count,
        max(fact.computed_at) AS as_of
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
        ${filterSql}
    `),
    db.execute<LeaderboardRow>(sql`
      WITH eligible AS (
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
          AND srp.is_swipe_rank_excluded = false
          AND fact.metric_version = ${SWIPE_RANK_METRIC_VERSION}
          AND ${completedFullSwipeRankBuildSql(
            "TINDER",
            SWIPE_RANK_METRIC_VERSION,
          )}
          AND fact.period_kind = ${input.period.kind}
          AND fact.period_start = ${input.period.start}::date
          AND fact.period_end = ${input.period.end}::date
          ${filterSql}
          AND ${eligibleSql}
      ),
      ranked AS (
        SELECT
          eligible.*,
          rank() OVER (ORDER BY match_rate DESC) AS rank,
          count(*) OVER (PARTITION BY match_rate) AS tie_count,
          count(*) OVER () AS field_size
        FROM eligible
      )
      SELECT *
      FROM ranked
      ORDER BY rank, provider_profile_id
      LIMIT ${input.limit}
      OFFSET ${offset}
    `),
  ]);

  const summary = summaryResult.rows[0];
  const totalFactCount = summary ? asNumber(summary.total_fact_count) : 0;
  const fieldSize = summary ? asNumber(summary.eligible_count) : 0;

  return {
    metricKey: "MATCH_YIELD" as const,
    metricLabel: "Match yield" as const,
    metricVersion: SWIPE_RANK_METRIC_VERSION,
    eligibilityVersion: SWIPE_RANK_ELIGIBILITY_VERSION,
    period: input.period,
    filters,
    eligibility: getSwipeRankEligibility(input.period.kind),
    asOf: summary?.as_of ? asDate(summary.as_of) : null,
    totalFactCount,
    fieldSize,
    page: input.page,
    limit: input.limit,
    totalPages: Math.ceil(fieldSize / input.limit),
    entries: entriesResult.rows.map((row) => {
      const rank = asNumber(row.rank);
      const rowFieldSize = asNumber(row.field_size);
      return {
        profileId: row.profile_id,
        providerProfileId: row.provider_profile_id,
        gender: row.gender,
        interestedIn: row.interested_in,
        city: row.city,
        region: row.region,
        country: row.country,
        ageInPeriod: asNullableNumber(row.age_in_period),
        matchRateNumerator: asNumber(row.match_rate_numerator),
        matchRateDenominator: asNumber(row.match_rate_denominator),
        matchRate: asNumber(row.match_rate),
        activeDays: asNumber(row.active_days),
        observedDays: asNumber(row.observed_days),
        qualityFlags: row.quality_flags ?? [],
        hasQualityAnomaly: row.has_quality_anomaly,
        computedAt: asDate(row.computed_at),
        rank,
        tieCount: asNumber(row.tie_count),
        fieldSize: rowFieldSize,
        percentile:
          rowFieldSize === 0
            ? null
            : ((rowFieldSize - rank + 1) / rowFieldSize) * 100,
        topShare: rowFieldSize === 0 ? null : (rank / rowFieldSize) * 100,
      };
    }),
  };
}
