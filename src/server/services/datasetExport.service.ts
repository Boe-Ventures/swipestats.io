import { eq, sql, gte, inArray } from "drizzle-orm";
import { put } from "@vercel/blob";

import { db } from "@/server/db";
import {
  datasetExportTable,
  tinderProfileTable,
  profileMetaTable,
  tinderUsageTable,
  matchTable,
} from "@/server/db/schema";

/**
 * Generate a dataset export for a given export record
 * This function should be called in a background job (e.g., with waitUntil)
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

    // Batch fetch all related data in 3 parallel queries (not N×3)
    const [metas, usageRows, matchCounts] = await Promise.all([
      db
        .select()
        .from(profileMetaTable)
        .where(inArray(profileMetaTable.tinderProfileId, profileIds)),

      db
        .select()
        .from(tinderUsageTable)
        .where(inArray(tinderUsageTable.tinderProfileId, profileIds))
        .orderBy(tinderUsageTable.tinderProfileId, tinderUsageTable.dateStamp),

      db
        .select({
          tinderProfileId: matchTable.tinderProfileId,
          count: sql<number>`count(*)`,
        })
        .from(matchTable)
        .where(inArray(matchTable.tinderProfileId, profileIds))
        .groupBy(matchTable.tinderProfileId),
    ]);

    // Index by profile ID for O(1) lookup
    const metaMap = new Map(metas.map((m) => [m.tinderProfileId, m]));
    const matchCountMap = new Map(
      matchCounts.map((r) => [r.tinderProfileId, r.count]),
    );

    // Group usage rows by profile, keeping only the 30 most recent
    const usageByProfile = new Map<string, typeof usageRows>();
    for (const u of usageRows) {
      const existing = usageByProfile.get(u.tinderProfileId) ?? [];
      existing.push(u);
      usageByProfile.set(u.tinderProfileId, existing);
    }

    // Assemble enriched profiles
    const enrichedProfiles = profiles.map((profile) => {
      const profileMeta = metaMap.get(profile.tinderId);
      const usageData = (usageByProfile.get(profile.tinderId) ?? []).slice(-30);
      const matchCount = matchCountMap.get(profile.tinderId) ?? 0;

      return {
        profile: {
          tinderId: profile.tinderId,
          birthDate: profile.birthDate,
          ageAtUpload: profile.ageAtUpload,
          ageAtLastUsage: profile.ageAtLastUsage,
          createDate: profile.createDate,
          activeTime: profile.activeTime,
          gender: profile.gender,
          bio: profile.bio,
          city: profile.city,
          country: profile.country,
          region: profile.region,
          interests: profile.interests,
          sexualOrientations: profile.sexualOrientations,
          instagramConnected: profile.instagramConnected,
          spotifyConnected: profile.spotifyConnected,
          jobTitle: profile.jobTitle,
          company: profile.company,
          school: profile.school,
          educationLevel: profile.educationLevel,
          ageFilterMin: profile.ageFilterMin,
          ageFilterMax: profile.ageFilterMax,
          interestedIn: profile.interestedIn,
          genderFilter: profile.genderFilter,
          firstDayOnApp: profile.firstDayOnApp,
          lastDayOnApp: profile.lastDayOnApp,
          daysInProfilePeriod: profile.daysInProfilePeriod,
        },
        meta: profileMeta ?? null,
        usageSample: usageData.map((u) => ({
          dateStamp: u.dateStamp,
          appOpens: u.appOpens,
          matches: u.matches,
          swipeLikes: u.swipeLikes,
          swipePasses: u.swipePasses,
          messagesReceived: u.messagesReceived,
          messagesSent: u.messagesSent,
          matchRate: u.matchRate,
          likeRate: u.likeRate,
        })),
        matchCount,
      };
    });

    // Create the dataset JSON
    const dataset = {
      metadata: {
        exportId,
        tier: exportRecord.tier,
        profileCount: profiles.length,
        generatedAt: new Date().toISOString(),
        version: "1.0",
        recency: exportRecord.recency,
      },
      profiles: enrichedProfiles,
      citation:
        'SwipeStats.io Dating App Dataset. Please cite as: "SwipeStats.io Dating App Dataset, ' +
        new Date().getFullYear() +
        ", " +
        profiles.length +
        ' Profiles"',
    };

    // Convert to JSON string
    const jsonContent = JSON.stringify(dataset, null, 2);
    const blob = Buffer.from(jsonContent);

    // Upload to Vercel Blob with structured path
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const pathname = `datasets/${exportRecord.tier.toLowerCase()}/${date}/${exportId}.json`;
    const blobResult = await put(pathname, blob, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    // Update export record with success
    await db
      .update(datasetExportTable)
      .set({
        status: "READY",
        blobUrl: blobResult.url,
        blobSize: blob.length,
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
