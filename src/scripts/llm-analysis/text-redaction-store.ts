import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { z } from "zod";
import {
  textProfileSchema,
  type Conversation,
} from "@/lib/research/text-redaction";
import {
  digest,
  TEXT_PIPELINE_DIGEST,
  type TextCohortMember,
  type TextRedactionReceipt,
} from "@/lib/research/text-redaction-state";

const conversationSchema = textProfileSchema.shape.conversations.element;
const rowSchema = z.object({
  id: z.string(),
  receipt: z.unknown(),
  messages: z.array(
    conversationSchema.shape.messages.element.extend({
      sanitized: z.string().nullable(),
    }),
  ),
});
export type StoredConversation = {
  source: Conversation;
  sanitized: Conversation | null;
  receipt: unknown;
};
function parseRow(row: unknown): StoredConversation {
  const parsed = rowSchema.parse(row);
  return {
    source: {
      id: parsed.id,
      messages: parsed.messages.map(({ sanitized: _sanitized, ...m }) => m),
    },
    sanitized: parsed.messages.some((m) => m.sanitized === null)
      ? null
      : {
          id: parsed.id,
          messages: parsed.messages.map(({ sanitized, ...m }) => ({
            ...m,
            content: sanitized!,
          })),
        },
    receipt: parsed.receipt,
  };
}
export function createTextStore(connectionString: string) {
  neonConfig.fetchFunction = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => fetch(input, { ...init, signal: AbortSignal.timeout(60000) });
  const sql = neon(connectionString);
  const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  // DOM typings omit Bun's proxy-capable WebSocket constructor overload.
  const BunWebSocket = WebSocket as unknown as new (
    url: string,
    options: { protocols?: string | string[]; proxy: string },
  ) => WebSocket;
  neonConfig.webSocketConstructor =
    proxy && typeof Bun !== "undefined"
      ? class extends BunWebSocket {
          constructor(url: string, protocols?: string | string[]) {
            super(url, { protocols, proxy: proxy! });
          }
        }
      : ws;
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 15000,
    query_timeout: 60000,
  });
  const ownerColumn = (member: TextCohortMember) =>
    member.provider === "TINDER" ? "tinder_profile_id" : "hinge_profile_id";
  const selection = `m.id, m.text_redaction AS receipt, coalesce(jsonb_agg(jsonb_build_object(
    'id', msg.id, 'content', msg.content, 'sanitized', msg.content_sanitized,
    'order', msg."order", 'sentDate', msg.sent_date_raw, 'messageType', msg.message_type
    ) ORDER BY msg."order", msg.id) FILTER (WHERE msg.id IS NOT NULL), '[]'::jsonb) AS messages`;
  return {
    close: () => pool.end(),
    async pendingMembers(): Promise<TextCohortMember[]> {
      const rows =
        await sql`SELECT DISTINCT tinder_profile_id, hinge_profile_id FROM match m
        WHERE (m.tinder_profile_id IS NOT NULL OR m.hinge_profile_id IS NOT NULL)
        AND (m.text_redaction IS NULL OR m.text_redaction->>'pipeline' IS DISTINCT FROM ${TEXT_PIPELINE_DIGEST}
          OR EXISTS (SELECT 1 FROM message msg WHERE msg.match_id=m.id AND msg.content_sanitized IS NULL))`;
      return rows
        .map((row) => {
          const provider = row.tinder_profile_id
            ? ("TINDER" as const)
            : ("HINGE" as const);
          const sourceId = String(
            row.tinder_profile_id ?? row.hinge_profile_id,
          );
          return {
            provider,
            sourceId,
            profileId: digest([provider, sourceId]),
          };
        })
        .sort((a, b) =>
          `${a.provider}:${a.sourceId}`.localeCompare(
            `${b.provider}:${b.sourceId}`,
          ),
        );
    },
    async preflight(members: TextCohortMember[]) {
      const totals = {
        profiles: 0,
        conversations: 0,
        nonemptyConversations: 0,
        messages: 0,
        unsanitized_messages: 0,
      };
      // Bound requests as well as results, including the fixed Ali mapping.
      for (let offset = 0; offset < members.length; offset += 100) {
        const selectedMembers = members
          .slice(offset, offset + 100)
          .map(({ sourceId, provider }) => ({ sourceId, provider }));
        const rows = await sql`WITH members AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(selectedMembers)}::jsonb) AS x("sourceId" text, provider text)
      ), selected AS (
        SELECT m.id FROM members x JOIN match m ON m.tinder_profile_id=x."sourceId" WHERE x.provider='TINDER'
        UNION ALL
        SELECT m.id FROM members x JOIN match m ON m.hinge_profile_id=x."sourceId" WHERE x.provider='HINGE'
      ) SELECT
        (SELECT count(*)::int FROM members x WHERE
          (x.provider='TINDER' AND EXISTS(SELECT 1 FROM tinder_profile p WHERE p.tinder_id=x."sourceId")) OR
          (x.provider='HINGE' AND EXISTS(SELECT 1 FROM hinge_profile p WHERE p.hinge_id=x."sourceId"))) AS profiles,
        count(DISTINCT m.id)::int AS conversations, count(msg.id)::int AS messages,
        count(DISTINCT m.id) FILTER (WHERE msg.id IS NOT NULL)::int AS "nonemptyConversations",
        count(msg.id) FILTER (WHERE msg.content_sanitized IS NULL)::int AS unsanitized_messages
      FROM selected m LEFT JOIN message msg ON msg.match_id=m.id`;
        const result = z
          .object({
            profiles: z.number(),
            conversations: z.number(),
            nonemptyConversations: z.number(),
            messages: z.number(),
            unsanitized_messages: z.number(),
          })
          .parse(rows[0]);
        for (const key of Object.keys(totals) as (keyof typeof totals)[])
          totals[key] += result[key];
      }
      if (totals.profiles !== members.length)
        throw new Error("Cohort members missing from selected database");
      return totals;
    },
    async page(
      member: TextCohortMember,
      after: string,
    ): Promise<StoredConversation[]> {
      // IDs are keyset-paginated; one joined statement gives a consistent source
      // and receipt snapshot. Never aggregate a whole profile into one response.
      const rows = await sql(
        `WITH batch AS (SELECT * FROM match WHERE ${ownerColumn(member)}=$1 AND id>$2 ORDER BY id LIMIT 32)
        SELECT ${selection} FROM batch m LEFT JOIN message msg ON msg.match_id=m.id
        GROUP BY m.id, m.text_redaction ORDER BY m.id`,
        [member.sourceId, after],
      );
      return rows.map(parseRow);
    },
    async saveBatch(
      member: TextCohortMember,
      entries: { sanitized: Conversation; receipt: TextRedactionReceipt }[],
    ) {
      if (!entries.length) return;
      for (const { sanitized, receipt } of entries)
        if (digest(sanitized) !== receipt.outputDigest)
          throw new Error("Sanitized output does not match receipt");
      const messages = entries.flatMap(({ sanitized }) =>
        sanitized.messages.map((message) => ({
          id: message.id,
          match_id: sanitized.id,
          content: message.content,
        })),
      );
      const receipts = entries.map(({ sanitized, receipt }) => ({
        id: sanitized.id,
        receipt,
      }));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // This is an offline materialization. The exporter checks source and
        // output digests before releasing text; no source reread is needed here.
        // Keep text and receipts atomic so a failed page can simply be retried.
        const updatedMessages = await client.query(
          `UPDATE message m SET content_sanitized=x.content
          FROM jsonb_to_recordset($1::jsonb) AS x(id text, match_id text, content text), match owner
          WHERE m.id=x.id AND m.match_id=x.match_id AND owner.id=m.match_id
            AND owner.${ownerColumn(member)}=$2`,
          [JSON.stringify(messages), member.sourceId],
        );
        if (updatedMessages.rowCount !== messages.length)
          throw new Error(
            "Message count or ownership changed while saving page",
          );
        const updatedMatches = await client.query(
          `UPDATE match SET text_redaction=x.receipt
          FROM jsonb_to_recordset($1::jsonb) AS x(id text, receipt jsonb)
          WHERE match.id=x.id AND match.${ownerColumn(member)}=$2`,
          [JSON.stringify(receipts), member.sourceId],
        );
        if (updatedMatches.rowCount !== entries.length)
          throw new Error(
            "Conversation count or ownership changed while saving page",
          );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
