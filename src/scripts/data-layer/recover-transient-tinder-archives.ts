/**
 * Rebuild a clearly labelled, derived-state archive for Tinder uploads whose
 * original anonymized Blob was already deleted by the former transient cleanup
 * policy. This never claims to recreate the original provider export.
 *
 * Dry run:
 *   bun run data-layer:recover-transient-tinder-archives -- --json
 * Apply after reviewing the dry run:
 *   bun run data-layer:recover-transient-tinder-archives -- --apply --json
 */
import { and, asc, eq, isNotNull, like } from "drizzle-orm";
import { list, put } from "@vercel/blob";

import { db } from "@/server/db";
import { createId } from "@/server/db/utils";
import {
  originalAnonymizedFileTable,
  tinderProfileTable,
  transientUploadTable,
} from "@/server/db/schema";
import {
  buildRecoveredTinderArchive,
  recoveredTinderArchivePath,
  type LostTinderUploadReceipt,
} from "@/server/services/profile/recovered-tinder-archive";

import { getIntegerFlag, hasFlag, printJson } from "./utils";

type RecoveryCandidate = {
  tinderId: string;
  receipts: LostTinderUploadReceipt[];
};

type RecoveryResult = {
  tinderId: string;
  receiptCount: number;
  result: "would-recover" | "recovered" | "skipped" | "missing-profile";
};

function groupByProfile(
  rows: Array<{
    id: string;
    resultProfileId: string | null;
    blobUrl: string | null;
    committedAt: Date | null;
    cleanedAt: Date | null;
  }>,
): RecoveryCandidate[] {
  const grouped = new Map<string, LostTinderUploadReceipt[]>();
  for (const row of rows) {
    if (!row.resultProfileId) continue;
    const receipts = grouped.get(row.resultProfileId) ?? [];
    receipts.push({
      id: row.id,
      committedAt: row.committedAt,
      cleanedAt: row.cleanedAt,
      originalBlobUrl: row.blobUrl,
    });
    grouped.set(row.resultProfileId, receipts);
  }
  return [...grouped.entries()].map(([tinderId, receipts]) => ({
    tinderId,
    receipts: receipts.sort(
      (a, b) =>
        (a.committedAt?.getTime() ?? 0) - (b.committedAt?.getTime() ?? 0),
    ),
  }));
}

async function hasRecoveredArchive(tinderId: string): Promise<boolean> {
  const row = await db.query.originalAnonymizedFileTable.findFirst({
    where: and(
      eq(originalAnonymizedFileTable.dataProvider, "TINDER"),
      like(
        originalAnonymizedFileTable.blobUrl,
        `%/${recoveredTinderArchivePath(tinderId)}`,
      ),
    ),
    columns: { blobUrl: true },
  });
  // This is the recovery checkpoint. It must be a database-only check: the
  // archive table records successful completion even if a later Blob metadata
  // request lacks a store token. The deterministic Blob pathname makes a
  // separately missing object easy to audit without duplicating archive rows.
  return Boolean(row?.blobUrl);
}

async function resolveRecoveryBlob(
  pathname: string,
  archive: unknown,
): Promise<string> {
  const existing = await list({ prefix: pathname });
  const exact = existing.blobs.find((blob) => blob.pathname === pathname);
  if (exact) return exact.url;
  const result = await put(pathname, JSON.stringify(archive), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  return result.url;
}

async function recoverCandidate(
  candidate: RecoveryCandidate,
  apply: boolean,
  now: Date,
): Promise<RecoveryResult> {
  if (await hasRecoveredArchive(candidate.tinderId)) {
    return {
      ...candidate,
      receiptCount: candidate.receipts.length,
      result: "skipped",
    };
  }
  const profile = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, candidate.tinderId),
    with: {
      usage: true,
      matches: { with: { messages: true } },
      media: true,
      jobs: true,
      schools: true,
    },
  });
  if (!profile?.userId) {
    return {
      ...candidate,
      receiptCount: candidate.receipts.length,
      result: "missing-profile",
    };
  }
  if (!apply) {
    return {
      ...candidate,
      receiptCount: candidate.receipts.length,
      result: "would-recover",
    };
  }

  const messages = profile.matches.flatMap((match) => match.messages);
  const archive = buildRecoveredTinderArchive({
    tinderId: candidate.tinderId,
    recoveredAt: now,
    receipts: candidate.receipts,
    profile: (() => {
      const {
        userId: _userId,
        usage: _usage,
        matches: _matches,
        media: _media,
        jobs: _jobs,
        schools: _schools,
        ...profileState
      } = profile;
      return profileState;
    })(),
    usage: profile.usage,
    matches: profile.matches.map(({ messages: _messages, ...match }) => match),
    messages,
    media: profile.media,
    jobs: profile.jobs,
    schools: profile.schools,
  });
  const blobUrl = await resolveRecoveryBlob(
    recoveredTinderArchivePath(candidate.tinderId),
    archive,
  );
  await db.insert(originalAnonymizedFileTable).values({
    id: createId("oaf"),
    dataProvider: "TINDER",
    swipestatsVersion: "SWIPESTATS_4",
    file: null,
    blobUrl,
    userId: profile.userId,
    createdAt: now,
    updatedAt: now,
  });
  return {
    ...candidate,
    receiptCount: candidate.receipts.length,
    result: "recovered",
  };
}

async function main(): Promise<void> {
  const apply = hasFlag("--apply");
  const limit = getIntegerFlag("--limit");
  if (limit !== null && limit < 1) throw new Error("--limit must be positive.");
  const now = new Date();
  const uploads = await db.query.transientUploadTable.findMany({
    where: and(
      eq(transientUploadTable.dataProvider, "TINDER"),
      eq(transientUploadTable.status, "CLEANED"),
      isNotNull(transientUploadTable.resultProfileId),
    ),
    orderBy: [asc(transientUploadTable.committedAt)],
  });
  const candidates = groupByProfile(uploads).slice(0, limit ?? undefined);
  const results: RecoveryResult[] = [];
  for (const candidate of candidates) {
    results.push(await recoverCandidate(candidate, apply, now));
  }
  printJson({
    mode: apply ? "apply" : "dry-run",
    recoveredAt: now.toISOString(),
    deletedReceiptCount: uploads.length,
    affectedProfileCount: groupByProfile(uploads).length,
    processedProfileCount: candidates.length,
    byResult: Object.fromEntries(
      ["would-recover", "recovered", "skipped", "missing-profile"].map(
        (result) => [
          result,
          results.filter((entry) => entry.result === result).length,
        ],
      ),
    ),
    results,
  });
  if (results.some((entry) => entry.result === "missing-profile"))
    process.exitCode = 1;
}

if (process.argv[1]?.endsWith("recover-transient-tinder-archives.ts")) {
  await main();
}
