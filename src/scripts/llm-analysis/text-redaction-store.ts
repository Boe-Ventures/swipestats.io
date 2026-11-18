import {
  neon,
  neonConfig,
  Pool,
  type PoolClient,
} from "@neondatabase/serverless";
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
  const lock = async (client: PoolClient, member: TextCohortMember) => {
    const prefix =
      member.provider === "TINDER"
        ? "tinder-profile-upload"
        : "hinge-profile-upload";
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${prefix}:${member.sourceId}`],
    );
  };
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
    async save(
      member: TextCohortMember,
      source: Conversation,
      sanitized: Conversation,
      receipt: TextRedactionReceipt,
    ) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await lock(client, member);
        await client.query(
          `SELECT id FROM match WHERE id=$1 AND ${ownerColumn(member)}=$2 FOR UPDATE`,
          [source.id, member.sourceId],
        );
        await client.query(
          "SELECT id FROM message WHERE match_id=$1 FOR UPDATE",
          [source.id],
        );
        // Same ingestion lock + a fresh read prevents saving over a repeat upload.
        const current = await client.query(
          `SELECT ${selection} FROM match m LEFT JOIN message msg ON msg.match_id=m.id
          WHERE m.id=$1 AND m.${ownerColumn(member)}=$2 GROUP BY m.id, m.text_redaction`,
          [source.id, member.sourceId],
        );
        if (
          current.rows.length !== 1 ||
          digest(parseRow(current.rows[0]).source) !== receipt.inputDigest ||
          digest(source) !== receipt.inputDigest ||
          digest(sanitized) !== receipt.outputDigest
        )
          throw new Error(
            "Source changed during redaction; retry this conversation",
          );
        const update = await client.query(
          `UPDATE message m SET content_sanitized=x.content
          FROM jsonb_to_recordset($1::jsonb) AS x(id text, content text)
          WHERE m.id=x.id AND m.match_id=$2`,
          [
            JSON.stringify(
              sanitized.messages.map(({ id, content }) => ({ id, content })),
            ),
            source.id,
          ],
        );
        if (update.rowCount !== source.messages.length)
          throw new Error("Message count changed while saving");
        await client.query(
          "UPDATE match SET text_redaction=$1::jsonb WHERE id=$2",
          [JSON.stringify(receipt), source.id],
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
