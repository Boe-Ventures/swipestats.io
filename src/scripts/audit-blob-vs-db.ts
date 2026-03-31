/**
 * Audit Vercel Blob storage vs database media table.
 *
 * Lists all blobs under media/tinder/ and media/hinge/, counts unique
 * profile folders, and cross-references with the DB to find:
 *   - Blobs in storage but not linked in DB (recoverable)
 *   - DB media rows still pointing at external CDNs (need migration)
 *
 * Usage:
 *   # Count blobs in dev store
 *   BLOB_READ_WRITE_TOKEN=<dev-token> bun run src/scripts/audit-blob-vs-db.ts
 *
 *   # Also check DB (requires DATABASE_URL)
 *   BLOB_READ_WRITE_TOKEN=<dev-token> DATABASE_URL=<prod-db> bun run src/scripts/audit-blob-vs-db.ts
 */

import { list } from "@vercel/blob";
import { db } from "@/server/db";
import { mediaTable } from "@/server/db/schema";
import { sql, isNotNull, isNull } from "drizzle-orm";

async function listAllBlobs(prefix: string) {
  const allBlobs: { url: string; pathname: string; size: number }[] = [];
  let cursor: string | undefined;
  let page = 0;

  do {
    const result = await list({
      prefix,
      limit: 1000,
      cursor,
    });

    for (const blob of result.blobs) {
      allBlobs.push({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
      });
    }

    cursor = result.hasMore ? result.cursor : undefined;
    page++;
    console.log(
      `  Page ${page}: ${result.blobs.length} blobs (${allBlobs.length} total)`,
    );
  } while (cursor);

  return allBlobs;
}

function extractProfileId(pathname: string): string | null {
  // media/tinder/{profileId}/{filename} or media/hinge/{profileId}/{filename}
  const parts = pathname.split("/");
  if (parts.length >= 3) {
    return parts[2] ?? null;
  }
  return null;
}

async function main() {
  console.log("=== Vercel Blob Audit ===\n");

  // ---- List tinder blobs ----
  console.log("Listing media/tinder/ blobs...");
  const tinderBlobs = await listAllBlobs("media/tinder/");

  console.log("\nListing media/hinge/ blobs...");
  const hingeBlobs = await listAllBlobs("media/hinge/");

  // ---- Extract unique profile IDs ----
  const tinderProfileIds = new Set(
    tinderBlobs.map((b) => extractProfileId(b.pathname)).filter(Boolean),
  );
  const hingeProfileIds = new Set(
    hingeBlobs.map((b) => extractProfileId(b.pathname)).filter(Boolean),
  );

  const totalBlobSize = [...tinderBlobs, ...hingeBlobs].reduce(
    (sum, b) => sum + b.size,
    0,
  );

  console.log("\n--- Blob Storage Summary ---");
  console.log(`Tinder blobs:    ${tinderBlobs.length.toLocaleString()}`);
  console.log(
    `  Unique profiles: ${tinderProfileIds.size.toLocaleString()}`,
  );
  console.log(`Hinge blobs:     ${hingeBlobs.length.toLocaleString()}`);
  console.log(
    `  Unique profiles: ${hingeProfileIds.size.toLocaleString()}`,
  );
  console.log(
    `Total blob size: ${(totalBlobSize / 1024 / 1024).toFixed(1)} MB`,
  );

  // ---- Cross-reference with DB ----
  if (!process.env.DATABASE_URL) {
    console.log(
      "\nSkipping DB cross-reference (no DATABASE_URL). Set it to compare.",
    );
    return;
  }

  console.log("\n--- Database Cross-Reference ---\n");

  // Total media rows
  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaTable);
  console.log(`Total media rows in DB: ${total?.count.toLocaleString()}`);

  // Rows with originalUrl set (already migrated to blob)
  const [withOriginal] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaTable)
    .where(isNotNull(mediaTable.originalUrl));
  console.log(
    `  With originalUrl (migrated): ${withOriginal?.count.toLocaleString()}`,
  );

  // Rows without originalUrl (still on CDN)
  const [withoutOriginal] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaTable)
    .where(isNull(mediaTable.originalUrl));
  console.log(
    `  Without originalUrl (CDN):   ${withoutOriginal?.count.toLocaleString()}`,
  );

  // Tinder media rows by profile
  const tinderMediaProfiles = await db.execute<{
    tinder_profile_id: string;
    count: number;
  }>(sql`
    SELECT tinder_profile_id, count(*)::int AS count
    FROM media
    WHERE tinder_profile_id IS NOT NULL
    GROUP BY tinder_profile_id
  `);
  const dbTinderProfileIds = new Set(
    tinderMediaProfiles.rows.map((r) => r.tinder_profile_id),
  );

  // Find blob profiles NOT in DB
  const blobOnlyProfiles = [...tinderProfileIds].filter(
    (id) => !dbTinderProfileIds.has(id!),
  );
  // Find blob profiles that ARE in DB
  const matchedProfiles = [...tinderProfileIds].filter((id) =>
    dbTinderProfileIds.has(id!),
  );
  // Find DB profiles not in blob
  const dbOnlyProfiles = [...dbTinderProfileIds].filter(
    (id) => !tinderProfileIds.has(id),
  );

  console.log(`\nTinder profile cross-reference:`);
  console.log(
    `  Blob profiles matched in DB:    ${matchedProfiles.length.toLocaleString()}`,
  );
  console.log(
    `  Blob profiles NOT in DB:        ${blobOnlyProfiles.length.toLocaleString()}`,
  );
  console.log(
    `  DB profiles NOT in blob:        ${dbOnlyProfiles.length.toLocaleString()}`,
  );

  // Check how many of the matched profiles already have blob URLs in DB
  if (matchedProfiles.length > 0) {
    const blobHostPattern = "%.vercel-storage.com%";
    const [alreadyLinked] = await db.execute<{ count: number }>(sql`
      SELECT count(DISTINCT tinder_profile_id)::int AS count
      FROM media
      WHERE tinder_profile_id IS NOT NULL
        AND url LIKE ${blobHostPattern}
    `);
    console.log(
      `  DB profiles already pointing to blob: ${alreadyLinked?.count ?? 0}`,
    );
    console.log(
      `  DB profiles recoverable from blob:    ${matchedProfiles.length - (alreadyLinked?.count ?? 0)}`,
    );
  }

  console.log("\nDone.");
}

main().catch(console.error);
