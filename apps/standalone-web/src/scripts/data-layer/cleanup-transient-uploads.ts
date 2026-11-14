import { and, eq, isNull, lte, ne, or } from "drizzle-orm";

import { db } from "@/server/db";
import { transientUploadTable } from "@/server/db/schema";
import { cleanupTransientUploadsBatch } from "@/server/services/transient-upload.service";

import { hasFlag, printHeading, printJson } from "./utils";

async function main(): Promise<void> {
  const apply = hasFlag("--apply");
  const now = new Date();
  const candidates = await db.query.transientUploadTable.findMany({
    where: and(
      ne(transientUploadTable.status, "CLEANED"),
      or(
        eq(transientUploadTable.status, "COMMITTED"),
        and(
          lte(transientUploadTable.expiresAt, now),
          or(
            ne(transientUploadTable.status, "ABANDONED"),
            isNull(transientUploadTable.cleanedAt),
          ),
        ),
      ),
    ),
    orderBy: (table, { asc }) => [asc(table.expiresAt)],
  });

  printHeading("Transient provider-upload cleanup");
  printJson({
    mode: apply ? "apply" : "dry-run",
    asOf: now.toISOString(),
    candidateCount: candidates.length,
    byStatus: Object.fromEntries(
      ["ISSUED", "UPLOADED", "PROCESSING", "COMMITTED"].map((status) => [
        status,
        candidates.filter((row) => row.status === status).length,
      ]),
    ),
    cleanupErrorCount: candidates.filter((row) => row.lastCleanupError).length,
  });

  if (!apply) {
    printJson(
      candidates.slice(0, 25).map((row) => ({
        id: row.id,
        provider: row.dataProvider,
        status: row.status,
        expiresAt: row.expiresAt.toISOString(),
        hasBoundUrl: Boolean(row.blobUrl),
        cleanupAttempts: row.cleanupAttempts,
        hasCleanupError: Boolean(row.lastCleanupError),
      })),
    );
    return;
  }

  const summary = await cleanupTransientUploadsBatch({ limit: 100, now });
  printJson(summary);
  if (summary.failed > 0) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
