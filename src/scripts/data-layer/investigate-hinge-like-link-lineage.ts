import { and, asc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { originalAnonymizedFileTable } from "@/server/db/schema";
import { BlobService } from "@/server/services/blob.service";
import {
  getCanonicalHingeTimestampIdentity,
  tryParseHingeTimestampToDate,
} from "@/lib/hinge/timestamp";

import { hasFlag, printHeading, printJson, printRows } from "./utils";

interface CollisionKeyRow extends Record<string, unknown> {
  hinge_profile_id: string;
  user_id: string;
  event_timestamp_ms: number | string;
  comment: string | null;
  unlinked_count: number | string;
  linked_count: number | string;
}

type SourceOccurrence = {
  linked: boolean;
  sourceEventSignature: string;
};

type SnapshotObservation = {
  createdAt: Date;
  lineageId: string;
  occurrences: SourceOccurrence[];
};

type LineageClassification =
  | "DEFINITE_PROGRESSIVE_DUPLICATE"
  | "SOURCE_SUPPORTS_DISTINCT_MULTIPLICITY"
  | "SOURCE_HAS_AMBIGUOUS_MULTIPLICITY"
  | "NON_MONOTONIC_LINEAGE"
  | "INSUFFICIENT_LINEAGE";

type SafeFinding = {
  key: number;
  classification: LineageClassification;
  dbUnlinked: number;
  dbLinked: number;
  lineageFiles: number;
  readableLineageFiles: number;
  snapshotsWithKey: number;
  maxSourceOccurrences: number;
  maxDistinctSourceEvents: number;
  distinctSourceEventsAcrossLineage: number;
  sourceOccurrenceSequence: number[];
  sourceStateSequence: string[];
  sawPendingToLinkedTransition: boolean;
  snapshotContainsBothStates: boolean;
};

type HingeSource = {
  Matches?: unknown;
};

type HingeThreadSource = {
  like?: unknown;
  match?: unknown;
};

type HingeLikeSource = {
  timestamp?: unknown;
  like?: unknown;
};

type HingeReactionSource = {
  timestamp?: unknown;
  comment?: unknown;
};

function collisionLookupKey(timestampMs: number, comment: string | null) {
  return JSON.stringify([timestampMs, comment]);
}

function normalizedComment(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Historical Hinge activity exports use a timezone-less SQL-style timestamp
 * with up to microsecond precision. The production importer has historically
 * treated that wall clock as UTC. Make that assumption explicit here so this
 * audit has the same result in Oslo and in Vercel's UTC runtime.
 *
 * REVIEW(provider assumption): Hinge does not label the timezone for this
 * grammar. UTC is the only interpretation consistent with the persisted rows
 * and retained export lineage inspected for this audit.
 */
export function canonicalHingeTimestamp(
  value: string,
): { milliseconds: number; sourceIdentity: string } | null {
  const date = tryParseHingeTimestampToDate(value);
  const sourceIdentity = getCanonicalHingeTimestampIdentity(value);
  if (!date || !sourceIdentity) return null;

  return { milliseconds: date.getTime(), sourceIdentity };
}

function sourceOccurrencesByKey(
  source: unknown,
): Map<string, SourceOccurrence[]> {
  const occurrences = new Map<string, SourceOccurrence[]>();
  const matches = (source as HingeSource | null)?.Matches;
  if (!Array.isArray(matches)) return occurrences;

  for (const threadValue of matches) {
    const thread = threadValue as HingeThreadSource;
    const likes = Array.isArray(thread.like) ? thread.like : [];
    const linked = Array.isArray(thread.match) && thread.match.length > 0;

    for (const likeValue of likes) {
      const like = likeValue as HingeLikeSource;
      if (typeof like.timestamp !== "string") continue;
      const outerTimestamp = canonicalHingeTimestamp(like.timestamp);
      if (!outerTimestamp) continue;
      const reactions = Array.isArray(like.like) ? like.like : [];
      const normalizedReactions = reactions.map((reactionValue) => {
        const reaction = reactionValue as HingeReactionSource;
        return [
          typeof reaction.timestamp === "string"
            ? (canonicalHingeTimestamp(reaction.timestamp)?.sourceIdentity ??
              reaction.timestamp)
            : null,
          normalizedComment(reaction.comment),
        ];
      });
      const comment = normalizedComment(
        (reactions[0] as HingeReactionSource | undefined)?.comment,
      );
      const key = collisionLookupKey(outerTimestamp.milliseconds, comment);
      const rows = occurrences.get(key) ?? [];
      rows.push({
        linked,
        // Never emitted. Preserve the outer timestamp beyond JavaScript's
        // millisecond precision, plus nested reaction chronology, so two real
        // provider events that collapse to one database key remain distinct.
        sourceEventSignature: JSON.stringify([
          outerTimestamp.sourceIdentity,
          normalizedReactions,
        ]),
      });
      occurrences.set(key, rows);
    }
  }

  return occurrences;
}

function isMonotonicPendingToLinked(
  observations: SnapshotObservation[],
): boolean {
  const states = observations.flatMap((snapshot) =>
    snapshot.occurrences.length === 1
      ? [snapshot.occurrences[0]!.linked ? "LINKED" : "PENDING"]
      : [],
  );
  const firstLinked = states.indexOf("LINKED");
  return (
    firstLinked > 0 &&
    states.slice(0, firstLinked).every((state) => state === "PENDING") &&
    states.slice(firstLinked).every((state) => state === "LINKED")
  );
}

function classifyLineage(
  collision: CollisionKeyRow,
  lineageFileCount: number,
  readableLineageFileCount: number,
  observations: SnapshotObservation[],
): SafeFinding {
  const observed = observations.filter(
    (snapshot) => snapshot.occurrences.length > 0,
  );
  const maxSourceOccurrences = Math.max(
    0,
    ...observed.map((snapshot) => snapshot.occurrences.length),
  );
  const maxDistinctSourceEvents = Math.max(
    0,
    ...observed.map(
      (snapshot) =>
        new Set(
          snapshot.occurrences.map(
            (occurrence) => occurrence.sourceEventSignature,
          ),
        ).size,
    ),
  );
  const snapshotContainsBothStates = observed.some(
    (snapshot) =>
      snapshot.occurrences.some((occurrence) => occurrence.linked) &&
      snapshot.occurrences.some((occurrence) => !occurrence.linked),
  );
  const sawPendingToLinkedTransition = isMonotonicPendingToLinked(observed);
  const allObservedSourceEvents = new Set(
    observed.flatMap((snapshot) =>
      snapshot.occurrences.map((occurrence) => occurrence.sourceEventSignature),
    ),
  );
  const dbUnlinked = Number(collision.unlinked_count);
  const dbLinked = Number(collision.linked_count);
  const sourceOccurrenceSequence = observed.map(
    (snapshot) => snapshot.occurrences.length,
  );
  const sourceStateSequence = observed.map((snapshot) => {
    const pending = snapshot.occurrences.filter(
      (occurrence) => !occurrence.linked,
    ).length;
    const linked = snapshot.occurrences.length - pending;
    return `pending:${pending},linked:${linked}`;
  });
  const sawPendingSnapshot = observed.some(
    (snapshot) => snapshot.occurrences[0]?.linked === false,
  );
  const sawLinkedSnapshot = observed.some(
    (snapshot) => snapshot.occurrences[0]?.linked === true,
  );

  let classification: LineageClassification = "INSUFFICIENT_LINEAGE";
  if (maxDistinctSourceEvents > 1) {
    classification = "SOURCE_SUPPORTS_DISTINCT_MULTIPLICITY";
  } else if (maxSourceOccurrences > 1 || snapshotContainsBothStates) {
    classification = "SOURCE_HAS_AMBIGUOUS_MULTIPLICITY";
  } else if (
    observed.length >= 2 &&
    allObservedSourceEvents.size === 1 &&
    sawPendingSnapshot &&
    sawLinkedSnapshot &&
    !sawPendingToLinkedTransition
  ) {
    classification = "NON_MONOTONIC_LINEAGE";
  } else if (
    readableLineageFileCount === lineageFileCount &&
    observed.length >= 2 &&
    allObservedSourceEvents.size === 1 &&
    sawPendingToLinkedTransition &&
    dbUnlinked === 1 &&
    dbLinked === 1
  ) {
    classification = "DEFINITE_PROGRESSIVE_DUPLICATE";
  }

  return {
    key: 0,
    classification,
    dbUnlinked,
    dbLinked,
    lineageFiles: lineageFileCount,
    readableLineageFiles: readableLineageFileCount,
    snapshotsWithKey: observed.length,
    maxSourceOccurrences,
    maxDistinctSourceEvents,
    distinctSourceEventsAcrossLineage: allObservedSourceEvents.size,
    sourceOccurrenceSequence,
    sourceStateSequence,
    sawPendingToLinkedTransition,
    snapshotContainsBothStates,
  };
}

async function loadLineageSource(row: {
  file: unknown;
  blobUrl: string | null;
}): Promise<unknown> {
  if (row.file !== null) return row.file;
  if (row.blobUrl) return BlobService.fetchJson<unknown>(row.blobUrl);
  throw new Error("Hinge lineage row has no retained payload.");
}

export async function investigateHingeLikeLinkLineage(): Promise<{
  findings: SafeFinding[];
  summary: Record<LineageClassification, number>;
}> {
  const collisionResult = (await db.execute(sql`
    WITH collision_keys AS (
      SELECT
        hinge_profile_id,
        timestamp AS event_timestamp,
        comment,
        count(*) FILTER (WHERE match_id IS NULL)::int AS unlinked_count,
        count(*) FILTER (WHERE match_id IS NOT NULL)::int AS linked_count
      FROM hinge_interaction
      WHERE type = 'LIKE_SENT'
      GROUP BY hinge_profile_id, timestamp, comment
      HAVING bool_or(match_id IS NULL)
        AND bool_or(match_id IS NOT NULL)
    )
    SELECT
      collision_keys.hinge_profile_id,
      profile.user_id,
      (
        extract(epoch FROM collision_keys.event_timestamp AT TIME ZONE 'UTC')
        * 1000
      )::bigint AS event_timestamp_ms,
      collision_keys.comment,
      collision_keys.unlinked_count,
      collision_keys.linked_count
    FROM collision_keys
    JOIN hinge_profile AS profile
      ON profile.hinge_id = collision_keys.hinge_profile_id
    ORDER BY
      collision_keys.event_timestamp,
      collision_keys.hinge_profile_id,
      collision_keys.comment
  `)) as unknown as { rows: CollisionKeyRow[] };
  const collisions = collisionResult.rows;
  const userIds = [...new Set(collisions.map((row) => row.user_id))];
  if (userIds.length === 0) {
    return {
      findings: [],
      summary: {
        DEFINITE_PROGRESSIVE_DUPLICATE: 0,
        SOURCE_SUPPORTS_DISTINCT_MULTIPLICITY: 0,
        SOURCE_HAS_AMBIGUOUS_MULTIPLICITY: 0,
        NON_MONOTONIC_LINEAGE: 0,
        INSUFFICIENT_LINEAGE: 0,
      },
    };
  }

  const lineageRows = await db
    .select({
      id: originalAnonymizedFileTable.id,
      userId: originalAnonymizedFileTable.userId,
      createdAt: originalAnonymizedFileTable.createdAt,
      file: originalAnonymizedFileTable.file,
      blobUrl: originalAnonymizedFileTable.blobUrl,
    })
    .from(originalAnonymizedFileTable)
    .where(
      and(
        inArray(originalAnonymizedFileTable.userId, userIds),
        eq(originalAnonymizedFileTable.dataProvider, "HINGE"),
        or(
          isNotNull(originalAnonymizedFileTable.file),
          isNotNull(originalAnonymizedFileTable.blobUrl),
        ),
      ),
    )
    .orderBy(
      asc(originalAnonymizedFileTable.createdAt),
      asc(originalAnonymizedFileTable.id),
    );

  const collisionIndexByUserAndKey = new Map<string, number[]>();
  collisions.forEach((collision, index) => {
    const lookup = `${collision.user_id}:${collisionLookupKey(
      Number(collision.event_timestamp_ms),
      collision.comment,
    )}`;
    const indexes = collisionIndexByUserAndKey.get(lookup) ?? [];
    indexes.push(index);
    collisionIndexByUserAndKey.set(lookup, indexes);
  });
  const observationsByCollision = collisions.map(
    (): SnapshotObservation[] => [],
  );
  const lineageFileCounts = new Map<string, number>();
  const readableLineageFileCounts = new Map<string, number>();

  for (const lineage of lineageRows) {
    lineageFileCounts.set(
      lineage.userId,
      (lineageFileCounts.get(lineage.userId) ?? 0) + 1,
    );
    try {
      const source = await loadLineageSource(lineage);
      readableLineageFileCounts.set(
        lineage.userId,
        (readableLineageFileCounts.get(lineage.userId) ?? 0) + 1,
      );
      for (const [sourceKey, occurrences] of sourceOccurrencesByKey(source)) {
        const indexes = collisionIndexByUserAndKey.get(
          `${lineage.userId}:${sourceKey}`,
        );
        if (!indexes) continue;
        for (const index of indexes) {
          observationsByCollision[index]!.push({
            createdAt: lineage.createdAt,
            lineageId: lineage.id,
            occurrences,
          });
        }
      }
    } catch {
      // Completeness is reflected in readableLineageFiles and prevents a
      // definitive progressive classification. URLs and payload errors are not
      // emitted because this report is safe to share.
    }
  }

  const findings = collisions.map((collision, index) => ({
    ...classifyLineage(
      collision,
      lineageFileCounts.get(collision.user_id) ?? 0,
      readableLineageFileCounts.get(collision.user_id) ?? 0,
      observationsByCollision[index]!,
    ),
    key: index + 1,
  }));
  const summary: Record<LineageClassification, number> = {
    DEFINITE_PROGRESSIVE_DUPLICATE: 0,
    SOURCE_SUPPORTS_DISTINCT_MULTIPLICITY: 0,
    SOURCE_HAS_AMBIGUOUS_MULTIPLICITY: 0,
    NON_MONOTONIC_LINEAGE: 0,
    INSUFFICIENT_LINEAGE: 0,
  };
  findings.forEach((finding) => summary[finding.classification]++);

  return { findings, summary };
}

async function main(): Promise<void> {
  const result = await investigateHingeLikeLinkLineage();
  if (hasFlag("--json")) {
    printJson({ mode: "read-only", ...result });
    return;
  }

  printHeading("Hinge like-link lineage investigation");
  printRows([
    ["mode", "read-only"],
    ["collision keys", result.findings.length],
    [
      "definite progressive duplicates",
      result.summary.DEFINITE_PROGRESSIVE_DUPLICATE,
    ],
    [
      "source-supported distinct multiplicity",
      result.summary.SOURCE_SUPPORTS_DISTINCT_MULTIPLICITY,
    ],
    [
      "ambiguous source multiplicity",
      result.summary.SOURCE_HAS_AMBIGUOUS_MULTIPLICITY,
    ],
    ["non-monotonic lineage", result.summary.NON_MONOTONIC_LINEAGE],
    ["insufficient lineage", result.summary.INSUFFICIENT_LINEAGE],
  ]);
  console.table(result.findings);
  console.log(
    "No URLs, comments, content, or database rows were emitted/changed.",
  );
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
