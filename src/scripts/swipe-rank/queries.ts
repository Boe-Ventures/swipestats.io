import { sql } from "drizzle-orm";

import { db } from "@/server/db";

import type { EligibilityRule, SwipeRankPeriod } from "./periods";

export interface PeriodRequest {
  period: SwipeRankPeriod;
  eligibility: EligibilityRule;
}

export interface SwipeRankResult {
  period: SwipeRankPeriod;
  eligibility: EligibilityRule;
  asOf: string;
  profile: {
    tinderId: string;
    computed: boolean;
    gender: string;
    interestedIn: string;
    ageInPeriod: number | null;
    ageAtLastUsage: number;
    city: string | null;
    country: string | null;
    firstDayOnApp: string;
    lastDayOnApp: string;
  };
  stats: {
    firstObservedDate: string | null;
    lastObservedDate: string | null;
    observedDays: number;
    activeDays: number;
    likes: number;
    passes: number;
    matches: number;
    matchRate: number | null;
  };
  eligible: boolean;
  global: {
    rank: number | null;
    fieldSize: number;
    tieCount: number | null;
    percentile: number | null;
    topShare: number | null;
  };
  peer: {
    definition: string;
    rank: number | null;
    fieldSize: number;
    tieCount: number | null;
    percentile: number | null;
    topShare: number | null;
  };
}

interface RawSwipeRankRow extends Record<string, unknown> {
  period_order: number | string;
  period_label: string;
  period_kind: SwipeRankPeriod["kind"];
  start_date: string | null;
  end_date: string | null;
  min_likes: number | string;
  min_active_days: number | string;
  as_of: string | Date;
  tinder_id: string;
  computed: boolean;
  gender: string;
  interested_in: string;
  age_in_period: number | string | null;
  age_at_last_usage: number | string;
  city: string | null;
  country: string | null;
  first_day_on_app: string | Date;
  last_day_on_app: string | Date;
  first_observed_date: string | null;
  last_observed_date: string | null;
  observed_days: number | string | null;
  active_days: number | string | null;
  likes: number | string | null;
  passes: number | string | null;
  matches: number | string | null;
  match_rate: number | string | null;
  eligible: boolean | null;
  global_rank: number | string | null;
  global_field_size: number | string | null;
  global_tie_count: number | string | null;
  peer_rank: number | string | null;
  peer_field_size: number | string | null;
  peer_tie_count: number | string | null;
}

export interface ObservedDateRange {
  firstObservedDate: string;
  lastObservedDate: string;
}

export interface SeasonSurveyRow {
  season: string;
  totalProfiles: number;
  eligibleProfiles: number;
  eligibilityRate: number;
  medianEligibleLikes: number | null;
  medianMatchRate: number | null;
  p90MatchRate: number | null;
  overOneHundredPercentProfiles: number;
}

function asNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function asNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function asIsoString(value: string | Date): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function rankToPercentile(
  rank: number | null,
  fieldSize: number,
): number | null {
  if (rank === null || fieldSize === 0) return null;
  return ((fieldSize - rank + 1) / fieldSize) * 100;
}

function rankToTopShare(rank: number | null, fieldSize: number): number | null {
  if (rank === null || fieldSize === 0) return null;
  return (rank / fieldSize) * 100;
}

export async function getObservedDateRange(
  tinderId: string,
): Promise<ObservedDateRange> {
  const result = await db.execute<{
    first_observed_date: string | null;
    last_observed_date: string | null;
  }>(sql`
    SELECT
      min(date_stamp_raw) AS first_observed_date,
      max(date_stamp_raw) AS last_observed_date
    FROM tinder_usage
    WHERE tinder_profile_id = ${tinderId}
  `);
  const row = result.rows[0];

  if (!row?.first_observed_date || !row.last_observed_date) {
    throw new Error(`No Tinder usage found for profile ${tinderId}.`);
  }

  return {
    firstObservedDate: row.first_observed_date,
    lastObservedDate: row.last_observed_date,
  };
}

export async function computeSwipeRanks(
  tinderId: string,
  requests: PeriodRequest[],
): Promise<SwipeRankResult[]> {
  if (requests.length === 0) return [];

  const requestedPeriods = requests.map(
    ({ period, eligibility }, index) => sql`(
    ${index}::int,
    ${period.label}::text,
    ${period.kind}::text,
    ${period.startDate}::text,
    ${period.endDate}::text,
    ${eligibility.minLikes}::int,
    ${eligibility.minActiveDays}::int
  )`,
  );

  const result = await db.execute<RawSwipeRankRow>(sql`
    WITH requested_periods (
      period_order,
      period_label,
      period_kind,
      start_date,
      end_date,
      min_likes,
      min_active_days
    ) AS (
      VALUES ${sql.join(requestedPeriods, sql`, `)}
    ),
    target_profile AS (
      SELECT *
      FROM tinder_profile
      WHERE tinder_id = ${tinderId}
    ),
    profile_period AS (
      SELECT
        rp.period_order,
        rp.period_label,
        rp.period_kind,
        rp.start_date,
        rp.end_date,
        rp.min_likes,
        rp.min_active_days,
        p.tinder_id,
        p.gender,
        p.interested_in,
        max(u.user_age_this_day)::int AS age_in_period,
        min(u.date_stamp_raw) AS first_observed_date,
        max(u.date_stamp_raw) AS last_observed_date,
        count(*)::int AS observed_days,
        count(*) FILTER (
          WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
        )::int AS active_days,
        sum(u.swipe_likes)::bigint AS likes,
        sum(u.swipe_passes)::bigint AS passes,
        sum(u.matches)::bigint AS matches,
        CASE
          WHEN sum(u.swipe_likes) > 0
            THEN sum(u.matches)::numeric / sum(u.swipe_likes)
          ELSE NULL
        END AS match_rate
      FROM requested_periods rp
      JOIN tinder_usage u
        ON (rp.start_date IS NULL OR u.date_stamp_raw >= rp.start_date)
       AND (rp.end_date IS NULL OR u.date_stamp_raw < rp.end_date)
      JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
      WHERE p.computed = false
      GROUP BY
        rp.period_order,
        rp.period_label,
        rp.period_kind,
        rp.start_date,
        rp.end_date,
        rp.min_likes,
        rp.min_active_days,
        p.tinder_id,
        p.gender,
        p.interested_in
    ),
    eligible AS (
      SELECT *
      FROM profile_period
      WHERE likes >= min_likes
        AND active_days >= min_active_days
        AND match_rate IS NOT NULL
    ),
    ranked AS (
      SELECT
        *,
        rank() OVER (
          PARTITION BY period_order
          ORDER BY match_rate DESC
        ) AS global_rank,
        count(*) OVER (
          PARTITION BY period_order, match_rate
        ) AS global_tie_count,
        rank() OVER (
          PARTITION BY period_order, gender, interested_in
          ORDER BY match_rate DESC
        ) AS peer_rank,
        count(*) OVER (
          PARTITION BY period_order, gender, interested_in, match_rate
        ) AS peer_tie_count
      FROM eligible
    ),
    global_counts AS (
      SELECT period_order, count(*)::bigint AS field_size
      FROM eligible
      GROUP BY period_order
    ),
    peer_counts AS (
      SELECT
        period_order,
        gender,
        interested_in,
        count(*)::bigint AS field_size
      FROM eligible
      GROUP BY period_order, gender, interested_in
    )
    SELECT
      rp.period_order,
      rp.period_label,
      rp.period_kind,
      rp.start_date,
      rp.end_date,
      rp.min_likes,
      rp.min_active_days,
      now() AS as_of,
      tp.tinder_id,
      tp.computed,
      tp.gender,
      tp.interested_in,
      pp.age_in_period,
      tp.age_at_last_usage,
      tp.city,
      tp.country,
      tp.first_day_on_app,
      tp.last_day_on_app,
      pp.first_observed_date,
      pp.last_observed_date,
      pp.observed_days,
      pp.active_days,
      pp.likes,
      pp.passes,
      pp.matches,
      pp.match_rate,
      (ranked.tinder_id IS NOT NULL) AS eligible,
      ranked.global_rank,
      coalesce(gc.field_size, 0) AS global_field_size,
      ranked.global_tie_count,
      ranked.peer_rank,
      coalesce(pc.field_size, 0) AS peer_field_size,
      ranked.peer_tie_count
    FROM requested_periods rp
    CROSS JOIN target_profile tp
    LEFT JOIN profile_period pp
      ON pp.period_order = rp.period_order
     AND pp.tinder_id = tp.tinder_id
    LEFT JOIN ranked
      ON ranked.period_order = rp.period_order
     AND ranked.tinder_id = tp.tinder_id
    LEFT JOIN global_counts gc ON gc.period_order = rp.period_order
    LEFT JOIN peer_counts pc
      ON pc.period_order = rp.period_order
     AND pc.gender = tp.gender
     AND pc.interested_in = tp.interested_in
    ORDER BY rp.period_order
  `);

  if (result.rows.length === 0) {
    throw new Error(`Tinder profile ${tinderId} was not found.`);
  }

  return result.rows.map((row) => {
    const globalRank = asNullableNumber(row.global_rank);
    const globalFieldSize = asNumber(row.global_field_size);
    const peerRank = asNullableNumber(row.peer_rank);
    const peerFieldSize = asNumber(row.peer_field_size);

    return {
      period: {
        label: row.period_label,
        kind: row.period_kind,
        startDate: row.start_date,
        endDate: row.end_date,
      },
      eligibility: {
        minLikes: asNumber(row.min_likes),
        minActiveDays: asNumber(row.min_active_days),
      },
      asOf: asIsoString(row.as_of),
      profile: {
        tinderId: row.tinder_id,
        computed: row.computed,
        gender: row.gender,
        interestedIn: row.interested_in,
        ageInPeriod: asNullableNumber(row.age_in_period),
        ageAtLastUsage: asNumber(row.age_at_last_usage),
        city: row.city,
        country: row.country,
        firstDayOnApp: asIsoString(row.first_day_on_app),
        lastDayOnApp: asIsoString(row.last_day_on_app),
      },
      stats: {
        firstObservedDate: row.first_observed_date,
        lastObservedDate: row.last_observed_date,
        observedDays: asNumber(row.observed_days),
        activeDays: asNumber(row.active_days),
        likes: asNumber(row.likes),
        passes: asNumber(row.passes),
        matches: asNumber(row.matches),
        matchRate: asNullableNumber(row.match_rate),
      },
      eligible: row.eligible === true,
      global: {
        rank: globalRank,
        fieldSize: globalFieldSize,
        tieCount: asNullableNumber(row.global_tie_count),
        percentile: rankToPercentile(globalRank, globalFieldSize),
        topShare: rankToTopShare(globalRank, globalFieldSize),
      },
      peer: {
        definition: `${row.gender} interested in ${row.interested_in}`,
        rank: peerRank,
        fieldSize: peerFieldSize,
        tieCount: asNullableNumber(row.peer_tie_count),
        percentile: rankToPercentile(peerRank, peerFieldSize),
        topShare: rankToTopShare(peerRank, peerFieldSize),
      },
    } satisfies SwipeRankResult;
  });
}

export async function surveySeasons(
  kind: Exclude<SwipeRankPeriod["kind"], "all-time">,
  eligibility: EligibilityRule,
): Promise<SeasonSurveyRow[]> {
  const seasonExpression =
    kind === "month"
      ? sql`substring(u.date_stamp_raw, 1, 7)`
      : kind === "quarter"
        ? sql`concat(
            substring(u.date_stamp_raw, 1, 4),
            '-Q',
            ((substring(u.date_stamp_raw, 6, 2)::int - 1) / 3 + 1)::int
          )`
        : sql`substring(u.date_stamp_raw, 1, 4)`;

  const result = await db.execute<{
    season: string;
    total_profiles: number | string;
    eligible_profiles: number | string;
    eligibility_rate: number | string;
    median_eligible_likes: number | string | null;
    median_match_rate: number | string | null;
    p90_match_rate: number | string | null;
    over_one_hundred_percent_profiles: number | string;
  }>(sql`
    WITH profile_season AS (
      SELECT
        ${seasonExpression} AS season,
        p.tinder_id,
        sum(u.swipe_likes)::bigint AS likes,
        sum(u.matches)::bigint AS matches,
        count(*) FILTER (
          WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
        )::int AS active_days,
        CASE
          WHEN sum(u.swipe_likes) > 0
            THEN sum(u.matches)::numeric / sum(u.swipe_likes)
          ELSE NULL
        END AS match_rate
      FROM tinder_usage u
      JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
      WHERE p.computed = false
      GROUP BY season, p.tinder_id
    )
    SELECT
      season,
      count(*)::bigint AS total_profiles,
      count(*) FILTER (
        WHERE likes >= ${eligibility.minLikes}
          AND active_days >= ${eligibility.minActiveDays}
          AND match_rate IS NOT NULL
      )::bigint AS eligible_profiles,
      count(*) FILTER (
        WHERE likes >= ${eligibility.minLikes}
          AND active_days >= ${eligibility.minActiveDays}
          AND match_rate IS NOT NULL
      )::numeric / count(*) AS eligibility_rate,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY likes) FILTER (
        WHERE likes >= ${eligibility.minLikes}
          AND active_days >= ${eligibility.minActiveDays}
          AND match_rate IS NOT NULL
      ) AS median_eligible_likes,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY match_rate) FILTER (
        WHERE likes >= ${eligibility.minLikes}
          AND active_days >= ${eligibility.minActiveDays}
          AND match_rate IS NOT NULL
      ) AS median_match_rate,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY match_rate) FILTER (
        WHERE likes >= ${eligibility.minLikes}
          AND active_days >= ${eligibility.minActiveDays}
          AND match_rate IS NOT NULL
      ) AS p90_match_rate,
      count(*) FILTER (
        WHERE likes >= ${eligibility.minLikes}
          AND active_days >= ${eligibility.minActiveDays}
          AND match_rate > 1
      )::bigint AS over_one_hundred_percent_profiles
    FROM profile_season
    GROUP BY season
    ORDER BY season
  `);

  return result.rows.map((row) => ({
    season: row.season,
    totalProfiles: asNumber(row.total_profiles),
    eligibleProfiles: asNumber(row.eligible_profiles),
    eligibilityRate: asNumber(row.eligibility_rate),
    medianEligibleLikes: asNullableNumber(row.median_eligible_likes),
    medianMatchRate: asNullableNumber(row.median_match_rate),
    p90MatchRate: asNullableNumber(row.p90_match_rate),
    overOneHundredPercentProfiles: asNumber(
      row.over_one_hundred_percent_profiles,
    ),
  }));
}
