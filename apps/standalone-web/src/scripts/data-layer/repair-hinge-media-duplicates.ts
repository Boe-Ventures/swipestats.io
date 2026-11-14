import { sql } from "drizzle-orm";

import { db, withTransaction, type TransactionClient } from "@/server/db";
import { swipeRankBuildLockName } from "@/server/services/swipe-rank/constants";

import { hasFlag, printHeading, printJson, printRows } from "./utils";

interface DuplicateMediaAuditRow extends Record<string, unknown> {
  duplicate_groups: number | string;
  affected_profiles: number | string;
  extra_rows: number | string;
}

interface DeletedMediaRow extends Record<string, unknown> {
  id: string;
}

interface EvidenceAuditRow extends Record<string, unknown> {
  evidence_gaps: number | string;
  evidence_conflicts: number | string;
}

function rankedHingeMedia(): ReturnType<typeof sql> {
  return sql`
    SELECT
      media.id,
      media.hinge_profile_id,
      media.url,
      media.prompt,
      media.from_so_me,
      media.caption,
      media.type,
      row_number() OVER (
        PARTITION BY media.hinge_profile_id, media.url
        ORDER BY
          (nullif(btrim(media.prompt), '') IS NOT NULL) DESC,
          (media.from_so_me IS NOT NULL) DESC,
          (nullif(btrim(media.caption), '') IS NOT NULL) DESC,
          (nullif(btrim(media.type), '') IS NOT NULL) DESC,
          media.id
      ) AS occurrence,
      count(*) OVER (
        PARTITION BY media.hinge_profile_id, media.url
      ) AS occurrence_count
    FROM media
    WHERE media.hinge_profile_id IS NOT NULL
  `;
}

function duplicateHingeMediaEvidence(): ReturnType<typeof sql> {
  return sql`
    SELECT
      hinge_profile_id,
      url,
      max(id) FILTER (WHERE occurrence = 1) AS winner_id,
      (
        array_agg(nullif(btrim(prompt), '') ORDER BY id)
          FILTER (WHERE nullif(btrim(prompt), '') IS NOT NULL)
      )[1] AS merged_prompt,
      bool_or(from_so_me) FILTER (
        WHERE from_so_me IS NOT NULL
      ) AS merged_from_so_me,
      (
        array_agg(nullif(btrim(caption), '') ORDER BY id)
          FILTER (WHERE nullif(btrim(caption), '') IS NOT NULL)
      )[1] AS merged_caption,
      (
        array_agg(nullif(btrim(type), '') ORDER BY id)
          FILTER (WHERE nullif(btrim(type), '') IS NOT NULL)
      )[1] AS merged_type,
      count(DISTINCT nullif(btrim(prompt), '')) FILTER (
        WHERE nullif(btrim(prompt), '') IS NOT NULL
      ) AS prompt_value_count,
      count(DISTINCT nullif(btrim(caption), '')) FILTER (
        WHERE nullif(btrim(caption), '') IS NOT NULL
      ) AS caption_value_count,
      count(DISTINCT nullif(btrim(type), '')) FILTER (
        WHERE nullif(btrim(type), '') IS NOT NULL
      ) AS type_value_count
    FROM ranked
    WHERE occurrence_count > 1
    GROUP BY hinge_profile_id, url
  `;
}

/** Fill every missing winner field from deterministic complementary evidence. */
export function buildHingeMediaEvidenceMergeQuery(): ReturnType<typeof sql> {
  return sql`
    WITH
      ranked AS (${rankedHingeMedia()}),
      duplicate_evidence AS (${duplicateHingeMediaEvidence()})
    UPDATE media AS winner
    SET
      prompt = coalesce(
        nullif(btrim(winner.prompt), ''),
        duplicate_evidence.merged_prompt
      ),
      from_so_me = coalesce(
        winner.from_so_me,
        duplicate_evidence.merged_from_so_me
      ),
      caption = coalesce(
        nullif(btrim(winner.caption), ''),
        duplicate_evidence.merged_caption
      ),
      type = coalesce(
        nullif(btrim(winner.type), ''),
        duplicate_evidence.merged_type,
        winner.type
      )
    FROM duplicate_evidence
    WHERE winner.id = duplicate_evidence.winner_id
    RETURNING winner.id
  `;
}

/** Assert complementary evidence reached the winner before any row is lost. */
export function buildHingeMediaEvidenceAuditQuery(): ReturnType<typeof sql> {
  return sql`
    WITH
      ranked AS (${rankedHingeMedia()}),
      duplicate_evidence AS (${duplicateHingeMediaEvidence()})
    SELECT
      count(*) FILTER (
        WHERE
          (
            duplicate_evidence.merged_prompt IS NOT NULL
            AND nullif(btrim(winner.prompt), '') IS NULL
          )
          OR (
            duplicate_evidence.merged_from_so_me IS NOT NULL
            AND winner.from_so_me IS NULL
          )
          OR (
            duplicate_evidence.merged_caption IS NOT NULL
            AND nullif(btrim(winner.caption), '') IS NULL
          )
          OR (
            duplicate_evidence.merged_type IS NOT NULL
            AND nullif(btrim(winner.type), '') IS NULL
          )
      )::int AS evidence_gaps,
      count(*) FILTER (
        WHERE duplicate_evidence.prompt_value_count > 1
          OR duplicate_evidence.caption_value_count > 1
          OR duplicate_evidence.type_value_count > 1
      )::int AS evidence_conflicts
    FROM duplicate_evidence
    JOIN media AS winner ON winner.id = duplicate_evidence.winner_id
  `;
}

export function assertHingeMediaEvidencePostconditions(
  row: EvidenceAuditRow | undefined,
): void {
  const evidenceGaps = Number(row?.evidence_gaps ?? 0);
  const evidenceConflicts = Number(row?.evidence_conflicts ?? 0);
  if (evidenceGaps !== 0 || evidenceConflicts !== 0) {
    throw new Error(
      "Hinge media duplicate repair postcondition failed: " +
        `${evidenceGaps} winner rows still lack complementary evidence; ` +
        `${evidenceConflicts} duplicate groups contain conflicting nonblank values.`,
    );
  }
}

async function auditDuplicates(
  executor: typeof db | TransactionClient = db,
): Promise<{
  duplicateGroups: number;
  affectedProfiles: number;
  extraRows: number;
}> {
  const result = (await executor.execute(sql`
    WITH ranked AS (${rankedHingeMedia()})
    SELECT
      count(*) FILTER (WHERE occurrence = 1 AND occurrence_count > 1)::int
        AS duplicate_groups,
      count(DISTINCT hinge_profile_id) FILTER (
        WHERE occurrence_count > 1
      )::int AS affected_profiles,
      count(*) FILTER (WHERE occurrence > 1)::int AS extra_rows
    FROM ranked
  `)) as unknown as { rows: DuplicateMediaAuditRow[] };
  const row = result.rows[0];
  if (!row) throw new Error("Hinge media duplicate audit returned no result.");

  return {
    duplicateGroups: Number(row.duplicate_groups),
    affectedProfiles: Number(row.affected_profiles),
    extraRows: Number(row.extra_rows),
  };
}

async function applyRepair(): Promise<{
  before: Awaited<ReturnType<typeof auditDuplicates>>;
  deletedRows: number;
  after: Awaited<ReturnType<typeof auditDuplicates>>;
}> {
  return withTransaction(async (tx) => {
    // Runtime Hinge writers take the shared form of this lock before their
    // profile locks, so this provider-exclusive repair sees a stable media set.
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${swipeRankBuildLockName("HINGE")}, 0)
      )
    `);

    const before = await auditDuplicates(tx);
    await tx.execute(buildHingeMediaEvidenceMergeQuery());
    const evidenceAudit = (await tx.execute(
      buildHingeMediaEvidenceAuditQuery(),
    )) as unknown as { rows: EvidenceAuditRow[] };
    assertHingeMediaEvidencePostconditions(evidenceAudit.rows[0]);
    const deleted = await tx.execute<DeletedMediaRow>(sql`
      WITH ranked AS (${rankedHingeMedia()})
      DELETE FROM media
      USING ranked
      WHERE media.id = ranked.id
        AND ranked.occurrence > 1
      RETURNING media.id
    `);
    const after = await auditDuplicates(tx);
    if (after.extraRows !== 0) {
      throw new Error(
        `Hinge media duplicate repair postcondition failed: ${after.extraRows} extra rows remain.`,
      );
    }

    return { before, deletedRows: deleted.rows.length, after };
  });
}

async function main(): Promise<void> {
  const apply = hasFlag("--apply");
  const report = apply
    ? await applyRepair()
    : { before: await auditDuplicates(), deletedRows: 0, after: null };

  if (hasFlag("--json")) {
    printJson({ mode: apply ? "apply" : "dry-run", ...report });
    return;
  }

  printHeading("Hinge media duplicate repair");
  printRows([
    ["mode", apply ? "apply" : "dry-run"],
    ["duplicate profile/URL groups", report.before.duplicateGroups],
    ["affected profiles", report.before.affectedProfiles],
    ["extra rows", report.before.extraRows],
    ["deleted rows", report.deletedRows],
    ["extra rows after", report.after?.extraRows ?? "not applied"],
  ]);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
