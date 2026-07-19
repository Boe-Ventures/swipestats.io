import { eq, sql, gte } from "drizzle-orm";
import { put } from "@vercel/blob";
import { createGzip } from "node:zlib";
import { PassThrough, Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { db } from "@/server/db";
import {
  datasetExportTable,
  tinderProfileTable,
  profileMetaTable,
  tinderUsageTable,
  matchTable,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import {
  DATASET_PRODUCTS,
  type DatasetTier,
} from "@/server/services/lemonSqueezy.service";
import { trackServerEvent } from "@/server/services/analytics.service";

export async function ensureDatasetExportForLicense(input: {
  licenseKey: string;
  licenseKeyId?: string;
  orderId?: string;
  tier: DatasetTier;
  customerEmail?: string;
  expiresAt?: Date | null;
}) {
  const existingExport = await db.query.datasetExportTable.findFirst({
    where: eq(datasetExportTable.licenseKey, input.licenseKey),
  });

  if (existingExport) {
    return { exportRecord: existingExport, created: false };
  }

  const product = DATASET_PRODUCTS[input.tier];

  try {
    const records = await db
      .insert(datasetExportTable)
      .values({
        id: createId("dex"),
        licenseKey: input.licenseKey,
        licenseKeyId: input.licenseKeyId,
        orderId: input.orderId,
        tier: input.tier,
        profileCount: product.profileCount,
        recency: product.recency,
        customerEmail: input.customerEmail,
        expiresAt: input.expiresAt ?? undefined,
        maxDownloads: 3,
        status: "PENDING",
      })
      .returning();

    return { exportRecord: records[0] ?? null, created: true };
  } catch (error) {
    // Handles webhook/request races when the same license is provisioned twice.
    const existing = await db.query.datasetExportTable.findFirst({
      where: eq(datasetExportTable.licenseKey, input.licenseKey),
    });

    if (existing) {
      return { exportRecord: existing, created: false };
    }

    throw error;
  }
}

/**
 * Generate a dataset export for a given export record.
 *
 * Processes one profile at a time to avoid Neon's 64MB HTTP response limit.
 * Outputs JSONL (one JSON object per line) so researchers can stream-parse
 * large datasets without loading the entire file into memory.
 */
export async function generateDatasetForExport(
  exportId: string,
): Promise<void> {
  let exportRecord: typeof datasetExportTable.$inferSelect | undefined;

  try {
    // Get the export record
    exportRecord = await db.query.datasetExportTable.findFirst({
      where: eq(datasetExportTable.id, exportId),
    });

    if (!exportRecord) {
      throw new Error(`Export record ${exportId} not found`);
    }

    // Update status to GENERATING
    await db
      .update(datasetExportTable)
      .set({ status: "GENERATING" })
      .where(eq(datasetExportTable.id, exportId));

    // Get random profiles based on tier and recency
    const profiles = await getRandomProfiles(
      exportRecord.profileCount,
      exportRecord.recency,
    );

    if (profiles.length === 0) {
      throw new Error("No profiles found for export");
    }

    const profileIds = profiles.map((p) => p.tinderId);

    const startTime = Date.now();
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const pathname = `datasets/${exportRecord.tier.toLowerCase()}/${date}/${exportId}.jsonl.gz`;

    let rawSize = 0;
    let compressedSize = 0;
    const jsonlStream = Readable.from(
      streamDatasetJsonl({
        exportId,
        exportRecord,
        profiles,
        startTime,
      }),
      { objectMode: false },
    );
    const rawSizeCounter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        rawSize += chunk.length;
        callback(null, chunk);
      },
    });
    const compressedSizeCounter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        compressedSize += chunk.length;
        callback(null, chunk);
      },
    });
    const uploadBody = new PassThrough();

    console.log(
      `[dataset-export] ${exportId} — streaming gzip upload to blob...`,
    );
    const uploadPromise = put(pathname, uploadBody, {
      access: "public",
      contentType: "application/gzip",
      addRandomSuffix: false,
      multipart: true,
    }).catch((error) => {
      uploadBody.destroy(error as Error);
      throw error;
    });
    const streamPromise = pipeline(
      jsonlStream,
      rawSizeCounter,
      createGzip(),
      compressedSizeCounter,
      uploadBody,
    );
    const [blobResult] = await Promise.all([uploadPromise, streamPromise]);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const rawMB = (rawSize / 1024 / 1024).toFixed(1);
    const gzMB = (compressedSize / 1024 / 1024).toFixed(1);
    console.log(
      `[dataset-export] ${exportId} — done! ${profiles.length} profiles, ${rawMB}MB raw, ${gzMB}MB gzipped, ${totalTime}s total`,
    );

    // Update export record with success
    await db
      .update(datasetExportTable)
      .set({
        status: "READY",
        blobUrl: blobResult.url,
        blobSize: rawSize,
        profileIds: profileIds,
        generatedAt: new Date(),
      })
      .where(eq(datasetExportTable.id, exportId));

    trackServerEvent(`dataset_export:${exportId}`, "dataset_export_ready", {
      exportId,
      tier: exportRecord.tier as DatasetTier,
      profileCount: profiles.length,
      recency: exportRecord.recency,
      blobSize: rawSize,
      compressedSize,
      generationTimeSeconds: Number(totalTime),
    });
  } catch (error) {
    console.error(`Failed to generate dataset ${exportId}:`, error);

    // Update status to FAILED with error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    await db
      .update(datasetExportTable)
      .set({
        status: "FAILED",
        errorMessage: errorMessage,
      })
      .where(eq(datasetExportTable.id, exportId))
      .catch((updateError) => {
        console.error("Failed to update status to FAILED:", updateError);
      });

    if (exportRecord) {
      trackServerEvent(`dataset_export:${exportId}`, "dataset_export_failed", {
        exportId,
        tier: exportRecord.tier as DatasetTier,
        profileCount: exportRecord.profileCount,
        recency: exportRecord.recency,
        errorMessage,
      });
    }

    throw error;
  }
}

async function* streamDatasetJsonl({
  exportId,
  exportRecord,
  profiles,
  startTime,
}: {
  exportId: string;
  exportRecord: typeof datasetExportTable.$inferSelect;
  profiles: Awaited<ReturnType<typeof getRandomProfiles>>;
  startTime: number;
}): AsyncGenerator<string> {
  yield `${JSON.stringify({
    type: "metadata",
    exportId,
    tier: exportRecord.tier,
    profileCount: profiles.length,
    generatedAt: new Date().toISOString(),
    version: "1.0",
    format: "jsonl",
    recency: exportRecord.recency,
  })}\n`;

  // Keep database concurrency bounded while allowing the upload stream to
  // apply backpressure. Only one ten-profile batch is resident at a time.
  for (let i = 0; i < profiles.length; i += 10) {
    const batch = profiles.slice(i, i + 10);
    const batchLines = await Promise.all(
      batch.map(async (profile) => {
        const [meta, usage, matchCount] = await Promise.all([
          db.query.profileMetaTable.findFirst({
            where: eq(profileMetaTable.tinderProfileId, profile.tinderId),
          }),

          db
            .select()
            .from(tinderUsageTable)
            .where(eq(tinderUsageTable.tinderProfileId, profile.tinderId))
            .orderBy(tinderUsageTable.dateStamp),

          db
            .select({ count: sql<number>`count(*)` })
            .from(matchTable)
            .where(eq(matchTable.tinderProfileId, profile.tinderId))
            .then((rows) => rows[0]?.count ?? 0),
        ]);

        // Strip internal fields, keep everything researchers need.
        const {
          userId,
          computed,
          createdAt,
          updatedAt,
          llmAnalyzedAt,
          bioOriginal,
          swipestatsVersion,
          ...profileData
        } = profile;

        return JSON.stringify({
          type: "profile",
          profile: profileData,
          meta: meta ?? null,
          usage,
          matchCount,
        });
      }),
    );

    for (const line of batchLines) {
      yield `${line}\n`;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[dataset-export] ${exportId} — batch ${Math.floor(i / 10) + 1}/${Math.ceil(profiles.length / 10)} done (${i + batch.length}/${profiles.length} profiles, ${elapsed}s)`,
    );
  }

  yield `${JSON.stringify({
    type: "citation",
    text:
      'SwipeStats.io Dating App Dataset. Please cite as: "SwipeStats.io Dating App Dataset, ' +
      new Date().getFullYear() +
      ", " +
      profiles.length +
      ' Profiles"',
  })}\n`;
}

/**
 * Get random profiles for dataset export
 */
async function getRandomProfiles(count: number, recency: "MIXED" | "RECENT") {
  const whereCondition =
    recency === "RECENT"
      ? gte(
          tinderProfileTable.createdAt,
          new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
        )
      : undefined;

  return db
    .select()
    .from(tinderProfileTable)
    .where(whereCondition)
    .orderBy(sql`RANDOM()`)
    .limit(count);
}
