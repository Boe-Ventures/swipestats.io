/**
 * Migrate Original File Data to Vercel Blob
 *
 * Migrates file content from old database JSONB column to Vercel Blob storage.
 * This backfills the blobUrl column for old records that have file data stored
 * directly in the database.
 *
 * Usage:
 *   # Dry run (preview)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=10 DRY_RUN=true \
 *     bun run src/scripts/migration/migrate-files-to-blob.ts
 *
 *   # Migrate 100 records (testing)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=100 \
 *     bun run src/scripts/migration/migrate-files-to-blob.ts
 *
 *   # Full migration
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> \
 *     bun run src/scripts/migration/migrate-files-to-blob.ts
 */

import { neon, Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { eq, isNotNull } from "drizzle-orm";
import ws from "ws";
import * as schema from "@/server/db/schema";
import { BlobService } from "@/server/services/blob.service";
import {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  log,
  formatDuration,
  printStep,
} from "./utils/cli";

// Enable WebSocket for large payload support
neonConfig.webSocketConstructor = ws;

// ---- TYPES --------------------------------------------------------

interface OldFileRecord {
  id: string;
  userId: string;
  dataProvider: string;
  file: unknown; // JSONB data from old database
  createdAt: Date | string; // Can be string from raw DB query
  profileId?: string; // tinderId or hingeId extracted from file
}

interface UploadResult {
  id: string;
  tinderId?: string;
  success: boolean;
  blobUrl?: string;
  error?: string;
  size?: number;
}

interface MigrationStats {
  totalFound: number;
  processed: number;
  uploaded: number;
  failed: number;
  skipped: number;
  totalSize: number;
}

// ---- CONFIGURATION ------------------------------------------------

const DEFAULT_BATCH_SIZE = 10;

// ---- QUERY FUNCTIONS ----------------------------------------------

async function queryFilesFromOldDb(
  oldPool: Pool,
  newDb: NeonHttpDatabase<typeof schema>,
  recordLimit?: number,
): Promise<OldFileRecord[]> {
  log(
    "Querying Tinder files from old database (using WebSocket for large payloads)...",
  );

  // First, get IDs of files that already have blobUrl in new DB
  log("Checking new database for already-migrated files...");
  const alreadyMigrated = await newDb
    .select({ id: schema.originalAnonymizedFileTable.id })
    .from(schema.originalAnonymizedFileTable)
    .where(isNotNull(schema.originalAnonymizedFileTable.blobUrl));

  const migratedIds = new Set(alreadyMigrated.map((r) => r.id));

  log(
    `Found ${migratedIds.size.toLocaleString()} already-migrated files to skip`,
  );

  const client = await oldPool.connect();
  try {
    const query = recordLimit
      ? `
        SELECT 
          id,
          "userId",
          "dataProvider",
          file,
          "createdAt"
        FROM "OriginalAnonymizedFile"
        WHERE file IS NOT NULL 
          AND "dataProvider" = 'TINDER'
        ORDER BY "createdAt" DESC
        LIMIT $1
      `
      : `
        SELECT 
          id,
          "userId",
          "dataProvider",
          file,
          "createdAt"
        FROM "OriginalAnonymizedFile"
        WHERE file IS NOT NULL
          AND "dataProvider" = 'TINDER'
        ORDER BY "createdAt" DESC
      `;

    const result = recordLimit
      ? await client.query(query, [recordLimit])
      : await client.query(query);

    const allFiles = result.rows as OldFileRecord[];

    // Filter out files that already have blobUrl
    const filesToMigrate = allFiles.filter((f) => !migratedIds.has(f.id));

    log(`Found ${allFiles.length.toLocaleString()} files in old DB`);
    log(
      `Skipping ${allFiles.length - filesToMigrate.length} already-migrated files`,
    );
    log(`${filesToMigrate.length.toLocaleString()} files to migrate`);

    return filesToMigrate;
  } finally {
    client.release();
  }
}

// ---- UPLOAD FUNCTIONS ---------------------------------------------

async function extractProfileId(file: OldFileRecord): Promise<string> {
  // Only handle Tinder files - throw error if we encounter anything else
  if (file.dataProvider !== "TINDER") {
    throw new Error(
      `Unexpected dataProvider: ${file.dataProvider} (only TINDER is supported)`,
    );
  }

  // Extract birth_date and create_date from Tinder JSON
  const fileData = file.file as {
    User?: { birth_date?: string; create_date?: string };
  };
  const birthDate = fileData.User?.birth_date;
  const createDate = fileData.User?.create_date;

  if (!birthDate || !createDate) {
    throw new Error(
      `Missing birth_date or create_date in Tinder file ${file.id}`,
    );
  }

  // Generate tinderId hash (same as extract-tinder-data.ts)
  const crypto = await import("crypto");
  const hash = crypto
    .createHash("sha256")
    .update(birthDate + "-" + createDate)
    .digest("hex");

  return hash;
}

function generateBlobPathname(profileId: string): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  // Only handling Tinder data (no Hinge files in old DB)
  return `tinder-data/${profileId}/${date}/data.json`;
}

async function uploadFileToBlob(
  file: OldFileRecord,
  dryRun: boolean,
): Promise<UploadResult> {
  try {
    // Extract profileId (tinderId) from file data
    const profileId = await extractProfileId(file);

    // Calculate file size
    const jsonString = JSON.stringify(file.file);
    const sizeInBytes = Buffer.byteLength(jsonString, "utf8");
    const sizeInMB = sizeInBytes / (1024 * 1024);

    // Validate size (warn if > 50MB)
    if (sizeInMB > 50) {
      printWarning(
        `   File ${file.id} is large (${sizeInMB.toFixed(2)} MB) - may take time to upload`,
      );
    }

    if (dryRun) {
      const pathname = generateBlobPathname(profileId);
      log(
        `   [DRY RUN] Would upload ${file.id} to ${pathname} (${sizeInMB.toFixed(2)} MB)`,
      );
      return {
        id: file.id,
        tinderId: profileId,
        success: true,
        blobUrl: `https://blob.vercel-storage.com/dry-run-${file.id}`,
        size: sizeInBytes,
      };
    }

    // Generate blob pathname (matches current upload structure)
    const pathname = generateBlobPathname(profileId);

    // Upload to Vercel Blob
    const uploadResult = await BlobService.uploadJson(pathname, file.file);

    return {
      id: file.id,
      tinderId: profileId,
      success: true,
      blobUrl: uploadResult.url,
      size: sizeInBytes,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    printError(`   Failed to upload ${file.id}: ${errorMessage}`);

    return {
      id: file.id,
      success: false,
      error: errorMessage,
    };
  }
}

async function uploadBatch(
  files: OldFileRecord[],
  dryRun: boolean,
): Promise<UploadResult[]> {
  // Upload files in parallel
  const results = await Promise.all(
    files.map((file) => uploadFileToBlob(file, dryRun)),
  );

  return results;
}

// ---- DATABASE UPDATE FUNCTIONS ------------------------------------

async function upsertDatabaseRecord(
  newDb: NeonHttpDatabase<typeof schema>,
  file: OldFileRecord,
  tinderId: string,
  blobUrl: string,
  dryRun: boolean,
): Promise<boolean> {
  try {
    if (dryRun) {
      return true;
    }

    // Step 1: Look up userId from tinder_profile using tinderId
    const tinderProfile = await newDb
      .select({ userId: schema.tinderProfileTable.userId })
      .from(schema.tinderProfileTable)
      .where(eq(schema.tinderProfileTable.tinderId, tinderId))
      .limit(1);

    if (tinderProfile.length === 0) {
      printError(
        `   Tinder profile ${tinderId} not found in new database - skipping file ${file.id}`,
      );
      return false;
    }

    const userId = tinderProfile[0]!.userId;

    if (!userId) {
      printError(
        `   Tinder profile ${tinderId} has no userId - skipping file ${file.id}`,
      );
      return false;
    }

    // Step 2: UPSERT into original_anonymized_file
    await newDb
      .insert(schema.originalAnonymizedFileTable)
      .values({
        id: file.id,
        userId: userId,
        dataProvider: file.dataProvider as "TINDER" | "HINGE",
        swipestatsVersion: "SWIPESTATS_1",
        blobUrl: blobUrl,
        file: null, // Not storing JSONB anymore
        createdAt: new Date(file.createdAt), // Convert string to Date
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.originalAnonymizedFileTable.id,
        set: {
          blobUrl: blobUrl,
          updatedAt: new Date(),
        },
      });

    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    printError(
      `   Failed to upsert database record for ${file.id}: ${errorMessage}`,
    );
    return false;
  }
}

async function upsertDatabaseBatch(
  newDb: NeonHttpDatabase<typeof schema>,
  files: OldFileRecord[],
  results: UploadResult[],
  dryRun: boolean,
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  // Create a map for quick lookup
  const fileMap = new Map(files.map((f) => [f.id, f]));

  for (const result of results) {
    if (result.success && result.blobUrl && result.tinderId) {
      const file = fileMap.get(result.id);
      if (!file) {
        printError(`   File ${result.id} not found in batch`);
        failed++;
        continue;
      }

      const success = await upsertDatabaseRecord(
        newDb,
        file,
        result.tinderId,
        result.blobUrl,
        dryRun,
      );
      if (success) {
        updated++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }

  return { updated, failed };
}

// ---- MAIN MIGRATION FUNCTION --------------------------------------

export async function migrateFilesToBlob(options: {
  recordLimit?: number;
  dryRun?: boolean;
  batchSize?: number;
}) {
  const {
    recordLimit,
    dryRun = false,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  // Validate environment
  if (!process.env.OLD_DATABASE_URL) {
    throw new Error("OLD_DATABASE_URL environment variable is required");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Connect to databases
  // Old DB: Use WebSocket Pool for large JSONB payloads (avoids 64MB HTTP limit)
  const oldPool = new Pool({ connectionString: process.env.OLD_DATABASE_URL });

  // New DB: Use HTTP for updates (smaller payloads)
  const newSql = neon(process.env.DATABASE_URL);
  const newDb = drizzle({
    client: newSql,
    schema,
    casing: "snake_case",
  });

  printHeader("SwipeStats V4: File Migration to Vercel Blob");

  if (dryRun) {
    printWarning("DRY RUN MODE - No data will be uploaded or updated\n");
  }

  // Show configuration
  console.log("Configuration:");
  console.log(`  RECORD_LIMIT: ${recordLimit ?? "all"}`);
  console.log(`  DRY_RUN: ${dryRun}`);
  console.log(`  BATCH_SIZE: ${batchSize}`);
  console.log("");

  const startTime = Date.now();
  const stats: MigrationStats = {
    totalFound: 0,
    processed: 0,
    uploaded: 0,
    failed: 0,
    skipped: 0,
    totalSize: 0,
  };

  const failedRecords: { id: string; error: string }[] = [];

  try {
    // Step 1: Query files from old database
    printStep("Querying files from old database...");
    const files = await queryFilesFromOldDb(oldPool, newDb, recordLimit);
    stats.totalFound = files.length;

    if (files.length === 0) {
      printWarning("No files found to migrate");
      return stats;
    }

    printSuccess(
      `Found ${files.length.toLocaleString()} files${recordLimit ? " (limit applied)" : ""}`,
    );
    console.log("");

    // Step 2: Upload files in batches
    printStep("Uploading to Vercel Blob...");

    const totalBatches = Math.ceil(files.length / batchSize);
    const batchStartTime = Date.now();

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;

      // Upload batch
      const uploadResults = await uploadBatch(batch, dryRun);

      // Upsert to database
      await upsertDatabaseBatch(newDb, batch, uploadResults, dryRun);

      // Update stats
      for (const result of uploadResults) {
        stats.processed++;
        if (result.success) {
          stats.uploaded++;
          if (result.size) {
            stats.totalSize += result.size;
          }
        } else {
          stats.failed++;
          if (result.error) {
            failedRecords.push({ id: result.id, error: result.error });
          }
        }
      }

      // Progress logging
      const progress = Math.min(i + batchSize, files.length);
      const elapsed = Date.now() - batchStartTime;
      const avgTimePerBatch = elapsed / currentBatch;
      const remainingBatches = totalBatches - currentBatch;
      const estimatedRemaining = remainingBatches * avgTimePerBatch;

      log(
        `   Batch ${currentBatch}/${totalBatches}: ${progress.toLocaleString()}/${files.length.toLocaleString()} (${stats.uploaded} uploaded, ${stats.failed} failed)${estimatedRemaining > 0 ? ` (est. ${formatDuration(estimatedRemaining)} remaining)` : ""}`,
      );
    }

    printSuccess(
      `Upload complete: ${stats.uploaded} succeeded, ${stats.failed} failed`,
    );
    console.log("");

    // Summary
    const totalDuration = Date.now() - startTime;
    const totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);

    printHeader("Migration Complete!");

    console.log("Summary:");
    console.log(`  Total found: ${stats.totalFound.toLocaleString()}`);
    console.log(`  Processed: ${stats.processed.toLocaleString()}`);
    console.log(`  Uploaded: ${stats.uploaded.toLocaleString()}`);
    console.log(`  Failed: ${stats.failed.toLocaleString()}`);
    console.log(`  Total size: ${totalSizeMB} MB`);
    console.log(`  Total time: ${formatDuration(totalDuration)}`);
    console.log("");

    if (failedRecords.length > 0) {
      printWarning(`Failed records (${failedRecords.length}):`);
      failedRecords.slice(0, 10).forEach((record) => {
        console.log(`  - ${record.id}: ${record.error}`);
      });
      if (failedRecords.length > 10) {
        console.log(`  ... and ${failedRecords.length - 10} more`);
      }
      console.log("");
    }

    if (!dryRun) {
      printSuccess("Next steps:");
      console.log("  1. Review any failed records above");
      console.log(
        "  2. Run migrate-extract-locations.ts to verify location signals",
      );
      console.log("");
    }

    return stats;
  } catch (error) {
    printError("Migration failed");
    console.error(error);
    throw error;
  } finally {
    // Clean up pool connection
    await oldPool.end();
  }
}

// ---- STANDALONE EXECUTION -----------------------------------------

if (import.meta.main) {
  const RECORD_LIMIT = process.env.RECORD_LIMIT
    ? parseInt(process.env.RECORD_LIMIT, 10)
    : undefined;
  const DRY_RUN = process.env.DRY_RUN === "true";
  const BATCH_SIZE = process.env.BATCH_SIZE
    ? parseInt(process.env.BATCH_SIZE, 10)
    : DEFAULT_BATCH_SIZE;

  migrateFilesToBlob({
    recordLimit: RECORD_LIMIT,
    dryRun: DRY_RUN,
    batchSize: BATCH_SIZE,
  })
    .then((stats) => {
      if (stats.failed > 0) {
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
