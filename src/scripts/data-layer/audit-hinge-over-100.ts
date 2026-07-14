import { sql, type SQL } from "drizzle-orm";

import type {
  AnonymizedHingeDataJSON,
  ConversationThread,
} from "@/lib/interfaces/HingeDataJSON";
import { withTransaction, type TransactionClient } from "@/server/db";

import { getFlagValue, hasFlag, printHeading, printJson } from "./utils";

type RawRow = Record<string, unknown>;

interface PopulationRow extends RawRow {
  profiles: number | string;
  profiles_with_matches: number | string;
  stored_over_one: number | string;
  linked_outbound_over_one: number | string;
  profiles_with_only_unclassified_matches: number | string;
  profiles_with_any_classified_matches: number | string;
  profiles_with_mixed_classification: number | string;
  profiles_with_duplicate_match_thread_links: number | string;
}

interface ProfileRow extends RawRow {
  hinge_id: string;
  gender: string;
  age_at_upload: number | string;
  country: string | null;
  stored_likes: number | string;
  stored_matches: number | string;
  stored_messages_sent: number | string;
  stored_rate: number | string;
  meta_from: string | Date;
  meta_to: string | Date;
  computed_at: string | Date;
  profile_created_at: string | Date;
  profile_updated_at: string | Date;
  likes_sent: number | string;
  match_interactions: number | string;
  classified_outbound_matches: number | string;
  classified_inbound_matches: number | string;
  unclassified_matches: number | string;
  linked_outbound_matches: number | string;
  linked_inbound_matches: number | string;
  duplicate_match_thread_links: number | string;
  match_rows: number | string;
  outgoing_messages: number | string;
  non_outgoing_messages: number | string;
  match_interactions_without_row: number | string;
  match_rows_without_interaction: number | string;
  cross_profile_interaction_links: number | string;
  cross_profile_message_links: number | string;
  first_event: string | Date;
  last_event: string | Date;
  future_events: number | string;
  uploads: number | string;
  distinct_blobs: number | string;
  first_upload_at: string | Date | null;
  last_upload_at: string | Date | null;
  inline_files: number | string;
  blob_files: number | string;
}

interface IntegrityRow extends RawRow {
  profiles: number | string;
  duplicate_meta_profiles: number | string;
  stored_like_mismatches: number | string;
  stored_match_mismatches: number | string;
  stored_message_mismatches: number | string;
  match_interaction_mismatches: number | string;
  match_interactions_without_row: number | string;
  match_rows_without_interaction: number | string;
  cross_profile_interaction_links: number | string;
  cross_profile_message_links: number | string;
  profiles_with_invalid_match_thread_links: number | string;
  profiles_with_non_outgoing_messages: number | string;
  profiles_with_events_outside_meta_range: number | string;
  profiles_with_events_before_account_creation: number | string;
  profiles_with_events_after_last_upload: number | string;
  future_events: number | string;
  timestamp_precision_mismatches: number | string;
  like_timestamp_collision_groups: number | string;
  match_timestamp_collision_groups: number | string;
  message_signature_collision_groups: number | string;
  message_signature_collision_excess: number | string;
  reject_timestamp_collision_groups: number | string;
  unmatch_timestamp_collision_groups: number | string;
}

interface BlobRow extends RawRow {
  hinge_id: string;
  blob_url: string;
}

interface ProfileAudit {
  profileId: string;
  gender: string;
  ageAtUpload: number;
  country: string | null;
  stored: {
    likesSent: number;
    allMatches: number;
    messagesSent: number;
    matchRate: number;
    from: string;
    to: string;
    computedAt: string;
  };
  reconstructedSemantics: {
    allMatchYield: number;
    outboundLikeMatches: number;
    inboundLikeMatches: number;
    outboundLikeYield: number;
    unclassifiedMatchInteractions: number;
  };
  persistedIntegrity: {
    coreTotalsAgree: boolean;
    matchRowsAgreeWithInteractions: boolean;
    matchThreadLinksAreOneToOne: boolean;
    allMessagesAreOutgoing: boolean;
    referentialLinksAgree: boolean;
    eventsInsideMetaRange: boolean;
    noFutureEvents: boolean;
  };
  uploadEvidence: {
    uploads: number;
    distinctBlobs: number;
    firstUploadAt: string | null;
    lastUploadAt: string | null;
    profileCreatedAt: string;
    profileUpdatedAt: string;
  };
  classification: {
    primary:
      | "STALE_LEGACY_SEMANTICS"
      | "SEMANTIC_MISMATCH"
      | "PERSISTED_INTEGRITY_ANOMALY"
      | "SOURCE_DUPLICATION_OR_CORRUPTION";
    confidence: "HIGH" | "MEDIUM";
    lowDenominator: boolean;
    reasons: string[];
  };
}

interface BlobVerification {
  profileId: string;
  fetchStatus: "VERIFIED" | "FAILED";
  raw?: {
    threads: number;
    likesSent: number;
    allMatches: number;
    outboundLikeMatches: number;
    inboundLikeMatches: number;
    outboundLikeYield: number;
    likeTimestampCollisionGroups: number;
    matchTimestampCollisionGroups: number;
  };
  agreesWithPersisted?: {
    likesSent: boolean;
    allMatches: boolean;
    outboundLikeMatches: boolean;
  };
  error?: string;
}

const HINGE_LIFECYCLE_SEMANTICS_DATE = "2026-06-25";

function number(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function nullableIso(value: unknown): string | null {
  return value === null || value === undefined ? null : iso(value);
}

function visibleId(hingeId: string, showIds: boolean): string {
  return showIds ? hingeId : `${hingeId.slice(0, 8)}…`;
}

function candidatePredicate(hingeId: string | null): SQL {
  return hingeId ? sql`m.hinge_profile_id = ${hingeId}` : sql`m.match_rate > 1`;
}

async function rows<T extends RawRow>(
  tx: TransactionClient,
  query: SQL,
): Promise<T[]> {
  const result = await tx.execute<T>(query);
  return result.rows as T[];
}

async function one<T extends RawRow>(
  tx: TransactionClient,
  query: SQL,
): Promise<T> {
  const result = await rows<T>(tx, query);
  const row = result[0];
  if (!row) throw new Error("Audit query returned no rows.");
  return row;
}

async function getPopulation(tx: TransactionClient): Promise<PopulationRow> {
  return one<PopulationRow>(
    tx,
    sql`
      WITH interactions AS (
        SELECT
          hinge_profile_id,
          count(*) FILTER (WHERE type = 'LIKE_SENT')::int AS likes_sent,
          count(*) FILTER (WHERE type = 'MATCH')::int AS matches,
          count(*) FILTER (
            WHERE type = 'MATCH' AND thread_origin IS NULL
          )::int AS unclassified_matches,
          count(*) FILTER (
            WHERE type = 'MATCH' AND thread_origin IS NOT NULL
          )::int AS classified_matches
        FROM hinge_interaction
        GROUP BY hinge_profile_id
      ),
      thread_links AS (
        SELECT
          hinge_profile_id,
          match_id,
          count(*) FILTER (WHERE type = 'LIKE_SENT')::int AS likes,
          count(*) FILTER (WHERE type = 'MATCH')::int AS matches
        FROM hinge_interaction
        WHERE match_id IS NOT NULL
        GROUP BY hinge_profile_id, match_id
      ),
      linked AS (
        SELECT
          hinge_profile_id,
          coalesce(sum(matches) FILTER (WHERE likes > 0), 0)::int
            AS outbound_matches,
          count(*) FILTER (WHERE likes > 1 OR matches > 1)::int
            AS duplicate_match_thread_links
        FROM thread_links
        GROUP BY hinge_profile_id
      ),
      compared AS (
        SELECT
          p.hinge_id,
          coalesce(i.likes_sent, 0) AS likes_sent,
          coalesce(i.matches, 0) AS matches,
          coalesce(i.unclassified_matches, 0) AS unclassified_matches,
          coalesce(i.classified_matches, 0) AS classified_matches,
          coalesce(l.outbound_matches, 0) AS outbound_matches,
          coalesce(l.duplicate_match_thread_links, 0)
            AS duplicate_match_thread_links,
          m.match_rate
        FROM hinge_profile p
        LEFT JOIN interactions i ON i.hinge_profile_id = p.hinge_id
        LEFT JOIN linked l ON l.hinge_profile_id = p.hinge_id
        LEFT JOIN profile_meta m ON m.hinge_profile_id = p.hinge_id
      )
      SELECT
        count(*)::int AS profiles,
        count(*) FILTER (WHERE matches > 0)::int AS profiles_with_matches,
        count(*) FILTER (WHERE match_rate > 1)::int AS stored_over_one,
        count(*) FILTER (
          WHERE outbound_matches::double precision / nullif(likes_sent, 0) > 1
        )::int AS linked_outbound_over_one,
        count(*) FILTER (
          WHERE unclassified_matches > 0 AND classified_matches = 0
        )::int AS profiles_with_only_unclassified_matches,
        count(*) FILTER (WHERE classified_matches > 0)::int
          AS profiles_with_any_classified_matches,
        count(*) FILTER (
          WHERE unclassified_matches > 0 AND classified_matches > 0
        )::int AS profiles_with_mixed_classification,
        count(*) FILTER (WHERE duplicate_match_thread_links > 0)::int
          AS profiles_with_duplicate_match_thread_links
      FROM compared
    `,
  );
}

async function getProfiles(
  tx: TransactionClient,
  hingeId: string | null,
): Promise<ProfileRow[]> {
  const predicate = candidatePredicate(hingeId);

  return rows<ProfileRow>(
    tx,
    sql`
      WITH candidates AS (
        SELECT
          m.*,
          p.gender,
          p.age_at_upload,
          p.country,
          p.create_date,
          p.created_at AS profile_created_at,
          p.updated_at AS profile_updated_at,
          p.user_id
        FROM profile_meta m
        JOIN hinge_profile p ON p.hinge_id = m.hinge_profile_id
        WHERE m.hinge_profile_id IS NOT NULL AND ${predicate}
      ),
      filtered_interactions AS (
        SELECT i.*
        FROM hinge_interaction i
        JOIN candidates c ON c.hinge_profile_id = i.hinge_profile_id
      ),
      interaction_agg AS (
        SELECT
          filtered_interactions.hinge_profile_id,
          count(*) FILTER (WHERE type = 'LIKE_SENT')::int AS likes_sent,
          count(*) FILTER (WHERE type = 'MATCH')::int AS match_interactions,
          count(*) FILTER (
            WHERE type = 'MATCH' AND thread_origin = 'OUTBOUND_LIKE'
          )::int AS classified_outbound_matches,
          count(*) FILTER (
            WHERE type = 'MATCH' AND thread_origin = 'INBOUND_LIKE'
          )::int AS classified_inbound_matches,
          count(*) FILTER (
            WHERE type = 'MATCH' AND thread_origin IS NULL
          )::int AS unclassified_matches,
          count(*) FILTER (
            WHERE type = 'MATCH' AND match_id IS NULL
          )::int AS match_interactions_without_row,
          count(*) FILTER (
            WHERE match_id IS NOT NULL
              AND linked.hinge_profile_id IS DISTINCT FROM
                filtered_interactions.hinge_profile_id
          )::int AS cross_profile_interaction_links
        FROM filtered_interactions
        LEFT JOIN match linked ON linked.id = filtered_interactions.match_id
        GROUP BY filtered_interactions.hinge_profile_id
      ),
      thread_links AS (
        SELECT
          hinge_profile_id,
          match_id,
          count(*) FILTER (WHERE type = 'LIKE_SENT')::int AS likes,
          count(*) FILTER (WHERE type = 'MATCH')::int AS matches
        FROM filtered_interactions
        WHERE match_id IS NOT NULL
        GROUP BY hinge_profile_id, match_id
      ),
      thread_agg AS (
        SELECT
          hinge_profile_id,
          coalesce(sum(matches) FILTER (WHERE likes > 0), 0)::int
            AS linked_outbound_matches,
          coalesce(sum(matches) FILTER (WHERE likes = 0), 0)::int
            AS linked_inbound_matches,
          count(*) FILTER (WHERE likes > 1 OR matches > 1)::int
            AS duplicate_match_thread_links
        FROM thread_links
        GROUP BY hinge_profile_id
      ),
      match_agg AS (
        SELECT
          m.hinge_profile_id,
          count(*)::int AS match_rows,
          count(*) FILTER (WHERE i.id IS NULL)::int
            AS match_rows_without_interaction
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        LEFT JOIN hinge_interaction i
          ON i.hinge_profile_id = m.hinge_profile_id
         AND i.match_id = m.id
         AND i.type = 'MATCH'
        GROUP BY m.hinge_profile_id
      ),
      message_agg AS (
        SELECT
          msg.hinge_profile_id,
          count(*) FILTER (WHERE msg."to" = 1)::int AS outgoing_messages,
          count(*) FILTER (WHERE msg."to" <> 1)::int AS non_outgoing_messages,
          count(*) FILTER (
            WHERE linked.hinge_profile_id IS DISTINCT FROM
              msg.hinge_profile_id
          )::int AS cross_profile_message_links
        FROM message msg
        JOIN candidates c ON c.hinge_profile_id = msg.hinge_profile_id
        LEFT JOIN match linked ON linked.id = msg.match_id
        GROUP BY msg.hinge_profile_id
      ),
      events AS (
        SELECT hinge_profile_id, timestamp AS event_at
        FROM filtered_interactions
        UNION ALL
        SELECT m.hinge_profile_id, m.matched_at
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        WHERE m.matched_at IS NOT NULL
        UNION ALL
        SELECT m.hinge_profile_id, m.initial_message_at
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        WHERE m.initial_message_at IS NOT NULL
        UNION ALL
        SELECT m.hinge_profile_id, m.last_message_at
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        WHERE m.last_message_at IS NOT NULL
        UNION ALL
        SELECT msg.hinge_profile_id, msg.sent_date
        FROM message msg
        JOIN candidates c ON c.hinge_profile_id = msg.hinge_profile_id
      ),
      event_agg AS (
        SELECT
          hinge_profile_id,
          min(event_at) AS first_event,
          max(event_at) AS last_event,
          count(*) FILTER (WHERE event_at > now())::int AS future_events
        FROM events
        GROUP BY hinge_profile_id
      ),
      upload_agg AS (
        SELECT
          c.hinge_profile_id,
          count(o.id)::int AS uploads,
          count(DISTINCT o.blob_url)::int AS distinct_blobs,
          min(o.created_at) AS first_upload_at,
          max(o.created_at) AS last_upload_at,
          count(*) FILTER (WHERE o.file IS NOT NULL)::int AS inline_files,
          count(*) FILTER (WHERE o.blob_url IS NOT NULL)::int AS blob_files
        FROM candidates c
        LEFT JOIN original_anonymized_file o
          ON o.user_id = c.user_id
         AND o.data_provider = 'HINGE'
        GROUP BY c.hinge_profile_id
      )
      SELECT
        c.hinge_profile_id AS hinge_id,
        c.gender::text AS gender,
        c.age_at_upload,
        c.country,
        c.swipe_likes_total AS stored_likes,
        c.matches_total AS stored_matches,
        c.messages_sent_total AS stored_messages_sent,
        c.match_rate AS stored_rate,
        c."from" AS meta_from,
        c."to" AS meta_to,
        c.computed_at,
        c.profile_created_at,
        c.profile_updated_at,
        coalesce(i.likes_sent, 0) AS likes_sent,
        coalesce(i.match_interactions, 0) AS match_interactions,
        coalesce(i.classified_outbound_matches, 0)
          AS classified_outbound_matches,
        coalesce(i.classified_inbound_matches, 0)
          AS classified_inbound_matches,
        coalesce(i.unclassified_matches, 0) AS unclassified_matches,
        coalesce(t.linked_outbound_matches, 0) AS linked_outbound_matches,
        coalesce(t.linked_inbound_matches, 0) AS linked_inbound_matches,
        coalesce(t.duplicate_match_thread_links, 0)
          AS duplicate_match_thread_links,
        coalesce(ma.match_rows, 0) AS match_rows,
        coalesce(msg.outgoing_messages, 0) AS outgoing_messages,
        coalesce(msg.non_outgoing_messages, 0) AS non_outgoing_messages,
        coalesce(i.match_interactions_without_row, 0)
          AS match_interactions_without_row,
        coalesce(ma.match_rows_without_interaction, 0)
          AS match_rows_without_interaction,
        coalesce(i.cross_profile_interaction_links, 0)
          AS cross_profile_interaction_links,
        coalesce(msg.cross_profile_message_links, 0)
          AS cross_profile_message_links,
        e.first_event,
        e.last_event,
        coalesce(e.future_events, 0) AS future_events,
        coalesce(u.uploads, 0) AS uploads,
        coalesce(u.distinct_blobs, 0) AS distinct_blobs,
        u.first_upload_at,
        u.last_upload_at,
        coalesce(u.inline_files, 0) AS inline_files,
        coalesce(u.blob_files, 0) AS blob_files
      FROM candidates c
      LEFT JOIN interaction_agg i USING (hinge_profile_id)
      LEFT JOIN thread_agg t USING (hinge_profile_id)
      LEFT JOIN match_agg ma USING (hinge_profile_id)
      LEFT JOIN message_agg msg USING (hinge_profile_id)
      LEFT JOIN event_agg e USING (hinge_profile_id)
      LEFT JOIN upload_agg u USING (hinge_profile_id)
      ORDER BY c.match_rate DESC, c.hinge_profile_id
    `,
  );
}

async function getIntegrity(
  tx: TransactionClient,
  hingeId: string | null,
): Promise<IntegrityRow> {
  const predicate = candidatePredicate(hingeId);

  return one<IntegrityRow>(
    tx,
    sql`
      WITH candidates AS (
        SELECT m.*, p.create_date, p.user_id
        FROM profile_meta m
        JOIN hinge_profile p ON p.hinge_id = m.hinge_profile_id
        WHERE m.hinge_profile_id IS NOT NULL AND ${predicate}
      ),
      meta_grain AS (
        SELECT hinge_profile_id, count(*)::int AS rows
        FROM profile_meta
        WHERE hinge_profile_id IN (
          SELECT hinge_profile_id FROM candidates
        )
        GROUP BY hinge_profile_id
      ),
      filtered_interactions AS (
        SELECT i.*
        FROM hinge_interaction i
        JOIN candidates c ON c.hinge_profile_id = i.hinge_profile_id
      ),
      interaction_agg AS (
        SELECT
          i.hinge_profile_id,
          count(*) FILTER (WHERE i.type = 'LIKE_SENT')::int AS likes,
          count(*) FILTER (WHERE i.type = 'MATCH')::int AS matches,
          count(*) FILTER (
            WHERE i.type = 'MATCH' AND linked.id IS NULL
          )::int AS match_interactions_without_row,
          count(*) FILTER (
            WHERE i.match_id IS NOT NULL
              AND linked.hinge_profile_id IS DISTINCT FROM i.hinge_profile_id
          )::int AS cross_profile_links
        FROM filtered_interactions i
        LEFT JOIN match linked ON linked.id = i.match_id
        GROUP BY i.hinge_profile_id
      ),
      thread_links AS (
        SELECT
          hinge_profile_id,
          match_id,
          count(*) FILTER (WHERE type = 'LIKE_SENT')::int AS likes,
          count(*) FILTER (WHERE type = 'MATCH')::int AS matches
        FROM filtered_interactions
        WHERE match_id IS NOT NULL
        GROUP BY hinge_profile_id, match_id
      ),
      invalid_thread_links AS (
        SELECT hinge_profile_id, count(*)::int AS invalid_links
        FROM thread_links
        WHERE likes > 1 OR matches > 1
        GROUP BY hinge_profile_id
      ),
      match_agg AS (
        SELECT
          m.hinge_profile_id,
          count(*)::int AS matches,
          count(*) FILTER (WHERE i.id IS NULL)::int
            AS match_rows_without_interaction
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        LEFT JOIN hinge_interaction i
          ON i.hinge_profile_id = m.hinge_profile_id
         AND i.match_id = m.id
         AND i.type = 'MATCH'
        GROUP BY m.hinge_profile_id
      ),
      message_agg AS (
        SELECT
          msg.hinge_profile_id,
          count(*) FILTER (WHERE msg."to" = 1)::int AS sent,
          count(*) FILTER (WHERE msg."to" <> 1)::int AS non_outgoing,
          count(*) FILTER (
            WHERE linked.hinge_profile_id IS DISTINCT FROM
              msg.hinge_profile_id
          )::int AS cross_profile_links
        FROM message msg
        JOIN candidates c ON c.hinge_profile_id = msg.hinge_profile_id
        LEFT JOIN match linked ON linked.id = msg.match_id
        GROUP BY msg.hinge_profile_id
      ),
      events AS (
        SELECT hinge_profile_id, timestamp AS event_at
        FROM filtered_interactions
        UNION ALL
        SELECT m.hinge_profile_id, m.matched_at
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        WHERE m.matched_at IS NOT NULL
        UNION ALL
        SELECT m.hinge_profile_id, m.initial_message_at
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        WHERE m.initial_message_at IS NOT NULL
        UNION ALL
        SELECT m.hinge_profile_id, m.last_message_at
        FROM match m
        JOIN candidates c ON c.hinge_profile_id = m.hinge_profile_id
        WHERE m.last_message_at IS NOT NULL
        UNION ALL
        SELECT msg.hinge_profile_id, msg.sent_date
        FROM message msg
        JOIN candidates c ON c.hinge_profile_id = msg.hinge_profile_id
      ),
      event_agg AS (
        SELECT
          hinge_profile_id,
          min(event_at) AS first_event,
          max(event_at) AS last_event,
          count(*) FILTER (WHERE event_at > now())::int AS future_events
        FROM events
        GROUP BY hinge_profile_id
      ),
      uploads AS (
        SELECT c.hinge_profile_id, max(o.created_at) AS last_upload_at
        FROM candidates c
        LEFT JOIN original_anonymized_file o
          ON o.user_id = c.user_id
         AND o.data_provider = 'HINGE'
        GROUP BY c.hinge_profile_id
      ),
      compared AS (
        SELECT
          c.*,
          coalesce(g.rows, 0) AS meta_rows,
          coalesce(i.likes, 0) AS raw_likes,
          coalesce(i.matches, 0) AS match_interactions,
          coalesce(i.match_interactions_without_row, 0)
            AS match_interactions_without_row,
          coalesce(i.cross_profile_links, 0)
            AS cross_profile_interaction_links,
          coalesce(il.invalid_links, 0) AS invalid_thread_links,
          coalesce(ma.matches, 0) AS match_rows,
          coalesce(ma.match_rows_without_interaction, 0)
            AS match_rows_without_interaction,
          coalesce(msg.sent, 0) AS messages_sent,
          coalesce(msg.non_outgoing, 0) AS non_outgoing_messages,
          coalesce(msg.cross_profile_links, 0)
            AS cross_profile_message_links,
          e.first_event,
          e.last_event,
          coalesce(e.future_events, 0) AS future_events,
          u.last_upload_at
        FROM candidates c
        LEFT JOIN meta_grain g USING (hinge_profile_id)
        LEFT JOIN interaction_agg i USING (hinge_profile_id)
        LEFT JOIN invalid_thread_links il USING (hinge_profile_id)
        LEFT JOIN match_agg ma USING (hinge_profile_id)
        LEFT JOIN message_agg msg USING (hinge_profile_id)
        LEFT JOIN event_agg e USING (hinge_profile_id)
        LEFT JOIN uploads u USING (hinge_profile_id)
      ),
      like_collisions AS (
        SELECT hinge_profile_id, timestamp
        FROM filtered_interactions
        WHERE type = 'LIKE_SENT'
        GROUP BY hinge_profile_id, timestamp
        HAVING count(*) > 1
      ),
      match_collisions AS (
        SELECT hinge_profile_id, timestamp
        FROM filtered_interactions
        WHERE type = 'MATCH'
        GROUP BY hinge_profile_id, timestamp
        HAVING count(*) > 1
      ),
      reject_collisions AS (
        SELECT hinge_profile_id, timestamp
        FROM filtered_interactions
        WHERE type = 'REJECT'
        GROUP BY hinge_profile_id, timestamp
        HAVING count(*) > 1
      ),
      unmatch_collisions AS (
        SELECT hinge_profile_id, timestamp
        FROM filtered_interactions
        WHERE type = 'UNMATCH'
        GROUP BY hinge_profile_id, timestamp
        HAVING count(*) > 1
      ),
      message_signature_collisions AS (
        SELECT
          msg.hinge_profile_id,
          msg.match_id,
          msg.sent_date,
          msg.content_raw,
          msg."to",
          count(*)::int AS rows
        FROM message msg
        JOIN candidates c ON c.hinge_profile_id = msg.hinge_profile_id
        GROUP BY
          msg.hinge_profile_id,
          msg.match_id,
          msg.sent_date,
          msg.content_raw,
          msg."to"
        HAVING count(*) > 1
      )
      SELECT
        count(*)::int AS profiles,
        count(*) FILTER (WHERE meta_rows <> 1)::int
          AS duplicate_meta_profiles,
        count(*) FILTER (
          WHERE swipe_likes_total <> raw_likes
        )::int AS stored_like_mismatches,
        count(*) FILTER (
          WHERE matches_total <> match_rows
        )::int AS stored_match_mismatches,
        count(*) FILTER (
          WHERE messages_sent_total <> messages_sent
        )::int AS stored_message_mismatches,
        count(*) FILTER (
          WHERE match_interactions <> match_rows
        )::int AS match_interaction_mismatches,
        coalesce(sum(match_interactions_without_row), 0)::int
          AS match_interactions_without_row,
        coalesce(sum(match_rows_without_interaction), 0)::int
          AS match_rows_without_interaction,
        coalesce(sum(cross_profile_interaction_links), 0)::int
          AS cross_profile_interaction_links,
        coalesce(sum(cross_profile_message_links), 0)::int
          AS cross_profile_message_links,
        count(*) FILTER (WHERE invalid_thread_links > 0)::int
          AS profiles_with_invalid_match_thread_links,
        count(*) FILTER (WHERE non_outgoing_messages > 0)::int
          AS profiles_with_non_outgoing_messages,
        count(*) FILTER (
          WHERE first_event < "from" OR last_event > "to"
        )::int AS profiles_with_events_outside_meta_range,
        count(*) FILTER (
          WHERE first_event < create_date
        )::int AS profiles_with_events_before_account_creation,
        count(*) FILTER (
          WHERE last_upload_at IS NOT NULL AND last_event > last_upload_at
        )::int AS profiles_with_events_after_last_upload,
        coalesce(sum(future_events), 0)::int AS future_events,
        (
          SELECT count(*)::int
          FROM filtered_interactions
          WHERE timestamp <> date_trunc(
            'milliseconds',
            timestamp_raw::timestamp
          )
        ) AS timestamp_precision_mismatches,
        (SELECT count(*)::int FROM like_collisions)
          AS like_timestamp_collision_groups,
        (SELECT count(*)::int FROM match_collisions)
          AS match_timestamp_collision_groups,
        (SELECT count(*)::int FROM message_signature_collisions)
          AS message_signature_collision_groups,
        (
          SELECT coalesce(sum(rows - 1), 0)::int
          FROM message_signature_collisions
        ) AS message_signature_collision_excess,
        (SELECT count(*)::int FROM reject_collisions)
          AS reject_timestamp_collision_groups,
        (SELECT count(*)::int FROM unmatch_collisions)
          AS unmatch_timestamp_collision_groups
      FROM compared
    `,
  );
}

async function getLatestBlobRows(
  tx: TransactionClient,
  hingeId: string | null,
): Promise<BlobRow[]> {
  const predicate = candidatePredicate(hingeId);

  return rows<BlobRow>(
    tx,
    sql`
      WITH candidates AS (
        SELECT m.hinge_profile_id, p.user_id
        FROM profile_meta m
        JOIN hinge_profile p ON p.hinge_id = m.hinge_profile_id
        WHERE m.hinge_profile_id IS NOT NULL AND ${predicate}
      ),
      ranked AS (
        SELECT
          c.hinge_profile_id,
          o.blob_url,
          row_number() OVER (
            PARTITION BY c.hinge_profile_id
            ORDER BY o.created_at DESC, o.id DESC
          ) AS recency
        FROM candidates c
        JOIN original_anonymized_file o
          ON o.user_id = c.user_id
         AND o.data_provider = 'HINGE'
        WHERE o.blob_url IS NOT NULL
      )
      SELECT hinge_profile_id AS hinge_id, blob_url
      FROM ranked
      WHERE recency = 1
      ORDER BY hinge_profile_id
    `,
  );
}

function countTimestampCollisions(values: string[]): number {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

function hasEntries<T>(values: T[] | undefined): values is T[] {
  return Array.isArray(values) && values.length > 0;
}

function inspectRawThreads(threads: ConversationThread[]) {
  let likesSent = 0;
  let allMatches = 0;
  let outboundLikeMatches = 0;
  let inboundLikeMatches = 0;
  const likeTimestamps: string[] = [];
  const matchTimestamps: string[] = [];

  for (const thread of threads) {
    const likes = thread.like;
    const matches = thread.match;
    const hasLike = hasEntries(likes);
    const hasMatch = hasEntries(matches);

    if (hasLike) {
      likesSent++;
      const timestamp = likes[0]?.timestamp;
      if (timestamp) likeTimestamps.push(timestamp);
    }

    if (hasMatch) {
      allMatches++;
      const timestamp = matches[0]?.timestamp;
      if (timestamp) matchTimestamps.push(timestamp);
      if (hasLike) outboundLikeMatches++;
      else inboundLikeMatches++;
    }
  }

  return {
    threads: threads.length,
    likesSent,
    allMatches,
    outboundLikeMatches,
    inboundLikeMatches,
    outboundLikeYield: ratio(outboundLikeMatches, likesSent),
    likeTimestampCollisionGroups: countTimestampCollisions(likeTimestamps),
    matchTimestampCollisionGroups: countTimestampCollisions(matchTimestamps),
  };
}

async function verifyBlobs(
  blobRows: BlobRow[],
  profilesById: Map<string, ProfileAudit>,
  showIds: boolean,
): Promise<BlobVerification[]> {
  const results: BlobVerification[] = [];

  for (const row of blobRows) {
    const profile = profilesById.get(row.hinge_id);
    try {
      const response = await fetch(row.blob_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AnonymizedHingeDataJSON;
      const raw = inspectRawThreads(
        Array.isArray(payload.Matches) ? payload.Matches : [],
      );

      results.push({
        profileId: visibleId(row.hinge_id, showIds),
        fetchStatus: "VERIFIED",
        raw,
        agreesWithPersisted: profile
          ? {
              likesSent: raw.likesSent === profile.stored.likesSent,
              allMatches: raw.allMatches === profile.stored.allMatches,
              outboundLikeMatches:
                raw.outboundLikeMatches ===
                profile.reconstructedSemantics.outboundLikeMatches,
            }
          : undefined,
      });
    } catch (error) {
      results.push({
        profileId: visibleId(row.hinge_id, showIds),
        fetchStatus: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function classifyProfile(row: ProfileRow): ProfileAudit["classification"] {
  const likes = number(row.likes_sent);
  const matches = number(row.match_rows);
  const outboundMatches = number(row.linked_outbound_matches);
  const inferredYield = ratio(outboundMatches, likes);
  const storedRate = number(row.stored_rate);
  const allMatchYield = ratio(matches, likes);

  const coreIntegrityIssue =
    number(row.stored_likes) !== likes ||
    number(row.stored_matches) !== matches ||
    number(row.stored_messages_sent) !== number(row.outgoing_messages) ||
    number(row.match_interactions) !== matches ||
    number(row.duplicate_match_thread_links) > 0 ||
    number(row.match_interactions_without_row) > 0 ||
    number(row.match_rows_without_interaction) > 0 ||
    number(row.cross_profile_interaction_links) > 0 ||
    number(row.cross_profile_message_links) > 0 ||
    number(row.non_outgoing_messages) > 0 ||
    iso(row.first_event) < iso(row.meta_from) ||
    iso(row.last_event) > iso(row.meta_to) ||
    number(row.future_events) > 0;

  const reasons: string[] = [];
  let primary: ProfileAudit["classification"]["primary"];
  let confidence: ProfileAudit["classification"]["confidence"] = "HIGH";

  if (coreIntegrityIssue) {
    primary = "PERSISTED_INTEGRITY_ANOMALY";
    confidence = "MEDIUM";
    reasons.push("One or more persisted-grain or referential checks failed.");
  } else if (inferredYield > 1) {
    primary = "SOURCE_DUPLICATION_OR_CORRUPTION";
    confidence = "MEDIUM";
    reasons.push(
      "More outbound match threads than outbound like threads remain after reconstructing thread origin.",
    );
  } else if (
    Math.abs(storedRate - allMatchYield) < 1e-12 &&
    number(row.unclassified_matches) === matches &&
    iso(row.computed_at).slice(0, 10) < HINGE_LIFECYCLE_SEMANTICS_DATE
  ) {
    primary = "STALE_LEGACY_SEMANTICS";
    reasons.push(
      "Stored match_rate exactly equals all matches divided by outbound likes.",
      "Every persisted match predates thread-origin classification and is still unclassified.",
      "Match-ID linkage reconstructs inbound and outbound origins without a rate above one.",
    );
  } else {
    primary = "SEMANTIC_MISMATCH";
    reasons.push(
      "All-match yield is unbounded because inbound matches are not caused by likes the user sent.",
    );
  }

  if (likes < 100) {
    reasons.push(
      `The outbound-like denominator is low (${likes}), amplifying the displayed legacy ratio.`,
    );
  }

  return {
    primary,
    confidence,
    lowDenominator: likes < 100,
    reasons,
  };
}

function toProfileAudit(row: ProfileRow, showIds: boolean): ProfileAudit {
  const likes = number(row.likes_sent);
  const matches = number(row.match_rows);
  const outboundMatches = number(row.linked_outbound_matches);

  return {
    profileId: visibleId(row.hinge_id, showIds),
    gender: row.gender,
    ageAtUpload: number(row.age_at_upload),
    country: row.country,
    stored: {
      likesSent: number(row.stored_likes),
      allMatches: number(row.stored_matches),
      messagesSent: number(row.stored_messages_sent),
      matchRate: number(row.stored_rate),
      from: iso(row.meta_from),
      to: iso(row.meta_to),
      computedAt: iso(row.computed_at),
    },
    reconstructedSemantics: {
      allMatchYield: ratio(matches, likes),
      outboundLikeMatches: outboundMatches,
      inboundLikeMatches: number(row.linked_inbound_matches),
      outboundLikeYield: ratio(outboundMatches, likes),
      unclassifiedMatchInteractions: number(row.unclassified_matches),
    },
    persistedIntegrity: {
      coreTotalsAgree:
        number(row.stored_likes) === likes &&
        number(row.stored_matches) === matches &&
        number(row.stored_messages_sent) === number(row.outgoing_messages),
      matchRowsAgreeWithInteractions:
        number(row.match_interactions) === matches,
      matchThreadLinksAreOneToOne:
        number(row.duplicate_match_thread_links) === 0,
      allMessagesAreOutgoing: number(row.non_outgoing_messages) === 0,
      referentialLinksAgree:
        number(row.match_interactions_without_row) === 0 &&
        number(row.match_rows_without_interaction) === 0 &&
        number(row.cross_profile_interaction_links) === 0 &&
        number(row.cross_profile_message_links) === 0,
      eventsInsideMetaRange:
        iso(row.first_event) >= iso(row.meta_from) &&
        iso(row.last_event) <= iso(row.meta_to),
      noFutureEvents: number(row.future_events) === 0,
    },
    uploadEvidence: {
      uploads: number(row.uploads),
      distinctBlobs: number(row.distinct_blobs),
      firstUploadAt: nullableIso(row.first_upload_at),
      lastUploadAt: nullableIso(row.last_upload_at),
      profileCreatedAt: iso(row.profile_created_at),
      profileUpdatedAt: iso(row.profile_updated_at),
    },
    classification: classifyProfile(row),
  };
}

function summarizeProfiles(profiles: ProfileAudit[]) {
  const sum = (get: (profile: ProfileAudit) => number) =>
    profiles.reduce((total, profile) => total + get(profile), 0);
  const likes = sum((profile) => profile.stored.likesSent);
  const matches = sum((profile) => profile.stored.allMatches);
  const outboundMatches = sum(
    (profile) => profile.reconstructedSemantics.outboundLikeMatches,
  );
  const inboundMatches = sum(
    (profile) => profile.reconstructedSemantics.inboundLikeMatches,
  );

  return {
    profiles: profiles.length,
    profilesByClassification: Object.fromEntries(
      [
        "STALE_LEGACY_SEMANTICS",
        "SEMANTIC_MISMATCH",
        "PERSISTED_INTEGRITY_ANOMALY",
        "SOURCE_DUPLICATION_OR_CORRUPTION",
      ].map((classification) => [
        classification,
        profiles.filter(
          (profile) => profile.classification.primary === classification,
        ).length,
      ]),
    ),
    profilesByGender: Object.fromEntries(
      [...new Set(profiles.map((profile) => profile.gender))].map((gender) => [
        gender,
        profiles.filter((profile) => profile.gender === gender).length,
      ]),
    ),
    lowDenominator: {
      below10Likes: profiles.filter((profile) => profile.stored.likesSent < 10)
        .length,
      below50Likes: profiles.filter((profile) => profile.stored.likesSent < 50)
        .length,
      below100Likes: profiles.filter(
        (profile) => profile.stored.likesSent < 100,
      ).length,
    },
    pooled: {
      likesSent: likes,
      allMatches: matches,
      outboundLikeMatches: outboundMatches,
      inboundLikeMatches: inboundMatches,
      legacyAllMatchYield: ratio(matches, likes),
      reconstructedOutboundLikeYield: ratio(outboundMatches, likes),
    },
  };
}

function serializePopulation(row: PopulationRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, number(value)]),
  );
}

function serializeIntegrity(row: IntegrityRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, number(value)]),
  );
}

function printHuman(result: Record<string, unknown>): void {
  const summary = result.summary as ReturnType<typeof summarizeProfiles>;
  const population = result.population as Record<string, number>;
  const integrity = result.integrity as Record<string, number>;
  const profiles = result.profiles as ProfileAudit[];
  const blobVerification = result.blobVerification as
    | BlobVerification[]
    | undefined;

  printHeading("Hinge >100% profile_meta audit");
  console.log(`As of: ${String(result.asOf)}`);
  console.log(
    `Selected: ${summary.profiles}; stale legacy semantics: ${summary.profilesByClassification.STALE_LEGACY_SEMANTICS ?? 0}`,
  );
  console.log(
    `Pooled legacy yield: ${(summary.pooled.legacyAllMatchYield * 100).toFixed(1)}%; reconstructed outbound-like yield: ${(summary.pooled.reconstructedOutboundLikeYield * 100).toFixed(1)}%`,
  );
  console.log(
    `Inbound matches mixed into legacy numerator: ${summary.pooled.inboundLikeMatches.toLocaleString()} of ${summary.pooled.allMatches.toLocaleString()}`,
  );
  console.log(
    `Low denominators: ${summary.lowDenominator.below100Likes}/${summary.profiles} below 100 likes (${summary.lowDenominator.below10Likes} below 10).`,
  );

  printHeading("Population context");
  console.table([population]);

  printHeading("Persisted integrity checks");
  console.table([integrity]);

  printHeading("Selected profiles");
  console.table(
    profiles.map((profile) => ({
      profile: profile.profileId,
      gender: profile.gender,
      likes: profile.stored.likesSent,
      matches: profile.stored.allMatches,
      stored: profile.stored.matchRate.toFixed(3),
      outboundMatches: profile.reconstructedSemantics.outboundLikeMatches,
      inboundMatches: profile.reconstructedSemantics.inboundLikeMatches,
      outboundYield:
        profile.reconstructedSemantics.outboundLikeYield.toFixed(3),
      uploads: profile.uploadEvidence.uploads,
      classification: profile.classification.primary,
    })),
  );

  if (blobVerification) {
    printHeading("Latest source-blob verification");
    console.table(
      blobVerification.map((verification) => ({
        profile: verification.profileId,
        status: verification.fetchStatus,
        likesAgree: verification.agreesWithPersisted?.likesSent ?? false,
        matchesAgree: verification.agreesWithPersisted?.allMatches ?? false,
        outboundAgree:
          verification.agreesWithPersisted?.outboundLikeMatches ?? false,
      })),
    );
  }

  printHeading("Conclusion");
  for (const conclusion of result.conclusions as string[]) {
    console.log(`- ${conclusion}`);
  }
  console.log("\nAll database queries ran in a read-only transaction.");
}

async function main(): Promise<void> {
  const hingeId = getFlagValue("--hinge-id");
  const showIds = hasFlag("--show-ids");
  const shouldVerifyBlobs = hasFlag("--verify-blobs");

  const databaseResult = await withTransaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);

    const population = await getPopulation(tx);
    const profileRows = await getProfiles(tx, hingeId);
    const integrity = await getIntegrity(tx, hingeId);
    const blobRows = shouldVerifyBlobs
      ? await getLatestBlobRows(tx, hingeId)
      : [];

    return { population, profileRows, integrity, blobRows };
  });

  if (databaseResult.profileRows.length === 0) {
    throw new Error(
      hingeId
        ? `No Hinge profile_meta row found for ${hingeId}.`
        : "No Hinge profile_meta rows have a stored match_rate above one.",
    );
  }

  const profiles = databaseResult.profileRows.map((row) =>
    toProfileAudit(row, showIds),
  );
  const profilesById = new Map(
    databaseResult.profileRows.map((row, index) => [
      row.hinge_id,
      profiles[index]!,
    ]),
  );
  const blobVerification = shouldVerifyBlobs
    ? await verifyBlobs(databaseResult.blobRows, profilesById, showIds)
    : undefined;
  const blobAgreements = blobVerification?.filter(
    (verification) =>
      verification.fetchStatus === "VERIFIED" &&
      verification.agreesWithPersisted?.likesSent &&
      verification.agreesWithPersisted.allMatches &&
      verification.agreesWithPersisted.outboundLikeMatches,
  ).length;
  const summary = summarizeProfiles(profiles);
  const integrity = serializeIntegrity(databaseResult.integrity);

  const result = {
    auditVersion: "hinge-over-100-audit-v1",
    asOf: new Date().toISOString(),
    selection: hingeId
      ? { hingeId: visibleId(hingeId, showIds) }
      : { storedProfileMetaMatchRateGreaterThan: 1 },
    metricSemantics: {
      legacyStoredNumerator: "all Hinge match threads",
      denominator: "Hinge threads containing an outbound like",
      reconstructedNumerator:
        "match threads sharing match_id with a LIKE_SENT interaction",
      explanation:
        "A Hinge match without a like in the same export thread is an inbound-like match. Including it over outbound likes makes the legacy ratio unbounded.",
      lifecycleSemanticsIntroducedInCode: HINGE_LIFECYCLE_SEMANTICS_DATE,
    },
    population: serializePopulation(databaseResult.population),
    summary,
    integrity,
    blobVerification,
    profiles,
    conclusions: [
      `${summary.profilesByClassification.STALE_LEGACY_SEMANTICS ?? 0} of ${summary.profiles} selected rows are stale legacy semantics, not corrupted match/like facts.`,
      `The old numerator contains ${summary.pooled.inboundLikeMatches.toLocaleString()} inbound-like matches. Reconstructing only outbound-like matches changes the pooled yield from ${(summary.pooled.legacyAllMatchYield * 100).toFixed(1)}% to ${(summary.pooled.reconstructedOutboundLikeYield * 100).toFixed(1)}%.`,
      `${summary.lowDenominator.below100Likes} profiles have fewer than 100 likes, which amplifies the old semantic mismatch but does not create it.`,
      `Core stored totals, match-thread links, provider keys, event ranges, timestamp millisecond serialization, and cross-table references have ${
        Object.values(integrity)
          .slice(1, 14)
          .every((value) => value === 0)
          ? "no blocking mismatches"
          : "one or more mismatches to inspect"
      }.`,
      `${integrity.message_signature_collision_groups ?? 0} repeated message signatures and ${integrity.reject_timestamp_collision_groups ?? 0} repeated reject timestamps are ancillary source/export ambiguities; neither participates in match-yield numerator or denominator.`,
      shouldVerifyBlobs
        ? `${blobAgreements ?? 0} of ${profiles.length} latest source blobs agree with persisted like, match, and reconstructed outbound-match counts.`
        : "Run with --verify-blobs to compare the latest linked source export without printing blob URLs or message content.",
      "Do not rank Hinge with Tinder's match-yield contract. Recompute stale Hinge meta after origin classification, and version a Hinge-native outbound-like conversion metric separately if it becomes a product metric.",
    ],
  };

  if (hasFlag("--json")) printJson(result);
  else printHuman(result);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
