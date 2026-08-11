import { sql } from "drizzle-orm";

import { db } from "@/server/db";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";

export interface SwipeRankValidationResult {
  metricVersion: string;
  closedBefore: string;
  profiles: number;
  facts: number;
  duplicateFacts: number;
  nonMonthFacts: number;
  openMonthFacts: number;
  rawMonthMismatches: number;
  rateInputMismatches: number;
  qualityFlagMismatches: number;
  registryDescriptorMismatches: number;
  valid: boolean;
}

interface CountRow extends Record<string, unknown> {
  count: number | string;
}

interface InventoryRow extends Record<string, unknown> {
  profiles: number | string;
  facts: number | string;
  non_month_facts: number | string;
  open_month_facts: number | string;
  rate_input_mismatches: number | string;
  quality_flag_mismatches: number | string;
}

export function assembleSwipeRankValidationResult(
  input: Omit<SwipeRankValidationResult, "valid">,
): SwipeRankValidationResult {
  return {
    ...input,
    valid:
      input.facts > 0 &&
      input.duplicateFacts === 0 &&
      input.nonMonthFacts === 0 &&
      input.openMonthFacts === 0 &&
      input.rawMonthMismatches === 0 &&
      input.rateInputMismatches === 0 &&
      input.qualityFlagMismatches === 0 &&
      input.registryDescriptorMismatches === 0,
  };
}

function count(rows: CountRow[], label: string): number {
  const row = rows[0];
  if (!row) throw new Error(`SwipeRank ${label} validation returned no row.`);
  return Number(row.count);
}

async function queryInventory(
  metricVersion: string,
  closedBefore: string,
): Promise<InventoryRow> {
  const result = await db.execute<InventoryRow>(sql`
    SELECT
      count(DISTINCT fact.profile_id)::bigint AS profiles,
      count(*)::bigint AS facts,
      count(*) FILTER (WHERE fact.period_kind <> 'MONTH')::bigint
        AS non_month_facts,
      count(*) FILTER (WHERE fact.period_end > ${closedBefore}::date)::bigint
        AS open_month_facts,
      count(*) FILTER (
        WHERE fact.match_rate_numerator IS DISTINCT FROM fact.matches
          OR fact.match_rate_denominator IS DISTINCT FROM fact.swipe_likes
          OR fact.like_rate_numerator IS DISTINCT FROM fact.swipe_likes
          OR fact.like_rate_denominator IS DISTINCT FROM
            (fact.swipe_likes + fact.swipe_passes)
      )::bigint AS rate_input_mismatches,
      count(*) FILTER (
        WHERE fact.has_quality_anomaly IS DISTINCT FROM
          (jsonb_array_length(fact.quality_flags) > 0)
          OR (
            fact.quality_flags ? 'MATCH_YIELD_OVER_ONE'
          ) IS DISTINCT FROM (
            fact.match_rate_denominator > 0
            AND fact.match_rate_numerator > fact.match_rate_denominator
          )
          OR (
            fact.quality_flags ? 'MATCHES_WITH_ZERO_LIKES'
          ) IS DISTINCT FROM (
            fact.match_rate_denominator = 0
            AND fact.match_rate_numerator > 0
          )
          OR NOT (fact.quality_flags <@ '[
            "MATCH_YIELD_OVER_ONE",
            "MATCHES_WITH_ZERO_LIKES",
            "PROFILE_RANGE_EXCLUDES_USAGE"
          ]'::jsonb)
      )::bigint AS quality_flag_mismatches
    FROM swipe_rank_period_fact fact
    JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
    WHERE profile.data_provider = 'TINDER'
      AND fact.metric_version = ${metricVersion}
  `);
  const row = result.rows[0];
  if (!row) throw new Error("SwipeRank inventory validation returned no row.");
  return row;
}

async function queryDuplicateFacts(metricVersion: string): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    SELECT count(*)::bigint AS count
    FROM (
      SELECT fact.profile_id, fact.period_start
      FROM swipe_rank_period_fact fact
      JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
      WHERE profile.data_provider = 'TINDER'
        AND fact.metric_version = ${metricVersion}
      GROUP BY fact.profile_id, fact.period_start
      HAVING count(*) > 1
    ) duplicates
  `);
  return count(result.rows, "duplicate fact");
}

async function queryRawMonthMismatches(
  metricVersion: string,
  closedBefore: string,
): Promise<number> {
  const result = await db.execute<CountRow>(sql`
    WITH raw AS (
      SELECT
        usage.tinder_profile_id,
        date_trunc('month', usage.date_stamp_raw::date)::date AS period_start,
        min(usage.date_stamp_raw::date) AS observed_first_date,
        max(usage.date_stamp_raw::date) AS observed_last_date,
        count(*)::bigint AS source_row_count,
        count(DISTINCT usage.date_stamp_raw)::int AS observed_days,
        count(DISTINCT usage.date_stamp_raw) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        sum(usage.swipe_likes)::bigint AS swipe_likes,
        sum(usage.swipe_passes)::bigint AS swipe_passes,
        sum(usage.matches)::bigint AS matches
      FROM tinder_usage usage
      JOIN tinder_profile profile
        ON profile.tinder_id = usage.tinder_profile_id
       AND profile.computed = false
      WHERE usage.date_stamp_raw::date < ${closedBefore}::date
      GROUP BY
        usage.tinder_profile_id,
        date_trunc('month', usage.date_stamp_raw::date)::date
    ), actual AS (
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
       OR actual.swipe_likes IS DISTINCT FROM raw.swipe_likes
       OR actual.swipe_passes IS DISTINCT FROM raw.swipe_passes
       OR actual.matches IS DISTINCT FROM raw.matches
  `);
  return count(result.rows, "raw month parity");
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
  return count(result.rows, "registry descriptor parity");
}

/** Validate the full month-only fact set before activating a publication. */
export async function validateTinderSwipeRankFacts(
  metricVersion = SWIPE_RANK_METRIC_VERSION,
  closedBefore = `${new Date().toISOString().slice(0, 7)}-01`,
): Promise<SwipeRankValidationResult> {
  const rawMonthMismatches = await queryRawMonthMismatches(
    metricVersion,
    closedBefore,
  );
  const [inventory, duplicateFacts, registryDescriptorMismatches] =
    await Promise.all([
      queryInventory(metricVersion, closedBefore),
      queryDuplicateFacts(metricVersion),
      queryRegistryDescriptorMismatches(),
    ]);

  return assembleSwipeRankValidationResult({
    metricVersion,
    closedBefore,
    profiles: Number(inventory.profiles),
    facts: Number(inventory.facts),
    duplicateFacts,
    nonMonthFacts: Number(inventory.non_month_facts),
    openMonthFacts: Number(inventory.open_month_facts),
    rawMonthMismatches,
    rateInputMismatches: Number(inventory.rate_input_mismatches),
    qualityFlagMismatches: Number(inventory.quality_flag_mismatches),
    registryDescriptorMismatches,
  });
}
