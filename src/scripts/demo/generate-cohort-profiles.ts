/**
 * Generate Synthetic Cohort Profiles Script
 *
 * Creates synthetic "average" profiles by aggregating real usage data
 * from cohort members. These profiles can be selected for comparison.
 *
 * Usage:
 *   bun run src/scripts/generate-cohort-profiles.ts
 */

import { db } from "@/server/db";
import {
  cohortDefinitionTable,
  tinderProfileTable,
  tinderUsageTable,
  profileMetaTable,
  userTable,
  type CohortDefinition,
  type TinderProfileInsert,
  type TinderUsageInsert,
  type ProfileMetaInsert,
} from "@/server/db/schema";
import { eq, and, gte, lte, inArray, sql, type SQL } from "drizzle-orm";
import { createId } from "@/server/db/utils";

/**
 * Compute median from sorted array
 */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * Compute mean (average) from array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Query profiles matching a cohort
 */
async function queryProfilesForCohort(
  cohort: CohortDefinition,
): Promise<string[]> {
  const conditions: SQL[] = [eq(tinderProfileTable.computed, false)];

  // Gender filter
  if (cohort.gender) {
    conditions.push(eq(tinderProfileTable.gender, cohort.gender));
  }

  // Age filter (using ageAtLastUsage)
  if (cohort.ageMin !== null) {
    conditions.push(gte(tinderProfileTable.ageAtLastUsage, cohort.ageMin));
  }
  if (cohort.ageMax !== null) {
    conditions.push(lte(tinderProfileTable.ageAtLastUsage, cohort.ageMax));
  }

  // Query profiles with user data
  const profiles = await db
    .select({
      tinderId: tinderProfileTable.tinderId,
      user: userTable,
    })
    .from(tinderProfileTable)
    .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
    .where(and(...conditions));

  // Apply geography filters in memory (user table)
  let filteredProfiles = profiles;

  if (cohort.country) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.user.country === cohort.country,
    );
  }

  if (cohort.region) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.user.region === cohort.region,
    );
  }

  return filteredProfiles.map((p) => p.tinderId);
}

/**
 * Generate synthetic profile for a cohort
 */
async function generateSyntheticProfile(
  cohort: CohortDefinition,
): Promise<void> {
  console.log(`\n[${cohort.name}] Starting generation...`);

  // Query matching profiles
  const profileIds = await queryProfilesForCohort(cohort);

  if (profileIds.length < 3) {
    console.log(
      `   ⚠️  Only ${profileIds.length} profiles found, skipping (need 3+ for meaningful medians)`,
    );
    return;
  }

  console.log(`   📊 Found ${profileIds.length} matching profiles`);

  // Query usage data in batches to avoid parameter limit
  const allUsage: Array<typeof tinderUsageTable.$inferSelect> = [];
  const QUERY_BATCH_SIZE = 100;

  console.log(`   📈 Fetching usage data in batches...`);
  for (let i = 0; i < profileIds.length; i += QUERY_BATCH_SIZE) {
    const batch = profileIds.slice(i, i + QUERY_BATCH_SIZE);
    const batchUsage = await db
      .select()
      .from(tinderUsageTable)
      .where(inArray(tinderUsageTable.tinderProfileId, batch));
    allUsage.push(...batchUsage);

    if ((i + QUERY_BATCH_SIZE) % 500 === 0) {
      console.log(
        `      ... ${i + QUERY_BATCH_SIZE}/${profileIds.length} profiles queried`,
      );
    }
  }

  if (allUsage.length === 0) {
    console.log(`   ⚠️  No usage data found, skipping`);
    return;
  }

  console.log(`   ✓ Fetched ${allUsage.length} usage rows`);

  // Group by date
  const usageByDate = new Map<
    string,
    Array<typeof tinderUsageTable.$inferSelect>
  >();

  allUsage.forEach((usage) => {
    const existing = usageByDate.get(usage.dateStampRaw) ?? [];
    existing.push(usage);
    usageByDate.set(usage.dateStampRaw, existing);
  });

  // Filter dates with at least 3 samples
  const validDates = Array.from(usageByDate.entries())
    .filter(([_, rows]) => rows.length >= 3)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (validDates.length === 0) {
    console.log(`   ⚠️  No dates with 3+ samples, skipping`);
    return;
  }

  console.log(
    `   ✓ ${validDates.length} valid dates (${validDates[0]?.[0]} to ${validDates[validDates.length - 1]?.[0]})`,
  );

  // Compute aggregated usage rows
  // Use MEAN for absolute counts (matches, swipes, etc) to get realistic totals
  // Use MEDIAN for rates to avoid outlier skew
  const syntheticUsageRows: TinderUsageInsert[] = validDates.map(
    ([dateStr, rows]) => {
      const date = new Date(dateStr);

      return {
        dateStamp: date,
        dateStampRaw: dateStr,
        tinderProfileId: `cohort_${cohort.id}`,
        appOpens: Math.round(mean(rows.map((r) => r.appOpens))),
        matches: Math.round(mean(rows.map((r) => r.matches))),
        swipeLikes: Math.round(mean(rows.map((r) => r.swipeLikes))),
        swipeSuperLikes: Math.round(mean(rows.map((r) => r.swipeSuperLikes))),
        swipePasses: Math.round(mean(rows.map((r) => r.swipePasses))),
        swipesCombined: Math.round(mean(rows.map((r) => r.swipesCombined))),
        messagesReceived: Math.round(mean(rows.map((r) => r.messagesReceived))),
        messagesSent: Math.round(mean(rows.map((r) => r.messagesSent))),
        matchRate: median(rows.map((r) => r.matchRate)),
        likeRate: median(rows.map((r) => r.likeRate)),
        messagesSentRate: median(rows.map((r) => r.messagesSentRate)),
        responseRate: median(rows.map((r) => r.responseRate)),
        engagementRate: median(rows.map((r) => r.engagementRate)),
        userAgeThisDay:
          cohort.ageMin && cohort.ageMax
            ? Math.floor((cohort.ageMin + cohort.ageMax) / 2)
            : 25,
      };
    },
  );

  // Compute aggregated profile meta
  const totalMatches = syntheticUsageRows.reduce(
    (sum, row) => sum + row.matches,
    0,
  );
  const totalLikes = syntheticUsageRows.reduce(
    (sum, row) => sum + row.swipeLikes,
    0,
  );
  const totalPasses = syntheticUsageRows.reduce(
    (sum, row) => sum + row.swipePasses,
    0,
  );
  const totalSwipes = totalLikes + totalPasses;
  const totalMessagesSent = syntheticUsageRows.reduce(
    (sum, row) => sum + row.messagesSent,
    0,
  );
  const totalMessagesReceived = syntheticUsageRows.reduce(
    (sum, row) => sum + row.messagesReceived,
    0,
  );
  const totalAppOpens = syntheticUsageRows.reduce(
    (sum, row) => sum + row.appOpens,
    0,
  );

  const likeRate = totalSwipes > 0 ? totalLikes / totalSwipes : 0;
  const matchRate = totalLikes > 0 ? totalMatches / totalLikes : 0;
  const swipesPerDay =
    syntheticUsageRows.length > 0 ? totalSwipes / syntheticUsageRows.length : 0;

  // Create synthetic profile
  const ageAtUpload =
    cohort.ageMin && cohort.ageMax
      ? Math.floor((cohort.ageMin + cohort.ageMax) / 2)
      : 25;

  const firstDate = new Date(validDates[0]?.[0] ?? new Date());
  const lastDate = new Date(
    validDates[validDates.length - 1]?.[0] ?? new Date(),
  );

  const syntheticProfile: TinderProfileInsert = {
    tinderId: `cohort_${cohort.id}`,
    computed: true,
    gender: cohort.gender ?? "OTHER",
    genderStr: cohort.gender ?? "OTHER",
    ageAtUpload,
    ageAtLastUsage: ageAtUpload,
    birthDate: new Date(new Date().getFullYear() - ageAtUpload, 0, 1),
    createDate: firstDate,
    activeTime: lastDate,
    city: null,
    country: null,
    region: null,
    bio: `Synthetic profile representing ${cohort.name}`,
    bioOriginal: null,
    userInterests: null,
    interests: null,
    sexualOrientations: null,
    descriptors: null,
    instagramConnected: false,
    spotifyConnected: false,
    jobTitle: null,
    jobTitleDisplayed: false,
    company: null,
    companyDisplayed: false,
    school: null,
    schoolDisplayed: false,
    college: null,
    jobsRaw: null,
    schoolsRaw: null,
    educationLevel: null,
    ageFilterMin: 18,
    ageFilterMax: 99,
    interestedIn: "OTHER",
    interestedInStr: "OTHER",
    genderFilter: "OTHER",
    genderFilterStr: "OTHER",
    swipestatsVersion: "SWIPESTATS_4",
    userId: null,
    firstDayOnApp: firstDate,
    lastDayOnApp: lastDate,
    daysInProfilePeriod: syntheticUsageRows.length,
  };

  const syntheticMeta: ProfileMetaInsert = {
    id: createId("pm"),
    tinderProfileId: `cohort_${cohort.id}`,
    hingeProfileId: null,
    from: firstDate,
    to: lastDate,
    daysInPeriod: syntheticUsageRows.length,
    daysActive: syntheticUsageRows.length,
    swipeLikesTotal: totalLikes,
    swipePassesTotal: totalPasses,
    matchesTotal: totalMatches,
    messagesSentTotal: totalMessagesSent,
    messagesReceivedTotal: totalMessagesReceived,
    appOpensTotal: totalAppOpens,
    likeRate,
    matchRate,
    swipesPerDay,
    conversationCount: 0,
    conversationsWithMessages: 0,
    ghostedCount: 0,
    averageResponseTimeSeconds: null,
    meanResponseTimeSeconds: null,
    medianConversationDurationDays: null,
    longestConversationDays: null,
    averageMessagesPerConversation: null,
    medianMessagesPerConversation: null,
    computedAt: new Date(),
  };

  // Delete existing synthetic data for this cohort
  console.log(`   🗑️  Deleting old synthetic data...`);
  await db
    .delete(tinderUsageTable)
    .where(eq(tinderUsageTable.tinderProfileId, `cohort_${cohort.id}`));

  await db
    .delete(profileMetaTable)
    .where(eq(profileMetaTable.tinderProfileId, `cohort_${cohort.id}`));

  // Upsert profile
  console.log(`   💾 Inserting synthetic profile...`);
  await db
    .insert(tinderProfileTable)
    .values(syntheticProfile)
    .onConflictDoUpdate({
      target: tinderProfileTable.tinderId,
      set: {
        ...syntheticProfile,
        createdAt: sql`EXCLUDED.created_at`,
        updatedAt: new Date(),
      },
    });

  // Insert meta
  await db.insert(profileMetaTable).values(syntheticMeta);

  // Insert usage rows in batches
  console.log(`   📥 Inserting ${syntheticUsageRows.length} usage rows...`);
  const INSERT_BATCH_SIZE = 100;
  for (let i = 0; i < syntheticUsageRows.length; i += INSERT_BATCH_SIZE) {
    const batch = syntheticUsageRows.slice(i, i + INSERT_BATCH_SIZE);
    await db.insert(tinderUsageTable).values(batch);
  }

  // Update cohort definition with accurate profile count
  await db
    .update(cohortDefinitionTable)
    .set({
      profileCount: profileIds.length,
      lastComputedAt: new Date(),
    })
    .where(eq(cohortDefinitionTable.id, cohort.id));

  console.log(
    `   ✅ Complete! Generated profile with ${syntheticUsageRows.length} usage days`,
  );
  console.log(
    `      Match Rate: ${(matchRate * 100).toFixed(2)}% | Like Rate: ${(likeRate * 100).toFixed(2)}% | Swipes/Day: ${swipesPerDay.toFixed(1)}`,
  );
}

/**
 * Main script
 */
async function generateAllSyntheticProfiles() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║          Generate Synthetic Cohort Profiles                   ║",
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝\n",
  );

  try {
    // Get all system cohorts
    const cohorts = await db.query.cohortDefinitionTable.findMany({
      where: eq(cohortDefinitionTable.type, "SYSTEM"),
    });

    console.log(`Found ${cohorts.length} system cohorts to process\n`);

    const startTime = Date.now();
    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < cohorts.length; i++) {
      const cohort = cohorts[i];
      if (!cohort) continue;

      console.log(
        `\n[${i + 1}/${cohorts.length}] ${cohort.name} (${cohort.id})`,
      );

      try {
        await generateSyntheticProfile(cohort);
        successCount++;
      } catch (error) {
        console.error(
          `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        skippedCount++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      "\n╔═══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                    Generation Complete! ✨                     ║",
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════════╝\n",
    );

    console.log(`✅ Success: ${successCount} synthetic profiles generated`);
    console.log(`⚠️  Skipped: ${skippedCount} cohorts`);
    console.log(`⏱️  Duration: ${duration} seconds\n`);

    console.log("Next steps:");
    console.log(
      "  1. Verify in database: SELECT * FROM tinder_profile WHERE computed = true",
    );
    console.log(
      "  2. Test in app: Go to comparison page and open comparison dialog\n",
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
generateAllSyntheticProfiles()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
