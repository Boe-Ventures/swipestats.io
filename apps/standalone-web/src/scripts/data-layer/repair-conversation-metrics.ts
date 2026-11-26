import { sql, type SQL } from "drizzle-orm";

import { db, withTransaction, type TransactionClient } from "@/server/db";
import { swipeRankBuildLockName } from "@/server/services/swipe-rank/constants";

import {
  getFlagValue,
  hasFlag,
  printHeading,
  printJson,
  printRows,
} from "./utils";

type Provider = "ALL" | "TINDER" | "HINGE";
type AuditRow = Record<string, unknown>;

const CONVERSATION_REPAIR_LOCK_PROVIDERS = ["TINDER", "HINGE"] as const;

function selectedProviders(
  provider: Provider,
): ReadonlyArray<(typeof CONVERSATION_REPAIR_LOCK_PROVIDERS)[number]> {
  return provider === "ALL" ? CONVERSATION_REPAIR_LOCK_PROVIDERS : [provider];
}

/**
 * Apply mode takes the exclusive form of the same provider lock acquired in
 * shared mode by Tinder and Hinge upload transactions. This gives each repair
 * a stable provider snapshot without blocking unrelated-provider writes.
 */
async function lockConversationRepairProvidersInTx(
  tx: TransactionClient,
  provider: Provider,
): Promise<void> {
  for (const dataProvider of selectedProviders(provider)) {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${swipeRankBuildLockName(dataProvider)}, 0)
      )
    `);
  }
}

function parseProvider(): Provider {
  const raw = (getFlagValue("--provider") ?? "ALL").toUpperCase();
  if (raw !== "ALL" && raw !== "TINDER" && raw !== "HINGE") {
    throw new Error("--provider must be ALL, TINDER, or HINGE.");
  }
  return raw;
}

function providerMatchFilter(provider: Provider, alias: SQL): SQL {
  if (provider === "TINDER") {
    return sql`${alias}.tinder_profile_id IS NOT NULL AND ${alias}.hinge_profile_id IS NULL`;
  }
  if (provider === "HINGE") {
    return sql`${alias}.hinge_profile_id IS NOT NULL AND ${alias}.tinder_profile_id IS NULL`;
  }
  return sql`num_nonnulls(${alias}.tinder_profile_id, ${alias}.hinge_profile_id) = 1`;
}

function providerProfileFilter(
  provider: Provider,
  providerName: Provider,
): SQL {
  return provider === "ALL" || provider === providerName
    ? sql`true`
    : sql`false`;
}

function structuralIntegrityCtes(provider: Provider): SQL {
  // REVIEW(provider assumption): Hinge export messages are uploader-authored
  // and the canonical parser stores them with to = 1. Any other persisted
  // value is quarantined here rather than treated as message direction.
  return sql`
    structural_match_audit AS (
      SELECT
        count(*) FILTER (
          WHERE num_nonnulls(
            source_match.tinder_profile_id,
            source_match.hinge_profile_id
          ) = 2
        )::int AS both_provider_match_rows,
        count(*) FILTER (
          WHERE num_nonnulls(
            source_match.tinder_profile_id,
            source_match.hinge_profile_id
          ) = 0
        )::int AS providerless_match_rows
      FROM match AS source_match
    ),
    selected_message_links AS (
      SELECT
        message.tinder_profile_id AS message_tinder_profile_id,
        message.hinge_profile_id AS message_hinge_profile_id,
        message."to" AS message_to,
        source_match.tinder_profile_id AS match_tinder_profile_id,
        source_match.hinge_profile_id AS match_hinge_profile_id
      FROM message
      JOIN match AS source_match ON source_match.id = message.match_id
      WHERE ${providerMatchFilter(provider, sql`source_match`)}
    ),
    message_link_audit AS (
      SELECT
        count(*) FILTER (
          WHERE (
            links.match_tinder_profile_id IS NOT NULL
            AND (
              links.message_tinder_profile_id IS DISTINCT FROM
                links.match_tinder_profile_id
              OR links.message_hinge_profile_id IS NOT NULL
            )
          ) OR (
            links.match_hinge_profile_id IS NOT NULL
            AND (
              links.message_hinge_profile_id IS DISTINCT FROM
                links.match_hinge_profile_id
              OR links.message_tinder_profile_id IS NOT NULL
            )
          )
        )::int AS cross_profile_message_links,
        count(*) FILTER (
          WHERE links.match_hinge_profile_id IS NOT NULL
            AND links.message_to <> 1
        )::int AS invalid_hinge_message_to_rows
      FROM selected_message_links AS links
    ),
    interaction_link_audit AS (
      SELECT
        count(*) FILTER (
          WHERE interaction.match_id IS NOT NULL
            AND (
              source_match.id IS NULL
              OR source_match.tinder_profile_id IS NOT NULL
              OR source_match.hinge_profile_id IS DISTINCT FROM
                interaction.hinge_profile_id
            )
        )::int AS cross_profile_interaction_links
      FROM hinge_interaction AS interaction
      LEFT JOIN match AS source_match ON source_match.id = interaction.match_id
      WHERE ${providerProfileFilter(provider, "HINGE")}
    )
  `;
}

function matchDerivationCtes(provider: Provider): SQL {
  return sql`
    selected_matches AS (
      SELECT
        source_match.id,
        CASE
          WHEN source_match.tinder_profile_id IS NOT NULL THEN 'TINDER'
          ELSE 'HINGE'
        END AS data_provider
      FROM match AS source_match
      WHERE ${providerMatchFilter(provider, sql`source_match`)}
    ),
    ordered_messages AS (
      SELECT
        selected.id AS match_id,
        message.sent_date,
        message.message_type,
        floor(extract(
          epoch FROM (
            message.sent_date - lag(message.sent_date) OVER (
              PARTITION BY selected.id
              ORDER BY message.sent_date, message."order", message.id
            )
          )
        ))::bigint AS gap_seconds
      FROM selected_matches AS selected
      JOIN message ON message.match_id = selected.id
    ),
    derived AS (
      SELECT
        selected.id AS match_id,
        selected.data_provider,
        count(message.match_id)::int AS total_message_count,
        min(message.sent_date) AS initial_message_at,
        max(message.sent_date) AS last_message_at,
        count(*) FILTER (
          WHERE message.message_type = 'TEXT'
        )::int AS text_count,
        count(*) FILTER (
          WHERE message.message_type = 'GIF'
        )::int AS gif_count,
        count(*) FILTER (
          WHERE message.message_type = 'GESTURE'
        )::int AS gesture_count,
        count(*) FILTER (
          WHERE message.message_type IS NOT NULL
            AND message.message_type NOT IN ('TEXT', 'GIF', 'GESTURE')
        )::int AS other_message_type_count,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY message.gap_seconds
          ) FILTER (WHERE message.gap_seconds IS NOT NULL) + 0.5
        )::int AS response_time_median_seconds,
        CASE
          WHEN count(message.match_id) > 0 THEN floor(
            extract(epoch FROM (max(message.sent_date) - min(message.sent_date))) /
              86400
          )::int
          ELSE NULL
        END AS conversation_duration_days,
        CASE
          WHEN count(message.gap_seconds) > 0
            THEN floor(max(message.gap_seconds) / 3600.0)::int
          ELSE NULL
        END AS longest_gap_hours,
        CASE
          WHEN count(message.match_id) > 0 THEN 'USER'
          ELSE NULL
        END AS last_message_from
      FROM selected_matches AS selected
      LEFT JOIN ordered_messages AS message
        ON message.match_id = selected.id
      GROUP BY selected.id, selected.data_provider
    )
  `;
}

function conversationAggregateCtes(provider: Provider): SQL {
  return sql`
    selected_profiles AS (
      SELECT 'TINDER'::text AS data_provider, profile.tinder_id AS profile_id
      FROM tinder_profile AS profile
      WHERE ${providerProfileFilter(provider, "TINDER")}
      UNION ALL
      SELECT 'HINGE'::text AS data_provider, profile.hinge_id AS profile_id
      FROM hinge_profile AS profile
      WHERE ${providerProfileFilter(provider, "HINGE")}
    ),
    ordered_profile_messages AS (
      SELECT
        selected.data_provider,
        selected.profile_id,
        source_match.id AS match_id,
        floor(extract(
          epoch FROM (
            message.sent_date - lag(message.sent_date) OVER (
              PARTITION BY selected.data_provider, selected.profile_id,
                source_match.id
              ORDER BY message.sent_date, message."order", message.id
            )
          )
        ))::bigint AS gap_seconds
      FROM selected_profiles AS selected
      JOIN match AS source_match
        ON (
          selected.data_provider = 'TINDER'
          AND source_match.tinder_profile_id = selected.profile_id
          AND source_match.hinge_profile_id IS NULL
        ) OR (
          selected.data_provider = 'HINGE'
          AND source_match.hinge_profile_id = selected.profile_id
          AND source_match.tinder_profile_id IS NULL
        )
      JOIN message ON message.match_id = source_match.id
    ),
    pooled_profile_gaps AS (
      SELECT
        ordered.data_provider,
        ordered.profile_id,
        floor(avg(ordered.gap_seconds) + 0.5)::int
          AS mean_response_time_seconds
      FROM ordered_profile_messages AS ordered
      WHERE ordered.gap_seconds IS NOT NULL
      GROUP BY ordered.data_provider, ordered.profile_id
    ),
    conversation AS (
      SELECT
        selected.data_provider,
        selected.profile_id,
        count(source_match.id)::int AS conversation_count,
        count(source_match.id) FILTER (
          WHERE source_match.total_message_count > 0
        )::int AS conversations_with_messages,
        count(source_match.id) FILTER (
          WHERE source_match.total_message_count = 0
        )::int AS ghosted_count,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY source_match.response_time_median_seconds
          ) FILTER (
            WHERE source_match.response_time_median_seconds IS NOT NULL
          ) + 0.5
        )::int AS average_response_time_seconds,
        pooled.mean_response_time_seconds,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY source_match.conversation_duration_days
          ) FILTER (
            WHERE source_match.conversation_duration_days IS NOT NULL
          ) + 0.5
        )::int AS median_conversation_duration_days,
        max(source_match.conversation_duration_days) FILTER (
          WHERE source_match.conversation_duration_days IS NOT NULL
        )::int AS longest_conversation_days,
        avg(source_match.total_message_count::double precision) FILTER (
          WHERE source_match.total_message_count > 0
        ) AS average_messages_per_conversation,
        floor(
          percentile_cont(0.5) WITHIN GROUP (
            ORDER BY source_match.total_message_count
          ) FILTER (WHERE source_match.total_message_count > 0) + 0.5
        )::int AS median_messages_per_conversation
      FROM selected_profiles AS selected
      LEFT JOIN match AS source_match
        ON (
          selected.data_provider = 'TINDER'
          AND source_match.tinder_profile_id = selected.profile_id
          AND source_match.hinge_profile_id IS NULL
        ) OR (
          selected.data_provider = 'HINGE'
          AND source_match.hinge_profile_id = selected.profile_id
          AND source_match.tinder_profile_id IS NULL
        )
      LEFT JOIN pooled_profile_gaps AS pooled
        ON pooled.data_provider = selected.data_provider
       AND pooled.profile_id = selected.profile_id
      GROUP BY
        selected.data_provider,
        selected.profile_id,
        pooled.mean_response_time_seconds
    )
  `;
}

function hingeProviderMetricCtes(provider: Provider): SQL {
  return sql`
    hinge_selected_profiles AS (
      SELECT profile.*
      FROM hinge_profile AS profile
      WHERE ${providerProfileFilter(provider, "HINGE")}
    ),
    hinge_event_times AS (
      SELECT interaction.hinge_profile_id, interaction.timestamp AS event_time
      FROM hinge_interaction AS interaction
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = interaction.hinge_profile_id
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.matched_at
      FROM match AS source_match
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.matched_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.liked_at
      FROM match AS source_match
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.liked_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.initial_message_at
      FROM match AS source_match
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.initial_message_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.last_message_at
      FROM match AS source_match
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.last_message_at IS NOT NULL
      UNION ALL
      SELECT
        source_match.hinge_profile_id,
        (source_match.we_met ->> 'timestamp')::timestamptz
          AT TIME ZONE 'UTC'
      FROM match AS source_match
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.we_met IS NOT NULL
        AND pg_input_is_valid(
          source_match.we_met ->> 'timestamp',
          'timestamp with time zone'
        )
    ),
    hinge_bounds AS (
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
      FROM hinge_selected_profiles AS profile
      LEFT JOIN hinge_event_times AS events
        ON events.hinge_profile_id = profile.hinge_id
      GROUP BY
        profile.hinge_id,
        profile.create_date,
        profile.first_account_create_date,
        profile.last_seen_at
    ),
    hinge_interaction_totals AS (
      SELECT
        profile.hinge_id,
        count(interaction.id) FILTER (
          WHERE interaction.type = 'LIKE_SENT'
        )::int AS likes_sent,
        count(DISTINCT (interaction.timestamp AT TIME ZONE 'UTC')::date)
          FILTER (WHERE interaction.type = 'LIKE_SENT')::int
          AS active_like_days
      FROM hinge_selected_profiles AS profile
      LEFT JOIN hinge_interaction AS interaction
        ON interaction.hinge_profile_id = profile.hinge_id
      GROUP BY profile.hinge_id
    ),
    hinge_explicit_origins AS (
      SELECT
        interaction.hinge_profile_id,
        interaction.match_id,
        count(DISTINCT interaction.thread_origin) FILTER (
          WHERE interaction.thread_origin IN (
            'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
          )
        )::int AS explicit_origin_count,
        CASE
          WHEN count(DISTINCT interaction.thread_origin) FILTER (
            WHERE interaction.thread_origin IN (
              'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
            )
          ) = 1
          THEN min(interaction.thread_origin) FILTER (
            WHERE interaction.thread_origin IN (
              'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
            )
          )
          ELSE NULL
        END AS thread_origin
      FROM hinge_interaction AS interaction
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = interaction.hinge_profile_id
      WHERE interaction.type = 'MATCH'
        AND interaction.match_id IS NOT NULL
      GROUP BY interaction.hinge_profile_id, interaction.match_id
    ),
    hinge_linked_outbound AS (
      SELECT DISTINCT interaction.hinge_profile_id, interaction.match_id
      FROM hinge_interaction AS interaction
      JOIN hinge_selected_profiles AS profile
        ON profile.hinge_id = interaction.hinge_profile_id
      JOIN match AS source_match
        ON source_match.id = interaction.match_id
       AND source_match.hinge_profile_id = interaction.hinge_profile_id
       AND source_match.tinder_profile_id IS NULL
      WHERE interaction.type = 'LIKE_SENT'
        AND interaction.match_id IS NOT NULL
        AND (
          source_match.matched_at IS NULL
          OR interaction.timestamp <= source_match.matched_at
        )
    ),
    hinge_match_totals AS (
      SELECT
        profile.hinge_id,
        count(source_match.id)::int AS total_matches,
        count(source_match.id) FILTER (
          WHERE (
            origin.explicit_origin_count = 1
            AND origin.thread_origin = 'OUTBOUND_LIKE'
          ) OR (
            coalesce(origin.explicit_origin_count, 0) = 0
            AND (
              linked.match_id IS NOT NULL
              OR (
                source_match.liked_at IS NOT NULL
                AND (
                  source_match.matched_at IS NULL
                  OR source_match.liked_at <= source_match.matched_at
                )
              )
            )
          )
        )::int AS outbound_matches,
        coalesce(sum(source_match.total_message_count), 0)::int
          AS messages_sent
      FROM hinge_selected_profiles AS profile
      LEFT JOIN match AS source_match
        ON source_match.hinge_profile_id = profile.hinge_id
       AND source_match.tinder_profile_id IS NULL
      LEFT JOIN hinge_explicit_origins AS origin
        ON origin.hinge_profile_id = profile.hinge_id
       AND origin.match_id = source_match.id
      LEFT JOIN hinge_linked_outbound AS linked
        ON linked.hinge_profile_id = profile.hinge_id
       AND linked.match_id = source_match.id
      GROUP BY profile.hinge_id
    ),
    hinge_derived AS (
      SELECT
        profile.hinge_id,
        bounds.first_activity,
        bounds.last_activity,
        greatest(
          1,
          (bounds.last_activity::date - bounds.first_activity::date) + 1
        )::int AS days_in_period,
        interaction.likes_sent,
        interaction.active_like_days,
        matches.total_matches,
        matches.outbound_matches,
        matches.messages_sent
      FROM hinge_selected_profiles AS profile
      JOIN hinge_bounds AS bounds ON bounds.hinge_id = profile.hinge_id
      JOIN hinge_interaction_totals AS interaction
        ON interaction.hinge_id = profile.hinge_id
      JOIN hinge_match_totals AS matches ON matches.hinge_id = profile.hinge_id
    )
  `;
}

export function buildConversationMetricAuditQuery(provider: Provider): SQL {
  return sql`
    WITH ${structuralIntegrityCtes(provider)},
    ${matchDerivationCtes(provider)},
    ${conversationAggregateCtes(provider)},
    ${hingeProviderMetricCtes(provider)},
    match_audit AS (
      SELECT
        derived.data_provider,
        count(*)::int AS match_rows,
        count(*) FILTER (
          WHERE ROW(
            source_match.total_message_count,
            source_match.initial_message_at,
            source_match.last_message_at,
            source_match.text_count,
            source_match.gif_count,
            source_match.gesture_count,
            source_match.other_message_type_count,
            source_match.response_time_median_seconds,
            source_match.conversation_duration_days,
            source_match.message_imbalance_ratio,
            source_match.longest_gap_hours,
            source_match.did_match_reply,
            source_match.last_message_from
          ) IS DISTINCT FROM ROW(
            derived.total_message_count,
            derived.initial_message_at,
            derived.last_message_at,
            derived.text_count,
            derived.gif_count,
            derived.gesture_count,
            derived.other_message_type_count,
            derived.response_time_median_seconds,
            derived.conversation_duration_days,
            NULL::double precision,
            derived.longest_gap_hours,
            NULL::boolean,
            derived.last_message_from
          )
        )::int AS mismatched_matches,
        count(*) FILTER (
          WHERE source_match.response_time_median_seconds < 0
             OR source_match.conversation_duration_days < 0
             OR source_match.longest_gap_hours < 0
        )::int AS negative_metric_matches,
        count(*) FILTER (
          WHERE source_match.total_message_count <>
            derived.total_message_count
        )::int AS message_count_mismatches
      FROM derived
      JOIN match AS source_match ON source_match.id = derived.match_id
      GROUP BY derived.data_provider
    ),
    meta_audit AS (
      SELECT
        selected.data_provider,
        count(*)::int AS profile_rows,
        count(*) FILTER (WHERE meta.id IS NULL)::int AS missing_meta,
        count(*) FILTER (
          WHERE meta.id IS NOT NULL
            AND ROW(
              meta.conversation_count,
              meta.conversations_with_messages,
              meta.ghosted_count,
              meta.average_response_time_seconds,
              meta.mean_response_time_seconds,
              meta.median_conversation_duration_days,
              meta.longest_conversation_days,
              meta.average_messages_per_conversation,
              meta.median_messages_per_conversation
            ) IS DISTINCT FROM ROW(
              conversation.conversation_count,
              conversation.conversations_with_messages,
              conversation.ghosted_count,
              conversation.average_response_time_seconds,
              conversation.mean_response_time_seconds,
              conversation.median_conversation_duration_days,
              conversation.longest_conversation_days,
              conversation.average_messages_per_conversation,
              conversation.median_messages_per_conversation
            )
        )::int AS mismatched_conversation_meta,
        count(*) FILTER (
          WHERE selected.data_provider = 'HINGE'
            AND meta.id IS NOT NULL
            AND ROW(
              meta."from",
              meta."to",
              meta.days_in_period,
              meta.days_active,
              meta.swipe_likes_total,
              meta.swipe_passes_total,
              meta.matches_total,
              meta.messages_sent_total,
              meta.messages_received_total,
              meta.app_opens_total,
              meta.like_rate,
              meta.match_rate,
              meta.swipes_per_day
            ) IS DISTINCT FROM ROW(
              hinge.first_activity,
              hinge.last_activity,
              hinge.days_in_period,
              hinge.active_like_days,
              hinge.likes_sent,
              0::int,
              hinge.total_matches,
              hinge.messages_sent,
              0::int,
              0::int,
              CASE WHEN hinge.likes_sent > 0 THEN 1 ELSE 0 END::double precision,
              CASE
                WHEN hinge.likes_sent > 0
                  THEN hinge.outbound_matches::double precision /
                    hinge.likes_sent
                ELSE 0
              END,
              CASE
                WHEN hinge.active_like_days > 0
                  THEN hinge.likes_sent::double precision /
                    hinge.active_like_days
                ELSE 0
              END
            )
        )::int AS mismatched_hinge_provider_meta
      FROM selected_profiles AS selected
      JOIN conversation
        ON conversation.data_provider = selected.data_provider
       AND conversation.profile_id = selected.profile_id
      LEFT JOIN profile_meta AS meta
        ON (
          selected.data_provider = 'TINDER'
          AND meta.tinder_profile_id = selected.profile_id
          AND meta.hinge_profile_id IS NULL
        ) OR (
          selected.data_provider = 'HINGE'
          AND meta.hinge_profile_id = selected.profile_id
          AND meta.tinder_profile_id IS NULL
        )
      LEFT JOIN hinge_derived AS hinge
        ON selected.data_provider = 'HINGE'
       AND hinge.hinge_id = selected.profile_id
      GROUP BY selected.data_provider
    )
    SELECT
      meta.data_provider,
      meta.profile_rows,
      coalesce(matches.match_rows, 0)::int AS match_rows,
      coalesce(matches.mismatched_matches, 0)::int AS mismatched_matches,
      coalesce(matches.negative_metric_matches, 0)::int
        AS negative_metric_matches,
      coalesce(matches.message_count_mismatches, 0)::int
        AS message_count_mismatches,
      structure.both_provider_match_rows,
      structure.providerless_match_rows,
      message_links.cross_profile_message_links,
      message_links.invalid_hinge_message_to_rows,
      interaction_links.cross_profile_interaction_links,
      meta.missing_meta,
      meta.mismatched_conversation_meta,
      meta.mismatched_hinge_provider_meta
    FROM meta_audit AS meta
    LEFT JOIN match_audit AS matches
      ON matches.data_provider = meta.data_provider
    CROSS JOIN structural_match_audit AS structure
    CROSS JOIN message_link_audit AS message_links
    CROSS JOIN interaction_link_audit AS interaction_links
    ORDER BY meta.data_provider
  `;
}

/** Inspect persisted match and profile-meta conversation derivatives. */
export async function auditConversationMetricRepair(
  provider: Provider,
): Promise<AuditRow[]> {
  if (provider === "ALL") {
    const rows: AuditRow[] = [];
    for (const selected of CONVERSATION_REPAIR_LOCK_PROVIDERS) {
      rows.push(...(await auditConversationMetricRepair(selected)));
    }
    return rows;
  }
  const result = await db.execute<AuditRow>(
    buildConversationMetricAuditQuery(provider),
  );
  return result.rows;
}

async function auditConversationMetricRepairInTx(
  tx: TransactionClient,
  provider: Provider,
): Promise<AuditRow[]> {
  if (provider === "ALL") {
    const rows: AuditRow[] = [];
    for (const selected of CONVERSATION_REPAIR_LOCK_PROVIDERS) {
      rows.push(...(await auditConversationMetricRepairInTx(tx, selected)));
    }
    return rows;
  }
  const result = await tx.execute<AuditRow>(
    buildConversationMetricAuditQuery(provider),
  );
  return result.rows;
}

const CONVERSATION_POSTCONDITION_FIELDS = [
  "both_provider_match_rows",
  "providerless_match_rows",
  "cross_profile_message_links",
  "invalid_hinge_message_to_rows",
  "cross_profile_interaction_links",
  "mismatched_matches",
  "negative_metric_matches",
  "message_count_mismatches",
  "missing_meta",
  "mismatched_conversation_meta",
  "mismatched_hinge_provider_meta",
] as const;

export function assertConversationRepairPostconditions(rows: AuditRow[]): void {
  const failures = CONVERSATION_POSTCONDITION_FIELDS.flatMap((field) => {
    const count = rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
    return count > 0 ? [`${field}=${count}`] : [];
  });

  if (failures.length > 0) {
    throw new Error(
      `Conversation repair postconditions failed: ${failures.join(", ")}`,
    );
  }
}

/** Rebuild every match-level metric from the same persisted message rows. */
export async function applyConversationMetricRepair(
  tx: TransactionClient,
  provider: Provider,
): Promise<void> {
  // Provider-specific plans avoid the large disjunctive joins produced by an
  // ALL query on the current corpus. Locks are acquired in a stable order and
  // remain held until the surrounding transaction commits.
  if (provider === "ALL") {
    for (const selected of CONVERSATION_REPAIR_LOCK_PROVIDERS) {
      await applyConversationMetricRepair(tx, selected);
    }
    return;
  }
  await lockConversationRepairProvidersInTx(tx, provider);

  await tx.execute(sql`
    WITH ${matchDerivationCtes(provider)}
    UPDATE match AS source_match
    SET
      total_message_count = derived.total_message_count,
      initial_message_at = derived.initial_message_at,
      last_message_at = derived.last_message_at,
      text_count = derived.text_count,
      gif_count = derived.gif_count,
      gesture_count = derived.gesture_count,
      other_message_type_count = derived.other_message_type_count,
      response_time_median_seconds = derived.response_time_median_seconds,
      conversation_duration_days = derived.conversation_duration_days,
      message_imbalance_ratio = NULL,
      longest_gap_hours = derived.longest_gap_hours,
      did_match_reply = NULL,
      last_message_from = derived.last_message_from
    FROM derived
    WHERE source_match.id = derived.match_id
      AND ROW(
        source_match.total_message_count,
        source_match.initial_message_at,
        source_match.last_message_at,
        source_match.text_count,
        source_match.gif_count,
        source_match.gesture_count,
        source_match.other_message_type_count,
        source_match.response_time_median_seconds,
        source_match.conversation_duration_days,
        source_match.message_imbalance_ratio,
        source_match.longest_gap_hours,
        source_match.did_match_reply,
        source_match.last_message_from
      ) IS DISTINCT FROM ROW(
        derived.total_message_count,
        derived.initial_message_at,
        derived.last_message_at,
        derived.text_count,
        derived.gif_count,
        derived.gesture_count,
        derived.other_message_type_count,
        derived.response_time_median_seconds,
        derived.conversation_duration_days,
        NULL::double precision,
        derived.longest_gap_hours,
        NULL::boolean,
        derived.last_message_from
      )
  `);

  await tx.execute(sql`
    WITH ${conversationAggregateCtes(provider)}
    UPDATE profile_meta AS meta
    SET
      conversation_count = conversation.conversation_count,
      conversations_with_messages = conversation.conversations_with_messages,
      ghosted_count = conversation.ghosted_count,
      average_response_time_seconds =
        conversation.average_response_time_seconds,
      mean_response_time_seconds = conversation.mean_response_time_seconds,
      median_conversation_duration_days =
        conversation.median_conversation_duration_days,
      longest_conversation_days = conversation.longest_conversation_days,
      average_messages_per_conversation =
        conversation.average_messages_per_conversation,
      median_messages_per_conversation =
        conversation.median_messages_per_conversation,
      computed_at = now()
    FROM conversation
    WHERE (
      (
        conversation.data_provider = 'TINDER'
        AND meta.tinder_profile_id = conversation.profile_id
        AND meta.hinge_profile_id IS NULL
      ) OR (
        conversation.data_provider = 'HINGE'
        AND meta.hinge_profile_id = conversation.profile_id
        AND meta.tinder_profile_id IS NULL
      )
    )
      AND ROW(
        meta.conversation_count,
        meta.conversations_with_messages,
        meta.ghosted_count,
        meta.average_response_time_seconds,
        meta.mean_response_time_seconds,
        meta.median_conversation_duration_days,
        meta.longest_conversation_days,
        meta.average_messages_per_conversation,
        meta.median_messages_per_conversation
      ) IS DISTINCT FROM ROW(
        conversation.conversation_count,
        conversation.conversations_with_messages,
        conversation.ghosted_count,
        conversation.average_response_time_seconds,
        conversation.mean_response_time_seconds,
        conversation.median_conversation_duration_days,
        conversation.longest_conversation_days,
        conversation.average_messages_per_conversation,
        conversation.median_messages_per_conversation
      )
  `);

  if (provider === "HINGE") {
    // REVIEW(provider assumption): for legacy Hinge rows without an explicit
    // thread origin, liked_at is positive evidence of an outbound match. A
    // match without either signal stays unknown rather than being called
    // inbound. New uploads persist explicit origin classifications.
    await tx.execute(sql`
    WITH selected_profiles AS (
      SELECT profile.*
      FROM hinge_profile AS profile
      WHERE ${providerProfileFilter(provider, "HINGE")}
    ),
    event_times AS (
      SELECT interaction.hinge_profile_id, interaction.timestamp AS event_time
      FROM hinge_interaction AS interaction
      JOIN selected_profiles AS profile
        ON profile.hinge_id = interaction.hinge_profile_id
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.matched_at
      FROM match AS source_match
      JOIN selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.matched_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.liked_at
      FROM match AS source_match
      JOIN selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.liked_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.initial_message_at
      FROM match AS source_match
      JOIN selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.initial_message_at IS NOT NULL
      UNION ALL
      SELECT source_match.hinge_profile_id, source_match.last_message_at
      FROM match AS source_match
      JOIN selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.last_message_at IS NOT NULL
      UNION ALL
      SELECT
        source_match.hinge_profile_id,
        (source_match.we_met ->> 'timestamp')::timestamptz
          AT TIME ZONE 'UTC'
      FROM match AS source_match
      JOIN selected_profiles AS profile
        ON profile.hinge_id = source_match.hinge_profile_id
      WHERE source_match.we_met IS NOT NULL
        AND pg_input_is_valid(
          source_match.we_met ->> 'timestamp',
          'timestamp with time zone'
        )
    ),
    bounds AS (
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
      FROM selected_profiles AS profile
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
        profile.hinge_id,
        count(interaction.id) FILTER (
          WHERE interaction.type = 'LIKE_SENT'
        )::int AS likes_sent,
        count(DISTINCT (interaction.timestamp AT TIME ZONE 'UTC')::date)
          FILTER (WHERE interaction.type = 'LIKE_SENT')::int
          AS active_like_days
      FROM selected_profiles AS profile
      LEFT JOIN hinge_interaction AS interaction
        ON interaction.hinge_profile_id = profile.hinge_id
      GROUP BY profile.hinge_id
    ),
    explicit_origins AS (
      SELECT
        interaction.hinge_profile_id,
        interaction.match_id,
        count(DISTINCT interaction.thread_origin) FILTER (
          WHERE interaction.thread_origin IN (
            'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
          )
        )::int AS explicit_origin_count,
        CASE
          WHEN count(DISTINCT interaction.thread_origin) FILTER (
            WHERE interaction.thread_origin IN (
              'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
            )
          ) = 1
          THEN min(interaction.thread_origin) FILTER (
            WHERE interaction.thread_origin IN (
              'OUTBOUND_LIKE', 'INBOUND_LIKE', 'UNKNOWN'
            )
          )
          ELSE NULL
        END AS thread_origin
      FROM hinge_interaction AS interaction
      JOIN selected_profiles AS profile
        ON profile.hinge_id = interaction.hinge_profile_id
      WHERE interaction.type = 'MATCH'
        AND interaction.match_id IS NOT NULL
      GROUP BY interaction.hinge_profile_id, interaction.match_id
    ),
    linked_outbound AS (
      SELECT DISTINCT interaction.hinge_profile_id, interaction.match_id
      FROM hinge_interaction AS interaction
      JOIN selected_profiles AS profile
        ON profile.hinge_id = interaction.hinge_profile_id
      JOIN match AS source_match
        ON source_match.id = interaction.match_id
       AND source_match.hinge_profile_id = interaction.hinge_profile_id
       AND source_match.tinder_profile_id IS NULL
      WHERE interaction.type = 'LIKE_SENT'
        AND interaction.match_id IS NOT NULL
        AND (
          source_match.matched_at IS NULL
          OR interaction.timestamp <= source_match.matched_at
        )
    ),
    match_totals AS (
      SELECT
        profile.hinge_id,
        count(source_match.id)::int AS total_matches,
        count(source_match.id) FILTER (
          WHERE (
            origin.explicit_origin_count = 1
            AND origin.thread_origin = 'OUTBOUND_LIKE'
          ) OR (
            coalesce(origin.explicit_origin_count, 0) = 0
            AND (
              linked.match_id IS NOT NULL
              OR (
                source_match.liked_at IS NOT NULL
                AND (
                  source_match.matched_at IS NULL
                  OR source_match.liked_at <= source_match.matched_at
                )
              )
            )
          )
        )::int AS outbound_matches,
        coalesce(sum(source_match.total_message_count), 0)::int
          AS messages_sent
      FROM selected_profiles AS profile
      LEFT JOIN match AS source_match
        ON source_match.hinge_profile_id = profile.hinge_id
       AND source_match.tinder_profile_id IS NULL
      LEFT JOIN explicit_origins AS origin
        ON origin.hinge_profile_id = profile.hinge_id
       AND origin.match_id = source_match.id
      LEFT JOIN linked_outbound AS linked
        ON linked.hinge_profile_id = profile.hinge_id
       AND linked.match_id = source_match.id
      GROUP BY profile.hinge_id
    ),
    derived AS (
      SELECT
        profile.hinge_id,
        bounds.first_activity,
        bounds.last_activity,
        greatest(
          1,
          (bounds.last_activity::date - bounds.first_activity::date) + 1
        )::int AS days_in_period,
        interaction.likes_sent,
        interaction.active_like_days,
        matches.total_matches,
        matches.outbound_matches,
        matches.messages_sent
      FROM selected_profiles AS profile
      JOIN bounds ON bounds.hinge_id = profile.hinge_id
      JOIN interaction_totals AS interaction
        ON interaction.hinge_id = profile.hinge_id
      JOIN match_totals AS matches ON matches.hinge_id = profile.hinge_id
    )
    UPDATE profile_meta AS meta
    SET
      "from" = derived.first_activity,
      "to" = derived.last_activity,
      days_in_period = derived.days_in_period,
      days_active = derived.active_like_days,
      swipe_likes_total = derived.likes_sent,
      swipe_passes_total = 0,
      matches_total = derived.total_matches,
      messages_sent_total = derived.messages_sent,
      messages_received_total = 0,
      app_opens_total = 0,
      like_rate = CASE WHEN derived.likes_sent > 0 THEN 1 ELSE 0 END,
      match_rate = CASE
        WHEN derived.likes_sent > 0
          THEN derived.outbound_matches::double precision /
            derived.likes_sent
        ELSE 0
      END,
      swipes_per_day = CASE
        WHEN derived.active_like_days > 0
          THEN derived.likes_sent::double precision /
            derived.active_like_days
        ELSE 0
      END,
      computed_at = now()
    FROM derived
    WHERE meta.hinge_profile_id = derived.hinge_id
      AND meta.tinder_profile_id IS NULL
      AND ROW(
        meta."from",
        meta."to",
        meta.days_in_period,
        meta.days_active,
        meta.swipe_likes_total,
        meta.swipe_passes_total,
        meta.matches_total,
        meta.messages_sent_total,
        meta.messages_received_total,
        meta.app_opens_total,
        meta.like_rate,
        meta.match_rate,
        meta.swipes_per_day
      ) IS DISTINCT FROM ROW(
        derived.first_activity,
        derived.last_activity,
        derived.days_in_period,
        derived.active_like_days,
        derived.likes_sent,
        0,
        derived.total_matches,
        derived.messages_sent,
        0,
        0,
        CASE WHEN derived.likes_sent > 0 THEN 1 ELSE 0 END,
        CASE
          WHEN derived.likes_sent > 0
            THEN derived.outbound_matches::double precision /
              derived.likes_sent
          ELSE 0
        END,
        CASE
          WHEN derived.active_like_days > 0
            THEN derived.likes_sent::double precision /
              derived.active_like_days
          ELSE 0
        END
      )
    `);
  }
}

async function main(): Promise<void> {
  const provider = parseProvider();
  const shouldApply = hasFlag("--apply");
  const before = await auditConversationMetricRepair(provider);
  let after: AuditRow[] | null = null;

  if (shouldApply) {
    after = await withTransaction(async (tx) => {
      await applyConversationMetricRepair(tx, provider);
      const postconditions = await auditConversationMetricRepairInTx(
        tx,
        provider,
      );
      assertConversationRepairPostconditions(postconditions);
      return postconditions;
    });
  }

  const output = {
    mode: shouldApply ? "applied" : "dry-run",
    provider,
    before,
    after,
    note: "Match derivatives are rebuilt from one chronologically ordered persisted-message set. Hinge all-time rates are then rebuilt with outbound-like semantics.",
  };

  if (hasFlag("--json")) {
    printJson(output);
    return;
  }

  printHeading("Conversation-metric repair");
  printRows([
    ["Mode", output.mode],
    ["Provider", provider],
    [
      "Mismatched matches before",
      before.reduce((sum, row) => sum + Number(row.mismatched_matches ?? 0), 0),
    ],
    [
      "Negative matches before",
      before.reduce(
        (sum, row) => sum + Number(row.negative_metric_matches ?? 0),
        0,
      ),
    ],
    [
      "Mismatched matches after",
      after
        ? after.reduce(
            (sum, row) => sum + Number(row.mismatched_matches ?? 0),
            0,
          )
        : "not applied",
    ],
    [
      "Missing metadata after",
      after
        ? after.reduce((sum, row) => sum + Number(row.missing_meta ?? 0), 0)
        : "not applied",
    ],
    [
      "Mismatched metadata after",
      after
        ? after.reduce(
            (sum, row) =>
              sum +
              Number(row.mismatched_conversation_meta ?? 0) +
              Number(row.mismatched_hinge_provider_meta ?? 0),
            0,
          )
        : "not applied",
    ],
  ]);
  console.log(`\n${output.note}`);
  if (!shouldApply) {
    console.log("Pass --apply to run the transactional repair.");
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
