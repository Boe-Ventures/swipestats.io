import { and, desc, eq, sql, gte, inArray } from "drizzle-orm";
import { put } from "@vercel/blob";
import { createGzip } from "node:zlib";
import { PassThrough, Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { db } from "@/server/db";
import {
  serializeResearchProfile,
  RESEARCH_DATASET_VERSION,
} from "@/lib/research/dataset-contract";
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
  quantity: number;
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
        profileCount: product.profileCount * input.quantity,
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
 * Processes bounded profile batches to stay below Neon's HTTP response limit.
 * Outputs JSONL (one JSON object per line) so researchers can stream-parse
 * large datasets without loading the entire file into memory.
 */
export async function generateDatasetForExport(
  exportId: string,
): Promise<void> {
  let exportRecord: typeof datasetExportTable.$inferSelect | undefined;
  let ownsGeneration = false;

  try {
    // Get the export record
    exportRecord = await db.query.datasetExportTable.findFirst({
      where: eq(datasetExportTable.id, exportId),
    });

    if (!exportRecord) {
      throw new Error(`Export record ${exportId} not found`);
    }

    // Update status to GENERATING
    const claimed = await db
      .update(datasetExportTable)
      .set({ status: "GENERATING" })
      .where(
        and(
          eq(datasetExportTable.id, exportId),
          eq(datasetExportTable.status, "PENDING"),
        ),
      )
      .returning({ id: datasetExportTable.id });
    if (!claimed.length) return;
    ownsGeneration = true;

    // Get random profiles based on tier and recency
    const profiles = await getRandomProfiles(
      exportRecord.profileCount,
      exportRecord.recency,
    );

    if (profiles.length !== exportRecord.profileCount) {
      throw new Error(
        `Requested ${exportRecord.profileCount} profiles, but only ${profiles.length} are available. Please contact support.`,
      );
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
        blobSize: compressedSize,
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

    if (!ownsGeneration) throw error;

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

export async function* streamDatasetJsonl({
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
    version: RESEARCH_DATASET_VERSION,
    includesMessageContent: false,
    format: "jsonl",
    recency: exportRecord.recency,
  })}\n`;

  // Three queries per batch instead of three queries per profile. Keep usage
  // payloads bounded and let the upload stream apply backpressure between batches.
  const batchSize = 25;
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    const ids = batch.map((profile) => profile.tinderId);
    const [metas, usageRows, counts] = await Promise.all([
      db
        .select()
        .from(profileMetaTable)
        .where(inArray(profileMetaTable.tinderProfileId, ids)),
      db
        .select()
        .from(tinderUsageTable)
        .where(inArray(tinderUsageTable.tinderProfileId, ids))
        .orderBy(tinderUsageTable.dateStamp),
      db
        .select({
          profileId: matchTable.tinderProfileId,
          count: sql<number>`count(*)::int`,
        })
        .from(matchTable)
        .where(inArray(matchTable.tinderProfileId, ids))
        .groupBy(matchTable.tinderProfileId),
    ]);
    const metaById = new Map(metas.map((meta) => [meta.tinderProfileId, meta]));
    const countById = new Map(counts.map((row) => [row.profileId, row.count]));
    const usageById = new Map<string, typeof usageRows>();
    for (const row of usageRows) {
      if (!row.tinderProfileId) continue;
      const rows = usageById.get(row.tinderProfileId) ?? [];
      rows.push(row);
      usageById.set(row.tinderProfileId, rows);
    }
    const batchLines = batch.map((profile) => {
      const meta = metaById.get(profile.tinderId);
      const usage = usageById.get(profile.tinderId) ?? [];
      const matchCount = countById.get(profile.tinderId) ?? 0;

      return JSON.stringify(
        serializeResearchProfile({
          profile,
          meta: meta ?? null,
          usage,
          matchCount,
        }),
      );
    });

    for (const line of batchLines) {
      yield `${line}\n`;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[dataset-export] ${exportId} — batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(profiles.length / batchSize)} done (${i + batch.length}/${profiles.length} profiles, ${elapsed}s)`,
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
    .where(and(eq(tinderProfileTable.computed, false), whereCondition))
    .orderBy(
      recency === "RECENT" ? desc(tinderProfileTable.createdAt) : sql`RANDOM()`,
    )
    .limit(count);
}

export async function assertDatasetAvailability(
  tier: DatasetTier,
  quantity: number,
) {
  const product = DATASET_PRODUCTS[tier];
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tinderProfileTable)
    .where(
      and(
        eq(tinderProfileTable.computed, false),
        product.recency === "RECENT"
          ? gte(
              tinderProfileTable.createdAt,
              new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
            )
          : undefined,
      ),
    );
  if ((row?.count ?? 0) < product.profileCount * quantity) {
    throw new Error(
      "This dataset size is currently unavailable. Please choose a smaller package or contact support.",
    );
  }
}

export async function getStandardDatasetAvailability() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tinderProfileTable)
    .where(eq(tinderProfileTable.computed, false));
  return { maxQuantity: Math.min(12, Math.floor((row?.count ?? 0) / 1000)) };
}
