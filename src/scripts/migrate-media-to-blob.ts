/**
 * Migrate media URLs from external CDNs to Vercel Blob storage.
 *
 * Selects media rows where `originalUrl IS NULL` and `url LIKE 'https://%'`,
 * downloads the image, uploads to Vercel Blob, and updates the DB row.
 *
 * Env vars:
 *   RECORD_LIMIT — max rows to process (default 100)
 *   DRY_RUN=true — preview without writing
 *   REMIGRATE=true — also re-process already-migrated rows (downloads from originalUrl)
 */

import { db } from "@/server/db";
import { mediaTable } from "@/server/db/schema";
import { uploadBlob, sanitizeFilename } from "@/server/services/blob.service";
import { and, eq, isNull, like, isNotNull, or } from "drizzle-orm";

const RECORD_LIMIT = Number(process.env.RECORD_LIMIT) || 100;
const DRY_RUN = process.env.DRY_RUN === "true";
const REMIGRATE = process.env.REMIGRATE === "true";
const DELAY_MS = 50;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "image.jpg";
    return sanitizeFilename(last);
  } catch {
    return "image.jpg";
  }
}

function buildBlobPath(
  row: { tinderProfileId: string | null; hingeProfileId: string | null },
  filename: string,
): string {
  if (row.tinderProfileId) {
    return `media/tinder/${row.tinderProfileId}/${filename}`;
  }
  if (row.hingeProfileId) {
    return `media/hinge/${row.hingeProfileId}/${filename}`;
  }
  return `media/unknown/${filename}`;
}

async function main() {
  console.log(
    `\nMedia → Blob migration  (limit=${RECORD_LIMIT}, dryRun=${DRY_RUN}, remigrate=${REMIGRATE})\n`,
  );

  const whereClause = REMIGRATE
    ? or(
        and(isNull(mediaTable.originalUrl), like(mediaTable.url, "https://%")),
        isNotNull(mediaTable.originalUrl),
      )
    : and(isNull(mediaTable.originalUrl), like(mediaTable.url, "https://%"));

  const rows = await db
    .select({
      id: mediaTable.id,
      url: mediaTable.url,
      originalUrl: mediaTable.originalUrl,
      tinderProfileId: mediaTable.tinderProfileId,
      hingeProfileId: mediaTable.hingeProfileId,
    })
    .from(mediaTable)
    .where(whereClause)
    .limit(RECORD_LIMIT);

  const unmigrated = rows.filter((r) => !r.originalUrl).length;
  const remigrating = rows.filter((r) => r.originalUrl).length;
  console.log(`Found ${rows.length} rows (${unmigrated} new, ${remigrating} remigrate)\n`);

  if (rows.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    // Always prefer originalUrl (the CDN source) for downloading
    const downloadUrl = row.originalUrl ?? row.url;
    const filename = extractFilename(downloadUrl);
    const blobPath = buildBlobPath(row, filename);

    if (DRY_RUN) {
      const tag = row.originalUrl ? "REMIGRATE" : "NEW";
      console.log(`[DRY RUN][${tag}] ${row.id}  ${downloadUrl}  →  ${blobPath}`);
      success++;
      continue;
    }

    try {
      // Download from CDN (originalUrl if available, otherwise url)
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get("content-type") ?? "image/jpeg";

      // Upload to Vercel Blob
      const blob = await uploadBlob(blobPath, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType,
      });

      // Update DB: set originalUrl to the CDN URL, url to new blob URL
      await db
        .update(mediaTable)
        .set({
          originalUrl: downloadUrl,
          url: blob.url,
        })
        .where(eq(mediaTable.id, row.id));

      success++;
      console.log(`✅ [${success + failed}/${rows.length}] ${row.id} → ${blob.url}`);
    } catch (err) {
      failed++;
      console.error(
        `❌ [${success + failed}/${rows.length}] ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. success=${success}  failed=${failed}`);
}

main().catch(console.error);
