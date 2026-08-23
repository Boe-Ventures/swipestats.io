import { createHmac } from "node:crypto";

import { sql } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/server/db";
import type { Gender } from "@/server/db/schema";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import {
  assertClosedSwipeRankPeriod,
  type SwipeRankPeriodBounds,
} from "./periods";

export const SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE = 25;
export const SWIPE_RANK_PUBLIC_PAGE_SIZE = 100;

export interface PublicSwipeRankEntry {
  entryKey: string;
  alias: string;
  rank: number;
  topShare: number;
  matchYieldPercent: number;
  matches: number;
  rightSwipes: number;
  activeDays: number;
  age: number | null;
  gender: Gender | null;
  interestedIn: Gender | null;
  city: string | null;
  region: string | null;
  country: string | null;
  seasonsRanked: number;
  observedHistoryDays: number;
  photoUrl: string | null;
  photoCount: number;
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

interface LeaderboardRow extends Record<string, unknown> {
  snapshot_id: string;
  profile_id: string | null;
  rank: number | string | null;
  top_share: number | string | null;
  field_size: number | string;
  metric_value: number | string | null;
  metric_numerator: number | string | null;
  metric_denominator: number | string | null;
  active_days: number | string | null;
  age_in_period: number | string | null;
  gender: Gender | null;
  interested_in: Gender | null;
  city: string | null;
  region: string | null;
  country: string | null;
  seasons_ranked: number | string | null;
  observed_history_days: number | string | null;
  photo_url: string | null;
  photo_count: number | string | null;
  as_of: string | Date;
  minimum_rate_denominator: number | string;
  minimum_active_days: number | string;
}

interface PeriodRow extends Record<string, unknown> {
  period_kind: "MONTH" | "QUARTER" | "YEAR";
  period_start: string;
  period_end: string;
  as_of: string | Date;
  minimum_rate_denominator: number | string;
  minimum_active_days: number | string;
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

export function getPublicSwipeRankPseudonym(
  profileId: string,
  secret: string,
): Pick<PublicSwipeRankEntry, "entryKey" | "alias"> {
  if (!secret) {
    throw new Error("SwipeRank public identity secret must not be empty.");
  }
  const digest = createHmac("sha256", secret)
    .update(`swipe-rank:profile:${profileId}`)
    .digest("hex");
  return {
    entryKey: `entry_${digest.slice(0, 32)}`,
    alias: `Dater #${digest.slice(0, 10).toUpperCase()}`,
  };
}

export async function getPublicSwipeRankLeaderboard(input: {
  period: SwipeRankPeriodBounds;
  page: number;
  metricVersion?: string;
}): Promise<PublicSwipeRankLeaderboard> {
  assertClosedSwipeRankPeriod(input.period);
  if (!Number.isSafeInteger(input.page) || input.page < 1) {
    throw new Error("SwipeRank page must be a positive integer.");
  }
  const metricVersion = input.metricVersion ?? SWIPE_RANK_METRIC_VERSION;
  const offset = (input.page - 1) * SWIPE_RANK_PUBLIC_PAGE_SIZE;
  const result = await db.execute<LeaderboardRow>(sql`
    WITH selected_snapshot AS (
      SELECT snapshot.*
      FROM swipe_rank_snapshot snapshot
      WHERE snapshot.data_provider = 'TINDER'
        AND snapshot.metric_key = 'MATCH_YIELD'
        AND snapshot.metric_version = ${metricVersion}
        AND snapshot.period_kind = ${input.period.kind}
        AND snapshot.period_start = ${input.period.start}::date
        AND snapshot.period_end = ${input.period.end}::date
        AND snapshot.status = 'PUBLISHED'
      ORDER BY snapshot.published_at DESC, snapshot.id DESC
      LIMIT 1
    ), season_counts AS (
      SELECT entry.profile_id, count(DISTINCT snapshot.period_start)::bigint
        AS seasons_ranked
      FROM swipe_rank_entry entry
      JOIN swipe_rank_snapshot snapshot ON snapshot.id = entry.snapshot_id
      WHERE snapshot.data_provider = 'TINDER'
        AND snapshot.metric_version = ${metricVersion}
        AND snapshot.period_kind = ${input.period.kind}
        AND snapshot.status = 'PUBLISHED'
      GROUP BY entry.profile_id
    ), field AS (
      SELECT
        entry.*,
        profile.gender,
        profile.interested_in,
        profile.city,
        profile.region,
        profile.country,
        season_counts.seasons_ranked,
        profile_media.photo_url,
        profile_media.photo_count,
        row_number() OVER (ORDER BY entry.rank, entry.profile_id) AS row_number
      FROM selected_snapshot snapshot
      JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
      JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
      JOIN season_counts ON season_counts.profile_id = entry.profile_id
      LEFT JOIN LATERAL (
        SELECT min(media.url) AS photo_url, count(*)::bigint AS photo_count
        FROM media
        WHERE media.tinder_profile_id = profile.provider_profile_id
          AND media.type IN ('image', 'photo')
      ) profile_media ON true
      WHERE profile.is_synthetic = false
        AND profile.is_swipe_rank_excluded = false
    ), stats AS (
      SELECT
        snapshot.id AS snapshot_id,
        snapshot.published_at AS as_of,
        snapshot.minimum_rate_denominator,
        snapshot.minimum_active_days,
        snapshot.field_size::bigint AS field_size
      FROM selected_snapshot snapshot
      GROUP BY snapshot.id, snapshot.published_at,
        snapshot.minimum_rate_denominator, snapshot.minimum_active_days,
        snapshot.field_size
    ), paged AS (
      SELECT field.*
      FROM field CROSS JOIN stats
      WHERE stats.field_size >= ${SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE}
      ORDER BY field.row_number
      LIMIT ${SWIPE_RANK_PUBLIC_PAGE_SIZE}
      OFFSET ${offset}
    )
    SELECT
      stats.*,
      paged.profile_id,
      paged.rank,
      paged.top_share,
      paged.metric_value,
      paged.metric_numerator,
      paged.metric_denominator,
      paged.active_days,
      paged.age_in_period,
      paged.gender,
      paged.interested_in,
      paged.city,
      paged.region,
      paged.country,
      paged.seasons_ranked,
      paged.observed_history_days,
      paged.photo_url,
      paged.photo_count
    FROM stats
    LEFT JOIN paged ON true
    ORDER BY paged.row_number NULLS LAST
  `);

  const first = result.rows[0];
  const ready = Boolean(first?.snapshot_id);
  const fieldSize = first ? Number(first.field_size) : 0;
  const countsSuppressed = fieldSize < SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE;
  const secret = publicIdentitySecret();
  const entries = countsSuppressed
    ? []
    : result.rows.flatMap((row) => {
        if (
          row.profile_id === null ||
          row.rank === null ||
          row.top_share === null ||
          row.metric_value === null ||
          row.metric_numerator === null ||
          row.metric_denominator === null
        ) {
          return [];
        }
        return [
          {
            ...getPublicSwipeRankPseudonym(row.profile_id, secret),
            rank: Number(row.rank),
            topShare: Number(row.top_share),
            matchYieldPercent:
              Math.round(Number(row.metric_value) * 1_000) / 10,
            matches: Number(row.metric_numerator),
            rightSwipes: Number(row.metric_denominator),
            activeDays: Number(row.active_days ?? 0),
            age: row.age_in_period === null ? null : Number(row.age_in_period),
            gender: row.gender,
            interestedIn: row.interested_in,
            city: row.city,
            region: row.region,
            country: row.country,
            seasonsRanked: Number(row.seasons_ranked ?? 1),
            observedHistoryDays: Number(row.observed_history_days ?? 0),
            photoUrl: row.photo_url,
            photoCount: Number(row.photo_count ?? 0),
          } satisfies PublicSwipeRankEntry,
        ];
      });

  return {
    ready,
    metricVersion,
    period: input.period,
    asOf: iso(first?.as_of ?? null),
    minimumRateDenominator: Number(first?.minimum_rate_denominator ?? 100),
    minimumActiveDays: Number(first?.minimum_active_days ?? 5),
    minimumPublicFieldSize: SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE,
    fieldSize: countsSuppressed ? null : fieldSize,
    countsSuppressed,
    page: input.page,
    pageSize: SWIPE_RANK_PUBLIC_PAGE_SIZE,
    totalPages: countsSuppressed
      ? 0
      : Math.ceil(fieldSize / SWIPE_RANK_PUBLIC_PAGE_SIZE),
    entries,
  };
}

export async function listPublicSwipeRankPeriods(
  metricVersion = SWIPE_RANK_METRIC_VERSION,
) {
  const result = await db.execute<PeriodRow>(sql`
    WITH latest AS (
      SELECT DISTINCT ON (snapshot.period_kind, snapshot.period_start) snapshot.*
      FROM swipe_rank_snapshot snapshot
      WHERE snapshot.data_provider = 'TINDER'
        AND snapshot.metric_key = 'MATCH_YIELD'
        AND snapshot.metric_version = ${metricVersion}
        AND snapshot.status = 'PUBLISHED'
      ORDER BY snapshot.period_kind, snapshot.period_start, snapshot.published_at DESC, snapshot.id DESC
    )
    SELECT
      latest.period_start::text,
      latest.period_end::text,
      latest.period_kind,
      latest.published_at AS as_of,
      latest.minimum_rate_denominator,
      latest.minimum_active_days,
      latest.field_size::bigint AS field_size
    FROM latest
    WHERE latest.field_size >= ${SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE}
    ORDER BY latest.period_start DESC, latest.period_kind
  `);

  return {
    metricVersion,
    minimumPublicFieldSize: SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE,
    periods: result.rows.map((row) => ({
      period: {
        kind: row.period_kind,
        start: row.period_start,
        end: row.period_end,
      },
      asOf: iso(row.as_of)!,
      minimumRateDenominator: Number(row.minimum_rate_denominator),
      minimumActiveDays: Number(row.minimum_active_days),
      fieldSize: Number(row.field_size),
    })),
  };
}
