import { inArray } from "drizzle-orm";

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
 * Delete every AI output (roasts today, Wrapped-style recaps later) whose
 * subject is being removed.
 *
 * `ai_output.subjectId` is a polymorphic pointer — a comparison-column id, a
 * tinderId or a hingeId depending on `kind` — and deliberately has no foreign
 * key, so DB cascades can't reach these rows. Every delete path for a roastable
 * subject must call this, otherwise a published roast (its text AND its public
 * share link) outlives the subject the user just deleted.
 *
 * subjectIds are collision-free cuids, so passing a mix of kinds in one call is
 * safe — we match purely on the id set.
 */
export async function pruneAiOutputsForSubjects(
  subjectIds: string[],
): Promise<void> {
  if (subjectIds.length === 0) return;
  await db
    .delete(aiOutputTable)
    .where(inArray(aiOutputTable.subjectId, subjectIds));
}

/**
 * Upsert one ai_output row. There's exactly one artifact per
 * (kind, subjectId, scope) — regenerating OVERWRITES it in place, preserving the
 * existing id / shareKey / isPublic (never touched here). Owns the conflict
 * target, the `set` keys, and `version`, so the two roast writers can't drift on
 * which columns get updated. Always returns the row (callers ignore it if unused).
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
      subjectId,
      scope,
      tone,
      model,
      version: AI_OUTPUT_VERSION,
      input,
      output,
    })
    .onConflictDoUpdate({
      target: [
        aiOutputTable.kind,
        aiOutputTable.subjectId,
        aiOutputTable.scope,
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
