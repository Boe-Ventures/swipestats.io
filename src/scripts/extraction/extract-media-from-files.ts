/**
 * Extract & Analyze Media/Photos from OriginalAnonymizedFile records
 *
 * READ-ONLY exploration script. Queries the old database to understand
 * what Tinder photo data exists in OriginalAnonymizedFile JSON blobs,
 * and cross-references with the new media table to identify what still
 * needs migrating. (The old Media table is empty — all media lives in
 * the JSON blobs only.)
 *
 * Focuses on "new format" TinderPhoto objects with https URLs.
 *
 * Usage:
 *   # Quick scan (10 files, verbose per-file logging)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=10 \
 *     bun run src/scripts/extraction/extract-media-from-files.ts
 *
 *   # Medium scan (100 files, summary only)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=100 \
 *     bun run src/scripts/extraction/extract-media-from-files.ts
 *
 *   # Full scan (all files)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> \
 *     bun run src/scripts/extraction/extract-media-from-files.ts
 */

import { neon, Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count } from "drizzle-orm";
import ws from "ws";
import * as schema from "@/server/db/schema";
import type {
  AnonymizedTinderDataJSON,
  TinderPhoto,
} from "@/lib/interfaces/TinderDataJSON";
import {
  isNewPhotoFormat,
  isOldPhotoFormat,
} from "@/lib/interfaces/TinderDataJSON";

// Enable WebSocket for large JSONB payloads
neonConfig.webSocketConstructor = ws;

// ---- CONFIG -------------------------------------------------------

const RECORD_LIMIT = process.env.RECORD_LIMIT
  ? parseInt(process.env.RECORD_LIMIT, 10)
  : undefined;

// Verbose per-file logging only when scanning small numbers
const VERBOSE = (RECORD_LIMIT ?? Infinity) <= 20;

// ---- TYPES --------------------------------------------------------

interface OriginalFileRecord {
  id: string;
  userId: string;
  dataProvider: string;
  swipestatsVersion: string;
  file: AnonymizedTinderDataJSON;
  createdAt: string;
  updatedAt: string;
}

interface PhotoStats {
  totalFiles: number;
  filesWithPhotos: number;
  filesWithNoPhotosField: number;
  filesWithEmptyPhotos: number;

  // Format breakdown
  newFormatFiles: number;
  oldFormatFiles: number;
  unknownFormatFiles: number;

  // Photo counts
  totalNewFormatPhotos: number;
  totalOldFormatPhotos: number;

  // New format analysis (the ones we care about)
  newFormatWithHttpsUrl: number;
  newFormatWithNonHttpsUrl: number;
  newFormatPhotoTypes: Map<string, number>;
  newFormatWithPrompt: number;
  newFormatWithSelfieVerified: number;
  newFormatUrlDomains: Map<string, number>;

  // Old format analysis
  oldFormatWithHttpsUrl: number;
  oldFormatWithNonHttpsUrl: number;
  oldFormatUrlDomains: Map<string, number>;

  // SwipeStats version distribution
  versionDistribution: Map<string, number>;

  // Date range
  oldestFile: string | null;
  newestFile: string | null;

  // TinderId extraction (for cross-reference)
  tinderIdsFromFiles: Set<string>;

  // Per-user photo counts (for distribution analysis)
  photosPerUser: number[];
}

// ---- UTILITIES ----------------------------------------------------

function log(message: string) {
  const timestamp = new Date()
    .toISOString()
    .replace("T", " ")
    .substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "INVALID_URL";
  }
}

function generateTinderId(birthDate: string, createDate: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto
    .createHash("sha256")
    .update(birthDate + "-" + createDate)
    .digest("hex");
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

function printMap(
  map: Map<string, number>,
  label: string,
  maxItems = 20,
): void {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n  ${label} (${sorted.length} unique):`);
  sorted.slice(0, maxItems).forEach(([key, count]) => {
    console.log(`    ${count.toLocaleString().padStart(8)} × ${key}`);
  });
  if (sorted.length > maxItems) {
    console.log(`    ... and ${sorted.length - maxItems} more`);
  }
}

// ---- MAIN EXTRACTION ----------------------------------------------

async function extractMedia() {
  console.log(
    "\n╔═══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║   Extract & Analyze Media from Original Files (READ-ONLY)    ║",
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝\n",
  );

  // ---- Validate environment
  if (!process.env.OLD_DATABASE_URL) {
    throw new Error("OLD_DATABASE_URL environment variable is required");
  }

  log(`Configuration:`);
  log(`  RECORD_LIMIT: ${RECORD_LIMIT ?? "all (no limit)"}`);
  log(`  VERBOSE: ${VERBOSE}`);
  log(`  DATABASE_URL: ${process.env.DATABASE_URL ? "set" : "NOT SET (skipping new DB cross-reference)"}`);
  console.log("");

  // ---- Connect to old database (WebSocket pool for large JSONB)
  const oldPool = new Pool({
    connectionString: process.env.OLD_DATABASE_URL,
  });

  // ---- Phase 1: Count total files (lightweight query first)
  log("Phase 1: Counting files in old database...");
  const client = await oldPool.connect();

  try {
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "dataProvider" = 'TINDER') as tinder,
        COUNT(*) FILTER (WHERE "dataProvider" = 'HINGE') as hinge,
        COUNT(*) FILTER (WHERE file IS NOT NULL) as with_file,
        COUNT(*) FILTER (WHERE file IS NULL) as without_file
      FROM "OriginalAnonymizedFile"
    `);

    const counts = countResult.rows[0] as {
      total: string;
      tinder: string;
      hinge: string;
      with_file: string;
      without_file: string;
    };

    console.log("  Old DB OriginalAnonymizedFile counts:");
    console.log(`    Total:         ${parseInt(counts.total).toLocaleString()}`);
    console.log(
      `    Tinder:        ${parseInt(counts.tinder).toLocaleString()}`,
    );
    console.log(`    Hinge:         ${parseInt(counts.hinge).toLocaleString()}`);
    console.log(
      `    With file:     ${parseInt(counts.with_file).toLocaleString()}`,
    );
    console.log(
      `    Without file:  ${parseInt(counts.without_file).toLocaleString()}`,
    );
    console.log("");

    // ---- Phase 2: Query Tinder files with JSONB data
    log(
      `Phase 2: Querying Tinder files${RECORD_LIMIT ? ` (limit ${RECORD_LIMIT})` : " (ALL)"}...`,
    );
    log(
      "  (Using WebSocket pool for large JSONB payloads - this may take a while...)",
    );

    const queryStart = Date.now();
    const query = RECORD_LIMIT
      ? `
        SELECT 
          id,
          "userId",
          "dataProvider",
          "swipestatsVersion",
          file,
          "createdAt",
          "updatedAt"
        FROM "OriginalAnonymizedFile"
        WHERE "dataProvider" = 'TINDER'
          AND file IS NOT NULL
        ORDER BY "createdAt" DESC
        LIMIT $1
      `
      : `
        SELECT 
          id,
          "userId",
          "dataProvider",
          "swipestatsVersion",
          file,
          "createdAt",
          "updatedAt"
        FROM "OriginalAnonymizedFile"
        WHERE "dataProvider" = 'TINDER'
          AND file IS NOT NULL
        ORDER BY "createdAt" DESC
      `;

    const result = RECORD_LIMIT
      ? await client.query(query, [RECORD_LIMIT])
      : await client.query(query);

    const files = result.rows as OriginalFileRecord[];
    log(`  Fetched ${files.length} files in ${Date.now() - queryStart}ms\n`);

    if (files.length === 0) {
      console.log("❌ No Tinder data files found");
      return;
    }

    // ---- Phase 3: Analyze each file's Photos
    log("Phase 3: Analyzing Photos from JSON blobs...");

    const stats: PhotoStats = {
      totalFiles: files.length,
      filesWithPhotos: 0,
      filesWithNoPhotosField: 0,
      filesWithEmptyPhotos: 0,
      newFormatFiles: 0,
      oldFormatFiles: 0,
      unknownFormatFiles: 0,
      totalNewFormatPhotos: 0,
      totalOldFormatPhotos: 0,
      newFormatWithHttpsUrl: 0,
      newFormatWithNonHttpsUrl: 0,
      newFormatPhotoTypes: new Map(),
      newFormatWithPrompt: 0,
      newFormatWithSelfieVerified: 0,
      newFormatUrlDomains: new Map(),
      oldFormatWithHttpsUrl: 0,
      oldFormatWithNonHttpsUrl: 0,
      oldFormatUrlDomains: new Map(),
      versionDistribution: new Map(),
      oldestFile: null,
      newestFile: null,
      tinderIdsFromFiles: new Set(),
      photosPerUser: [],
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      // Track version
      const version = file.swipestatsVersion || "UNKNOWN";
      stats.versionDistribution.set(
        version,
        (stats.versionDistribution.get(version) ?? 0) + 1,
      );

      // Track date range
      const dateStr =
        typeof file.createdAt === "string"
          ? file.createdAt
          : String(file.createdAt);
      if (!stats.oldestFile || dateStr < stats.oldestFile) {
        stats.oldestFile = dateStr;
      }
      if (!stats.newestFile || dateStr > stats.newestFile) {
        stats.newestFile = dateStr;
      }

      // Try to extract tinderId for cross-reference
      const data = file.file;
      const birthDate = data?.User?.birth_date;
      const createDate = data?.User?.create_date;
      if (birthDate && createDate) {
        const tinderId = generateTinderId(
          String(birthDate),
          String(createDate),
        );
        stats.tinderIdsFromFiles.add(tinderId);
      }

      // Analyze Photos
      if (!data?.Photos) {
        stats.filesWithNoPhotosField++;
        if (VERBOSE) {
          console.log(
            `  [${i + 1}/${files.length}] ${file.userId} - ⚠️ No Photos field`,
          );
        }
        stats.photosPerUser.push(0);
        continue;
      }

      const photos = data.Photos;

      if (Array.isArray(photos) && photos.length === 0) {
        stats.filesWithEmptyPhotos++;
        if (VERBOSE) {
          console.log(
            `  [${i + 1}/${files.length}] ${file.userId} - ⚠️ Empty Photos array`,
          );
        }
        stats.photosPerUser.push(0);
        continue;
      }

      if (isNewPhotoFormat(photos)) {
        stats.newFormatFiles++;
        stats.totalNewFormatPhotos += photos.length;
        stats.filesWithPhotos++;
        stats.photosPerUser.push(photos.length);

        // Analyze each new-format photo
        for (const photo of photos) {
          // URL analysis
          if (photo.url?.startsWith("https://")) {
            stats.newFormatWithHttpsUrl++;
            const domain = extractDomain(photo.url);
            stats.newFormatUrlDomains.set(
              domain,
              (stats.newFormatUrlDomains.get(domain) ?? 0) + 1,
            );
          } else {
            stats.newFormatWithNonHttpsUrl++;
          }

          // Type analysis
          const photoType = photo.type || "UNKNOWN";
          stats.newFormatPhotoTypes.set(
            photoType,
            (stats.newFormatPhotoTypes.get(photoType) ?? 0) + 1,
          );

          // Metadata
          if (photo.prompt_text) stats.newFormatWithPrompt++;
          if (photo.selfie_verified) stats.newFormatWithSelfieVerified++;
        }

        if (VERBOSE) {
          console.log(
            `  [${i + 1}/${files.length}] ${file.userId} - 📸 New format: ${photos.length} photos`,
          );
          for (const photo of photos.slice(0, 3)) {
            console.log(
              `      ${photo.type} | ${photo.url?.substring(0, 70)}...`,
            );
            if (photo.prompt_text) {
              console.log(`      Prompt: "${photo.prompt_text}"`);
            }
          }
          if (photos.length > 3) {
            console.log(`      ... and ${photos.length - 3} more`);
          }
        }
      } else if (isOldPhotoFormat(photos)) {
        stats.oldFormatFiles++;
        stats.totalOldFormatPhotos += photos.length;
        stats.filesWithPhotos++;
        stats.photosPerUser.push(photos.length);

        // Analyze old-format URLs
        for (const url of photos) {
          if (url.startsWith("https://")) {
            stats.oldFormatWithHttpsUrl++;
            const domain = extractDomain(url);
            stats.oldFormatUrlDomains.set(
              domain,
              (stats.oldFormatUrlDomains.get(domain) ?? 0) + 1,
            );
          } else {
            stats.oldFormatWithNonHttpsUrl++;
          }
        }

        if (VERBOSE) {
          console.log(
            `  [${i + 1}/${files.length}] ${file.userId} - 📷 Old format: ${photos.length} URLs`,
          );
          for (const url of photos.slice(0, 2)) {
            console.log(`      ${url.substring(0, 80)}...`);
          }
        }
      } else {
        stats.unknownFormatFiles++;
        stats.photosPerUser.push(0);
        if (VERBOSE) {
          console.log(
            `  [${i + 1}/${files.length}] ${file.userId} - ⚠️ Unknown format`,
          );
        }
      }

      // Progress for large scans
      if (!VERBOSE && (i + 1) % 100 === 0) {
        log(
          `  Analyzed ${i + 1}/${files.length} files (${stats.filesWithPhotos} with photos)...`,
        );
      }
    }

    const tinderIds = [...stats.tinderIdsFromFiles];

    // ---- Phase 4: Cross-reference with new media table (if DATABASE_URL set)
    if (process.env.DATABASE_URL) {
      log("\nPhase 4: Cross-referencing with new media table...");

      const newSql = neon(process.env.DATABASE_URL);
      const newDb = drizzle({
        client: newSql,
        schema,
        casing: "snake_case",
      });

      const [newMediaCount] = await newDb
        .select({ count: count() })
        .from(schema.mediaTable);

      console.log(
        `  New DB media table: ${(newMediaCount?.count ?? 0).toLocaleString()} total records`,
      );

      // Check how many of our extracted tinderIds have media in new DB
      if (tinderIds.length > 0) {
        const BATCH = 500;
        let profilesWithNewMedia = 0;
        let totalNewMediaItems = 0;

        for (let i = 0; i < tinderIds.length; i += BATCH) {
          const batch = tinderIds.slice(i, i + BATCH);
          // Use raw SQL for ANY() array query
          const newMediaResult = await newSql`
            SELECT tinder_profile_id, COUNT(*) as cnt
            FROM media
            WHERE tinder_profile_id = ANY(${batch}::text[])
            GROUP BY tinder_profile_id
          `;

          for (const row of newMediaResult as {
            tinder_profile_id: string;
            cnt: string;
          }[]) {
            profilesWithNewMedia++;
            totalNewMediaItems += parseInt(row.cnt);
          }
        }

        console.log(
          `  Of the ${tinderIds.length} profiles from old files:`,
        );
        console.log(
          `    ${profilesWithNewMedia} already have media in NEW media table`,
        );
        console.log(
          `    ${totalNewMediaItems} total media items in NEW media table`,
        );
        console.log(
          `    ${tinderIds.length - profilesWithNewMedia} still need media migrated`,
        );
      }
    } else {
      log(
        "\nPhase 4: Skipped (DATABASE_URL not set - cannot check new DB)",
      );
    }

    // ---- SUMMARY ----
    console.log(
      `\n${"═".repeat(65)}`,
    );
    console.log("📊 FULL SUMMARY");
    console.log(`${"═".repeat(65)}`);

    console.log("\n📁 Files:");
    console.log(`  Total Tinder files scanned:  ${stats.totalFiles.toLocaleString()}`);
    console.log(`  Files with photos:           ${stats.filesWithPhotos.toLocaleString()}`);
    console.log(`  Files with no Photos field:  ${stats.filesWithNoPhotosField.toLocaleString()}`);
    console.log(`  Files with empty Photos[]:   ${stats.filesWithEmptyPhotos.toLocaleString()}`);

    console.log("\n📐 Format Breakdown:");
    console.log(`  New format (TinderPhoto[]):  ${stats.newFormatFiles.toLocaleString()} files → ${stats.totalNewFormatPhotos.toLocaleString()} photos`);
    console.log(`  Old format (string[]):       ${stats.oldFormatFiles.toLocaleString()} files → ${stats.totalOldFormatPhotos.toLocaleString()} photos`);
    console.log(`  Unknown format:              ${stats.unknownFormatFiles.toLocaleString()} files`);

    console.log("\n🔗 New Format URL Analysis (our focus):");
    console.log(`  HTTPS URLs:      ${stats.newFormatWithHttpsUrl.toLocaleString()}`);
    console.log(`  Non-HTTPS URLs:  ${stats.newFormatWithNonHttpsUrl.toLocaleString()}`);
    console.log(`  With prompt:     ${stats.newFormatWithPrompt.toLocaleString()}`);
    console.log(`  Selfie verified: ${stats.newFormatWithSelfieVerified.toLocaleString()}`);

    if (stats.newFormatUrlDomains.size > 0) {
      printMap(stats.newFormatUrlDomains, "New Format URL Domains");
    }

    if (stats.newFormatPhotoTypes.size > 0) {
      printMap(stats.newFormatPhotoTypes, "New Format Photo Types");
    }

    console.log("\n🔗 Old Format URL Analysis (for reference):");
    console.log(`  HTTPS URLs:      ${stats.oldFormatWithHttpsUrl.toLocaleString()}`);
    console.log(`  Non-HTTPS URLs:  ${stats.oldFormatWithNonHttpsUrl.toLocaleString()}`);

    if (stats.oldFormatUrlDomains.size > 0) {
      printMap(stats.oldFormatUrlDomains, "Old Format URL Domains");
    }

    // Photo distribution
    if (stats.photosPerUser.length > 0) {
      const nonZero = stats.photosPerUser.filter((n) => n > 0);
      console.log("\n📈 Photos-per-User Distribution:");
      console.log(`  Min:    ${Math.min(...stats.photosPerUser)}`);
      console.log(`  Max:    ${Math.max(...stats.photosPerUser)}`);
      console.log(
        `  Mean:   ${(stats.photosPerUser.reduce((a, b) => a + b, 0) / stats.photosPerUser.length).toFixed(1)}`,
      );
      console.log(`  Median: ${percentile(stats.photosPerUser, 50)}`);
      console.log(`  P75:    ${percentile(stats.photosPerUser, 75)}`);
      console.log(`  P90:    ${percentile(stats.photosPerUser, 90)}`);
      console.log(`  P99:    ${percentile(stats.photosPerUser, 99)}`);
      if (nonZero.length < stats.photosPerUser.length) {
        console.log(
          `  Users with 0 photos: ${stats.photosPerUser.length - nonZero.length}`,
        );
      }
    }

    if (stats.versionDistribution.size > 0) {
      printMap(stats.versionDistribution, "SwipeStats Versions");
    }

    console.log("\n📅 Date Range:");
    console.log(`  Oldest: ${stats.oldestFile}`);
    console.log(`  Newest: ${stats.newestFile}`);

    console.log(`\n🔑 Tinder IDs extracted: ${stats.tinderIdsFromFiles.size.toLocaleString()}`);

    // Migration estimate
    const totalPhotosToMigrate = stats.totalNewFormatPhotos + stats.totalOldFormatPhotos;
    console.log("\n🚀 Migration Estimate:");
    console.log(
      `  Total photos in JSON blobs:  ${totalPhotosToMigrate.toLocaleString()}`,
    );
    console.log(
      `  New format (primary focus):  ${stats.totalNewFormatPhotos.toLocaleString()} (${stats.newFormatWithHttpsUrl} with https)`,
    );
    console.log(
      `  Old format (string URLs):    ${stats.totalOldFormatPhotos.toLocaleString()} (${stats.oldFormatWithHttpsUrl} with https)`,
    );
    console.log(
      `  Source: All from JSON blobs (old Media table is empty)`,
    );

    console.log(`\n${"═".repeat(65)}\n`);
  } finally {
    client.release();
    await oldPool.end();
  }
}

// ---- RUN ----------------------------------------------------------

extractMedia().catch((error) => {
  console.error("\n❌ Extraction failed:");
  console.error(error);
  if (error instanceof Error) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
  process.exit(1);
});
