import { eq, sql, gte } from "drizzle-orm";
import { put } from "@vercel/blob";
import { gzipSync } from "zlib";

import { db } from "@/server/db";
import {
  datasetExportTable,
  tinderProfileTable,
  profileMetaTable,
  tinderUsageTable,
  matchTable,
} from "@/server/db/schema";

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
  try {
    // Get the export record
    const exportRecord = await db.query.datasetExportTable.findFirst({
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

    // Build JSONL: one line per object
    const lines: string[] = [];

    // First line: metadata
    lines.push(
      JSON.stringify({
        type: "metadata",
        exportId,
        tier: exportRecord.tier,
        profileCount: profiles.length,
        generatedAt: new Date().toISOString(),
        version: "1.0",
        format: "jsonl",
        recency: exportRecord.recency,
      }),
    );

    // Process profiles in parallel batches (10 at a time)
    const startTime = Date.now();
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

          // Strip internal fields, keep everything researchers need
          const { userId, computed, createdAt, updatedAt, llmAnalyzedAt, bioOriginal, swipestatsVersion, ...profileData } =
            profile;

          return JSON.stringify({
            type: "profile",
            profile: profileData,
            meta: meta ?? null,
            usage,
            matchCount,
          });
        }),
      );
      lines.push(...batchLines);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[dataset-export] ${exportId} — batch ${Math.floor(i / 10) + 1}/${Math.ceil(profiles.length / 10)} done (${i + batch.length}/${profiles.length} profiles, ${elapsed}s)`,
      );
    }

    // Last line: citation
    lines.push(
      JSON.stringify({
        type: "citation",
        text:
          'SwipeStats.io Dating App Dataset. Please cite as: "SwipeStats.io Dating App Dataset, ' +
          new Date().getFullYear() +
          ", " +
          profiles.length +
          ' Profiles"',
      }),
    );

    const jsonlContent = lines.join("\n") + "\n";
    const raw = Buffer.from(jsonlContent);
    const compressed = gzipSync(raw);

    // Upload gzipped to Vercel Blob
    const rawMB = (raw.length / 1024 / 1024).toFixed(1);
    const gzMB = (compressed.length / 1024 / 1024).toFixed(1);
    console.log(`[dataset-export] ${exportId} — uploading ${gzMB}MB gzipped (${rawMB}MB raw) to blob...`);
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const pathname = `datasets/${exportRecord.tier.toLowerCase()}/${date}/${exportId}.jsonl.gz`;
    const blobResult = await put(pathname, compressed, {
      access: "public",
      contentType: "application/gzip",
      addRandomSuffix: false,
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[dataset-export] ${exportId} — done! ${profiles.length} profiles, ${rawMB}MB raw, ${gzMB}MB gzipped, ${totalTime}s total`);

    // Update export record with success
    await db
      .update(datasetExportTable)
      .set({
        status: "READY",
        blobUrl: blobResult.url,
        blobSize: raw.length,
        profileIds: profileIds,
        generatedAt: new Date(),
      })
      .where(eq(datasetExportTable.id, exportId));
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

    throw error;
  }
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
