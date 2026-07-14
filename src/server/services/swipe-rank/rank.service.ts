import { sql } from "drizzle-orm";

import { db } from "@/server/db";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import { assertAlignedPeriod, type SwipeRankPeriodBounds } from "./periods";
import { completedFullSwipeRankBuildSql } from "./readiness";

export interface GetSwipeRankInput {
  /** v1 has an approved numerator mapping for Tinder only. */
  dataProvider: "TINDER";
  providerProfileId: string;
  period: SwipeRankPeriodBounds;
  metricVersion?: string;
  minimumRateDenominator: number;
  minimumActiveDays: number;
}

export interface SwipeRankPlacement {
  rank: number | null;
  tieCount: number | null;
  fieldSize: number;
  percentile: number | null;
  topShare: number | null;
}

export interface SwipeRankFactResult {
  profileId: string;
  providerProfileId: string;
  buildId: string | null;
  computedAt: Date;
  metricVersion: string;
  period: SwipeRankPeriodBounds;
  gender: string | null;
  interestedIn: string | null;
  ageInPeriod: number | null;
  matchRateNumerator: number;
  matchRateDenominator: number;
  matchRate: number | null;
  activeDays: number;
  observedDays: number;
  qualityFlags: string[];
  hasQualityAnomaly: boolean;
  isStale: boolean;
  eligible: boolean;
  global: SwipeRankPlacement;
  peer: SwipeRankPlacement & { definition: string };
}

interface RankRow extends Record<string, unknown> {
  profile_id: string;
  provider_profile_id: string;
  build_id: string | null;
  computed_at: Date | string | null;
  gender: string | null;
  interested_in: string | null;
  age_in_period: number | string | null;
  match_rate_numerator: number | string | null;
  match_rate_denominator: number | string | null;
  match_rate: number | string | null;
  active_days: number | string | null;
  observed_days: number | string | null;
  quality_flags: string[] | null;
  has_quality_anomaly: boolean | null;
  is_stale: boolean | null;
  eligible: boolean;
  global_rank: number | string | null;
  global_tie_count: number | string | null;
  global_field_size: number | string;
  peer_rank: number | string | null;
  peer_tie_count: number | string | null;
  peer_field_size: number | string;
}

function numberOrZero(value: number | string | null): number {
  return value === null ? 0 : Number(value);
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function placement(
  rankValue: number | string | null,
  tieValue: number | string | null,
  fieldValue: number | string,
): SwipeRankPlacement {
  const rank = nullableNumber(rankValue);
  const tieCount = nullableNumber(tieValue);
  const fieldSize = Number(fieldValue);
  return {
    rank,
    tieCount,
    fieldSize,
    percentile:
      rank === null || fieldSize === 0
        ? null
        : ((fieldSize - rank + 1) / fieldSize) * 100,
    topShare:
      rank === null || fieldSize === 0 ? null : (rank / fieldSize) * 100,
  };
}

/**
 * Read an exact live placement from materialized facts.
 *
 * Quality anomalies, including match yield above 100%, remain in the field and
 * are returned to the caller. Publication policy may annotate them, but this
 * data-layer query never silently removes them.
 */
export async function getSwipeRankFromFacts(
  input: GetSwipeRankInput,
): Promise<SwipeRankFactResult> {
  assertAlignedPeriod(input.period);
  if (input.minimumRateDenominator < 0 || input.minimumActiveDays < 0) {
    throw new Error("SwipeRank eligibility thresholds cannot be negative.");
  }

  const metricVersion = input.metricVersion ?? SWIPE_RANK_METRIC_VERSION;
  const result = await db.execute<RankRow>(sql`
    WITH target_profile AS (
      SELECT srp.*
      FROM swipe_rank_profile srp
      WHERE srp.data_provider = ${input.dataProvider}
        AND srp.provider_profile_id = ${input.providerProfileId}
        AND srp.is_synthetic = false
    ),
    period_field AS (
      SELECT
        fact.*,
        srp.gender,
        srp.interested_in,
        srp.provider_profile_id
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
      JOIN swipe_rank_build build
        ON build.id = fact.build_id
       AND build.status = 'COMPLETE'
      WHERE srp.data_provider = ${input.dataProvider}
        AND srp.is_synthetic = false
        AND fact.metric_version = ${metricVersion}
        AND ${completedFullSwipeRankBuildSql("TINDER", metricVersion)}
        AND fact.period_kind = ${input.period.kind}
        AND fact.period_start = ${input.period.start}::date
        AND fact.period_end = ${input.period.end}::date
    ),
    eligible AS (
      SELECT *
      FROM period_field
      WHERE match_rate_denominator >= ${input.minimumRateDenominator}
        AND active_days >= ${input.minimumActiveDays}
        AND match_rate IS NOT NULL
    ),
    ranked AS (
      SELECT
        eligible.*,
        rank() OVER (ORDER BY match_rate DESC) AS global_rank,
        count(*) OVER (PARTITION BY match_rate) AS global_tie_count,
        count(*) OVER () AS global_field_size,
        rank() OVER (
          PARTITION BY gender, interested_in
          ORDER BY match_rate DESC
        ) AS peer_rank,
        count(*) OVER (
          PARTITION BY gender, interested_in, match_rate
        ) AS peer_tie_count,
        count(*) OVER (
          PARTITION BY gender, interested_in
        ) AS peer_field_size
      FROM eligible
    ),
    field_sizes AS (
      SELECT
        count(*)::bigint AS global_field_size,
        max(eligible.computed_at) AS global_computed_at,
        count(*) FILTER (
          WHERE eligible.gender IS NOT DISTINCT FROM target.gender
            AND eligible.interested_in IS NOT DISTINCT FROM target.interested_in
        )::bigint AS peer_field_size
      FROM eligible
      CROSS JOIN target_profile target
    ),
    target_fact AS (
      SELECT field.*
      FROM period_field field
      JOIN target_profile target ON target.id = field.profile_id
    ),
    target_source AS (
      SELECT
        md5(concat_ws(':',
          count(*),
          min(u.date_stamp_raw::date),
          max(u.date_stamp_raw::date),
          coalesce(sum(u.swipe_likes), 0),
          coalesce(sum(u.swipe_passes), 0),
          coalesce(sum(u.swipe_super_likes), 0),
          coalesce(sum(u.matches), 0),
          coalesce(sum(u.messages_sent), 0),
          coalesce(sum(u.messages_received), 0),
          coalesce(sum(u.app_opens), 0)
        )) AS source_fingerprint
      FROM target_profile target
      JOIN tinder_usage u
        ON ${input.dataProvider} = 'TINDER'
       AND u.tinder_profile_id = target.provider_profile_id
       AND u.date_stamp_raw >= ${input.period.start}
       AND u.date_stamp_raw < ${input.period.end}
    ),
    current_source_watermark AS (
      SELECT
        p.updated_at AS profile_updated_at,
        p.user_id AS source_user_id,
        p.gender AS source_gender,
        p.interested_in AS source_interested_in,
        coalesce(app_user.city, p.city) AS source_city,
        coalesce(app_user.region, p.region) AS source_region,
        coalesce(app_user.country, p.country) AS source_country,
        max(source_file.created_at) AS file_created_at
      FROM target_profile target
      JOIN tinder_profile p
        ON ${input.dataProvider} = 'TINDER'
       AND p.tinder_id = target.provider_profile_id
      LEFT JOIN "user" app_user ON app_user.id = p.user_id
      LEFT JOIN original_anonymized_file source_file
        ON source_file.user_id = p.user_id
       AND source_file.data_provider = 'TINDER'
      GROUP BY
        p.updated_at,
        p.user_id,
        p.gender,
        p.interested_in,
        app_user.city,
        p.city,
        app_user.region,
        p.region,
        app_user.country,
        p.country
    )
    SELECT
      target.id AS profile_id,
      target.provider_profile_id,
      target_fact.build_id,
      coalesce(sizes.global_computed_at, target_fact.computed_at)
        AS computed_at,
      target.gender,
      target.interested_in,
      target_fact.age_in_period,
      target_fact.match_rate_numerator,
      target_fact.match_rate_denominator,
      target_fact.match_rate,
      target_fact.active_days,
      target_fact.observed_days,
      target_fact.quality_flags,
      target_fact.has_quality_anomaly,
      (
        target_fact.id IS NOT NULL AND (
          target_source.source_fingerprint IS DISTINCT FROM target_fact.source_fingerprint
          OR current_watermark.profile_updated_at > target_fact.source_profile_updated_at
          OR target.user_id IS DISTINCT FROM current_watermark.source_user_id
          OR target.gender IS DISTINCT FROM current_watermark.source_gender
          OR target.interested_in IS DISTINCT FROM current_watermark.source_interested_in
          OR target.city IS DISTINCT FROM current_watermark.source_city
          OR target.region IS DISTINCT FROM current_watermark.source_region
          OR target.country IS DISTINCT FROM current_watermark.source_country
          OR (
            current_watermark.file_created_at IS NOT NULL
            AND (
              target_fact.source_file_created_at IS NULL
              OR current_watermark.file_created_at > target_fact.source_file_created_at
            )
          )
        )
      ) AS is_stale,
      ranked.id IS NOT NULL AS eligible,
      ranked.global_rank,
      ranked.global_tie_count,
      coalesce(ranked.global_field_size, sizes.global_field_size, 0)
        AS global_field_size,
      ranked.peer_rank,
      ranked.peer_tie_count,
      coalesce(ranked.peer_field_size, sizes.peer_field_size, 0)
        AS peer_field_size
    FROM target_profile target
    CROSS JOIN field_sizes sizes
    LEFT JOIN target_fact ON true
    LEFT JOIN target_source ON true
    LEFT JOIN current_source_watermark current_watermark ON true
    LEFT JOIN ranked ON ranked.profile_id = target.id
  `);

  const row = result.rows[0];
  if (!row) {
    throw new Error(
      `${input.dataProvider} profile ${input.providerProfileId} is not registered for SwipeRank.`,
    );
  }
  if (!row.build_id || !row.computed_at) {
    throw new Error(
      `${input.dataProvider} profile ${input.providerProfileId} has no SwipeRank fact for ${input.period.kind} ${input.period.start}.`,
    );
  }

  return {
    profileId: row.profile_id,
    providerProfileId: row.provider_profile_id,
    buildId: row.build_id,
    computedAt: asDate(row.computed_at),
    metricVersion,
    period: input.period,
    gender: row.gender,
    interestedIn: row.interested_in,
    ageInPeriod: nullableNumber(row.age_in_period),
    matchRateNumerator: numberOrZero(row.match_rate_numerator),
    matchRateDenominator: numberOrZero(row.match_rate_denominator),
    matchRate: nullableNumber(row.match_rate),
    activeDays: numberOrZero(row.active_days),
    observedDays: numberOrZero(row.observed_days),
    qualityFlags: row.quality_flags ?? [],
    hasQualityAnomaly: row.has_quality_anomaly ?? false,
    isStale: row.is_stale ?? false,
    eligible: row.eligible,
    global: placement(
      row.global_rank,
      row.global_tie_count,
      row.global_field_size,
    ),
    peer: {
      ...placement(row.peer_rank, row.peer_tie_count, row.peer_field_size),
      definition: `${row.gender ?? "UNKNOWN"} interested in ${row.interested_in ?? "UNKNOWN"}`,
    },
  };
}
