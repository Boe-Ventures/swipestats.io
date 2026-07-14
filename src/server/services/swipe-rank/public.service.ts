import { createHmac } from "node:crypto";

import { sql } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/server/db";
import type { SwipeRankPeriodKind } from "@/server/db/schema";

import {
  SWIPE_RANK_METRIC_VERSION,
  SWIPE_RANK_PERIOD_KINDS,
} from "./constants";
import { SWIPE_RANK_ELIGIBILITY_V1 } from "./eligibility";
import { assertAlignedPeriod, type SwipeRankPeriodBounds } from "./periods";
import { completedFullSwipeRankBuildSql } from "./readiness";

export const SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE = 25;
export const SWIPE_RANK_PUBLIC_PAGE_SIZE = 100;

export interface PublicSwipeRankEntry {
  entryKey: string;
  alias: string;
  rank: number;
  topShare: number;
  matchYieldPercent: number;
}

export interface PublicSwipeRankLeaderboard {
  ready: boolean;
  metricVersion: string;
  period: SwipeRankPeriodBounds;
  asOf: string | null;
  minimumRateDenominator: number;
  minimumActiveDays: number;
  minimumPublicFieldSize: number;
  fieldSize: number | null;
  countsSuppressed: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  entries: PublicSwipeRankEntry[];
}

export interface PublicSwipeRankPeriodSummary {
  period: SwipeRankPeriodBounds;
  asOf: string;
  minimumRateDenominator: number;
  minimumActiveDays: number;
  fieldSize: number;
}

export interface PublicSwipeRankPeriods {
  metricVersion: string;
  minimumPublicFieldSize: number;
  periods: PublicSwipeRankPeriodSummary[];
}

interface PublicLeaderboardQueryRow extends Record<string, unknown> {
  ready: boolean;
  profile_id: string | null;
  rank: number | string | null;
  field_size: number | string;
  metric_value: number | string | null;
  as_of: string | Date | null;
}

interface PublicPeriodSummaryRow extends Record<string, unknown> {
  period_kind: SwipeRankPeriodKind;
  period_start: string;
  period_end: string;
  as_of: string | Date;
  field_size: number | string;
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function publicIdentitySecret(): string {
  const secret = env.SWIPE_RANK_PUBLIC_ID_SECRET ?? env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "SwipeRank public identities require SWIPE_RANK_PUBLIC_ID_SECRET or BETTER_AUTH_SECRET.",
    );
  }
  return secret;
}

/**
 * A profile receives a different opaque identity in every season. The source
 * profile ID is never returned, and the HMAC prevents somebody who learns an
 * internal ID elsewhere from reproducing its public alias without the secret.
 */
export function getPublicSwipeRankPseudonym(
  profileId: string,
  period: SwipeRankPeriodBounds,
  secret: string,
): Pick<PublicSwipeRankEntry, "entryKey" | "alias"> {
  if (!secret) {
    throw new Error("SwipeRank public identity secret must not be empty.");
  }
  const digest = createHmac("sha256", secret)
    .update(
      `swipe-rank:${period.kind}:${period.start}:${period.end}:${profileId}`,
    )
    .digest("hex");
  return {
    entryKey: `entry_${digest.slice(0, 32)}`,
    alias: `Dater #${digest.slice(0, 10).toUpperCase()}`,
  };
}

function assertPublicLeaderboardInput(input: {
  minimumRateDenominator: number;
  minimumActiveDays: number;
  page: number;
}) {
  if (
    !Number.isSafeInteger(input.minimumRateDenominator) ||
    input.minimumRateDenominator < 0 ||
    !Number.isSafeInteger(input.minimumActiveDays) ||
    input.minimumActiveDays < 0
  ) {
    throw new Error(
      "SwipeRank public eligibility thresholds must be non-negative integers.",
    );
  }
  if (!Number.isSafeInteger(input.page) || input.page < 1) {
    throw new Error(
      "SwipeRank public leaderboard page must be a positive integer.",
    );
  }
  const offset = (input.page - 1) * SWIPE_RANK_PUBLIC_PAGE_SIZE;
  if (!Number.isSafeInteger(offset)) {
    throw new Error("SwipeRank public leaderboard page is too large.");
  }
}

export async function getPublicSwipeRankLeaderboard(input: {
  period: SwipeRankPeriodBounds;
  minimumRateDenominator: number;
  minimumActiveDays: number;
  page: number;
  metricVersion?: string;
}): Promise<PublicSwipeRankLeaderboard> {
  assertAlignedPeriod(input.period);
  assertPublicLeaderboardInput(input);
  const metricVersion = input.metricVersion ?? SWIPE_RANK_METRIC_VERSION;
  const offset = (input.page - 1) * SWIPE_RANK_PUBLIC_PAGE_SIZE;
  const result = await db.execute<PublicLeaderboardQueryRow>(sql`
    WITH eligible AS (
      SELECT
        fact.match_rate,
        profile.id AS profile_id,
        build.completed_at AS build_completed_at,
        rank() OVER (ORDER BY fact.match_rate DESC) AS rank,
        row_number() OVER (
          ORDER BY fact.match_rate DESC, profile.id
        ) AS row_number
      FROM swipe_rank_period_fact AS fact
      JOIN swipe_rank_profile AS profile ON profile.id = fact.profile_id
      JOIN swipe_rank_build AS build
        ON build.id = fact.build_id
       AND build.status = 'COMPLETE'
      WHERE profile.data_provider = 'TINDER'
        AND profile.is_synthetic = false
        AND fact.metric_version = ${metricVersion}
        AND ${completedFullSwipeRankBuildSql("TINDER", metricVersion)}
        AND fact.period_kind = ${input.period.kind}
        AND fact.period_start = ${input.period.start}::date
        AND fact.period_end = ${input.period.end}::date
        AND fact.match_rate_denominator >= ${input.minimumRateDenominator}
        AND fact.active_days >= ${input.minimumActiveDays}
        AND fact.match_rate IS NOT NULL
    ), stats AS (
      SELECT
        ${completedFullSwipeRankBuildSql("TINDER", metricVersion)} AS ready,
        count(*)::bigint AS field_size,
        max(build_completed_at) AS as_of
      FROM eligible
    ), paged AS (
      SELECT eligible.*
      FROM eligible
      CROSS JOIN stats
      WHERE stats.field_size >= ${SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE}
      ORDER BY eligible.row_number
      LIMIT ${SWIPE_RANK_PUBLIC_PAGE_SIZE}
      OFFSET ${offset}
    )
    SELECT
      stats.field_size,
      stats.ready,
      stats.as_of,
      paged.profile_id,
      paged.rank,
      paged.match_rate AS metric_value
    FROM stats
    LEFT JOIN paged ON true
    ORDER BY paged.row_number NULLS LAST
  `);
  const rows = result.rows;
  const first = rows[0];
  const fieldSize = first ? Number(first.field_size) : 0;
  const countsSuppressed = fieldSize < SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE;
  const totalPages = countsSuppressed
    ? 0
    : Math.ceil(fieldSize / SWIPE_RANK_PUBLIC_PAGE_SIZE);
  const secret = publicIdentitySecret();
  const entries = !countsSuppressed
    ? rows.flatMap((row) => {
        if (
          row.profile_id === null ||
          row.rank === null ||
          row.metric_value === null
        ) {
          return [];
        }
        const rank = Number(row.rank);
        return [
          {
            ...getPublicSwipeRankPseudonym(
              row.profile_id,
              input.period,
              secret,
            ),
            rank,
            topShare: (rank / fieldSize) * 100,
            matchYieldPercent:
              Math.round(Number(row.metric_value) * 1_000) / 10,
          } satisfies PublicSwipeRankEntry,
        ];
      })
    : [];

  return {
    ready: first?.ready ?? false,
    metricVersion,
    period: input.period,
    asOf: iso(first?.as_of ?? null),
    minimumRateDenominator: input.minimumRateDenominator,
    minimumActiveDays: input.minimumActiveDays,
    minimumPublicFieldSize: SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE,
    fieldSize: countsSuppressed ? null : fieldSize,
    countsSuppressed,
    page: input.page,
    pageSize: SWIPE_RANK_PUBLIC_PAGE_SIZE,
    totalPages,
    entries,
  };
}

/**
 * Every observed useful period is retained. Small fields stay entirely absent
 * from the public inventory, while all eligible profiles in a useful period
 * are available through the paginated leaderboard.
 */
export async function listPublicSwipeRankPeriods(
  metricVersion = SWIPE_RANK_METRIC_VERSION,
): Promise<PublicSwipeRankPeriods> {
  const result = await db.execute<PublicPeriodSummaryRow>(sql`
    WITH period_facts AS (
      SELECT
        fact.period_kind,
        fact.period_start,
        fact.period_end,
        build.completed_at,
        (
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
        ) AS is_eligible
      FROM swipe_rank_period_fact AS fact
      JOIN swipe_rank_profile AS profile ON profile.id = fact.profile_id
      JOIN swipe_rank_build AS build
        ON build.id = fact.build_id
       AND build.status = 'COMPLETE'
      WHERE profile.data_provider = 'TINDER'
        AND profile.is_synthetic = false
        AND fact.metric_version = ${metricVersion}
        AND ${completedFullSwipeRankBuildSql("TINDER", metricVersion)}
    ), summaries AS (
      SELECT
        period_kind,
        period_start,
        period_end,
        max(completed_at) FILTER (WHERE is_eligible) AS as_of,
        count(*) FILTER (WHERE is_eligible)::bigint AS field_size
      FROM period_facts
      GROUP BY period_kind, period_start, period_end
    )
    SELECT
      period_kind,
      period_start::text,
      period_end::text,
      as_of,
      field_size
    FROM summaries
    WHERE field_size >= ${SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE}
    ORDER BY CASE period_kind
      WHEN 'MONTH' THEN 1
      WHEN 'QUARTER' THEN 2
      WHEN 'YEAR' THEN 3
      WHEN 'ALL_TIME' THEN 4
    END, period_start DESC, period_end DESC
  `);

  const periods = result.rows.map((row) => {
    const eligibility = SWIPE_RANK_ELIGIBILITY_V1[row.period_kind];
    return {
      period: {
        kind: row.period_kind,
        start: row.period_start,
        end: row.period_end,
      },
      asOf: iso(row.as_of)!,
      ...eligibility,
      fieldSize: Number(row.field_size),
    } satisfies PublicSwipeRankPeriodSummary;
  });

  return {
    metricVersion,
    minimumPublicFieldSize: SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE,
    periods: SWIPE_RANK_PERIOD_KINDS.flatMap((kind) =>
      periods.filter((period) => period.period.kind === kind),
    ),
  };
}
