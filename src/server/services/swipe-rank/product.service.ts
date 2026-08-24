import { sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";
import type { Gender } from "@/server/db/schema";

import {
  SWIPE_RANK_AI_REVIEW_MODEL,
  SWIPE_RANK_AI_REVIEW_VERSION,
} from "./ai-review.contract";
import {
  SWIPE_RANK_ELIGIBILITY_VERSION,
  evaluateSwipeRankEligibility,
  getSwipeRankEligibility,
} from "./eligibility";
import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import { swipeRankCountryFilterSql } from "./country-filter";
import {
  assertClosedSwipeRankPeriod,
  type SwipeRankPeriodBounds,
} from "./periods";
import { getSwipeRankFromFacts } from "./rank.service";

export interface SwipeRankFilters {
  gender?: Gender;
  interestedIn?: Gender;
  ageMin?: number;
  ageMax?: number;
  country?: string;
  region?: string;
  city?: string;
}

interface ProfilePeriodRow extends Record<string, unknown> {
  period_kind: "MONTH" | "QUARTER" | "YEAR";
  period_start: string;
  period_end: string;
  published_at: Date | string;
  gender: Gender | null;
  interested_in: Gender | null;
  is_swipe_rank_excluded: boolean;
  metric_denominator: number | string;
  active_days: number | string | null;
}

interface PeriodRow extends Record<string, unknown> {
  period_kind: "MONTH" | "QUARTER" | "YEAR";
  period_start: string;
  period_end: string;
  published_at: Date | string;
  total_count: number | string;
}

interface LeaderboardRow extends Record<string, unknown> {
  entry_id: string | null;
  profile_id: string | null;
  provider_profile_id: string | null;
  gender: Gender | null;
  interested_in: Gender | null;
  city: string | null;
  region: string | null;
  country: string | null;
  photo_url: string | null;
  photo_count: number | string;
  age_in_period: number | string | null;
  metric_numerator: number | string;
  metric_denominator: number | string;
  metric_value: number | string;
  active_days: number | string | null;
  observed_days: number | string | null;
  quality_flags: string[] | null;
  as_of: Date | string | null;
  total_filtered_count: number | string;
  filtered_rank: number | string | null;
  filtered_tie_count: number | string | null;
  filtered_field_size: number | string;
  ai_review_id: string | null;
  ai_review_verdict: "CLEAR" | "NEEDS_REVIEW" | "EXCLUDE_RECOMMENDED" | null;
  ai_review_confidence: number | string | null;
  ai_review_summary: string | null;
  ai_review_recommended_action: string | null;
  ai_review_signals: Array<{
    category: string;
    severity: string;
    finding: string;
    evidence: string;
  }> | null;
  ai_review_model: string | null;
  ai_reviewed_at: Date | string | null;
}

function number(value: number | string | null): number {
  return value === null ? 0 : Number(value);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function filterSql(filters: SwipeRankFilters): SQL {
  const conditions: SQL[] = [];
  if (filters.gender) conditions.push(sql`profile.gender = ${filters.gender}`);
  if (filters.interestedIn) {
    conditions.push(sql`profile.interested_in = ${filters.interestedIn}`);
  }
  if (filters.ageMin !== undefined) {
    conditions.push(sql`entry.age_in_period >= ${filters.ageMin}`);
  }
  if (filters.ageMax !== undefined) {
    conditions.push(sql`entry.age_in_period <= ${filters.ageMax}`);
  }
  if (filters.country) {
    conditions.push(
      swipeRankCountryFilterSql(sql`profile.country`, filters.country),
    );
  }
  if (filters.region) {
    conditions.push(sql`lower(profile.region) = lower(${filters.region})`);
  }
  if (filters.city) {
    conditions.push(sql`lower(profile.city) = lower(${filters.city})`);
  }
  return conditions.length === 0
    ? sql``
    : sql`AND ${sql.join(conditions, sql` AND `)}`;
}

/** Published closed seasons in which this owner has a frozen entry. */
export async function listTinderSwipeRankProfilePeriods(
  providerProfileId: string,
) {
  const result = await db.execute<ProfilePeriodRow>(sql`
    SELECT
      snapshot.period_start::text,
      snapshot.period_end::text,
      snapshot.period_kind,
      snapshot.published_at,
      profile.gender,
      profile.interested_in,
      profile.is_swipe_rank_excluded,
      entry.metric_denominator,
      entry.active_days
    FROM swipe_rank_snapshot snapshot
    JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
    JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
    WHERE snapshot.data_provider = 'TINDER'
      AND snapshot.metric_version = ${SWIPE_RANK_METRIC_VERSION}
      AND snapshot.status = 'PUBLISHED'
      AND profile.provider_profile_id = ${providerProfileId}
      AND profile.is_synthetic = false
    ORDER BY snapshot.period_start DESC, snapshot.published_at DESC
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
      };
      const eligibility = evaluateSwipeRankEligibility({
        periodKind: row.period_kind,
        rateDenominator: number(row.metric_denominator),
        activeDays: number(row.active_days),
      });
      return {
        period,
        asOf: asDate(row.published_at),
        gender: row.gender,
        interestedIn: row.interested_in,
        excludedFromSwipeRank: row.is_swipe_rank_excluded,
        eligibility,
        rankEligible: eligibility.eligible && !row.is_swipe_rank_excluded,
      };
    }),
  };
}

export async function getTinderSwipeRankPlacement(
  providerProfileId: string,
  period: SwipeRankPeriodBounds,
) {
  assertClosedSwipeRankPeriod(period);
  const threshold = getSwipeRankEligibility(period.kind);
  const placement = await getSwipeRankFromFacts({
    dataProvider: "TINDER",
    providerProfileId,
    period,
    ...threshold,
  });
  return {
    ...placement,
    asOf: placement.computedAt,
    eligibility: evaluateSwipeRankEligibility({
      periodKind: period.kind,
      rateDenominator: placement.matchRateDenominator,
      activeDays: placement.activeDays,
    }),
    rankEligible: true,
  };
}

export async function getTinderSwipeRankSummary(providerProfileId: string) {
  const inventory = await listTinderSwipeRankProfilePeriods(providerProfileId);
  const latest = inventory.periods[0];
  return {
    ...inventory,
    latest: latest
      ? await getTinderSwipeRankPlacement(providerProfileId, latest.period)
      : null,
  };
}

export async function listAdminSwipeRankPeriods(
  filters: SwipeRankFilters = {},
) {
  const conditions = filterSql(filters);
  const result = await db.execute<PeriodRow>(sql`
    WITH latest_snapshots AS (
      SELECT DISTINCT ON (
        period_kind,
        period_start,
        period_end
      )
        id,
        period_kind,
        period_start,
        period_end,
        published_at
      FROM swipe_rank_snapshot
      WHERE data_provider = 'TINDER'
        AND metric_version = ${SWIPE_RANK_METRIC_VERSION}
        AND status = 'PUBLISHED'
      ORDER BY
        period_kind,
        period_start,
        period_end,
        published_at DESC,
        id DESC
    )
    SELECT
      snapshot.period_start::text,
      snapshot.period_end::text,
      snapshot.period_kind,
      snapshot.published_at,
      count(entry.id)::bigint AS total_count
    FROM latest_snapshots snapshot
    JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
    JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
    WHERE profile.is_synthetic = false
      AND profile.is_swipe_rank_excluded = false
      ${conditions}
    GROUP BY snapshot.id, snapshot.period_kind, snapshot.period_start, snapshot.period_end,
      snapshot.published_at
    ORDER BY snapshot.period_start DESC, snapshot.published_at DESC
  `);
  return {
    metricVersion: SWIPE_RANK_METRIC_VERSION,
    eligibilityVersion: SWIPE_RANK_ELIGIBILITY_VERSION,
    filters,
    periods: result.rows.map((row) => ({
      period: {
        kind: row.period_kind,
        start: row.period_start,
        end: row.period_end,
      },
      asOf: asDate(row.published_at),
      totalFactCount: number(row.total_count),
      eligibleCount: number(row.total_count),
      eligibility: getSwipeRankEligibility(row.period_kind),
    })),
  };
}

export interface AdminSwipeRankLeaderboardInput {
  period: SwipeRankPeriodBounds;
  filters?: SwipeRankFilters;
  aiReview?:
    | "ALL"
    | "UNREVIEWED"
    | "CLEAR"
    | "NEEDS_REVIEW"
    | "EXCLUDE_RECOMMENDED";
  page: number;
  limit: number;
}

export async function getAdminSwipeRankLeaderboard(
  input: AdminSwipeRankLeaderboardInput,
) {
  assertClosedSwipeRankPeriod(input.period);
  const filters = input.filters ?? {};
  const conditions = filterSql(filters);
  const aiReviewCondition =
    input.aiReview === undefined || input.aiReview === "ALL"
      ? sql``
      : input.aiReview === "UNREVIEWED"
        ? sql`AND ai_review.id IS NULL`
        : sql`AND ai_review.verdict = ${input.aiReview}::"SwipeRankAiReviewVerdict"`;
  const offset = (input.page - 1) * input.limit;
  const result = await db.execute<LeaderboardRow>(sql`
    WITH selected_snapshot AS (
      SELECT snapshot.*
      FROM swipe_rank_snapshot snapshot
      WHERE snapshot.data_provider = 'TINDER'
        AND snapshot.metric_version = ${SWIPE_RANK_METRIC_VERSION}
        AND snapshot.period_kind = ${input.period.kind}
        AND snapshot.period_start = ${input.period.start}::date
        AND snapshot.period_end = ${input.period.end}::date
        AND snapshot.status = 'PUBLISHED'
      ORDER BY snapshot.published_at DESC, snapshot.id DESC
      LIMIT 1
    ), field AS (
      SELECT
        entry.id AS entry_id,
        entry.*,
        profile.provider_profile_id,
        profile.gender,
        profile.interested_in,
        profile.city,
        profile.region,
        profile.country,
        profile_media.photo_url,
        profile_media.photo_count,
        ai_review.id AS ai_review_id,
        ai_review.verdict AS ai_review_verdict,
        ai_review.confidence AS ai_review_confidence,
        ai_review.summary AS ai_review_summary,
        ai_review.recommended_action AS ai_review_recommended_action,
        ai_review.signals AS ai_review_signals,
        ai_review.model AS ai_review_model,
        ai_review.reviewed_at AS ai_reviewed_at,
        snapshot.published_at
      FROM selected_snapshot snapshot
      JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
      JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
      LEFT JOIN LATERAL (
        SELECT min(media.url) AS photo_url, count(*)::bigint AS photo_count
        FROM media
        WHERE media.tinder_profile_id = profile.provider_profile_id
          AND media.type IN ('image', 'photo')
      ) profile_media ON true
      LEFT JOIN LATERAL (
        SELECT review.*
        FROM swipe_rank_profile_ai_review review
        WHERE review.profile_id = profile.id
          AND review.review_version = ${SWIPE_RANK_AI_REVIEW_VERSION}
          AND review.model = ${SWIPE_RANK_AI_REVIEW_MODEL}
        ORDER BY review.reviewed_at DESC, review.id DESC
        LIMIT 1
      ) ai_review ON true
      WHERE profile.is_synthetic = false
        AND profile.is_swipe_rank_excluded = false
        ${conditions}
        ${aiReviewCondition}
    ), ranked AS (
      SELECT
        field.*,
        rank() OVER (ORDER BY metric_value DESC) AS filtered_rank,
        count(*) OVER (PARTITION BY metric_value) AS filtered_tie_count,
        count(*) OVER () AS filtered_field_size
      FROM field
    ), stats AS (
      SELECT
        max(selected_snapshot.published_at) AS as_of,
        count(ranked.id)::bigint AS total_filtered_count
      FROM selected_snapshot
      LEFT JOIN ranked ON true
    ), paged AS (
      SELECT ranked.*
      FROM ranked
      ORDER BY filtered_rank, provider_profile_id
      LIMIT ${input.limit}
      OFFSET ${offset}
    )
    SELECT stats.*, paged.*
    FROM stats
    LEFT JOIN paged ON true
    ORDER BY paged.filtered_rank, paged.provider_profile_id
  `);
  const summary = result.rows[0];
  const fieldSize = number(summary?.total_filtered_count ?? 0);
  return {
    metricKey: "MATCH_YIELD" as const,
    metricLabel: "Match yield" as const,
    metricVersion: SWIPE_RANK_METRIC_VERSION,
    eligibilityVersion: SWIPE_RANK_ELIGIBILITY_VERSION,
    period: input.period,
    filters,
    aiReview: input.aiReview ?? "ALL",
    eligibility: getSwipeRankEligibility(input.period.kind),
    asOf: summary?.as_of ? asDate(summary.as_of) : null,
    totalFactCount: fieldSize,
    fieldSize,
    page: input.page,
    limit: input.limit,
    totalPages: Math.ceil(fieldSize / input.limit),
    entries: result.rows.flatMap((row) => {
      if (
        row.entry_id === null ||
        row.profile_id === null ||
        row.provider_profile_id === null ||
        row.filtered_rank === null ||
        row.filtered_tie_count === null
      ) {
        return [];
      }
      const rank = number(row.filtered_rank);
      return [
        {
          profileId: row.profile_id,
          entryId: row.entry_id,
          providerProfileId: row.provider_profile_id,
          gender: row.gender,
          interestedIn: row.interested_in,
          city: row.city,
          region: row.region,
          country: row.country,
          photoUrl: row.photo_url,
          photoCount: number(row.photo_count),
          ageInPeriod:
            row.age_in_period === null ? null : number(row.age_in_period),
          matchRateNumerator: number(row.metric_numerator),
          matchRateDenominator: number(row.metric_denominator),
          matchRate: number(row.metric_value),
          activeDays: number(row.active_days),
          observedDays: number(row.observed_days),
          qualityFlags: row.quality_flags ?? [],
          hasQualityAnomaly: (row.quality_flags?.length ?? 0) > 0,
          aiReview:
            row.ai_review_id && row.ai_review_verdict
              ? {
                  id: row.ai_review_id,
                  verdict: row.ai_review_verdict,
                  confidence: number(row.ai_review_confidence),
                  summary: row.ai_review_summary ?? "",
                  recommendedAction: row.ai_review_recommended_action ?? "",
                  signals: row.ai_review_signals ?? [],
                  model: row.ai_review_model ?? "",
                  reviewedAt: asDate(row.ai_reviewed_at!),
                }
              : null,
          computedAt: asDate(row.as_of!),
          rank,
          tieCount: number(row.filtered_tie_count),
          fieldSize,
          percentile: ((fieldSize - rank + 1) / fieldSize) * 100,
          topShare: (rank / fieldSize) * 100,
        },
      ];
    }),
  };
}
