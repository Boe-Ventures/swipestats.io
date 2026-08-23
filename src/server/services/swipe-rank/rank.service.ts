import { sql } from "drizzle-orm";

import { db } from "@/server/db";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import {
  assertClosedSwipeRankPeriod,
  type SwipeRankPeriodBounds,
} from "./periods";

export interface GetSwipeRankInput {
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

interface RankRow extends Record<string, unknown> {
  profile_id: string;
  provider_profile_id: string;
  build_id: string;
  published_at: Date | string;
  gender: string | null;
  interested_in: string | null;
  age_in_period: number | string | null;
  metric_numerator: number | string;
  metric_denominator: number | string;
  metric_value: number | string;
  active_days: number | string | null;
  observed_days: number | string | null;
  quality_flags: string[] | null;
  is_swipe_rank_excluded: boolean;
  global_rank: number | string;
  global_tie_count: number | string;
  global_field_size: number | string;
  global_percentile: number | string;
  global_top_share: number | string;
  peer_rank: number | string | null;
  peer_tie_count: number | string | null;
  peer_field_size: number | string;
}

function number(value: number | string | null): number {
  return value === null ? 0 : Number(value);
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Read an owner's immutable placement from a published closed season. */
export async function getSwipeRankFromFacts(input: GetSwipeRankInput) {
  assertClosedSwipeRankPeriod(input.period);
  const metricVersion = input.metricVersion ?? SWIPE_RANK_METRIC_VERSION;
  const result = await db.execute<RankRow>(sql`
    WITH selected_snapshot AS (
      SELECT snapshot.*
      FROM swipe_rank_snapshot snapshot
      WHERE snapshot.data_provider = ${input.dataProvider}
        AND snapshot.metric_version = ${metricVersion}
        AND snapshot.period_kind = ${input.period.kind}
        AND snapshot.period_start = ${input.period.start}::date
        AND snapshot.period_end = ${input.period.end}::date
        AND snapshot.status = 'PUBLISHED'
      ORDER BY snapshot.published_at DESC, snapshot.id DESC
      LIMIT 1
    ), field AS (
      SELECT
        entry.*,
        profile.gender,
        profile.interested_in,
        rank() OVER (
          PARTITION BY profile.gender, profile.interested_in
          ORDER BY entry.metric_value DESC
        ) AS peer_rank,
        count(*) OVER (
          PARTITION BY profile.gender, profile.interested_in,
            entry.metric_value
        ) AS peer_tie_count,
        count(*) OVER (
          PARTITION BY profile.gender, profile.interested_in
        ) AS peer_field_size
      FROM selected_snapshot snapshot
      JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
      JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
      WHERE profile.is_synthetic = false
        AND profile.is_swipe_rank_excluded = false
    )
    SELECT
      profile.id AS profile_id,
      profile.provider_profile_id,
      snapshot.build_id,
      snapshot.published_at,
      profile.gender,
      profile.interested_in,
      field.age_in_period,
      field.metric_numerator,
      field.metric_denominator,
      field.metric_value,
      field.active_days,
      field.observed_days,
      field.quality_flags,
      profile.is_swipe_rank_excluded,
      field.rank AS global_rank,
      field.tie_count AS global_tie_count,
      field.field_size AS global_field_size,
      field.percentile AS global_percentile,
      field.top_share AS global_top_share,
      field.peer_rank,
      field.peer_tie_count,
      field.peer_field_size
    FROM swipe_rank_profile profile
    JOIN selected_snapshot snapshot ON true
    JOIN field ON field.profile_id = profile.id
    WHERE profile.data_provider = ${input.dataProvider}
      AND profile.provider_profile_id = ${input.providerProfileId}
      AND profile.is_synthetic = false
  `);
  const row = result.rows[0];
  if (!row) {
    throw new Error(
      `${input.dataProvider} profile ${input.providerProfileId} has no published SwipeRank for ${input.period.start}.`,
    );
  }

  const peerRank = nullableNumber(row.peer_rank);
  const peerFieldSize = number(row.peer_field_size);
  return {
    profileId: row.profile_id,
    providerProfileId: row.provider_profile_id,
    buildId: row.build_id,
    computedAt: asDate(row.published_at),
    metricVersion,
    period: input.period,
    gender: row.gender,
    interestedIn: row.interested_in,
    ageInPeriod: nullableNumber(row.age_in_period),
    matchRateNumerator: number(row.metric_numerator),
    matchRateDenominator: number(row.metric_denominator),
    matchRate: number(row.metric_value),
    activeDays: number(row.active_days),
    observedDays: number(row.observed_days),
    qualityFlags: row.quality_flags ?? [],
    hasQualityAnomaly: (row.quality_flags?.length ?? 0) > 0,
    excludedFromSwipeRank: row.is_swipe_rank_excluded,
    isStale: false,
    eligible: true,
    global: {
      rank: number(row.global_rank),
      tieCount: number(row.global_tie_count),
      fieldSize: number(row.global_field_size),
      percentile: number(row.global_percentile),
      topShare: number(row.global_top_share),
    },
    peer: {
      rank: peerRank,
      tieCount: nullableNumber(row.peer_tie_count),
      fieldSize: peerFieldSize,
      percentile:
        peerRank === null || peerFieldSize === 0
          ? null
          : ((peerFieldSize - peerRank + 1) / peerFieldSize) * 100,
      topShare:
        peerRank === null || peerFieldSize === 0
          ? null
          : (peerRank / peerFieldSize) * 100,
      definition: `${row.gender ?? "UNKNOWN"} interested in ${row.interested_in ?? "UNKNOWN"}`,
    },
  };
}
