import { sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";

import { hasFlag, printHeading, printJson, printRows } from "./utils";

type AuditRow = Record<string, unknown>;

async function one<T extends Record<string, unknown>>(query: SQL): Promise<T> {
  const result = await db.execute<T>(query);
  const row = result.rows[0];
  if (!row) throw new Error("Audit query returned no rows.");
  return row;
}

async function auditInventory(): Promise<AuditRow> {
  return one<AuditRow>(sql`
    SELECT
      now() AS as_of,
      count(*)::int AS meta_rows,
      count(*) FILTER (
        WHERE tinder_profile_id IS NOT NULL AND hinge_profile_id IS NULL
      )::int AS tinder_rows,
      count(*) FILTER (
        WHERE hinge_profile_id IS NOT NULL AND tinder_profile_id IS NULL
      )::int AS hinge_rows,
      count(*) FILTER (
        WHERE tinder_profile_id IS NOT NULL AND hinge_profile_id IS NOT NULL
      )::int AS both_provider_ids,
      count(*) FILTER (
        WHERE tinder_profile_id IS NULL AND hinge_profile_id IS NULL
      )::int AS neither_provider_id,
      min(computed_at) AS oldest_computed_at,
      max(computed_at) AS newest_computed_at,
      (SELECT count(*)::int FROM tinder_profile WHERE computed = false)
        AS real_tinder_profiles,
      (SELECT count(*)::int FROM tinder_profile WHERE computed = true)
        AS synthetic_tinder_profiles,
      (SELECT count(*)::int FROM hinge_profile) AS hinge_profiles,
      (SELECT count(*)::int FROM raya_profile) AS raya_profiles
    FROM profile_meta
  `);
}

async function auditGrainAndCoverage(): Promise<AuditRow> {
  return one<AuditRow>(sql`
    WITH tinder_meta_counts AS (
      SELECT tinder_profile_id, count(*)::int AS row_count
      FROM profile_meta
      WHERE tinder_profile_id IS NOT NULL
      GROUP BY tinder_profile_id
    ),
    hinge_meta_counts AS (
      SELECT hinge_profile_id, count(*)::int AS row_count
      FROM profile_meta
      WHERE hinge_profile_id IS NOT NULL
      GROUP BY hinge_profile_id
    )
    SELECT
      count(*) FILTER (WHERE tmc.row_count > 1)::int
        AS tinder_profiles_with_duplicate_meta,
      coalesce(sum(tmc.row_count - 1) FILTER (WHERE tmc.row_count > 1), 0)::int
        AS excess_tinder_meta_rows,
      (SELECT count(*)::int
       FROM hinge_meta_counts
       WHERE row_count > 1) AS hinge_profiles_with_duplicate_meta,
      (SELECT coalesce(sum(row_count - 1), 0)::int
       FROM hinge_meta_counts
       WHERE row_count > 1) AS excess_hinge_meta_rows,
      (SELECT count(*)::int
       FROM tinder_profile p
       LEFT JOIN tinder_meta_counts m ON m.tinder_profile_id = p.tinder_id
       WHERE p.computed = false AND m.tinder_profile_id IS NULL)
        AS real_tinder_profiles_missing_meta,
      (SELECT count(*)::int
       FROM tinder_profile p
       LEFT JOIN tinder_meta_counts m ON m.tinder_profile_id = p.tinder_id
       WHERE p.computed = true AND m.tinder_profile_id IS NULL)
        AS synthetic_tinder_profiles_missing_meta,
      (SELECT count(*)::int
       FROM hinge_profile p
       LEFT JOIN hinge_meta_counts m ON m.hinge_profile_id = p.hinge_id
       WHERE m.hinge_profile_id IS NULL) AS hinge_profiles_missing_meta,
      (SELECT count(*)::int
       FROM profile_meta m
       JOIN tinder_profile p ON p.tinder_id = m.tinder_profile_id
       WHERE p.computed = true) AS synthetic_tinder_meta_rows
    FROM tinder_meta_counts tmc
  `);
}

async function auditDomainRules(): Promise<AuditRow> {
  return one<AuditRow>(sql`
    WITH checked AS (
      SELECT
        *,
        CASE
          WHEN tinder_profile_id IS NOT NULL
            AND swipe_likes_total + swipe_passes_total > 0
            THEN swipe_likes_total::double precision /
              (swipe_likes_total + swipe_passes_total)
          WHEN hinge_profile_id IS NOT NULL AND swipe_likes_total > 0 THEN 1
          ELSE 0
        END AS expected_like_rate,
        CASE
          WHEN tinder_profile_id IS NOT NULL AND swipe_likes_total > 0
            THEN matches_total::double precision / swipe_likes_total
          WHEN tinder_profile_id IS NOT NULL THEN 0
          ELSE NULL
        END AS expected_match_rate,
        CASE
          WHEN days_active > 0
            THEN (swipe_likes_total + swipe_passes_total)::double precision /
              days_active
          ELSE 0
        END AS expected_swipes_per_day
      FROM profile_meta
    )
    SELECT
      count(*) FILTER (WHERE "from" > "to")::int AS reversed_periods,
      count(*) FILTER (WHERE days_in_period <= 0)::int
        AS non_positive_days_in_period,
      count(*) FILTER (WHERE days_active < 0 OR days_active > days_in_period)::int
        AS invalid_active_day_counts,
      count(*) FILTER (
        WHERE swipe_likes_total < 0
           OR swipe_passes_total < 0
           OR matches_total < 0
           OR messages_sent_total < 0
           OR messages_received_total < 0
           OR app_opens_total < 0
      )::int AS negative_core_totals,
      count(*) FILTER (
        WHERE conversation_count < 0
           OR conversations_with_messages < 0
           OR ghosted_count < 0
           OR conversations_with_messages > conversation_count
           OR ghosted_count > conversation_count
           OR ghosted_count + conversations_with_messages <> conversation_count
      )::int AS invalid_conversation_counts,
      count(*) FILTER (
        WHERE abs(like_rate - expected_like_rate) > 1e-12
      )::int AS like_rate_formula_mismatches,
      count(*) FILTER (
        WHERE expected_match_rate IS NOT NULL
          AND abs(match_rate - expected_match_rate) > 1e-12
      )::int AS match_rate_formula_mismatches,
      count(*) FILTER (
        WHERE abs(swipes_per_day - expected_swipes_per_day) > 1e-12
      )::int AS swipes_per_day_formula_mismatches,
      count(*) FILTER (
        WHERE tinder_profile_id IS NOT NULL
          AND abs(like_rate - expected_like_rate) > 1e-12
      )::int AS tinder_like_rate_formula_mismatches,
      count(*) FILTER (
        WHERE hinge_profile_id IS NOT NULL
          AND abs(like_rate - expected_like_rate) > 1e-12
      )::int AS hinge_like_rate_formula_mismatches,
      count(*) FILTER (
        WHERE tinder_profile_id IS NOT NULL
          AND expected_match_rate IS NOT NULL
          AND abs(match_rate - expected_match_rate) > 1e-12
      )::int AS tinder_match_rate_formula_mismatches,
      NULL::int AS hinge_match_rate_formula_mismatches,
      count(*) FILTER (
        WHERE tinder_profile_id IS NOT NULL
          AND abs(swipes_per_day - expected_swipes_per_day) > 1e-12
      )::int AS tinder_swipes_per_day_formula_mismatches,
      count(*) FILTER (
        WHERE hinge_profile_id IS NOT NULL
          AND abs(swipes_per_day - expected_swipes_per_day) > 1e-12
      )::int AS hinge_swipes_per_day_formula_mismatches,
      count(*) FILTER (WHERE match_rate > 1)::int AS match_rates_over_one,
      count(*) FILTER (WHERE like_rate < 0 OR like_rate > 1)::int
        AS like_rates_outside_zero_one
    FROM checked
  `);
}

async function auditTinderIdentityProvenance(): Promise<AuditRow> {
  // REVIEW(provider assumption): historical Tinder exports can contain teen-era
  // activity. Keep ages 13-17 visible as a separate policy/source anomaly;
  // only a derived age below 13 (or above 100) is treated as implausible here.
  return one<AuditRow>(sql`
    WITH usage_bounds AS (
      SELECT
        tinder_profile_id,
        min(left(date_stamp_raw, 10)::date)::timestamp AS first_observed_day,
        max(left(date_stamp_raw, 10)::date)::timestamp AS last_observed_day,
        count(*) FILTER (
          WHERE user_age_this_day < 13 OR user_age_this_day > 100
        )::bigint AS implausible_usage_age_rows,
        count(*) FILTER (
          WHERE user_age_this_day >= 13 AND user_age_this_day < 18
        )::bigint AS below_adult_threshold_usage_age_rows
      FROM tinder_usage
      GROUP BY tinder_profile_id
    )
    SELECT
      count(*)::int AS profiles,
      count(*) FILTER (
        WHERE profile.create_date_source = 'PROVIDER'
      )::int AS provider_create_dates,
      count(*) FILTER (
        WHERE profile.create_date_source = 'INFERRED_FROM_USAGE'
      )::int AS inferred_create_dates,
      count(*) FILTER (
        WHERE profile.create_date_source IS NULL
      )::int AS unknown_legacy_create_date_sources,
      count(*) FILTER (
        WHERE profile.create_date_source IS NOT NULL
          AND profile.create_date_source NOT IN (
            'PROVIDER',
            'INFERRED_FROM_USAGE'
          )
      )::int AS invalid_create_date_sources,
      count(*) FILTER (
        WHERE bounds.first_observed_day::date < profile.create_date::date
      )::int AS activity_calendar_day_before_create_date,
      count(*) FILTER (
        WHERE profile.create_date_source = 'INFERRED_FROM_USAGE'
          AND profile.create_date IS DISTINCT FROM bounds.first_observed_day
      )::int AS inferred_date_not_first_observed_day,
      count(*) FILTER (
        WHERE profile.birth_date > profile.create_date
      )::int AS birth_after_create_date,
      count(*) FILTER (
        WHERE profile.active_time IS NOT NULL
          AND profile.active_time < profile.create_date
      )::int AS active_time_before_create_date,
      count(*) FILTER (
        WHERE profile.birth_date > now() + interval '48 hours'
      )::int AS clearly_future_birth_dates,
      count(*) FILTER (
        WHERE profile.create_date > now() + interval '48 hours'
      )::int AS clearly_future_create_dates,
      count(*) FILTER (
        WHERE profile.active_time > now() + interval '48 hours'
      )::int AS clearly_future_active_times,
      count(*) FILTER (
        WHERE profile.age_at_upload < 13 OR profile.age_at_upload > 100
      )::int AS implausible_age_at_upload_profiles,
      count(*) FILTER (
        WHERE profile.age_at_last_usage < 13
           OR profile.age_at_last_usage > 100
      )::int AS implausible_age_at_last_usage_profiles,
      count(*) FILTER (
        WHERE bounds.implausible_usage_age_rows > 0
      )::int AS profiles_with_implausible_usage_age,
      coalesce(sum(bounds.implausible_usage_age_rows), 0)::bigint
        AS implausible_usage_age_rows,
      count(*) FILTER (
        WHERE bounds.below_adult_threshold_usage_age_rows > 0
      )::int AS profiles_with_below_adult_threshold_usage_age,
      coalesce(
        sum(bounds.below_adult_threshold_usage_age_rows),
        0
      )::bigint AS below_adult_threshold_usage_age_rows
    FROM tinder_profile AS profile
    LEFT JOIN usage_bounds AS bounds
      ON bounds.tinder_profile_id = profile.tinder_id
    WHERE profile.computed = false
  `);
}

async function auditTinderDateSerialization(): Promise<{
  summary: AuditRow;
  deltaDistribution: AuditRow[];
}> {
  const result = await db.execute<AuditRow>(sql`
    WITH parsed AS (
      SELECT
        tinder_profile_id,
        date_stamp_raw,
        date_stamp::date AS timestamp_date,
        date_stamp::time AS timestamp_time,
        date_stamp_raw::date AS raw_date,
        date_stamp_raw !~ '^\\d{4}-\\d{2}-\\d{2}$'
          AS has_noncanonical_raw_date_text
      FROM tinder_usage
    ),
    dated AS (
      SELECT
        *,
        timestamp_date - raw_date AS delta_days
      FROM parsed
    )
    SELECT
      grouping(delta_days, timestamp_time) = 3 AS is_total,
      delta_days,
      timestamp_time::text AS timestamp_time,
      count(*)::bigint AS usage_rows,
      count(DISTINCT tinder_profile_id)::int AS profiles,
      count(*) FILTER (
        WHERE has_noncanonical_raw_date_text
      )::bigint AS noncanonical_raw_date_text_rows,
      count(*) FILTER (
        WHERE timestamp_date <> raw_date
      )::bigint AS timestamp_raw_date_mismatch_rows,
      count(*) FILTER (
        WHERE timestamp_date = raw_date
      )::bigint AS timestamp_raw_date_match_rows,
      round(
        100.0 * count(*) FILTER (WHERE timestamp_date <> raw_date) /
          nullif(count(*), 0),
        6
      ) AS timestamp_raw_date_mismatch_percent,
      count(DISTINCT tinder_profile_id) FILTER (
        WHERE timestamp_date <> raw_date
      )::int AS profiles_with_timestamp_raw_date_mismatch,
      min(delta_days)::int AS minimum_delta_days,
      max(delta_days)::int AS maximum_delta_days,
      min(raw_date) AS first_raw_date,
      max(raw_date) AS last_raw_date
    FROM dated
    GROUP BY GROUPING SETS (
      (),
      (delta_days, timestamp_time)
    )
    ORDER BY
      grouping(delta_days, timestamp_time) DESC,
      delta_days NULLS LAST,
      timestamp_time
  `);

  const total = result.rows.find((row) => row.is_total === true);
  if (!total)
    throw new Error("Date serialization audit returned no total row.");

  return {
    summary: total,
    deltaDistribution: result.rows.filter((row) => row.is_total !== true),
  };
}

async function auditTinderCoreReconciliation(): Promise<{
  summary: AuditRow;
  examples: AuditRow[];
}> {
  const reconciliation = sql`
    WITH raw_all AS (
      SELECT
        u.tinder_profile_id,
        min(u.date_stamp_raw) AS first_usage_date,
        max(u.date_stamp_raw) AS last_usage_date,
        count(*)::int AS usage_rows,
        count(*) FILTER (
          WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
        )::int AS active_days,
        sum(u.swipe_likes)::bigint AS likes,
        sum(u.swipe_passes)::bigint AS passes,
        sum(u.matches)::bigint AS matches,
        sum(u.messages_sent)::bigint AS messages_sent,
        sum(u.messages_received)::bigint AS messages_received,
        sum(u.app_opens)::bigint AS app_opens
      FROM tinder_usage u
      JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
      WHERE p.computed = false
      GROUP BY u.tinder_profile_id
    ),
    raw_bounded AS (
      SELECT
        u.tinder_profile_id,
        count(*)::int AS bounded_usage_rows,
        count(*) FILTER (
          WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
        )::int AS bounded_active_days,
        sum(u.swipe_likes)::bigint AS bounded_likes,
        sum(u.swipe_passes)::bigint AS bounded_passes,
        sum(u.matches)::bigint AS bounded_matches,
        sum(u.messages_sent)::bigint AS bounded_messages_sent,
        sum(u.messages_received)::bigint AS bounded_messages_received,
        sum(u.app_opens)::bigint AS bounded_app_opens
      FROM tinder_usage u
      JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
      WHERE p.computed = false
        AND u.date_stamp >= p.first_day_on_app
        AND u.date_stamp <= p.last_day_on_app
      GROUP BY u.tinder_profile_id
    ),
    range_anomalies AS (
      SELECT
        p.tinder_id,
        count(*) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
        )::int AS usage_rows_before_profile_period,
        count(*) FILTER (
          WHERE u.date_stamp > p.last_day_on_app
        )::int AS usage_rows_after_profile_period,
        coalesce(sum(u.swipe_likes) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
             OR u.date_stamp > p.last_day_on_app
        ), 0)::bigint AS excluded_likes,
        coalesce(sum(u.swipe_passes) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
             OR u.date_stamp > p.last_day_on_app
        ), 0)::bigint AS excluded_passes,
        coalesce(sum(u.matches) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
             OR u.date_stamp > p.last_day_on_app
        ), 0)::bigint AS excluded_matches,
        coalesce(sum(u.messages_sent) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
             OR u.date_stamp > p.last_day_on_app
        ), 0)::bigint AS excluded_messages_sent,
        coalesce(sum(u.messages_received) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
             OR u.date_stamp > p.last_day_on_app
        ), 0)::bigint AS excluded_messages_received,
        coalesce(sum(u.app_opens) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
             OR u.date_stamp > p.last_day_on_app
        ), 0)::bigint AS excluded_app_opens,
        count(*) FILTER (
          WHERE (u.swipe_likes > 0 OR u.swipe_passes > 0)
            AND (
              u.date_stamp < p.first_day_on_app
              OR u.date_stamp > p.last_day_on_app
            )
        )::int AS excluded_active_days,
        max(p.first_day_on_app::date - u.date_stamp::date) FILTER (
          WHERE u.date_stamp < p.first_day_on_app
        )::int AS max_days_before_profile_period,
        max(u.date_stamp::date - p.last_day_on_app::date) FILTER (
          WHERE u.date_stamp > p.last_day_on_app
        )::int AS max_days_after_profile_period
      FROM tinder_profile p
      JOIN tinder_usage u ON u.tinder_profile_id = p.tinder_id
      WHERE p.computed = false
      GROUP BY p.tinder_id
    ),
    compared AS (
      SELECT
        p.tinder_id,
        p.updated_at AS profile_updated_at,
        p.first_day_on_app,
        p.last_day_on_app,
        r.tinder_profile_id AS raw_tinder_profile_id,
        r.first_usage_date,
        r.last_usage_date,
        r.usage_rows,
        r.active_days,
        r.likes,
        r.passes,
        r.matches,
        r.messages_sent,
        r.messages_received,
        r.app_opens,
        b.bounded_usage_rows,
        b.bounded_active_days,
        b.bounded_likes,
        b.bounded_passes,
        b.bounded_matches,
        b.bounded_messages_sent,
        b.bounded_messages_received,
        b.bounded_app_opens,
        coalesce(a.usage_rows_before_profile_period, 0)
          AS usage_rows_before_profile_period,
        coalesce(a.usage_rows_after_profile_period, 0)
          AS usage_rows_after_profile_period,
        coalesce(a.excluded_likes, 0) AS excluded_likes,
        coalesce(a.excluded_passes, 0) AS excluded_passes,
        coalesce(a.excluded_matches, 0) AS excluded_matches,
        coalesce(a.excluded_messages_sent, 0) AS excluded_messages_sent,
        coalesce(a.excluded_messages_received, 0)
          AS excluded_messages_received,
        coalesce(a.excluded_app_opens, 0) AS excluded_app_opens,
        coalesce(a.excluded_active_days, 0) AS excluded_active_days,
        a.max_days_before_profile_period,
        a.max_days_after_profile_period,
        m.id AS meta_id,
        m."from" AS meta_from,
        m."to" AS meta_to,
        m.computed_at,
        m.days_active AS meta_active_days,
        m.swipe_likes_total AS meta_likes,
        m.swipe_passes_total AS meta_passes,
        m.matches_total AS meta_matches,
        m.messages_sent_total AS meta_messages_sent,
        m.messages_received_total AS meta_messages_received,
        m.app_opens_total AS meta_app_opens
      FROM tinder_profile p
      LEFT JOIN raw_all r ON r.tinder_profile_id = p.tinder_id
      LEFT JOIN raw_bounded b ON b.tinder_profile_id = p.tinder_id
      LEFT JOIN range_anomalies a ON a.tinder_id = p.tinder_id
      LEFT JOIN profile_meta m
        ON m.tinder_profile_id = p.tinder_id
       AND m.hinge_profile_id IS NULL
      WHERE p.computed = false
    )
  `;

  const summaryResult = await db.execute<AuditRow>(sql`
    ${reconciliation}
    SELECT
      count(*)::int AS profiles,
      count(*) FILTER (WHERE meta_id IS NULL)::int AS missing_meta,
      count(*) FILTER (WHERE raw_tinder_profile_id IS NULL)::int
        AS missing_usage,
      count(*) FILTER (WHERE likes IS DISTINCT FROM meta_likes)::int
        AS all_usage_likes_mismatches,
      count(*) FILTER (WHERE passes IS DISTINCT FROM meta_passes)::int
        AS all_usage_passes_mismatches,
      count(*) FILTER (WHERE matches IS DISTINCT FROM meta_matches)::int
        AS all_usage_matches_mismatches,
      count(*) FILTER (
        WHERE messages_sent IS DISTINCT FROM meta_messages_sent
      )::int AS all_usage_messages_sent_mismatches,
      count(*) FILTER (
        WHERE messages_received IS DISTINCT FROM meta_messages_received
      )::int AS all_usage_messages_received_mismatches,
      count(*) FILTER (WHERE app_opens IS DISTINCT FROM meta_app_opens)::int
        AS all_usage_app_opens_mismatches,
      count(*) FILTER (
        WHERE active_days IS DISTINCT FROM meta_active_days
      )::int AS all_usage_active_days_mismatches,
      count(*) FILTER (
        WHERE likes IS DISTINCT FROM meta_likes
           OR passes IS DISTINCT FROM meta_passes
           OR matches IS DISTINCT FROM meta_matches
           OR messages_sent IS DISTINCT FROM meta_messages_sent
           OR messages_received IS DISTINCT FROM meta_messages_received
           OR app_opens IS DISTINCT FROM meta_app_opens
           OR active_days IS DISTINCT FROM meta_active_days
      )::int AS profiles_with_any_all_usage_core_mismatch,
      count(*) FILTER (
        WHERE bounded_likes IS DISTINCT FROM meta_likes
           OR bounded_passes IS DISTINCT FROM meta_passes
           OR bounded_matches IS DISTINCT FROM meta_matches
           OR bounded_messages_sent IS DISTINCT FROM meta_messages_sent
           OR bounded_messages_received IS DISTINCT FROM meta_messages_received
           OR bounded_app_opens IS DISTINCT FROM meta_app_opens
           OR bounded_active_days IS DISTINCT FROM meta_active_days
      )::int AS profiles_with_any_bounded_usage_core_mismatch,
      count(*) FILTER (
        WHERE usage_rows_before_profile_period > 0
           OR usage_rows_after_profile_period > 0
      )::int AS profiles_with_usage_outside_profile_period,
      sum(usage_rows_before_profile_period)::bigint
        AS usage_rows_before_profile_period,
      sum(usage_rows_after_profile_period)::bigint
        AS usage_rows_after_profile_period,
      sum(excluded_likes)::bigint AS excluded_likes,
      sum(excluded_passes)::bigint AS excluded_passes,
      sum(excluded_matches)::bigint AS excluded_matches,
      sum(excluded_messages_sent)::bigint AS excluded_messages_sent,
      sum(excluded_messages_received)::bigint AS excluded_messages_received,
      sum(excluded_app_opens)::bigint AS excluded_app_opens,
      sum(excluded_active_days)::bigint AS excluded_active_days,
      max(max_days_before_profile_period)::int
        AS max_days_before_profile_period,
      max(max_days_after_profile_period)::int AS max_days_after_profile_period,
      count(*) FILTER (
        WHERE meta_from::date IS DISTINCT FROM first_day_on_app::date
           OR meta_to::date IS DISTINCT FROM last_day_on_app::date
      )::int AS profile_period_mismatches,
      count(*) FILTER (
        WHERE profile_updated_at > computed_at + interval '1 second'
      )::int AS profile_updated_after_meta,
      count(*) FILTER (
        WHERE likes >= 1000 AND active_days >= 40
          AND NOT (meta_likes >= 1000 AND meta_active_days >= 40)
      )::int AS all_usage_only_all_time_eligible,
      count(*) FILTER (
        WHERE meta_likes >= 1000 AND meta_active_days >= 40
          AND NOT (likes >= 1000 AND active_days >= 40)
      )::int AS meta_only_vs_all_usage_all_time_eligible
    FROM compared
  `);

  const examplesResult = await db.execute<AuditRow>(sql`
    ${reconciliation}
    SELECT
      tinder_id,
      computed_at,
      profile_updated_at,
      first_day_on_app::date AS profile_start,
      last_day_on_app::date AS profile_end,
      likes AS all_likes,
      bounded_likes,
      meta_likes,
      matches AS all_matches,
      bounded_matches,
      meta_matches,
      active_days AS all_active_days,
      bounded_active_days,
      meta_active_days,
      usage_rows_before_profile_period,
      usage_rows_after_profile_period,
      excluded_likes,
      excluded_matches,
      max_days_before_profile_period,
      max_days_after_profile_period
    FROM compared
    WHERE likes IS DISTINCT FROM meta_likes
       OR passes IS DISTINCT FROM meta_passes
       OR matches IS DISTINCT FROM meta_matches
       OR messages_sent IS DISTINCT FROM meta_messages_sent
       OR messages_received IS DISTINCT FROM meta_messages_received
       OR app_opens IS DISTINCT FROM meta_app_opens
       OR active_days IS DISTINCT FROM meta_active_days
    ORDER BY
      excluded_likes + excluded_matches DESC
    LIMIT 10
  `);

  return {
    summary: summaryResult.rows[0] ?? {},
    examples: examplesResult.rows,
  };
}

/**
 * REVIEW(provider assumption): Tinder's export contains the uploader's own
 * messages. Cadence therefore means adjacent uploader-message gaps, not reply
 * latency. Tinder's numeric `to` is a provider-local match reference, not a
 * direction flag, so only missing or negative references are invalid here.
 */
export function buildTinderConversationReconciliationQuery(): SQL {
  return sql`
    WITH ordered_messages AS (
      SELECT
        source_match.id AS match_id,
        source_match.tinder_profile_id,
        message.sent_date,
        message."to",
        floor(extract(
          epoch FROM (
            message.sent_date - lag(message.sent_date) OVER (
              PARTITION BY source_match.id
              ORDER BY message.sent_date, message."order", message.id
            )
          )
        ))::bigint AS gap_seconds
      FROM match AS source_match
      JOIN message ON message.match_id = source_match.id
      WHERE source_match.tinder_profile_id IS NOT NULL
        AND source_match.hinge_profile_id IS NULL
    ),
    match_rows AS (
      SELECT
        m.id,
        m.tinder_profile_id,
        m.total_message_count,
        m.response_time_median_seconds,
        m.conversation_duration_days,
        count(msg.match_id)::int AS actual_message_rows,
        count(msg.match_id) FILTER (
          WHERE msg."to" IS NULL OR msg."to" < 0
        )::int AS invalid_message_reference_rows,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY msg.gap_seconds
          ) FILTER (WHERE msg.gap_seconds IS NOT NULL) + 0.5
        )::int AS derived_response_time_median_seconds,
        CASE
          WHEN count(msg.match_id) > 0 THEN floor(
            extract(epoch FROM (max(msg.sent_date) - min(msg.sent_date))) /
              86400
          )::int
          ELSE NULL
        END AS derived_conversation_duration_days
      FROM match m
      LEFT JOIN ordered_messages msg ON msg.match_id = m.id
      WHERE m.tinder_profile_id IS NOT NULL
        AND m.hinge_profile_id IS NULL
      GROUP BY m.id
    ),
    pooled_profile_gaps AS (
      SELECT
        tinder_profile_id,
        floor(avg(gap_seconds) + 0.5)::int AS mean_response_time_seconds
      FROM ordered_messages
      WHERE gap_seconds IS NOT NULL
      GROUP BY tinder_profile_id
    ),
    raw AS (
      SELECT
        matches.tinder_profile_id,
        count(*)::int AS conversation_count,
        count(*) FILTER (WHERE matches.actual_message_rows > 0)::int
          AS conversations_with_messages,
        count(*) FILTER (WHERE matches.actual_message_rows = 0)::int
          AS ghosted_count,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY matches.derived_response_time_median_seconds
          ) FILTER (
            WHERE matches.derived_response_time_median_seconds IS NOT NULL
          ) + 0.5
        )::int
          AS median_response_time_seconds,
        pooled.mean_response_time_seconds,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY matches.derived_conversation_duration_days
          ) FILTER (
            WHERE matches.derived_conversation_duration_days IS NOT NULL
          ) + 0.5
        )::int
          AS median_conversation_duration_days,
        max(matches.derived_conversation_duration_days) FILTER (
          WHERE matches.derived_conversation_duration_days IS NOT NULL
        )::int AS longest_conversation_days,
        avg(matches.actual_message_rows::double precision) FILTER (
          WHERE matches.actual_message_rows > 0
        )::double precision AS average_messages_per_conversation,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY matches.actual_message_rows
          ) FILTER (WHERE matches.actual_message_rows > 0) + 0.5
        )::int
          AS median_messages_per_conversation,
        count(*) FILTER (
          WHERE matches.actual_message_rows <> matches.total_message_count
        )::int AS matches_whose_message_rows_disagree_with_total,
        coalesce(sum(matches.invalid_message_reference_rows), 0)::int
          AS invalid_message_reference_rows
      FROM match_rows AS matches
      LEFT JOIN pooled_profile_gaps AS pooled
        ON pooled.tinder_profile_id = matches.tinder_profile_id
      GROUP BY matches.tinder_profile_id, pooled.mean_response_time_seconds
    ),
    compared AS (
      SELECT
        p.tinder_id,
        coalesce(r.conversation_count, 0) AS conversation_count,
        coalesce(r.conversations_with_messages, 0)
          AS conversations_with_messages,
        coalesce(r.ghosted_count, 0) AS ghosted_count,
        r.median_response_time_seconds,
        r.mean_response_time_seconds,
        r.median_conversation_duration_days,
        r.longest_conversation_days,
        r.average_messages_per_conversation,
        r.median_messages_per_conversation,
        coalesce(r.matches_whose_message_rows_disagree_with_total, 0)
          AS matches_whose_message_rows_disagree_with_total,
        coalesce(r.invalid_message_reference_rows, 0)
          AS invalid_message_reference_rows,
        m.conversation_count AS meta_conversation_count,
        m.conversations_with_messages AS meta_conversations_with_messages,
        m.ghosted_count AS meta_ghosted_count,
        m.average_response_time_seconds AS meta_median_response_time_seconds,
        m.mean_response_time_seconds AS meta_mean_response_time_seconds,
        m.median_conversation_duration_days
          AS meta_median_conversation_duration_days,
        m.longest_conversation_days AS meta_longest_conversation_days,
        m.average_messages_per_conversation
          AS meta_average_messages_per_conversation,
        m.median_messages_per_conversation
          AS meta_median_messages_per_conversation
      FROM tinder_profile p
      LEFT JOIN raw r ON r.tinder_profile_id = p.tinder_id
      LEFT JOIN profile_meta m
        ON m.tinder_profile_id = p.tinder_id
       AND m.hinge_profile_id IS NULL
      WHERE p.computed = false
    )
    SELECT
      count(*)::int AS profiles,
      count(*) FILTER (
        WHERE conversation_count IS DISTINCT FROM meta_conversation_count
      )::int AS conversation_count_mismatches,
      count(*) FILTER (
        WHERE conversations_with_messages IS DISTINCT FROM
          meta_conversations_with_messages
      )::int AS conversations_with_messages_mismatches,
      count(*) FILTER (
        WHERE ghosted_count IS DISTINCT FROM meta_ghosted_count
      )::int AS ghosted_count_mismatches,
      count(*) FILTER (
        WHERE median_response_time_seconds IS DISTINCT FROM
          meta_median_response_time_seconds
      )::int AS median_response_time_mismatches,
      count(*) FILTER (
        WHERE mean_response_time_seconds IS DISTINCT FROM
          meta_mean_response_time_seconds
      )::int AS mean_response_time_mismatches,
      count(*) FILTER (
        WHERE median_conversation_duration_days IS DISTINCT FROM
          meta_median_conversation_duration_days
      )::int AS median_conversation_duration_mismatches,
      count(*) FILTER (
        WHERE longest_conversation_days IS DISTINCT FROM
          meta_longest_conversation_days
      )::int AS longest_conversation_mismatches,
      count(*) FILTER (
        WHERE abs(
          coalesce(average_messages_per_conversation, 0) -
          coalesce(meta_average_messages_per_conversation, 0)
        ) > 1e-9
        OR (average_messages_per_conversation IS NULL) <>
          (meta_average_messages_per_conversation IS NULL)
      )::int AS average_messages_mismatches,
      count(*) FILTER (
        WHERE median_messages_per_conversation IS DISTINCT FROM
          meta_median_messages_per_conversation
      )::int AS median_messages_mismatches,
      coalesce(sum(matches_whose_message_rows_disagree_with_total), 0)::int
        AS matches_whose_message_rows_disagree_with_total,
      coalesce(sum(invalid_message_reference_rows), 0)::int
        AS invalid_message_reference_rows,
      (SELECT count(*)::int
       FROM match_rows
       WHERE response_time_median_seconds < 0)
        AS matches_with_negative_response_time,
      (SELECT count(*)::int
       FROM match_rows
       WHERE conversation_duration_days < 0)
        AS matches_with_negative_conversation_duration,
      (SELECT count(*)::int
       FROM profile_meta
       WHERE tinder_profile_id IS NOT NULL
         AND average_response_time_seconds < 0)
        AS profiles_with_negative_stored_response_time
    FROM compared
  `;
}

async function auditTinderConversationReconciliation(): Promise<AuditRow> {
  return one<AuditRow>(buildTinderConversationReconciliationQuery());
}

/**
 * REVIEW(provider assumption): Hinge chat rows are also uploader-authored
 * (`to = 1`). Explicit match origin wins, including UNKNOWN; legacy outbound
 * inference requires positive like evidence at or before the match timestamp.
 */
export function buildHingeCoreReconciliationQuery(): SQL {
  return sql`
    WITH event_times AS (
      SELECT interaction.hinge_profile_id, interaction.timestamp AS event_time
      FROM hinge_interaction AS interaction
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.matched_at
      FROM match AS source_match
      WHERE source_match.hinge_profile_id IS NOT NULL
        AND source_match.matched_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.liked_at
      FROM match AS source_match
      WHERE source_match.hinge_profile_id IS NOT NULL
        AND source_match.liked_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.initial_message_at
      FROM match AS source_match
      WHERE source_match.hinge_profile_id IS NOT NULL
        AND source_match.initial_message_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.last_message_at
      FROM match AS source_match
      WHERE source_match.hinge_profile_id IS NOT NULL
        AND source_match.last_message_at IS NOT NULL
      UNION ALL
      SELECT
        source_match.hinge_profile_id,
        (source_match.we_met ->> 'timestamp')::timestamptz
          AT TIME ZONE 'UTC'
      FROM match AS source_match
      WHERE source_match.hinge_profile_id IS NOT NULL
        AND source_match.we_met IS NOT NULL
        AND pg_input_is_valid(
          source_match.we_met ->> 'timestamp',
          'timestamp with time zone'
        )
    ),
    profile_bounds AS (
      SELECT
        profile.hinge_id,
        least(
          coalesce(profile.first_account_create_date, profile.create_date),
          coalesce(
            min(events.event_time),
            coalesce(profile.first_account_create_date, profile.create_date)
          )
        ) AS first_activity,
        greatest(
          profile.create_date,
          coalesce(profile.last_seen_at, profile.create_date),
          coalesce(max(events.event_time), profile.create_date)
        ) AS last_activity
      FROM hinge_profile AS profile
      LEFT JOIN event_times AS events
        ON events.hinge_profile_id = profile.hinge_id
      GROUP BY
        profile.hinge_id,
        profile.create_date,
        profile.first_account_create_date,
        profile.last_seen_at
    ),
    interaction_totals AS (
      SELECT
        hinge_profile_id,
        count(*) FILTER (WHERE type = 'LIKE_SENT')::int AS likes_sent,
        count(DISTINCT (timestamp AT TIME ZONE 'UTC')::date)
          FILTER (WHERE type = 'LIKE_SENT')::int AS active_like_days
      FROM hinge_interaction
      GROUP BY hinge_profile_id
    ),
    explicit_origins AS (
      SELECT
        hinge_profile_id,
        match_id,
        count(DISTINCT thread_origin) FILTER (
          WHERE thread_origin IN (
            'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
          )
        )::int AS explicit_origin_count,
        CASE
          WHEN count(DISTINCT thread_origin) FILTER (
            WHERE thread_origin IN (
              'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
            )
          ) = 1
          THEN min(thread_origin) FILTER (
            WHERE thread_origin IN (
              'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
            )
          )
          ELSE NULL
        END AS thread_origin
      FROM hinge_interaction
      WHERE type = 'MATCH' AND match_id IS NOT NULL
      GROUP BY hinge_profile_id, match_id
    ),
    linked_outbound AS (
      SELECT DISTINCT interaction.hinge_profile_id, interaction.match_id
      FROM hinge_interaction AS interaction
      JOIN match AS source_match ON source_match.id = interaction.match_id
      WHERE interaction.type = 'LIKE_SENT'
        AND interaction.match_id IS NOT NULL
        AND (
          source_match.matched_at IS NULL
          OR interaction.timestamp <= source_match.matched_at
        )
    ),
    match_classification AS (
      SELECT
        source_match.hinge_profile_id,
        source_match.id,
        CASE
          WHEN origin.explicit_origin_count = 1 THEN origin.thread_origin
          WHEN origin.explicit_origin_count > 1 THEN 'UNKNOWN'
          WHEN linked.match_id IS NOT NULL
            OR (
              source_match.liked_at IS NOT NULL
              AND (
                source_match.matched_at IS NULL
                OR source_match.liked_at <= source_match.matched_at
              )
            ) THEN 'OUTBOUND_LIKE'
          ELSE 'UNKNOWN'
        END AS derived_origin
      FROM match AS source_match
      LEFT JOIN explicit_origins AS origin
        ON origin.hinge_profile_id = source_match.hinge_profile_id
       AND origin.match_id = source_match.id
      LEFT JOIN linked_outbound AS linked
        ON linked.hinge_profile_id = source_match.hinge_profile_id
       AND linked.match_id = source_match.id
      WHERE source_match.hinge_profile_id IS NOT NULL
    ),
    match_counts AS (
      SELECT
        hinge_profile_id,
        count(*)::int AS matches,
        count(*) FILTER (
          WHERE derived_origin = 'OUTBOUND_LIKE'
        )::int AS outbound_matches,
        count(*) FILTER (
          WHERE derived_origin = 'INBOUND_LIKE'
        )::int AS inbound_matches,
        count(*) FILTER (
          WHERE derived_origin = 'UNKNOWN'
        )::int AS unknown_origin_matches
      FROM match_classification
      GROUP BY hinge_profile_id
    ),
    message_counts AS (
      SELECT
        source_match.hinge_profile_id,
        count(message.id) FILTER (WHERE message."to" = 1)::int
          AS messages_sent,
        count(message.id) FILTER (
          WHERE message."to" IS DISTINCT FROM 1
        )::int AS non_outgoing_message_rows,
        count(message.id) FILTER (
          WHERE message.hinge_profile_id IS DISTINCT FROM
            source_match.hinge_profile_id
        )::int AS message_provider_link_mismatches
      FROM match AS source_match
      JOIN message ON message.match_id = source_match.id
      WHERE source_match.hinge_profile_id IS NOT NULL
      GROUP BY source_match.hinge_profile_id
    ),
    compared AS (
      SELECT
        p.hinge_id,
        p.create_date,
        p.first_account_create_date,
        coalesce(i.likes_sent, 0) AS likes_sent,
        coalesce(i.active_like_days, 0) AS active_like_days,
        coalesce(mc.matches, 0) AS matches,
        coalesce(mc.outbound_matches, 0) AS outbound_matches,
        coalesce(mc.inbound_matches, 0) AS inbound_matches,
        coalesce(mc.unknown_origin_matches, 0) AS unknown_origin_matches,
        coalesce(msg.messages_sent, 0) AS messages_sent,
        coalesce(msg.non_outgoing_message_rows, 0)
          AS non_outgoing_message_rows,
        coalesce(msg.message_provider_link_mismatches, 0)
          AS message_provider_link_mismatches,
        bounds.first_activity AS expected_from,
        bounds.last_activity AS expected_to,
        greatest(
          1,
          (bounds.last_activity::date - bounds.first_activity::date) + 1
        )::int AS expected_days_in_period,
        CASE
          WHEN coalesce(i.likes_sent, 0) = 0 THEN 0
          ELSE coalesce(mc.outbound_matches, 0)::double precision /
            i.likes_sent
        END AS expected_match_rate,
        CASE WHEN coalesce(i.likes_sent, 0) > 0 THEN 1 ELSE 0 END
          AS expected_like_rate,
        CASE
          WHEN coalesce(i.active_like_days, 0) > 0
            THEN i.likes_sent::double precision / i.active_like_days
          ELSE 0
        END AS expected_swipes_per_day,
        m.*
      FROM hinge_profile p
      JOIN profile_bounds bounds ON bounds.hinge_id = p.hinge_id
      LEFT JOIN interaction_totals i ON i.hinge_profile_id = p.hinge_id
      LEFT JOIN match_counts mc ON mc.hinge_profile_id = p.hinge_id
      LEFT JOIN message_counts msg ON msg.hinge_profile_id = p.hinge_id
      LEFT JOIN profile_meta m
        ON m.hinge_profile_id = p.hinge_id
       AND m.tinder_profile_id IS NULL
    )
    SELECT
      count(*)::int AS profiles,
      count(*) FILTER (WHERE id IS NULL)::int AS missing_meta,
      count(*) FILTER (
        WHERE likes_sent IS DISTINCT FROM swipe_likes_total
      )::int AS likes_mismatches,
      count(*) FILTER (
        WHERE matches IS DISTINCT FROM matches_total
      )::int AS matches_mismatches,
      count(*) FILTER (
        WHERE messages_sent IS DISTINCT FROM messages_sent_total
      )::int AS messages_sent_mismatches,
      count(*) FILTER (
        WHERE abs(expected_match_rate - match_rate) > 1e-12
      )::int AS match_rate_mismatches,
      count(*) FILTER (
        WHERE abs(expected_like_rate - like_rate) > 1e-12
      )::int AS like_rate_mismatches,
      count(*) FILTER (
        WHERE active_like_days IS DISTINCT FROM days_active
      )::int AS active_day_mismatches,
      count(*) FILTER (
        WHERE expected_from IS DISTINCT FROM "from"
           OR expected_to IS DISTINCT FROM "to"
           OR expected_days_in_period IS DISTINCT FROM days_in_period
      )::int AS profile_period_mismatches,
      count(*) FILTER (
        WHERE first_account_create_date > create_date
      )::int AS invalid_account_signup_order,
      count(*) FILTER (
        WHERE abs(expected_swipes_per_day - swipes_per_day) > 1e-12
      )::int AS swipes_per_day_mismatches,
      coalesce(sum(outbound_matches), 0)::int AS outbound_matches,
      coalesce(sum(inbound_matches), 0)::int AS inbound_matches,
      coalesce(sum(unknown_origin_matches), 0)::int
        AS unknown_origin_matches,
      coalesce(sum(non_outgoing_message_rows), 0)::int
        AS non_outgoing_message_rows,
      coalesce(sum(message_provider_link_mismatches), 0)::int
        AS message_provider_link_mismatches,
      count(*) FILTER (
        WHERE swipe_passes_total <> 0
           OR messages_received_total <> 0
           OR app_opens_total <> 0
      )::int AS hinge_capability_placeholder_mismatches
    FROM compared
  `;
}

async function auditHingeCoreReconciliation(): Promise<AuditRow> {
  return one<AuditRow>(buildHingeCoreReconciliationQuery());
}

function printHuman(result: Record<string, unknown>): void {
  printHeading("Profile meta inventory");
  printRows(Object.entries(result.inventory as Record<string, unknown>));

  printHeading("Grain and coverage");
  printRows(Object.entries(result.grainAndCoverage as Record<string, unknown>));

  printHeading("Stored domain rules");
  printRows(Object.entries(result.domainRules as Record<string, unknown>));

  printHeading("Tinder identity provenance");
  printRows(
    Object.entries(result.tinderIdentityProvenance as Record<string, unknown>),
  );

  const dateSerialization = result.tinderDateSerialization as {
    summary: Record<string, unknown>;
    deltaDistribution: AuditRow[];
  };
  printHeading("Tinder date serialization");
  printRows(Object.entries(dateSerialization.summary));
  console.log("\nDelta-day and stored-time distribution:");
  console.table(dateSerialization.deltaDistribution);

  const tinder = result.tinderCore as {
    summary: Record<string, unknown>;
    examples: AuditRow[];
  };
  printHeading("Tinder raw-usage reconciliation");
  printRows(Object.entries(tinder.summary));
  if (tinder.examples.length > 0) {
    console.log("\nLargest mismatches:");
    console.table(tinder.examples);
  }

  printHeading("Tinder conversation reconciliation");
  printRows(
    Object.entries(result.tinderConversations as Record<string, unknown>),
  );

  printHeading("Hinge core reconciliation");
  printRows(Object.entries(result.hingeCore as Record<string, unknown>));

  console.log(
    "\nAll queries were read-only. Use --json for a machine-readable audit artifact.",
  );
}

async function main(): Promise<void> {
  const skipConversations = hasFlag("--skip-conversations");
  const [
    inventory,
    grainAndCoverage,
    domainRules,
    tinderIdentityProvenance,
    tinderDateSerialization,
    tinderCore,
    hingeCore,
  ] = await Promise.all([
    auditInventory(),
    auditGrainAndCoverage(),
    auditDomainRules(),
    auditTinderIdentityProvenance(),
    auditTinderDateSerialization(),
    auditTinderCoreReconciliation(),
    auditHingeCoreReconciliation(),
  ]);

  const tinderConversations = skipConversations
    ? { skipped: true }
    : await auditTinderConversationReconciliation();

  const result = {
    auditVersion: "profile-meta-audit-v3",
    inventory,
    grainAndCoverage,
    domainRules,
    tinderIdentityProvenance,
    tinderDateSerialization,
    tinderCore,
    tinderConversations,
    hingeCore,
    notes: {
      expectedGrain:
        "One current all-time profile_meta row per Tinder or Hinge profile.",
      tinderCoreBoundary:
        "Bounded reconciliation mirrors the current profile date filter. All-usage reconciliation exposes valid stored rows outside that range.",
      canonicalPeriodDate:
        "Calendar period facts and SwipeRank boundaries must use date_stamp_raw (or its parsed calendar-date prefix), not date_stamp::date. A small legacy subset stores an ISO timestamp string in date_stamp_raw, but its first ten characters retain the source calendar day.",
      legacyTimestampFiltering:
        "When reproducing legacy profile_meta behavior, compare date_stamp directly with the timestamp-valued first_day_on_app and last_day_on_app. Mixing a date_stamp_raw boundary with one side of that legacy timestamp filter changes inclusion semantics.",
      dateSerializationInterpretation:
        "The observed -1-day rows are stored at 22:00 or 23:00 on the preceding date, consistent with timezone and daylight-saving serialization. A date_stamp::date versus date_stamp_raw::date mismatch is not evidence that the provider calendar date is corrupt unless a separate source invariant fails.",
      rayaCoverage:
        "profile_meta has no Raya foreign key; Raya is intentionally inventoried but cannot be reconciled here.",
      tinderConversationSemantics:
        "The Tinder export path observes uploader-authored messages, so response-time fields are uploader-message gap statistics, not reply times. Tinder message.to is a match reference, not direction.",
      tinderCreateDateProvenance:
        "New uploads distinguish provider signup timestamps from earliest-usage inference. Legacy null provenance is intentionally retained because equality with first observed activity is not enough evidence to backfill the source.",
      tinderAgeInterpretation:
        "Below-13 and over-100 derived ages are reported as implausible source identity. Ages from 13 through 17 are reported separately: historical Tinder exports can include teen-era activity, and later rows can reflect provider policy or identity inconsistencies, so the audit must not relabel them as mathematical corruption.",
      tinderMergedAccountChronology:
        "A profile can retain activity before its current create_date after an explicit cross-account absorption. The audit reports earlier calendar days for review rather than treating them as automatic corruption.",
      pooledCadenceSemantics:
        "Mean response time is the message-weighted mean across every adjacent outgoing-message gap, while average response time is the conversation-weighted median of per-conversation medians.",
      hingeOriginSemantics:
        "An explicit UNKNOWN origin remains unknown. Legacy linked likes and liked_at classify a match as outbound only when their timestamp is at or before matched_at.",
      hingeMessageDirectionSemantics:
        "Hinge GDPR chat rows are expected to be outgoing (to = 1). Non-outgoing or provider-link-inconsistent rows are reported separately and excluded from messages_sent_total reconciliation.",
    },
  };

  if (hasFlag("--json")) printJson(result);
  else printHuman(result);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
