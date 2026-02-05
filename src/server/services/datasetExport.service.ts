import { eq, sql, gte } from "drizzle-orm";
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

    // Collect profile IDs for audit
    const profileIds = profiles.map((p) => p.tinderId);

    // For each profile, get related data
    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        // Get profile meta
        const profileMeta = await db.query.profileMetaTable.findFirst({
          where: eq(profileMetaTable.tinderProfileId, profile.tinderId),
        });

        // Get usage data (sample - last 30 days or all if less)
        const usageData = await db.query.tinderUsageTable.findMany({
          where: eq(tinderUsageTable.tinderProfileId, profile.tinderId),
          limit: 30,
        });

        // Get match count (without full message data for privacy)
        const matchCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(matchTable)
          .where(eq(matchTable.tinderProfileId, profile.tinderId))
          .then((r) => r[0]?.count ?? 0);

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
          meta: profileMeta
            ? {
                daysInProfilePeriod: profileMeta.daysInPeriod,
                daysActiveOnApp: profileMeta.daysActive,
                appOpensTotal: profileMeta.appOpensTotal,
                swipeLikesTotal: profileMeta.swipeLikesTotal,
                swipePassesTotal: profileMeta.swipePassesTotal,
                messagesSentTotal: profileMeta.messagesSentTotal,
                messagesReceivedTotal: profileMeta.messagesReceivedTotal,
                matchesTotal: profileMeta.matchesTotal,
                matchRateForPeriod: profileMeta.matchRate,
                likeRateForPeriod: profileMeta.likeRate,
                averageMatchesPerDay:
                  profileMeta.matchesTotal / profileMeta.daysInPeriod,
                averageSwipesPerDay: profileMeta.swipesPerDay,
                numberOfConversations: profileMeta.conversationCount,
              }
            : null,
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
      }),
    );

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
  // Build the where condition (only filter by recency if specified)
  const whereCondition =
    recency === "RECENT"
      ? gte(
          tinderProfileTable.createdAt,
          new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
        )
      : undefined;

  // Use PostgreSQL RANDOM() for randomization
  const profiles = await db
    .select()
    .from(tinderProfileTable)
    .where(whereCondition)
    .orderBy(sql`RANDOM()`)
    .limit(count);

  return profiles;
}
