import { sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";
import type { SwipeRankPeriodKind } from "@/server/db/schema";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";

export interface SwipeRankValidationResult {
  metricVersion: string;
  profiles: number;
  facts: number;
  monthFacts: number;
  quarterFacts: number;
  yearFacts: number;
  allTimeFacts: number;
  duplicateFacts: number;
  invalidAllTimeSentinels: number;
  rollupMismatches: number;
  rawMonthMismatches: number;
  rawAllTimeMismatches: number;
  rateInputMismatches: number;
  overOneMissingFlag: number;
  overOneFlagWithoutCondition: number;
  zeroLikeMissingFlag: number;
  zeroLikeFlagWithoutCondition: number;
  profileRangeFlagMismatches: number;
  unknownQualityFlags: number;
  registryDescriptorMismatches: number;
  staleFacts: number;
  /** Informational: zero is required to freeze/activate a coherent FULL build. */
  sourceGenerationMismatches: number;
  snapshotSourceCurrent: boolean;
  valid: boolean;
}

interface InventoryRow extends Record<string, unknown> {
  profiles: number | string;
  facts: number | string;
  month_facts: number | string;
  quarter_facts: number | string;
  year_facts: number | string;
  all_time_facts: number | string;
  invalid_all_time_sentinels: number | string;
  over_one_missing_flag: number | string;
  over_one_flag_without_condition: number | string;
  zero_like_missing_flag: number | string;
  zero_like_flag_without_condition: number | string;
  unknown_quality_flags: number | string;
  rate_input_mismatches: number | string;
}

interface CountRow extends Record<string, unknown> {
  count: number | string;
}

interface ValidationComponents {
  profiles: number;
  facts: number;
  monthFacts: number;
  quarterFacts: number;
  yearFacts: number;
  allTimeFacts: number;
  duplicateFacts: number;
  invalidAllTimeSentinels: number;
  rollupMismatches: number;
  rawMonthMismatches: number;
  rawAllTimeMismatches: number;
  rateInputMismatches: number;
  overOneMissingFlag: number;
  overOneFlagWithoutCondition: number;
  zeroLikeMissingFlag: number;
  zeroLikeFlagWithoutCondition: number;
  profileRangeFlagMismatches: number;
  unknownQualityFlags: number;
  registryDescriptorMismatches: number;
  staleFacts: number;
  sourceGenerationMismatches: number;
}

type RollupKind = Exclude<SwipeRankPeriodKind, "MONTH">;

function firstRow<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row)
    throw new Error(`SwipeRank ${label} validation returned no result.`);
  return row;
}

function countFrom(rows: CountRow[], label: string): number {
  return Number(firstRow(rows, label).count);
}

/** Exported for a focused contract test; database work stays in small queries. */
export function assembleSwipeRankValidationResult(
  metricVersion: string,
  values: ValidationComponents,
): SwipeRankValidationResult {
  return {
    metricVersion,
    ...values,
    snapshotSourceCurrent: values.sourceGenerationMismatches === 0,
    valid:
      values.facts > 0 &&
      values.duplicateFacts === 0 &&
      values.invalidAllTimeSentinels === 0 &&
      values.rollupMismatches === 0 &&
      values.rawMonthMismatches === 0 &&
      values.rawAllTimeMismatches === 0 &&
      values.rateInputMismatches === 0 &&
      values.overOneMissingFlag === 0 &&
      values.overOneFlagWithoutCondition === 0 &&
      values.zeroLikeMissingFlag === 0 &&
      values.zeroLikeFlagWithoutCondition === 0 &&
      values.profileRangeFlagMismatches === 0 &&
      values.unknownQualityFlags === 0 &&
      values.registryDescriptorMismatches === 0 &&
      values.staleFacts === 0,
  };
}

async function queryInventory(metricVersion: string): Promise<InventoryRow> {
  const result = await db.execute<InventoryRow>(sql`
    SELECT
      count(DISTINCT fact.profile_id)::bigint AS profiles,
      count(*)::bigint AS facts,
      count(*) FILTER (WHERE fact.period_kind = 'MONTH')::bigint AS month_facts,
      count(*) FILTER (WHERE fact.period_kind = 'QUARTER')::bigint AS quarter_facts,
      count(*) FILTER (WHERE fact.period_kind = 'YEAR')::bigint AS year_facts,
      count(*) FILTER (WHERE fact.period_kind = 'ALL_TIME')::bigint AS all_time_facts,
      count(*) FILTER (
        WHERE fact.period_kind = 'ALL_TIME'
          AND (
            fact.period_start <> date '0001-01-01'
            OR fact.period_end <> date '9999-01-01'
          )
      )::bigint AS invalid_all_time_sentinels,
      count(*) FILTER (
        WHERE fact.match_rate_denominator > 0
          AND fact.match_rate_numerator > fact.match_rate_denominator
          AND NOT (fact.quality_flags ? 'MATCH_YIELD_OVER_ONE')
      )::bigint AS over_one_missing_flag,
      count(*) FILTER (
        WHERE fact.quality_flags ? 'MATCH_YIELD_OVER_ONE'
          AND NOT (
            fact.match_rate_denominator > 0
            AND fact.match_rate_numerator > fact.match_rate_denominator
          )
      )::bigint AS over_one_flag_without_condition,
      count(*) FILTER (
        WHERE fact.match_rate_denominator = 0
          AND fact.match_rate_numerator > 0
          AND NOT (fact.quality_flags ? 'MATCHES_WITH_ZERO_LIKES')
      )::bigint AS zero_like_missing_flag,
      count(*) FILTER (
        WHERE fact.quality_flags ? 'MATCHES_WITH_ZERO_LIKES'
          AND NOT (
            fact.match_rate_denominator = 0
            AND fact.match_rate_numerator > 0
          )
      )::bigint AS zero_like_flag_without_condition,
      count(*) FILTER (
        WHERE NOT (fact.quality_flags <@ '[
          "MATCH_YIELD_OVER_ONE",
          "MATCHES_WITH_ZERO_LIKES",
          "PROFILE_RANGE_EXCLUDES_USAGE"
        ]'::jsonb)
      )::bigint AS unknown_quality_flags,
      count(*) FILTER (
        WHERE fact.match_rate_numerator IS DISTINCT FROM fact.matches
          OR fact.match_rate_denominator IS DISTINCT FROM fact.swipe_likes
          OR fact.like_rate_numerator IS DISTINCT FROM fact.swipe_likes
          OR fact.like_rate_denominator IS DISTINCT FROM
            (fact.swipe_likes + fact.swipe_passes)
      )::bigint AS rate_input_mismatches
    FROM swipe_rank_period_fact fact
    JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
    WHERE profile.data_provider = 'TINDER'
      AND fact.metric_version = ${metricVersion}
  `);
  return firstRow(result.rows, "inventory");
}

async function queryDuplicateFacts(metricVersion: string): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    SELECT count(*)::bigint AS count
    FROM (
      SELECT fact.profile_id, fact.period_kind, fact.period_start
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
      WHERE profile.data_provider = 'TINDER'
        AND fact.metric_version = ${metricVersion}
      GROUP BY fact.profile_id, fact.period_kind, fact.period_start
      HAVING count(*) > 1
    ) duplicates
  `);
  return countFrom(result.rows, "duplicate");
}

function rollupStartExpression(kind: RollupKind): SQL {
  switch (kind) {
    case "QUARTER":
      return sql`date_trunc('quarter', fact.period_start)::date`;
    case "YEAR":
      return sql`date_trunc('year', fact.period_start)::date`;
    case "ALL_TIME":
      return sql`date '0001-01-01'`;
  }
}

async function queryRollupMismatches(
  metricVersion: string,
  kind: RollupKind,
): Promise<number> {
  const rollupStart = rollupStartExpression(kind);
  const result = await db.execute<CountRow>(sql`
    WITH expected AS (
      SELECT
        fact.profile_id,
        ${rollupStart} AS period_start,
        min(fact.observed_first_date) AS observed_first_date,
        max(fact.observed_last_date) AS observed_last_date,
        sum(fact.source_row_count)::bigint AS source_row_count,
        sum(fact.observed_days)::bigint AS observed_days,
        sum(fact.active_days)::bigint AS active_days,
        max(fact.age_in_period)::int AS age_in_period,
        sum(fact.swipe_likes)::bigint AS swipe_likes,
        sum(fact.swipe_passes)::bigint AS swipe_passes,
        sum(fact.swipe_super_likes)::bigint AS swipe_super_likes,
        sum(fact.matches)::bigint AS matches,
        sum(fact.messages_sent)::bigint AS messages_sent,
        sum(fact.messages_received)::bigint AS messages_received,
        sum(fact.app_opens)::bigint AS app_opens
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
      WHERE profile.data_provider = 'TINDER'
        AND fact.metric_version = ${metricVersion}
        AND fact.period_kind = 'MONTH'
      GROUP BY fact.profile_id, ${rollupStart}
    ),
    actual AS (
      SELECT fact.*
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
      WHERE profile.data_provider = 'TINDER'
        AND fact.metric_version = ${metricVersion}
        AND fact.period_kind = ${kind}
    )
    SELECT count(*)::bigint AS count
    FROM expected
    FULL JOIN actual
      ON actual.profile_id = expected.profile_id
     AND actual.period_start = expected.period_start
    WHERE actual.profile_id IS NULL
       OR expected.profile_id IS NULL
       OR actual.observed_first_date <> expected.observed_first_date
       OR actual.observed_last_date <> expected.observed_last_date
       OR actual.source_row_count <> expected.source_row_count
       OR actual.observed_days <> expected.observed_days
       OR actual.active_days <> expected.active_days
       OR actual.age_in_period IS DISTINCT FROM expected.age_in_period
       OR actual.swipe_likes IS DISTINCT FROM expected.swipe_likes
       OR actual.swipe_passes IS DISTINCT FROM expected.swipe_passes
       OR actual.swipe_super_likes IS DISTINCT FROM expected.swipe_super_likes
       OR actual.matches IS DISTINCT FROM expected.matches
       OR actual.messages_sent IS DISTINCT FROM expected.messages_sent
       OR actual.messages_received IS DISTINCT FROM expected.messages_received
       OR actual.app_opens IS DISTINCT FROM expected.app_opens
  `);
  return countFrom(result.rows, `${kind.toLowerCase()} rollup`);
}

async function queryRawAllTimeMismatches(
  metricVersion: string,
): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    WITH raw AS (
      SELECT
        usage.tinder_profile_id,
        count(*)::bigint AS source_row_count,
        count(*)::int AS observed_days,
        count(*) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        max(usage.user_age_this_day)::int AS age_in_period,
        sum(usage.swipe_likes)::bigint AS swipe_likes,
        sum(usage.swipe_passes)::bigint AS swipe_passes,
        sum(usage.swipe_super_likes)::bigint AS swipe_super_likes,
        sum(usage.matches)::bigint AS matches,
        sum(usage.messages_sent)::bigint AS messages_sent,
        sum(usage.messages_received)::bigint AS messages_received,
        sum(usage.app_opens)::bigint AS app_opens
      FROM tinder_usage usage
      JOIN tinder_profile profile
        ON profile.tinder_id = usage.tinder_profile_id
       AND profile.computed = false
      GROUP BY usage.tinder_profile_id
    ),
    actual AS (
      SELECT fact.*, profile.provider_profile_id
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
      WHERE profile.data_provider = 'TINDER'
        AND fact.metric_version = ${metricVersion}
        AND fact.period_kind = 'ALL_TIME'
    )
    SELECT count(*)::bigint AS count
    FROM raw
    FULL JOIN actual
      ON actual.provider_profile_id = raw.tinder_profile_id
    WHERE actual.profile_id IS NULL
       OR raw.tinder_profile_id IS NULL
       OR actual.source_row_count <> raw.source_row_count
       OR actual.observed_days <> raw.observed_days
       OR actual.active_days <> raw.active_days
       OR actual.age_in_period IS DISTINCT FROM raw.age_in_period
       OR actual.swipe_likes IS DISTINCT FROM raw.swipe_likes
       OR actual.swipe_passes IS DISTINCT FROM raw.swipe_passes
       OR actual.swipe_super_likes IS DISTINCT FROM raw.swipe_super_likes
       OR actual.matches IS DISTINCT FROM raw.matches
       OR actual.messages_sent IS DISTINCT FROM raw.messages_sent
       OR actual.messages_received IS DISTINCT FROM raw.messages_received
       OR actual.app_opens IS DISTINCT FROM raw.app_opens
  `);
  return countFrom(result.rows, "raw all-time parity");
}

async function queryRawMonthMismatches(metricVersion: string): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    WITH raw AS (
      SELECT
        usage.tinder_profile_id,
        date_trunc('month', usage.date_stamp_raw::date)::date AS period_start,
        min(usage.date_stamp_raw::date) AS observed_first_date,
        max(usage.date_stamp_raw::date) AS observed_last_date,
        count(*)::bigint AS source_row_count,
        count(*)::int AS observed_days,
        count(*) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        max(usage.user_age_this_day)::int AS age_in_period,
        sum(usage.swipe_likes)::bigint AS swipe_likes,
        sum(usage.swipe_passes)::bigint AS swipe_passes,
        sum(usage.swipe_super_likes)::bigint AS swipe_super_likes,
        sum(usage.matches)::bigint AS matches,
        sum(usage.messages_sent)::bigint AS messages_sent,
        sum(usage.messages_received)::bigint AS messages_received,
        sum(usage.app_opens)::bigint AS app_opens,
        md5(concat_ws(':',
          count(*),
          min(usage.date_stamp_raw::date),
          max(usage.date_stamp_raw::date),
          sum(usage.swipe_likes),
          sum(usage.swipe_passes),
          sum(usage.swipe_super_likes),
          sum(usage.matches),
          sum(usage.messages_sent),
          sum(usage.messages_received),
          sum(usage.app_opens)
        )) AS source_fingerprint
      FROM tinder_usage usage
      JOIN tinder_profile profile
        ON profile.tinder_id = usage.tinder_profile_id
       AND profile.computed = false
      GROUP BY
        usage.tinder_profile_id,
        date_trunc('month', usage.date_stamp_raw::date)::date
    ),
    actual AS (
      SELECT fact.*, profile.provider_profile_id
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
      WHERE profile.data_provider = 'TINDER'
        AND fact.metric_version = ${metricVersion}
        AND fact.period_kind = 'MONTH'
    )
    SELECT count(*)::bigint AS count
    FROM raw
    FULL JOIN actual
      ON actual.provider_profile_id = raw.tinder_profile_id
     AND actual.period_start = raw.period_start
    WHERE actual.profile_id IS NULL
       OR raw.tinder_profile_id IS NULL
       OR actual.observed_first_date <> raw.observed_first_date
       OR actual.observed_last_date <> raw.observed_last_date
       OR actual.source_row_count <> raw.source_row_count
       OR actual.observed_days <> raw.observed_days
       OR actual.active_days <> raw.active_days
       OR actual.age_in_period IS DISTINCT FROM raw.age_in_period
       OR actual.swipe_likes IS DISTINCT FROM raw.swipe_likes
       OR actual.swipe_passes IS DISTINCT FROM raw.swipe_passes
       OR actual.swipe_super_likes IS DISTINCT FROM raw.swipe_super_likes
       OR actual.matches IS DISTINCT FROM raw.matches
       OR actual.messages_sent IS DISTINCT FROM raw.messages_sent
       OR actual.messages_received IS DISTINCT FROM raw.messages_received
       OR actual.app_opens IS DISTINCT FROM raw.app_opens
       OR actual.source_fingerprint IS DISTINCT FROM raw.source_fingerprint
  `);
  return countFrom(result.rows, "raw month parity");
}

async function queryStaleFacts(metricVersion: string): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    WITH latest_files AS (
      SELECT source_file.user_id, max(source_file.created_at) AS created_at
      FROM original_anonymized_file source_file
      WHERE source_file.data_provider = 'TINDER'
      GROUP BY source_file.user_id
    ),
    current_watermarks AS (
      SELECT
        registry.id AS profile_id,
        source_profile.updated_at AS profile_updated_at,
        latest_files.created_at AS file_created_at
      FROM swipe_rank_profile registry
      JOIN tinder_profile source_profile
        ON source_profile.tinder_id = registry.provider_profile_id
       AND source_profile.computed = false
      LEFT JOIN latest_files ON latest_files.user_id = source_profile.user_id
      WHERE registry.data_provider = 'TINDER'
    )
    SELECT count(*)::bigint AS count
    FROM swipe_rank_period_fact fact
    JOIN current_watermarks watermark ON watermark.profile_id = fact.profile_id
    WHERE fact.metric_version = ${metricVersion}
      AND (
        watermark.profile_updated_at > fact.source_profile_updated_at
        OR (
          watermark.file_created_at IS NOT NULL
          AND (
            fact.source_file_created_at IS NULL
            OR watermark.file_created_at > fact.source_file_created_at
          )
        )
      )
  `);
  return countFrom(result.rows, "staleness");
}

async function queryRegistryDescriptorMismatches(): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    SELECT count(*)::bigint AS count
    FROM swipe_rank_profile registry
    JOIN tinder_profile source_profile
      ON source_profile.tinder_id = registry.provider_profile_id
     AND source_profile.computed = false
    LEFT JOIN "user" app_user ON app_user.id = source_profile.user_id
    WHERE registry.data_provider = 'TINDER'
      AND (
        registry.user_id IS DISTINCT FROM source_profile.user_id
        OR registry.gender IS DISTINCT FROM source_profile.gender
        OR registry.interested_in IS DISTINCT FROM source_profile.interested_in
        OR registry.city IS DISTINCT FROM coalesce(app_user.city, source_profile.city)
        OR registry.region IS DISTINCT FROM coalesce(app_user.region, source_profile.region)
        OR registry.country IS DISTINCT FROM coalesce(app_user.country, source_profile.country)
      )
  `);
  return countFrom(result.rows, "registry descriptor parity");
}

async function queryProfileRangeFlagMismatches(
  metricVersion: string,
): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    WITH monthly_expected AS (
      SELECT
        registry.id AS profile_id,
        date_trunc('month', usage.date_stamp_raw::date)::date AS period_start,
        bool_or(
          usage.date_stamp < source_profile.first_day_on_app
          OR usage.date_stamp > source_profile.last_day_on_app
        ) AS expected_flag
      FROM tinder_usage usage
      JOIN tinder_profile source_profile
        ON source_profile.tinder_id = usage.tinder_profile_id
       AND source_profile.computed = false
      JOIN swipe_rank_profile registry
        ON registry.data_provider = 'TINDER'
       AND registry.provider_profile_id = source_profile.tinder_id
      GROUP BY
        registry.id,
        date_trunc('month', usage.date_stamp_raw::date)::date
    ), expanded AS (
      SELECT
        profile_id,
        'MONTH'::"SwipeRankPeriodKind" AS period_kind,
        period_start,
        expected_flag
      FROM monthly_expected
      UNION ALL
      SELECT
        profile_id,
        'QUARTER'::"SwipeRankPeriodKind",
        date_trunc('quarter', period_start)::date,
        expected_flag
      FROM monthly_expected
      UNION ALL
      SELECT
        profile_id,
        'YEAR'::"SwipeRankPeriodKind",
        date_trunc('year', period_start)::date,
        expected_flag
      FROM monthly_expected
      UNION ALL
      SELECT
        profile_id,
        'ALL_TIME'::"SwipeRankPeriodKind",
        date '0001-01-01',
        expected_flag
      FROM monthly_expected
    ), expected AS (
      SELECT
        profile_id,
        period_kind,
        period_start,
        bool_or(expected_flag) AS expected_flag
      FROM expanded
      GROUP BY profile_id, period_kind, period_start
    )
    SELECT count(*)::bigint AS count
    FROM swipe_rank_period_fact fact
    JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
    LEFT JOIN expected
      ON expected.profile_id = fact.profile_id
     AND expected.period_kind = fact.period_kind
     AND expected.period_start = fact.period_start
    WHERE profile.data_provider = 'TINDER'
      AND fact.metric_version = ${metricVersion}
      AND coalesce(expected.expected_flag, false) IS DISTINCT FROM
        (fact.quality_flags ? 'PROFILE_RANGE_EXCLUDES_USAGE')
  `);
  return countFrom(result.rows, "profile range quality flag parity");
}

async function querySourceGenerationMismatches(
  metricVersion: string,
): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    WITH latest_full AS (
      SELECT build.id, build.source_watermark
      FROM swipe_rank_build build
      WHERE build.data_provider = 'TINDER'
        AND build.metric_version = ${metricVersion}
        AND build.scope = 'FULL'
        AND build.status = 'COMPLETE'
      ORDER BY build.completed_at DESC, build.started_at DESC
      LIMIT 1
    ), current_source AS (
      SELECT coalesce(max(mutation.id), 0)::bigint AS generation
      FROM swipe_rank_source_mutation mutation
      WHERE mutation.data_provider = 'TINDER'
    )
    SELECT CASE
      WHEN latest_full.id IS NULL
        OR latest_full.source_watermark ->> 'sourceGeneration' IS NULL
        OR (latest_full.source_watermark ->> 'sourceGeneration')::bigint
          <> current_source.generation
      THEN 1
      ELSE 0
    END::bigint AS count
    FROM current_source
    LEFT JOIN latest_full ON true
  `);
  return countFrom(result.rows, "source generation");
}

/**
 * Read-only parity checks for a completed Tinder fact version.
 *
 * Keep the 5.8M-row raw aggregation isolated from the inexpensive fact checks;
 * combining them in one CTE made Neon materialize a large validation graph and
 * exceed the HTTP request timeout. Each request now has one bounded concern.
 */
export async function validateTinderSwipeRankFacts(
  metricVersion = SWIPE_RANK_METRIC_VERSION,
): Promise<SwipeRankValidationResult> {
  // Keep the two full raw scans sequential so one validation run does not
  // double peak memory on the database. Monthly parity verifies the canonical
  // grain; all-time parity independently checks complete source coverage.
  const rawMonthMismatches = await queryRawMonthMismatches(metricVersion);
  const rawAllTimeMismatches = await queryRawAllTimeMismatches(metricVersion);

  const [
    inventory,
    duplicateFacts,
    quarterMismatches,
    yearMismatches,
    allTimeMismatches,
    registryDescriptorMismatches,
    staleFacts,
    profileRangeFlagMismatches,
    sourceGenerationMismatches,
  ] = await Promise.all([
    queryInventory(metricVersion),
    queryDuplicateFacts(metricVersion),
    queryRollupMismatches(metricVersion, "QUARTER"),
    queryRollupMismatches(metricVersion, "YEAR"),
    queryRollupMismatches(metricVersion, "ALL_TIME"),
    queryRegistryDescriptorMismatches(),
    queryStaleFacts(metricVersion),
    queryProfileRangeFlagMismatches(metricVersion),
    querySourceGenerationMismatches(metricVersion),
  ]);

  return assembleSwipeRankValidationResult(metricVersion, {
    profiles: Number(inventory.profiles),
    facts: Number(inventory.facts),
    monthFacts: Number(inventory.month_facts),
    quarterFacts: Number(inventory.quarter_facts),
    yearFacts: Number(inventory.year_facts),
    allTimeFacts: Number(inventory.all_time_facts),
    duplicateFacts,
    invalidAllTimeSentinels: Number(inventory.invalid_all_time_sentinels),
    rollupMismatches: quarterMismatches + yearMismatches + allTimeMismatches,
    rawMonthMismatches,
    rawAllTimeMismatches,
    rateInputMismatches: Number(inventory.rate_input_mismatches),
    overOneMissingFlag: Number(inventory.over_one_missing_flag),
    overOneFlagWithoutCondition: Number(
      inventory.over_one_flag_without_condition,
    ),
    zeroLikeMissingFlag: Number(inventory.zero_like_missing_flag),
    zeroLikeFlagWithoutCondition: Number(
      inventory.zero_like_flag_without_condition,
    ),
    profileRangeFlagMismatches,
    unknownQualityFlags: Number(inventory.unknown_quality_flags),
    registryDescriptorMismatches,
    staleFacts,
    sourceGenerationMismatches,
  });
}
