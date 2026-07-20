import { sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";

import {
  getIntegerFlag,
  hasFlag,
  printHeading,
  printJson,
  printRows,
} from "./utils";

interface HingeLikeLinkCollisionRow extends Record<string, unknown> {
  hinge_profile_id: string;
  event_timestamp: Date | string;
  comment_is_null: boolean;
  comment_length: number | string;
  comment_fingerprint: string;
  unlinked_count: number | string;
  linked_count: number | string;
  occurrence_count: number | string;
  unlinked_ids: string[];
  linked_ids: string[];
  linked_match_ids: string[];
  total_collision_keys: number | string;
}

/**
 * Find exact timestamp/comment LIKE_SENT keys that have both pending and linked
 * rows. These can be a historical progressive-link duplicate, but equal
 * occurrences can also be legitimate, so this audit is deliberately read-only.
 * Comment text is grouped exactly but emitted only as a fingerprint.
 */
export function buildHingeLikeLinkCollisionAuditQuery(
  limit: number,
): SQL<unknown> {
  return sql`
    WITH collision_keys AS (
      SELECT
        hinge_profile_id,
        timestamp AS event_timestamp,
        comment,
        count(*) FILTER (WHERE match_id IS NULL)::int AS unlinked_count,
        count(*) FILTER (WHERE match_id IS NOT NULL)::int AS linked_count,
        count(*)::int AS occurrence_count,
        array_agg(id ORDER BY id) FILTER (
          WHERE match_id IS NULL
        ) AS unlinked_ids,
        array_agg(id ORDER BY id) FILTER (
          WHERE match_id IS NOT NULL
        ) AS linked_ids,
        array_agg(DISTINCT match_id ORDER BY match_id) FILTER (
          WHERE match_id IS NOT NULL
        ) AS linked_match_ids
      FROM hinge_interaction
      WHERE type = 'LIKE_SENT'
      GROUP BY hinge_profile_id, timestamp, comment
      HAVING bool_or(match_id IS NULL)
        AND bool_or(match_id IS NOT NULL)
    )
    SELECT
      hinge_profile_id,
      event_timestamp,
      comment IS NULL AS comment_is_null,
      length(coalesce(comment, ''))::int AS comment_length,
      md5(coalesce(comment, '')) AS comment_fingerprint,
      unlinked_count,
      linked_count,
      occurrence_count,
      unlinked_ids,
      linked_ids,
      linked_match_ids,
      count(*) OVER ()::int AS total_collision_keys
    FROM collision_keys
    ORDER BY event_timestamp, hinge_profile_id, comment_fingerprint
    LIMIT ${limit}
  `;
}

export async function auditHingeLikeLinkCollisions(
  limit = 100,
): Promise<HingeLikeLinkCollisionRow[]> {
  const result = (await db.execute(
    buildHingeLikeLinkCollisionAuditQuery(limit),
  )) as unknown as { rows: HingeLikeLinkCollisionRow[] };
  return result.rows;
}

async function main(): Promise<void> {
  const limit = getIntegerFlag("--limit") ?? 100;
  if (limit < 1) throw new Error("--limit must be at least 1.");

  const rows = await auditHingeLikeLinkCollisions(limit);
  const totalCollisionKeys = Number(rows[0]?.total_collision_keys ?? 0);

  if (hasFlag("--json")) {
    printJson({
      mode: "read-only",
      totalCollisionKeys,
      returnedKeys: rows.length,
      rows,
    });
    return;
  }

  printHeading("Hinge pending-to-matched like collision audit");
  printRows([
    ["mode", "read-only"],
    ["collision keys", totalCollisionKeys],
    ["returned keys", rows.length],
    ["limit", limit],
  ]);
  if (rows.length > 0) console.table(rows);
  console.log(
    "No rows were changed. Exact duplicate occurrences are ambiguous and require manual review.",
  );
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
