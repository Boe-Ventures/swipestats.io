import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
  aiOutputTable,
  type AiOutputInput,
  type AiOutputKind,
  type AiOutputPayload,
  type AiOutputRow,
} from "@/server/db/schema";

/**
 * Current output-format version for ai_output rows. Bump when a payload SHAPE
 * changes; rows below this are flagged outdated on read so the UI can offer a
 * one-click regenerate instead of rendering a stale-shaped payload. Single
 * source of truth — both the writer (`upsertAiOutput`) and the readers
 * (roastRouter's `isOutdated`) point here.
 */
export const AI_OUTPUT_VERSION = 1;

/**
 * Map a (kind, subjectId) onto the exclusive-arc FK column the subject lives in.
 * One source of the kind→column mapping, used on write.
 */
function subjectColumns(kind: AiOutputKind, subjectId: string) {
  return {
    tinderProfileId: kind === "tinder_roast" ? subjectId : null,
    hingeProfileId: kind === "hinge_roast" ? subjectId : null,
    columnId: kind === "profile_roast" ? subjectId : null,
  };
}

/**
 * WHERE fragment matching the row for (kind, subjectId) — selects the right FK
 * column so callers don't repeat the kind→column mapping. Combine with
 * `eq(aiOutputTable.scope, …)` for the full identity key.
 *
 * (There is no `pruneAiOutputsForSubjects` anymore: each subject FK is
 * onDelete:cascade, so deleting the subject deletes its artifacts at the DB.)
 */
export function aiOutputSubjectEq(kind: AiOutputKind, subjectId: string) {
  switch (kind) {
    case "tinder_roast":
      return eq(aiOutputTable.tinderProfileId, subjectId);
    case "hinge_roast":
      return eq(aiOutputTable.hingeProfileId, subjectId);
    case "profile_roast":
      return eq(aiOutputTable.columnId, subjectId);
  }
}

/**
 * Upsert one ai_output row. There's exactly one artifact per
 * (kind, subject, scope) — regenerating OVERWRITES it in place, preserving the
 * existing id / shareKey / isPublic (never touched here). Owns the conflict
 * target, the `set` keys, and `version`, so the two roast writers can't drift on
 * which columns get updated. The subject is written to one of the exclusive-arc
 * FK columns. Always returns the row (callers ignore it if unused).
 */
export async function upsertAiOutput(args: {
  db: typeof db;
  userId: string;
  kind: AiOutputKind;
  subjectId: string;
  /** "" = the whole subject (the default); a period like "2024" for recaps. */
  scope?: string;
  tone: string;
  model: string;
  input: AiOutputInput;
  output: AiOutputPayload;
}): Promise<AiOutputRow> {
  const {
    db: conn,
    scope = "",
    userId,
    kind,
    subjectId,
    tone,
    model,
    input,
    output,
  } = args;

  const [row] = await conn
    .insert(aiOutputTable)
    .values({
      userId,
      kind,
      ...subjectColumns(kind, subjectId),
      scope,
      tone,
      model,
      version: AI_OUTPUT_VERSION,
      input,
      output,
    })
    .onConflictDoUpdate({
      // Matches the nullsNotDistinct unique constraint (kind, scope, arc).
      target: [
        aiOutputTable.kind,
        aiOutputTable.scope,
        aiOutputTable.tinderProfileId,
        aiOutputTable.hingeProfileId,
        aiOutputTable.columnId,
      ],
      // Note: `userId` is intentionally NOT reassigned on conflict — never
      // re-owner an existing artifact.
      set: {
        tone,
        model,
        version: AI_OUTPUT_VERSION,
        input,
        output,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row!;
}
