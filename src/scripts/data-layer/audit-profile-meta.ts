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
          WHEN swipe_likes_total + swipe_passes_total > 0
            THEN swipe_likes_total::double precision /
              (swipe_likes_total + swipe_passes_total)
          ELSE 0
        END AS expected_like_rate,
        CASE
          WHEN swipe_likes_total > 0
            THEN matches_total::double precision / swipe_likes_total
          ELSE 0
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
        WHERE abs(match_rate - expected_match_rate) > 1e-12
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
          AND abs(match_rate - expected_match_rate) > 1e-12
      )::int AS tinder_match_rate_formula_mismatches,
      count(*) FILTER (
        WHERE hinge_profile_id IS NOT NULL
          AND abs(match_rate - expected_match_rate) > 1e-12
      )::int AS hinge_match_rate_formula_mismatches,
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

async function auditTinderConversationReconciliation(): Promise<AuditRow> {
  return one<AuditRow>(sql`
    WITH match_rows AS (
      SELECT
        m.id,
        m.tinder_profile_id,
        m.total_message_count,
        m.response_time_median_seconds,
        m.conversation_duration_days,
        count(msg.id)::int AS actual_message_rows
      FROM match m
      LEFT JOIN message msg ON msg.match_id = m.id
      WHERE m.tinder_profile_id IS NOT NULL
      GROUP BY m.id
    ),
    raw AS (
      SELECT
        tinder_profile_id,
        count(*)::int AS conversation_count,
        count(*) FILTER (WHERE actual_message_rows > 0)::int
          AS conversations_with_messages,
        count(*) FILTER (WHERE actual_message_rows = 0)::int AS ghosted_count,
        round(percentile_cont(0.5) WITHIN GROUP (
          ORDER BY response_time_median_seconds
        ) FILTER (WHERE response_time_median_seconds IS NOT NULL))::int
          AS median_response_time_seconds,
        round(avg(response_time_median_seconds) FILTER (
          WHERE response_time_median_seconds IS NOT NULL
        ))::int AS mean_response_time_seconds,
        round(percentile_cont(0.5) WITHIN GROUP (
          ORDER BY conversation_duration_days
        ) FILTER (WHERE conversation_duration_days > 0))::int
          AS median_conversation_duration_days,
        max(conversation_duration_days) FILTER (
          WHERE conversation_duration_days > 0
        )::int AS longest_conversation_days,
        avg(total_message_count) FILTER (
          WHERE actual_message_rows > 0
        )::double precision AS average_messages_per_conversation,
        round(percentile_cont(0.5) WITHIN GROUP (
          ORDER BY total_message_count
        ) FILTER (WHERE actual_message_rows > 0))::int
          AS median_messages_per_conversation,
        count(*) FILTER (
          WHERE actual_message_rows <> total_message_count
        )::int AS matches_whose_message_rows_disagree_with_total
      FROM match_rows
      GROUP BY tinder_profile_id
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
      LEFT JOIN profile_meta m ON m.tinder_profile_id = p.tinder_id
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
  `);
}

async function auditHingeCoreReconciliation(): Promise<AuditRow> {
  return one<AuditRow>(sql`
    WITH interactions AS (
      SELECT
        hinge_profile_id,
        count(*) FILTER (WHERE type = 'LIKE_SENT')::int AS likes_sent,
        count(*) FILTER (WHERE type = 'MATCH')::int AS match_interactions,
        count(*) FILTER (
          WHERE type = 'MATCH' AND thread_origin = 'OUTBOUND_LIKE'
        )::int AS outbound_like_matches,
        bool_or(type = 'MATCH' AND thread_origin IS NOT NULL)
          AS has_classified_match_origins
      FROM hinge_interaction
      GROUP BY hinge_profile_id
    ),
    match_counts AS (
      SELECT hinge_profile_id, count(*)::int AS matches
      FROM match
      WHERE hinge_profile_id IS NOT NULL
      GROUP BY hinge_profile_id
    ),
    message_counts AS (
      SELECT hinge_profile_id,
        count(*) FILTER (WHERE "to" = 1)::int AS messages_sent
      FROM message
      WHERE hinge_profile_id IS NOT NULL
      GROUP BY hinge_profile_id
    ),
    compared AS (
      SELECT
        p.hinge_id,
        coalesce(i.likes_sent, 0) AS likes_sent,
        coalesce(mc.matches, 0) AS matches,
        coalesce(msg.messages_sent, 0) AS messages_sent,
        CASE
          WHEN coalesce(i.likes_sent, 0) = 0 THEN 0
          WHEN coalesce(i.has_classified_match_origins, false)
            THEN coalesce(i.outbound_like_matches, 0)::double precision /
              i.likes_sent
          ELSE coalesce(mc.matches, 0)::double precision / i.likes_sent
        END AS expected_match_rate,
        m.*
      FROM hinge_profile p
      LEFT JOIN interactions i ON i.hinge_profile_id = p.hinge_id
      LEFT JOIN match_counts mc ON mc.hinge_profile_id = p.hinge_id
      LEFT JOIN message_counts msg ON msg.hinge_profile_id = p.hinge_id
      LEFT JOIN profile_meta m ON m.hinge_profile_id = p.hinge_id
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
        WHERE swipe_passes_total <> 0
           OR messages_received_total <> 0
           OR app_opens_total <> 0
           OR days_active <> 0
           OR like_rate <> 1
      )::int AS hinge_capability_placeholder_mismatches
    FROM compared
  `);
}

function printHuman(result: Record<string, unknown>): void {
  printHeading("Profile meta inventory");
  printRows(Object.entries(result.inventory as Record<string, unknown>));

  printHeading("Grain and coverage");
  printRows(Object.entries(result.grainAndCoverage as Record<string, unknown>));

  printHeading("Stored domain rules");
  printRows(Object.entries(result.domainRules as Record<string, unknown>));

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
    tinderDateSerialization,
    tinderCore,
    hingeCore,
  ] = await Promise.all([
    auditInventory(),
    auditGrainAndCoverage(),
    auditDomainRules(),
    auditTinderDateSerialization(),
    auditTinderCoreReconciliation(),
    auditHingeCoreReconciliation(),
  ]);

  const tinderConversations = skipConversations
    ? { skipped: true }
    : await auditTinderConversationReconciliation();

  const result = {
    auditVersion: "profile-meta-audit-v2",
    inventory,
    grainAndCoverage,
    domainRules,
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
        "The Tinder export path observes outgoing messages, so response-time fields are outgoing-message gap statistics, not reply times.",
    },
  };

  if (hasFlag("--json")) printJson(result);
  else printHuman(result);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
