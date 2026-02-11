/**
 * Migrate Media from OriginalAnonymizedFile JSON blobs → new media table
 *
 * Extracts Tinder photo data from the old database's OriginalAnonymizedFile
 * JSONB column and inserts into the new media table. Focuses on "new format"
 * TinderPhoto objects with HTTPS URLs. The old Media table is empty — all
 * media lives in JSON blobs only.
 *
 * IDEMPOTENT: Profiles that already have media in the new DB are skipped.
 * Safe to re-run at any time.
 *
 * Usage:
 *   # Dry run (preview 10 records)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=10 DRY_RUN=true \
 *     bun run src/scripts/migration/migrate-media-from-blobs.ts
 *
 *   # Migrate 100 records (testing)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=100 \
 *     bun run src/scripts/migration/migrate-media-from-blobs.ts
 *
 *   # Full migration
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> \
 *     bun run src/scripts/migration/migrate-media-from-blobs.ts
 */

import { neon, Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import ws from "ws";
import crypto from "crypto";
import * as schema from "@/server/db/schema";
import type { MediaInsert } from "@/server/db/schema";
import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { isNewPhotoFormat } from "@/lib/interfaces/TinderDataJSON";
import { createId } from "@/server/db/utils";
import {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  log,
  formatDuration,
  printStep,
} from "./utils/cli";

// Enable WebSocket for large JSONB payloads
neonConfig.webSocketConstructor = ws;

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

interface MigrationStats {
  totalFiles: number;
  filesProcessed: number;
  filesSkippedNoPhotos: number;
  filesSkippedOldFormat: number;
  filesSkippedAlreadyMigrated: number;
  filesSkippedNoProfile: number;
  filesFailed: number;
  mediaInserted: number;
  mediaSkippedNonHttps: number;
}

// ---- CONFIGURATION ------------------------------------------------

const DEFAULT_FETCH_BATCH = 50; // How many files to fetch from old DB at a time
const INSERT_BATCH_SIZE = 200; // How many media rows to insert at a time

// ---- UTILITIES ----------------------------------------------------

function generateTinderId(birthDate: string, createDate: string): string {
  return crypto
    .createHash("sha256")
    .update(birthDate + "-" + createDate)
    .digest("hex");
}

/**
 * Extract tinderId from an OriginalAnonymizedFile record.
 * Returns null if birth_date or create_date are missing.
 */
function extractTinderId(file: OriginalFileRecord): string | null {
  const data = file.file;
  const birthDate = data?.User?.birth_date;
  const createDate = data?.User?.create_date;

  if (!birthDate || !createDate) {
    return null;
  }

  return generateTinderId(String(birthDate), String(createDate));
}

/**
 * Transform new-format TinderPhotos into MediaInsert rows.
 * Only includes photos with HTTPS URLs.
 */
function transformPhotosToMedia(
  file: OriginalFileRecord,
  tinderId: string,
): { media: MediaInsert[]; skippedNonHttps: number } {
  const data = file.file;
  let skippedNonHttps = 0;

  if (
    !data?.Photos ||
    !Array.isArray(data.Photos) ||
    data.Photos.length === 0
  ) {
    return { media: [], skippedNonHttps: 0 };
  }

  const photos = data.Photos;

  if (!isNewPhotoFormat(photos)) {
    // Old format — skip (all non-HTTPS per our analysis)
    return { media: [], skippedNonHttps: 0 };
  }

  const media: MediaInsert[] = [];

  for (const photo of photos) {
    if (!photo.url?.startsWith("https://")) {
      skippedNonHttps++;
      continue;
    }

    media.push({
      id: createId("media"),
      type: photo.type || "photo",
      url: photo.url,
      prompt: photo.prompt_text || null,
      caption: null,
      fromSoMe: null,
      tinderProfileId: tinderId,
      hingeProfileId: null,
    });
  }

  return { media, skippedNonHttps };
}

// ---- MAIN MIGRATION -----------------------------------------------

async function migrateMedia(options: {
  recordLimit?: number;
  dryRun: boolean;
  fetchBatch?: number;
}) {
  const { recordLimit, dryRun, fetchBatch = DEFAULT_FETCH_BATCH } = options;

  // Validate environment
  if (!process.env.OLD_DATABASE_URL) {
    throw new Error("OLD_DATABASE_URL environment variable is required");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  printHeader("SwipeStats V4: Media Migration from JSON Blobs");

  if (dryRun) {
    printWarning("DRY RUN MODE - No data will be written\n");
  }

  // Show configuration
  console.log("Configuration:");
  console.log(`  RECORD_LIMIT:    ${recordLimit ?? "all"}`);
  console.log(`  DRY_RUN:         ${dryRun}`);
  console.log(`  FETCH_BATCH:     ${fetchBatch}`);
  console.log(`  INSERT_BATCH:    ${INSERT_BATCH_SIZE}`);
  console.log("");

  const startTime = Date.now();

  // Connect to databases
  const oldPool = new Pool({ connectionString: process.env.OLD_DATABASE_URL });
  const newSql = neon(process.env.DATABASE_URL);
  const newDb = drizzle({
    client: newSql,
    schema,
    casing: "snake_case",
  }) as NeonHttpDatabase<typeof schema>;

  const stats: MigrationStats = {
    totalFiles: 0,
    filesProcessed: 0,
    filesSkippedNoPhotos: 0,
    filesSkippedOldFormat: 0,
    filesSkippedAlreadyMigrated: 0,
    filesSkippedNoProfile: 0,
    filesFailed: 0,
    mediaInserted: 0,
    mediaSkippedNonHttps: 0,
  };

  const failedFiles: { id: string; tinderId: string | null; error: string }[] =
    [];

  const client = await oldPool.connect();

  try {
    // ---- Step 1: Get profiles that already have media in new DB (for idempotency)
    printStep("Step 1: Loading already-migrated profiles from new DB...");

    const existingMedia = await newSql`
      SELECT DISTINCT tinder_profile_id FROM media
      WHERE tinder_profile_id IS NOT NULL
    `;
    const alreadyMigratedProfiles = new Set(
      (existingMedia as { tinder_profile_id: string }[]).map(
        (r) => r.tinder_profile_id,
      ),
    );

    log(
      `  ${alreadyMigratedProfiles.size.toLocaleString()} profiles already have media in new DB`,
    );
    console.log("");

    // ---- Step 2: Also load the set of valid tinderProfileIds in new DB
    //              (media table has FK to tinder_profile, so we can only insert
    //               for profiles that exist)
    printStep("Step 2: Loading valid tinder profiles from new DB...");

    const validProfiles = await newSql`
      SELECT tinder_id FROM tinder_profile
    `;
    const validTinderIds = new Set(
      (validProfiles as { tinder_id: string }[]).map((r) => r.tinder_id),
    );

    log(
      `  ${validTinderIds.size.toLocaleString()} tinder profiles exist in new DB`,
    );
    console.log("");

    // ---- Step 3: Count total files to migrate
    printStep("Step 3: Counting files in old database...");

    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM "OriginalAnonymizedFile"
      WHERE "dataProvider" = 'TINDER'
        AND file IS NOT NULL
    `);
    const totalInOldDb = parseInt(
      (countResult.rows[0] as { total: string }).total,
    );

    log(`  ${totalInOldDb.toLocaleString()} Tinder files with data in old DB`);
    const effectiveLimit = recordLimit
      ? Math.min(recordLimit, totalInOldDb)
      : totalInOldDb;
    log(
      `  Will process: ${effectiveLimit.toLocaleString()}${recordLimit ? " (limit applied)" : ""}`,
    );
    console.log("");

    // ---- Step 4: Fetch and process files in batches
    printStep("Step 4: Migrating media...");

    stats.totalFiles = effectiveLimit;
    let offset = 0;
    let allMediaToInsert: MediaInsert[] = [];

    while (offset < effectiveLimit) {
      const batchSize = Math.min(fetchBatch, effectiveLimit - offset);
      const batchNum = Math.floor(offset / fetchBatch) + 1;

      // Fetch batch from old DB
      const batchResult = await client.query(
        `
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
        LIMIT $1 OFFSET $2
      `,
        [batchSize, offset],
      );

      const files = batchResult.rows as OriginalFileRecord[];

      if (files.length === 0) break;

      // Process each file in this batch
      for (const file of files) {
        try {
          // Extract tinderId
          const tinderId = extractTinderId(file);
          if (!tinderId) {
            stats.filesSkippedNoPhotos++;
            continue;
          }

          // Idempotency check: skip if already migrated
          if (alreadyMigratedProfiles.has(tinderId)) {
            stats.filesSkippedAlreadyMigrated++;
            continue;
          }

          // FK check: skip if profile doesn't exist in new DB
          if (!validTinderIds.has(tinderId)) {
            stats.filesSkippedNoProfile++;
            continue;
          }

          // Transform photos
          const { media, skippedNonHttps } = transformPhotosToMedia(
            file,
            tinderId,
          );
          stats.mediaSkippedNonHttps += skippedNonHttps;

          if (media.length === 0) {
            // Check why: old format or genuinely no photos
            const data = file.file;
            if (
              data?.Photos &&
              Array.isArray(data.Photos) &&
              data.Photos.length > 0 &&
              !isNewPhotoFormat(data.Photos)
            ) {
              stats.filesSkippedOldFormat++;
            } else {
              stats.filesSkippedNoPhotos++;
            }
            continue;
          }

          // Accumulate for batch insert
          allMediaToInsert.push(...media);
          stats.filesProcessed++;

          // Mark this profile as migrated (in-memory) so we don't double-process
          // if same profile appears again in a later batch
          alreadyMigratedProfiles.add(tinderId);

          // Flush accumulated media if we have enough
          if (allMediaToInsert.length >= INSERT_BATCH_SIZE) {
            if (!dryRun) {
              await insertMediaBatch(newDb, allMediaToInsert);
            }
            stats.mediaInserted += allMediaToInsert.length;
            allMediaToInsert = [];
          }
        } catch (error) {
          const tinderId = extractTinderId(file);
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          failedFiles.push({
            id: file.id,
            tinderId,
            error: errorMsg,
          });
          stats.filesFailed++;
        }
      }

      offset += files.length;

      // Progress
      const elapsed = Date.now() - startTime;
      const rate = offset / (elapsed / 1000);
      const remaining = effectiveLimit - offset;
      const eta = remaining / rate;

      log(
        `  Batch ${batchNum}: ${offset.toLocaleString()}/${effectiveLimit.toLocaleString()} files` +
          ` | ${stats.mediaInserted + allMediaToInsert.length} media queued` +
          ` | ${stats.filesSkippedAlreadyMigrated} already migrated` +
          ` | ${stats.filesSkippedNoProfile} no profile` +
          (eta > 0 ? ` | ETA: ${formatDuration(eta * 1000)}` : ""),
      );
    }

    // Flush remaining media
    if (allMediaToInsert.length > 0) {
      if (!dryRun) {
        await insertMediaBatch(newDb, allMediaToInsert);
      }
      stats.mediaInserted += allMediaToInsert.length;
      allMediaToInsert = [];
    }

    // ---- Summary
    const totalDuration = Date.now() - startTime;

    printHeader("Migration Complete!");

    console.log("Summary:");
    console.log(
      `  Total files in scope:      ${stats.totalFiles.toLocaleString()}`,
    );
    console.log(
      `  Files processed (media):   ${stats.filesProcessed.toLocaleString()}`,
    );
    console.log(
      `  Already migrated (skipped): ${stats.filesSkippedAlreadyMigrated.toLocaleString()}`,
    );
    console.log(
      `  No profile in new DB:      ${stats.filesSkippedNoProfile.toLocaleString()}`,
    );
    console.log(
      `  Old format (skipped):      ${stats.filesSkippedOldFormat.toLocaleString()}`,
    );
    console.log(
      `  No photos (skipped):       ${stats.filesSkippedNoPhotos.toLocaleString()}`,
    );
    console.log(
      `  Failed:                    ${stats.filesFailed.toLocaleString()}`,
    );
    console.log("");
    console.log(
      `  Media rows inserted:       ${stats.mediaInserted.toLocaleString()}`,
    );
    console.log(
      `  Non-HTTPS skipped:         ${stats.mediaSkippedNonHttps.toLocaleString()}`,
    );
    console.log("");
    console.log(`  Total time: ${formatDuration(totalDuration)}`);
    console.log("");

    if (failedFiles.length > 0) {
      printWarning(`Failed files (${failedFiles.length}):`);
      failedFiles.slice(0, 20).forEach((f) => {
        console.log(
          `  - File ${f.id} (tinderId: ${f.tinderId?.substring(0, 12) ?? "unknown"}...): ${f.error}`,
        );
      });
      if (failedFiles.length > 20) {
        console.log(`  ... and ${failedFiles.length - 20} more`);
      }
      console.log("");
    }

    if (dryRun) {
      printWarning("This was a DRY RUN — no data was written");
      printWarning("Run without DRY_RUN=true to apply changes");
    } else {
      printSuccess("Media migration completed successfully!");
    }

    console.log("");

    return stats;
  } catch (error) {
    printError("Migration failed");
    console.error(error);
    throw error;
  } finally {
    client.release();
    await oldPool.end();
  }
}

// ---- INSERT HELPERS -----------------------------------------------

async function insertMediaBatch(
  newDb: NeonHttpDatabase<typeof schema>,
  media: MediaInsert[],
): Promise<void> {
  // Insert in sub-batches to stay within Neon HTTP payload limits
  const SUB_BATCH = 100;
  for (let i = 0; i < media.length; i += SUB_BATCH) {
    const batch = media.slice(i, i + SUB_BATCH);
    await newDb.insert(schema.mediaTable).values(batch).onConflictDoNothing(); // Idempotent: skip if ID already exists
  }
}

// ---- STANDALONE EXECUTION -----------------------------------------

if (import.meta.main) {
  const RECORD_LIMIT = process.env.RECORD_LIMIT
    ? parseInt(process.env.RECORD_LIMIT, 10)
    : undefined;
  const DRY_RUN = process.env.DRY_RUN === "true";
  const FETCH_BATCH = process.env.FETCH_BATCH
    ? parseInt(process.env.FETCH_BATCH, 10)
    : DEFAULT_FETCH_BATCH;

  migrateMedia({
    recordLimit: RECORD_LIMIT,
    dryRun: DRY_RUN,
    fetchBatch: FETCH_BATCH,
  })
    .then((stats) => {
      if (stats.filesFailed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nMigration failed:");
      console.error(error);
      process.exit(1);
    });
}
