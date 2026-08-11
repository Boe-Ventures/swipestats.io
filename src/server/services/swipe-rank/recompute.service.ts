import { sql } from "drizzle-orm";

import { db, withAdvisoryLockTransaction } from "@/server/db";
import { swipeRankBuildTable } from "@/server/db/schema";
import { createId } from "@/server/db/utils";

import { SWIPE_RANK_METRIC_VERSION, swipeRankBuildLockName } from "./constants";
import { periodContaining } from "./periods";

export interface RecomputeTinderSwipeRankFactsOptions {
  metricVersion?: string;
  /** Exclusive UTC month boundary. Defaults to the current UTC month. */
  closedBefore?: string;
}

export interface SwipeRankBuildSummary {
  buildId: string;
  metricVersion: string;
  scope: "FULL";
  profileCount: number;
  factCount: number;
  monthFactCount: number;
  anomalousFactCount: number;
}

interface SummaryRow extends Record<string, unknown> {
  profile_count: number | string;
  fact_count: number | string;
  month_fact_count: number | string;
  anomalous_fact_count: number | string;
}

function asNumber(value: number | string): number {
  return Number(value);
}

/**
 * Atomically replace Tinder facts for one metric version.
 *
 * The only source range is the set of rows actually present in tinder_usage.
 * Profile first/last app-open dates are retained only as a quality diagnostic.
 * Only completed UTC calendar months are materialized. Publication reads a
 * frozen monthly snapshot and never treats these working facts as a live rank.
 */
export async function recomputeTinderSwipeRankFacts(
  options: RecomputeTinderSwipeRankFactsOptions = {},
): Promise<SwipeRankBuildSummary> {
  const metricVersion =
    options.metricVersion?.trim() || SWIPE_RANK_METRIC_VERSION;
  const closedBefore =
    options.closedBefore ?? `${new Date().toISOString().slice(0, 7)}-01`;
  let containingMonth;
  try {
    containingMonth = periodContaining("MONTH", closedBefore);
  } catch {
    throw new Error("SwipeRank closedBefore must be a UTC month start.");
  }
  if (containingMonth.start !== closedBefore) {
    throw new Error("SwipeRank closedBefore must be a UTC month start.");
  }
  const scope = "FULL" as const;
  const buildId = createId("srb");

  await db.insert(swipeRankBuildTable).values({
    id: buildId,
    dataProvider: "TINDER",
    metricVersion,
    scope,
    status: "RUNNING",
    sourceWatermark: {
      closedBefore,
    },
  });

  let row: SummaryRow;
  try {
    row = await withAdvisoryLockTransaction(
      swipeRankBuildLockName("TINDER"),
      async (tx) => {
        // Fact IDs are deterministic. One full monthly publication build
        // replaces the working fact set for this metric version atomically.

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

        // Provider rows are the source of truth.
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
            'closedBefore', ${closedBefore},
            'profileCount', (SELECT count(*) FROM selected_profiles),
            'usageRowCount', coalesce((SELECT row_count FROM usage_watermark), 0),
            'firstObservedDate', (SELECT first_date FROM usage_watermark),
            'lastObservedDate', (SELECT last_date FROM usage_watermark),
            'latestProfileUpdatedAt', (SELECT max(updated_at) FROM selected_profiles),
            'latestSourceFileCreatedAt', (SELECT latest_file_created_at FROM file_watermark)
          )
          WHERE swipe_rank_build.id = ${buildId}
        `);

        // Replacing one version inside a transaction keeps readers on the old
        // committed facts until the complete replacement is ready.
        await tx.execute(sql`
        DELETE FROM swipe_rank_period_fact fact
        USING swipe_rank_profile srp
        WHERE fact.profile_id = srp.id
          AND srp.data_provider = 'TINDER'
          AND fact.metric_version = ${metricVersion}
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
            AND u.date_stamp_raw::date < ${closedBefore}::date
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

        await tx.execute(sql`
        UPDATE swipe_rank_build build
        SET
          status = 'COMPLETE',
          completed_at = now(),
          source_watermark = build.source_watermark || jsonb_build_object(
            'factCount', (
              SELECT count(*)
              FROM swipe_rank_period_fact fact
              JOIN swipe_rank_profile srp ON srp.id = fact.profile_id
              WHERE fact.build_id = ${buildId}
                AND srp.data_provider = 'TINDER'
            )
          )
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
    anomalousFactCount: asNumber(row.anomalous_fact_count),
  };
}
