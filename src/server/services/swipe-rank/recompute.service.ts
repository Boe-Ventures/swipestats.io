import { sql, type SQL } from "drizzle-orm";

import { db, withAdvisoryLockTransaction } from "@/server/db";
import { swipeRankBuildTable } from "@/server/db/schema";
import { createId } from "@/server/db/utils";

import { SWIPE_RANK_METRIC_VERSION, swipeRankBuildLockName } from "./constants";
import {
  getRecomputeScope,
  normalizeRecomputeProfileIds,
} from "./recompute-options";

export interface RecomputeTinderSwipeRankFactsOptions {
  /** Undefined means every real Tinder profile. An empty array is rejected. */
  profileIds?: readonly string[];
  metricVersion?: string;
}

export interface SwipeRankBuildSummary {
  buildId: string;
  metricVersion: string;
  scope: "FULL" | "PROFILE";
  profileCount: number;
  factCount: number;
  monthFactCount: number;
  quarterFactCount: number;
  yearFactCount: number;
  allTimeFactCount: number;
  anomalousFactCount: number;
}

interface SummaryRow extends Record<string, unknown> {
  profile_count: number | string;
  fact_count: number | string;
  month_fact_count: number | string;
  quarter_fact_count: number | string;
  year_fact_count: number | string;
  all_time_fact_count: number | string;
  anomalous_fact_count: number | string;
}

function inList(values: readonly string[]): SQL {
  return sql`(${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;
}

function sourceProfileFilter(profileIds: readonly string[] | undefined): SQL {
  return profileIds ? sql`AND p.tinder_id IN ${inList(profileIds)}` : sql``;
}

function registryProfileFilter(profileIds: readonly string[] | undefined): SQL {
  return profileIds
    ? sql`AND srp.provider_profile_id IN ${inList(profileIds)}`
    : sql``;
}

function asNumber(value: number | string): number {
  return Number(value);
}

/**
 * Atomically replace Tinder facts for one metric version.
 *
 * The only source range is the set of rows actually present in tinder_usage.
 * Profile first/last app-open dates are retained only as a quality diagnostic.
 * Broader periods are always derived from the canonical MONTH rows, so rates
 * are ratios of summed numerators/denominators rather than averages of rates.
 */
export async function recomputeTinderSwipeRankFacts(
  options: RecomputeTinderSwipeRankFactsOptions = {},
): Promise<SwipeRankBuildSummary> {
  const profileIds = normalizeRecomputeProfileIds(options.profileIds);
  const metricVersion =
    options.metricVersion?.trim() || SWIPE_RANK_METRIC_VERSION;
  const scope = getRecomputeScope(profileIds);
  const buildId = createId("srb");

  await db.insert(swipeRankBuildTable).values({
    id: buildId,
    dataProvider: "TINDER",
    metricVersion,
    scope,
    status: "RUNNING",
    sourceWatermark: {
      requestedProfileCount: profileIds?.length ?? 0,
    },
  });

  let row: SummaryRow;
  try {
    row = await withAdvisoryLockTransaction(
      swipeRankBuildLockName("TINDER"),
      async (tx) => {
        // Fact IDs are deterministic and full/scoped builds replace overlapping
        // rows. The transaction lock is the first READ COMMITTED statement, so
        // a queued build's source queries see its predecessor's commit. The
        // provider-wide registry is shared across metric versions.

        // Sync provider-native identity and immutable source provenance. The
        // source-file timestamp is informative only; raw usage is authoritative.
        await tx.execute(sql`
        INSERT INTO swipe_rank_profile (
          id,
          data_provider,
          provider_profile_id,
          user_id,
          gender,
          interested_in,
          city,
          region,
          country,
          location_source,
          is_synthetic,
          capabilities,
          source_profile_updated_at,
          source_file_created_at,
          created_at,
          updated_at
        )
        SELECT
          'srp_' || md5('TINDER:' || p.tinder_id),
          'TINDER'::"DataProvider",
          p.tinder_id,
          p.user_id,
          p.gender,
          p.interested_in,
          coalesce(app_user.city, p.city),
          coalesce(app_user.region, p.region),
          coalesce(app_user.country, p.country),
          CASE
            WHEN app_user.city IS NOT NULL
              OR app_user.region IS NOT NULL
              OR app_user.country IS NOT NULL
              THEN 'USER_CURRENT_WITH_TINDER_PROFILE_FALLBACK'
            ELSE 'TINDER_PROFILE'
          END,
          p.computed,
          jsonb_build_object(
            'swipeLikes', true,
            'swipePasses', true,
            'swipeSuperLikes', true,
            'matches', true,
            'messagesSent', true,
            'messagesReceived', true,
            'appOpens', true,
            'dailyAge', true
          ),
          p.updated_at,
          source_file.created_at,
          now(),
          now()
        FROM tinder_profile p
        LEFT JOIN "user" app_user ON app_user.id = p.user_id
        LEFT JOIN LATERAL (
          SELECT max(o.created_at) AS created_at
          FROM original_anonymized_file o
          WHERE o.user_id = p.user_id
            AND o.data_provider = 'TINDER'
        ) source_file ON true
        WHERE p.computed = false
        ${sourceProfileFilter(profileIds)}
        ON CONFLICT (data_provider, provider_profile_id) DO UPDATE SET
          user_id = excluded.user_id,
          gender = excluded.gender,
          interested_in = excluded.interested_in,
          city = excluded.city,
          region = excluded.region,
          country = excluded.country,
          location_source = excluded.location_source,
          is_synthetic = excluded.is_synthetic,
          capabilities = excluded.capabilities,
          source_profile_updated_at = excluded.source_profile_updated_at,
          source_file_created_at = excluded.source_file_created_at,
          updated_at = now()
      `);

        // Provider rows are the source of truth. A full reconciliation removes
        // analytical subjects whose source profile was deleted; scoped rebuilds
        // never infer deletion from an omitted ID.
        if (!profileIds) {
          await tx.execute(sql`
          DELETE FROM swipe_rank_profile srp
          WHERE srp.data_provider = 'TINDER'
            AND NOT EXISTS (
              SELECT 1
              FROM tinder_profile p
              WHERE p.tinder_id = srp.provider_profile_id
                AND p.computed = false
            )
        `);
        }

        if (scope === "FULL") {
          await tx.execute(sql`
          WITH selected_profiles AS (
            SELECT
              p.tinder_id,
              p.updated_at,
              p.user_id
            FROM tinder_profile p
            WHERE p.computed = false
          ),
          usage_watermark AS (
            SELECT
              count(*)::bigint AS row_count,
              min(u.date_stamp_raw)::date AS first_date,
              max(u.date_stamp_raw)::date AS last_date
            FROM tinder_usage u
            JOIN selected_profiles p ON p.tinder_id = u.tinder_profile_id
          ),
          file_watermark AS (
            SELECT max(o.created_at) AS latest_file_created_at
            FROM original_anonymized_file o
            JOIN selected_profiles p ON p.user_id = o.user_id
            WHERE o.data_provider = 'TINDER'
          )
          UPDATE swipe_rank_build
          SET source_watermark = swipe_rank_build.source_watermark || jsonb_build_object(
            'sourceGeneration', coalesce((
              SELECT max(mutation.id)
              FROM swipe_rank_source_mutation mutation
              WHERE mutation.data_provider = 'TINDER'
            ), 0),
            'profileCount', (SELECT count(*) FROM selected_profiles),
            'usageRowCount', coalesce((SELECT row_count FROM usage_watermark), 0),
            'firstObservedDate', (SELECT first_date FROM usage_watermark),
            'lastObservedDate', (SELECT last_date FROM usage_watermark),
            'latestProfileUpdatedAt', (SELECT max(updated_at) FROM selected_profiles),
            'latestSourceFileCreatedAt', (SELECT latest_file_created_at FROM file_watermark)
          )
          WHERE swipe_rank_build.id = ${buildId}
        `);
        } else {
          // Scoped build rows outlive profile deletion, so retain no exact
          // dates, usage counts, file timestamps, or provider identifiers.
          await tx.execute(sql`
          UPDATE swipe_rank_build
          SET source_watermark = swipe_rank_build.source_watermark || jsonb_build_object(
            'sourceGeneration', coalesce((
              SELECT max(mutation.id)
              FROM swipe_rank_source_mutation mutation
              WHERE mutation.data_provider = 'TINDER'
            ), 0)
          )
          WHERE swipe_rank_build.id = ${buildId}
        `);
        }

        // Replacing one version inside a transaction keeps readers on the old
        // committed facts until the complete replacement is ready.
        await tx.execute(sql`
        DELETE FROM swipe_rank_period_fact fact
        USING swipe_rank_profile srp
        WHERE fact.profile_id = srp.id
          AND srp.data_provider = 'TINDER'
          AND fact.metric_version = ${metricVersion}
          ${registryProfileFilter(profileIds)}
      `);

        // MONTH is canonical. date_stamp_raw is the provider's calendar date and
        // is deliberately not clipped to tinder_profile first/last app-open dates.
        await tx.execute(sql`
        WITH monthly AS (
          SELECT
            srp.id AS profile_id,
            date_trunc('month', u.date_stamp_raw::date)::date AS period_start,
            min(u.date_stamp_raw::date) AS observed_first_date,
            max(u.date_stamp_raw::date) AS observed_last_date,
            count(*)::bigint AS source_row_count,
            count(DISTINCT u.date_stamp_raw)::int AS observed_days,
            count(DISTINCT u.date_stamp_raw) FILTER (
              WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
            )::int AS active_days,
            max(u.user_age_this_day)::int AS age_in_period,
            sum(u.swipe_likes)::bigint AS swipe_likes,
            sum(u.swipe_passes)::bigint AS swipe_passes,
            sum(u.swipe_super_likes)::bigint AS swipe_super_likes,
            sum(u.matches)::bigint AS matches,
            sum(u.messages_sent)::bigint AS messages_sent,
            sum(u.messages_received)::bigint AS messages_received,
            sum(u.app_opens)::bigint AS app_opens,
            bool_or(
              u.date_stamp < p.first_day_on_app
              OR u.date_stamp > p.last_day_on_app
            ) AS profile_range_excludes_usage,
            p.updated_at AS source_profile_updated_at,
            srp.source_file_created_at
          FROM tinder_usage u
          JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
          JOIN swipe_rank_profile srp
            ON srp.data_provider = 'TINDER'
           AND srp.provider_profile_id = p.tinder_id
          WHERE p.computed = false
          ${sourceProfileFilter(profileIds)}
          GROUP BY
            srp.id,
            date_trunc('month', u.date_stamp_raw::date)::date,
            p.updated_at,
            srp.source_file_created_at
        ),
        prepared AS (
          SELECT
            *,
            to_jsonb(array_remove(ARRAY[
              CASE WHEN swipe_likes > 0 AND matches > swipe_likes
                THEN 'MATCH_YIELD_OVER_ONE' END,
              CASE WHEN swipe_likes = 0 AND matches > 0
                THEN 'MATCHES_WITH_ZERO_LIKES' END,
              CASE WHEN profile_range_excludes_usage
                THEN 'PROFILE_RANGE_EXCLUDES_USAGE' END
            ]::text[], NULL)) AS quality_flags
          FROM monthly
        )
        INSERT INTO swipe_rank_period_fact (
          id,
          profile_id,
          build_id,
          metric_version,
          period_kind,
          period_start,
          period_end,
          observed_first_date,
          observed_last_date,
          source_row_count,
          observed_days,
          active_days,
          age_in_period,
          swipe_likes,
          swipe_passes,
          swipe_super_likes,
          matches,
          messages_sent,
          messages_received,
          app_opens,
          match_rate_numerator,
          match_rate_denominator,
          like_rate_numerator,
          like_rate_denominator,
          quality_flags,
          has_quality_anomaly,
          source_profile_updated_at,
          source_file_created_at,
          source_fingerprint,
          computed_at
        )
        SELECT
          'srf_' || md5(
            profile_id || ':MONTH:' || period_start::text || ':' || ${metricVersion}
          ),
          profile_id,
          ${buildId},
          ${metricVersion},
          'MONTH'::"SwipeRankPeriodKind",
          period_start,
          (period_start + interval '1 month')::date,
          observed_first_date,
          observed_last_date,
          source_row_count,
          observed_days,
          active_days,
          age_in_period,
          swipe_likes,
          swipe_passes,
          swipe_super_likes,
          matches,
          messages_sent,
          messages_received,
          app_opens,
          matches,
          swipe_likes,
          swipe_likes,
          swipe_likes + swipe_passes,
          quality_flags,
          jsonb_array_length(quality_flags) > 0,
          source_profile_updated_at,
          source_file_created_at,
          md5(concat_ws(':',
            source_row_count,
            observed_first_date,
            observed_last_date,
            swipe_likes,
            swipe_passes,
            swipe_super_likes,
            matches,
            messages_sent,
            messages_received,
            app_opens
          )),
          now()
        FROM prepared
      `);

        // Quarter, year and all-time rows are sums of canonical months. No rate
        // is averaged: generated rates use the rolled-up numerator/denominator.
        await tx.execute(sql`
        WITH month_base AS (
          SELECT fact.*
          FROM swipe_rank_period_fact fact
          JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
          WHERE srp.data_provider = 'TINDER'
            AND fact.metric_version = ${metricVersion}
            AND fact.period_kind = 'MONTH'
            ${registryProfileFilter(profileIds)}
        ),
        expanded AS (
          SELECT
            month_base.*,
            'QUARTER'::"SwipeRankPeriodKind" AS rollup_kind,
            date_trunc('quarter', period_start)::date AS rollup_start,
            (date_trunc('quarter', period_start) + interval '3 months')::date AS rollup_end
          FROM month_base
          UNION ALL
          SELECT
            month_base.*,
            'YEAR'::"SwipeRankPeriodKind",
            date_trunc('year', period_start)::date,
            (date_trunc('year', period_start) + interval '1 year')::date
          FROM month_base
          UNION ALL
          SELECT
            month_base.*,
            'ALL_TIME'::"SwipeRankPeriodKind",
            date '0001-01-01',
            date '9999-01-01'
          FROM month_base
        ),
        rolled AS (
          SELECT
            profile_id,
            rollup_kind,
            rollup_start,
            rollup_end,
            min(observed_first_date) AS observed_first_date,
            max(observed_last_date) AS observed_last_date,
            sum(source_row_count)::bigint AS source_row_count,
            sum(observed_days)::int AS observed_days,
            sum(active_days)::int AS active_days,
            max(age_in_period)::int AS age_in_period,
            CASE WHEN bool_and(swipe_likes IS NOT NULL)
              THEN sum(swipe_likes)::bigint END AS swipe_likes,
            CASE WHEN bool_and(swipe_passes IS NOT NULL)
              THEN sum(swipe_passes)::bigint END AS swipe_passes,
            CASE WHEN bool_and(swipe_super_likes IS NOT NULL)
              THEN sum(swipe_super_likes)::bigint END AS swipe_super_likes,
            CASE WHEN bool_and(matches IS NOT NULL)
              THEN sum(matches)::bigint END AS matches,
            CASE WHEN bool_and(messages_sent IS NOT NULL)
              THEN sum(messages_sent)::bigint END AS messages_sent,
            CASE WHEN bool_and(messages_received IS NOT NULL)
              THEN sum(messages_received)::bigint END AS messages_received,
            CASE WHEN bool_and(app_opens IS NOT NULL)
              THEN sum(app_opens)::bigint END AS app_opens,
            CASE WHEN bool_and(match_rate_numerator IS NOT NULL)
              THEN sum(match_rate_numerator)::bigint END AS match_rate_numerator,
            CASE WHEN bool_and(match_rate_denominator IS NOT NULL)
              THEN sum(match_rate_denominator)::bigint END AS match_rate_denominator,
            CASE WHEN bool_and(like_rate_numerator IS NOT NULL)
              THEN sum(like_rate_numerator)::bigint END AS like_rate_numerator,
            CASE WHEN bool_and(like_rate_denominator IS NOT NULL)
              THEN sum(like_rate_denominator)::bigint END AS like_rate_denominator,
            bool_or(quality_flags ? 'PROFILE_RANGE_EXCLUDES_USAGE')
              AS profile_range_excludes_usage,
            max(source_profile_updated_at) AS source_profile_updated_at,
            max(source_file_created_at) AS source_file_created_at
          FROM expanded
          GROUP BY profile_id, rollup_kind, rollup_start, rollup_end
        ),
        prepared AS (
          SELECT
            *,
            to_jsonb(array_remove(ARRAY[
              CASE WHEN match_rate_denominator > 0
                     AND match_rate_numerator > match_rate_denominator
                THEN 'MATCH_YIELD_OVER_ONE' END,
              CASE WHEN match_rate_denominator = 0
                     AND match_rate_numerator > 0
                THEN 'MATCHES_WITH_ZERO_LIKES' END,
              CASE WHEN profile_range_excludes_usage
                THEN 'PROFILE_RANGE_EXCLUDES_USAGE' END
            ]::text[], NULL)) AS quality_flags
          FROM rolled
        )
        INSERT INTO swipe_rank_period_fact (
          id,
          profile_id,
          build_id,
          metric_version,
          period_kind,
          period_start,
          period_end,
          observed_first_date,
          observed_last_date,
          source_row_count,
          observed_days,
          active_days,
          age_in_period,
          swipe_likes,
          swipe_passes,
          swipe_super_likes,
          matches,
          messages_sent,
          messages_received,
          app_opens,
          match_rate_numerator,
          match_rate_denominator,
          like_rate_numerator,
          like_rate_denominator,
          quality_flags,
          has_quality_anomaly,
          source_profile_updated_at,
          source_file_created_at,
          source_fingerprint,
          computed_at
        )
        SELECT
          'srf_' || md5(
            profile_id || ':' || rollup_kind::text || ':' || rollup_start::text || ':' || ${metricVersion}
          ),
          profile_id,
          ${buildId},
          ${metricVersion},
          rollup_kind,
          rollup_start,
          rollup_end,
          observed_first_date,
          observed_last_date,
          source_row_count,
          observed_days,
          active_days,
          age_in_period,
          swipe_likes,
          swipe_passes,
          swipe_super_likes,
          matches,
          messages_sent,
          messages_received,
          app_opens,
          match_rate_numerator,
          match_rate_denominator,
          like_rate_numerator,
          like_rate_denominator,
          quality_flags,
          jsonb_array_length(quality_flags) > 0,
          source_profile_updated_at,
          source_file_created_at,
          md5(concat_ws(':',
            source_row_count,
            observed_first_date,
            observed_last_date,
            swipe_likes,
            swipe_passes,
            swipe_super_likes,
            matches,
            messages_sent,
            messages_received,
            app_opens
          )),
          now()
        FROM prepared
      `);

        const completionWatermark =
          scope === "FULL"
            ? sql`build.source_watermark || jsonb_build_object(
                'factCount', (
                  SELECT count(*)
                  FROM swipe_rank_period_fact fact
                  JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
                  WHERE fact.build_id = ${buildId}
                    AND srp.data_provider = 'TINDER'
                )
              )`
            : sql`build.source_watermark`;
        await tx.execute(sql`
        UPDATE swipe_rank_build build
        SET
          status = 'COMPLETE',
          completed_at = now(),
          source_watermark = ${completionWatermark}
        WHERE build.id = ${buildId}
      `);

        // Capture the caller-facing result before this transaction releases the
        // provider/version advisory lock. A queued overlapping rebuild may
        // replace these deterministic fact rows immediately after commit.
        const summary = await tx.execute<SummaryRow>(sql`
        SELECT
          count(DISTINCT profile_id)::bigint AS profile_count,
          count(*)::bigint AS fact_count,
          count(*) FILTER (WHERE period_kind = 'MONTH')::bigint AS month_fact_count,
          count(*) FILTER (WHERE period_kind = 'QUARTER')::bigint AS quarter_fact_count,
          count(*) FILTER (WHERE period_kind = 'YEAR')::bigint AS year_fact_count,
          count(*) FILTER (WHERE period_kind = 'ALL_TIME')::bigint AS all_time_fact_count,
          count(*) FILTER (WHERE has_quality_anomaly)::bigint AS anomalous_fact_count
        FROM swipe_rank_period_fact
        WHERE build_id = ${buildId}
      `);
        const summaryRow = summary.rows[0];
        if (!summaryRow) {
          throw new Error(`Build ${buildId} completed without a summary.`);
        }
        return summaryRow;
      },
    );
  } catch (error) {
    await db
      .update(swipeRankBuildTable)
      .set({
        status: "FAILED",
        completedAt: new Date(),
        // Query errors can embed bound profile IDs in their stack/message.
        // Persist only a coarse category; the caller still receives the full
        // error through the normal runtime logs.
        failureCode: "BUILD_FAILED",
      })
      .where(sql`${swipeRankBuildTable.id} = ${buildId}`);
    throw error;
  }

  return {
    buildId,
    metricVersion,
    scope,
    profileCount: asNumber(row.profile_count),
    factCount: asNumber(row.fact_count),
    monthFactCount: asNumber(row.month_fact_count),
    quarterFactCount: asNumber(row.quarter_fact_count),
    yearFactCount: asNumber(row.year_fact_count),
    allTimeFactCount: asNumber(row.all_time_fact_count),
    anomalousFactCount: asNumber(row.anomalous_fact_count),
  };
}
