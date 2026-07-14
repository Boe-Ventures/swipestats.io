import { sql, type SQL } from "drizzle-orm";

import { db, withTransaction, type TransactionClient } from "@/server/db";
import { lockTinderSwipeRankMutationsInTx } from "@/server/services/swipe-rank/lifecycle.service";

import {
  getFlagValue,
  hasFlag,
  printHeading,
  printJson,
  printRows,
} from "./utils";

type AuditRow = Record<string, unknown>;

function profileFilter(tinderId: string | null, alias: SQL): SQL {
  return tinderId ? sql`AND ${alias} = ${tinderId}` : sql``;
}

async function audit(tinderId: string | null): Promise<AuditRow> {
  const result = await db.execute<AuditRow>(sql`
    WITH selected_profiles AS (
      SELECT profile.*
      FROM tinder_profile AS profile
      WHERE profile.computed = false
        ${profileFilter(tinderId, sql`profile.tinder_id`)}
    ),
    raw AS (
      SELECT
        source_profile.tinder_id AS tinder_profile_id,
        min(usage.date_stamp) AS first_day,
        max(usage.date_stamp) AS last_day,
        count(*) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        coalesce(sum(usage.swipe_likes), 0)::bigint AS likes,
        coalesce(sum(usage.swipe_passes), 0)::bigint AS passes,
        coalesce(sum(usage.matches), 0)::bigint AS matches,
        coalesce(sum(usage.messages_sent), 0)::bigint AS messages_sent,
        coalesce(sum(usage.messages_received), 0)::bigint
          AS messages_received,
        coalesce(sum(usage.app_opens), 0)::bigint AS app_opens
      FROM selected_profiles AS source_profile
      LEFT JOIN tinder_usage AS usage
        ON usage.tinder_profile_id = source_profile.tinder_id
      GROUP BY source_profile.tinder_id
    )
    SELECT
      count(*)::int AS profiles,
      count(*) FILTER (
        WHERE (raw.first_day IS NOT NULL AND
               raw.first_day < profile.first_day_on_app)
           OR (raw.last_day IS NOT NULL AND
               raw.last_day > profile.last_day_on_app)
      )::int AS profile_range_mismatches,
      count(*) FILTER (
        WHERE meta.id IS NOT NULL
          AND (
            meta."from" <>
              least(
                profile.first_day_on_app,
                coalesce(raw.first_day, profile.first_day_on_app)
              )
           OR meta."to" <>
              greatest(
                profile.last_day_on_app,
                coalesce(raw.last_day, profile.last_day_on_app)
              )
           OR meta.days_active <> raw.active_days
           OR meta.swipe_likes_total <> raw.likes
           OR meta.swipe_passes_total <> raw.passes
           OR meta.matches_total <> raw.matches
           OR meta.messages_sent_total <> raw.messages_sent
           OR meta.messages_received_total <> raw.messages_received
           OR meta.app_opens_total <> raw.app_opens
          )
      )::int AS meta_core_mismatches,
      count(*) FILTER (WHERE meta.id IS NULL)::int AS missing_meta
    FROM raw
    JOIN selected_profiles AS profile
      ON profile.tinder_id = raw.tinder_profile_id
    LEFT JOIN profile_meta AS meta
      ON meta.tinder_profile_id = raw.tinder_profile_id
     AND meta.hinge_profile_id IS NULL
  `);
  return result.rows[0] ?? {};
}

export async function applyProfileMetaRepair(
  tx: TransactionClient,
  tinderId: string | null,
): Promise<void> {
  await lockTinderSwipeRankMutationsInTx(tx);

  await tx.execute(sql`
    WITH selected_profiles AS (
      SELECT profile.tinder_id
      FROM tinder_profile AS profile
      WHERE profile.computed = false
        ${profileFilter(tinderId, sql`profile.tinder_id`)}
    ),
    bounds AS (
      SELECT
        source_profile.tinder_id AS tinder_profile_id,
        min(usage.date_stamp) AS first_day,
        max(usage.date_stamp) AS last_day
      FROM selected_profiles AS source_profile
      LEFT JOIN tinder_usage AS usage
        ON usage.tinder_profile_id = source_profile.tinder_id
      GROUP BY source_profile.tinder_id
    )
    UPDATE tinder_profile AS profile
    SET
      first_day_on_app = least(
        profile.first_day_on_app,
        coalesce(bounds.first_day, profile.first_day_on_app)
      ),
      last_day_on_app = greatest(
        profile.last_day_on_app,
        coalesce(bounds.last_day, profile.last_day_on_app)
      ),
      days_in_profile_period =
        (
          greatest(
            profile.last_day_on_app::date,
            coalesce(bounds.last_day::date, profile.last_day_on_app::date)
          ) -
          least(
            profile.first_day_on_app::date,
            coalesce(bounds.first_day::date, profile.first_day_on_app::date)
          )
        ) + 1,
      age_at_last_usage = extract(
        year FROM age(
          greatest(
            profile.last_day_on_app::date,
            coalesce(bounds.last_day::date, profile.last_day_on_app::date)
          ),
          profile.birth_date
        )
      )::int,
      updated_at = now()
    FROM bounds
    WHERE profile.tinder_id = bounds.tinder_profile_id
  `);

  // Missing rows need the complete non-null contract. Conversation fields are
  // reconstructed from match/message relations with the same all-time rules as
  // computeProfileMeta(); existing rows retain their conversation aggregates.
  await tx.execute(sql`
    WITH selected_profiles AS (
      SELECT profile.*
      FROM tinder_profile AS profile
      WHERE profile.computed = false
        ${profileFilter(tinderId, sql`profile.tinder_id`)}
    ),
    usage_aggregate AS (
      SELECT
        source_profile.tinder_id,
        least(
          source_profile.first_day_on_app,
          coalesce(
            min(usage.date_stamp),
            source_profile.first_day_on_app
          )
        ) AS first_day,
        greatest(
          source_profile.last_day_on_app,
          coalesce(
            max(usage.date_stamp),
            source_profile.last_day_on_app
          )
        ) AS last_day,
        count(*) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        coalesce(sum(usage.swipe_likes), 0)::int AS likes,
        coalesce(sum(usage.swipe_passes), 0)::int AS passes,
        coalesce(sum(usage.matches), 0)::int AS matches,
        coalesce(sum(usage.messages_sent), 0)::int AS messages_sent,
        coalesce(sum(usage.messages_received), 0)::int
          AS messages_received,
        coalesce(sum(usage.app_opens), 0)::int AS app_opens
      FROM selected_profiles AS source_profile
      LEFT JOIN tinder_usage AS usage
        ON usage.tinder_profile_id = source_profile.tinder_id
      GROUP BY
        source_profile.tinder_id,
        source_profile.first_day_on_app,
        source_profile.last_day_on_app
    ),
    conversation_rows AS (
      SELECT
        source_profile.tinder_id,
        conversation.id AS match_id,
        conversation.response_time_median_seconds,
        conversation.conversation_duration_days,
        conversation.total_message_count,
        EXISTS (
          SELECT 1
          FROM message
          WHERE message.match_id = conversation.id
        ) AS has_messages
      FROM selected_profiles AS source_profile
      LEFT JOIN match AS conversation
        ON conversation.tinder_profile_id = source_profile.tinder_id
    ),
    conversation_aggregate AS (
      SELECT
        tinder_id,
        count(match_id)::int AS conversation_count,
        count(match_id) FILTER (WHERE has_messages)::int
          AS conversations_with_messages,
        count(match_id) FILTER (WHERE NOT has_messages)::int AS ghosted_count,
        round(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY response_time_median_seconds
          ) FILTER (WHERE response_time_median_seconds IS NOT NULL)
        )::int AS average_response_time_seconds,
        round(
          avg(response_time_median_seconds) FILTER (
            WHERE response_time_median_seconds IS NOT NULL
          )
        )::int AS mean_response_time_seconds,
        round(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY conversation_duration_days
          ) FILTER (WHERE conversation_duration_days > 0)
        )::int AS median_conversation_duration_days,
        max(conversation_duration_days) FILTER (
          WHERE conversation_duration_days > 0
        )::int AS longest_conversation_days,
        avg(total_message_count::double precision) FILTER (
          WHERE has_messages
        ) AS average_messages_per_conversation,
        round(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY total_message_count
          ) FILTER (WHERE has_messages)
        )::int AS median_messages_per_conversation
      FROM conversation_rows
      GROUP BY tinder_id
    )
    INSERT INTO profile_meta (
      id,
      tinder_profile_id,
      hinge_profile_id,
      "from",
      "to",
      days_in_period,
      days_active,
      swipe_likes_total,
      swipe_passes_total,
      matches_total,
      messages_sent_total,
      messages_received_total,
      app_opens_total,
      like_rate,
      match_rate,
      swipes_per_day,
      conversation_count,
      conversations_with_messages,
      ghosted_count,
      average_response_time_seconds,
      mean_response_time_seconds,
      median_conversation_duration_days,
      longest_conversation_days,
      average_messages_per_conversation,
      median_messages_per_conversation,
      computed_at
    )
    SELECT
      'pmeta_' || md5('TINDER:' || usage.tinder_id),
      usage.tinder_id,
      NULL,
      usage.first_day,
      usage.last_day,
      (usage.last_day::date - usage.first_day::date) + 1,
      usage.active_days,
      usage.likes,
      usage.passes,
      usage.matches,
      usage.messages_sent,
      usage.messages_received,
      usage.app_opens,
      CASE
        WHEN usage.likes + usage.passes > 0
          THEN usage.likes::double precision /
            (usage.likes + usage.passes)
        ELSE 0
      END,
      CASE
        WHEN usage.likes > 0
          THEN usage.matches::double precision / usage.likes
        ELSE 0
      END,
      CASE
        WHEN usage.active_days > 0
          THEN (usage.likes + usage.passes)::double precision /
            usage.active_days
        ELSE 0
      END,
      conversation.conversation_count,
      conversation.conversations_with_messages,
      conversation.ghosted_count,
      conversation.average_response_time_seconds,
      conversation.mean_response_time_seconds,
      conversation.median_conversation_duration_days,
      conversation.longest_conversation_days,
      conversation.average_messages_per_conversation,
      conversation.median_messages_per_conversation,
      now()
    FROM usage_aggregate AS usage
    JOIN conversation_aggregate AS conversation
      ON conversation.tinder_id = usage.tinder_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM profile_meta AS existing
      WHERE existing.tinder_profile_id = usage.tinder_id
        AND existing.hinge_profile_id IS NULL
    )
    ON CONFLICT (id) DO NOTHING
  `);

  await tx.execute(sql`
    WITH selected_profiles AS (
      SELECT profile.*
      FROM tinder_profile AS profile
      WHERE profile.computed = false
        ${profileFilter(tinderId, sql`profile.tinder_id`)}
    ),
    aggregate AS (
      SELECT
        source_profile.tinder_id AS tinder_profile_id,
        source_profile.first_day_on_app AS profile_first_day,
        source_profile.last_day_on_app AS profile_last_day,
        min(usage.date_stamp) AS first_day,
        max(usage.date_stamp) AS last_day,
        count(*) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        coalesce(sum(usage.swipe_likes), 0)::bigint AS likes,
        coalesce(sum(usage.swipe_passes), 0)::bigint AS passes,
        coalesce(sum(usage.matches), 0)::bigint AS matches,
        coalesce(sum(usage.messages_sent), 0)::bigint AS messages_sent,
        coalesce(sum(usage.messages_received), 0)::bigint
          AS messages_received,
        coalesce(sum(usage.app_opens), 0)::bigint AS app_opens
      FROM selected_profiles AS source_profile
      LEFT JOIN tinder_usage AS usage
        ON usage.tinder_profile_id = source_profile.tinder_id
      GROUP BY
        source_profile.tinder_id,
        source_profile.first_day_on_app,
        source_profile.last_day_on_app
    )
    UPDATE profile_meta AS meta
    SET
      "from" = least(aggregate.profile_first_day, aggregate.first_day),
      "to" = greatest(aggregate.profile_last_day, aggregate.last_day),
      days_in_period =
        (
          greatest(
            aggregate.profile_last_day::date,
            aggregate.last_day::date
          ) -
          least(
            aggregate.profile_first_day::date,
            aggregate.first_day::date
          )
        ) + 1,
      days_active = aggregate.active_days,
      swipe_likes_total = aggregate.likes,
      swipe_passes_total = aggregate.passes,
      matches_total = aggregate.matches,
      messages_sent_total = aggregate.messages_sent,
      messages_received_total = aggregate.messages_received,
      app_opens_total = aggregate.app_opens,
      like_rate = CASE
        WHEN aggregate.likes + aggregate.passes > 0
          THEN aggregate.likes::double precision /
            (aggregate.likes + aggregate.passes)
        ELSE 0
      END,
      match_rate = CASE
        WHEN aggregate.likes > 0
          THEN aggregate.matches::double precision / aggregate.likes
        ELSE 0
      END,
      swipes_per_day = CASE
        WHEN aggregate.active_days > 0
          THEN (aggregate.likes + aggregate.passes)::double precision /
            aggregate.active_days
        ELSE 0
      END,
      computed_at = now()
    FROM aggregate
    WHERE meta.tinder_profile_id = aggregate.tinder_profile_id
      AND meta.hinge_profile_id IS NULL
  `);
}

async function main(): Promise<void> {
  const tinderId = getFlagValue("--tinder-id");
  const before = await audit(tinderId);
  const shouldApply = hasFlag("--apply");

  if (shouldApply) {
    await withTransaction((tx) => applyProfileMetaRepair(tx, tinderId));
  }

  const after = shouldApply ? await audit(tinderId) : null;
  const output = {
    mode: shouldApply ? "applied" : "dry-run",
    tinderId,
    provider: "TINDER",
    note: "Writes take the shared Tinder SwipeRank mutation lock and journal a source generation. Existing conversation fields are preserved; missing metadata rows reconstruct the complete all-time contract.",
    before,
    after,
  };

  if (hasFlag("--json")) {
    printJson(output);
    return;
  }

  printHeading("Profile metadata repair");
  printRows([
    ["Mode", output.mode],
    ["Provider", output.provider],
    ["Profile", tinderId ?? "all real Tinder profiles"],
    ["Before range mismatches", before.profile_range_mismatches ?? 0],
    ["Before meta mismatches", before.meta_core_mismatches ?? 0],
    ["Before missing metadata", before.missing_meta ?? 0],
    [
      "After range mismatches",
      after?.profile_range_mismatches ?? "not applied",
    ],
    ["After meta mismatches", after?.meta_core_mismatches ?? "not applied"],
    ["After missing metadata", after?.missing_meta ?? "not applied"],
  ]);
  console.log(`\n${output.note}`);
  if (!shouldApply)
    console.log("Pass --apply to run the transactional repair.");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
