/**
 * Compute Cohort Stats Step
 *
 * Computes percentile statistics for all cohorts across multiple time periods.
 * Supports all-time and yearly periods (e.g., 2024, 2023, 2022).
 *
 * Usage (standalone):
 *   bun run src/scripts/migration/steps/compute-cohort-stats.ts
 *
 * Usage (as module):
 *   import { computeAllCohortStats } from "./steps/compute-cohort-stats";
 *   await computeAllCohortStats();
 */

import { db } from "@/server/db";
import {
  cohortDefinitionTable,
  cohortStatsTable,
  tinderProfileTable,
  profileMetaTable,
} from "@/server/db/schema";
import type { CohortStatsInsert, CohortDefinition } from "@/server/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { createId } from "@/server/db/utils";
import { printHeader, printSuccess } from "../utils/cli";

// Define periods to compute
const PERIODS = [
  { period: "all-time", start: null, end: null },
  {
    period: "2025",
    start: new Date("2025-01-01"),
    end: new Date("2025-12-31"),
  },
  {
    period: "2024",
    start: new Date("2024-01-01"),
    end: new Date("2024-12-31"),
  },
  {
    period: "2023",
    start: new Date("2023-01-01"),
    end: new Date("2023-12-31"),
  },
  {
    period: "2022",
    start: new Date("2022-01-01"),
    end: new Date("2022-12-31"),
  },
  {
    period: "2021",
    start: new Date("2021-01-01"),
    end: new Date("2021-12-31"),
  },
  {
    period: "2020",
    start: new Date("2020-01-01"),
    end: new Date("2020-12-31"),
  },
  {
    period: "2019",
    start: new Date("2019-01-01"),
    end: new Date("2019-12-31"),
  },
  {
    period: "2018",
    start: new Date("2018-01-01"),
    end: new Date("2018-12-31"),
  },
];

/**
 * Compute percentile from sorted array
 */
function percentile(arr: number[], p: number): number | null {
  if (arr.length === 0) return null;
  const index = Math.ceil(arr.length * p) - 1;
  return arr[Math.max(0, index)] ?? null;
}

/**
 * Compute mean from array
 */
function mean(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return sum / arr.length;
}

/**
 * Query profiles for a cohort in a specific period
 */
async function queryProfilesForCohort(
  cohort: CohortDefinition,
  period: (typeof PERIODS)[0],
): Promise<
  Array<{
    profile: typeof tinderProfileTable.$inferSelect;
    meta: typeof profileMetaTable.$inferSelect;
  }>
> {
  // Build filter conditions
  const conditions: any[] = [];

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

  // For yearly periods, filter by profile date range overlap
  if (period.start && period.end) {
    conditions.push(
      sql`${tinderProfileTable.firstDayOnApp} <= ${period.end} AND ${tinderProfileTable.lastDayOnApp} >= ${period.start}`,
    );
  }

  // Query profiles with their meta
  const profiles = await db
    .select({
      profile: tinderProfileTable,
      meta: profileMetaTable,
    })
    .from(tinderProfileTable)
    .innerJoin(
      profileMetaTable,
      eq(tinderProfileTable.tinderId, profileMetaTable.tinderProfileId),
    )
    .where(and(...conditions));

  // Apply geography filters (these are on the profile table, not joins)
  let filteredProfiles = profiles;

  if (cohort.country) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.profile.country === cohort.country,
    );
  }

  if (cohort.region) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.profile.region === cohort.region,
    );
  }

  return filteredProfiles;
}

/**
 * Compute cohort stats for a specific period
 * @returns true if stats were computed, false if skipped
 */
async function computeCohortStatsForPeriod(
  cohortId: string,
  period: (typeof PERIODS)[0],
): Promise<boolean> {
  // Fetch cohort definition
  const cohort = await db.query.cohortDefinitionTable.findFirst({
    where: eq(cohortDefinitionTable.id, cohortId),
  });

  if (!cohort) {
    throw new Error(`Cohort not found: ${cohortId}`);
  }

  // Query matching profiles
  const profiles = await queryProfilesForCohort(cohort, period);

  if (profiles.length < 5) {
    console.log(
      `   Skip - Only ${profiles.length} profiles (need 5+ for meaningful stats)`,
    );
    return false;
  }

  // Extract and sort values for each metric
  const likeRates = profiles.map((p) => p.meta.likeRate).sort((a, b) => a - b);
  const matchRates = profiles
    .map((p) => p.meta.matchRate)
    .sort((a, b) => a - b);
  const swipesPerDay = profiles
    .map((p) => p.meta.swipesPerDay)
    .sort((a, b) => a - b);

  // Build cohort stats
  const stats: CohortStatsInsert = {
    id: createId("cst"),
    cohortId,
    period: period.period,
    periodStart: period.start,
    periodEnd: period.end,
    profileCount: profiles.length,

    // Like Rate (pickiness)
    likeRateP10: percentile(likeRates, 0.1),
    likeRateP25: percentile(likeRates, 0.25),
    likeRateP50: percentile(likeRates, 0.5),
    likeRateP75: percentile(likeRates, 0.75),
    likeRateP90: percentile(likeRates, 0.9),
    likeRateMean: mean(likeRates),

    // Match Rate (desirability)
    matchRateP10: percentile(matchRates, 0.1),
    matchRateP25: percentile(matchRates, 0.25),
    matchRateP50: percentile(matchRates, 0.5),
    matchRateP75: percentile(matchRates, 0.75),
    matchRateP90: percentile(matchRates, 0.9),
    matchRateMean: mean(matchRates),

    // Swipes Per Day (activity)
    swipesPerDayP10: percentile(swipesPerDay, 0.1),
    swipesPerDayP25: percentile(swipesPerDay, 0.25),
    swipesPerDayP50: percentile(swipesPerDay, 0.5),
    swipesPerDayP75: percentile(swipesPerDay, 0.75),
    swipesPerDayP90: percentile(swipesPerDay, 0.9),
    swipesPerDayMean: mean(swipesPerDay),

    computedAt: new Date(),
  };

  // Upsert stats
  await db
    .insert(cohortStatsTable)
    .values(stats)
    .onConflictDoUpdate({
      target: [cohortStatsTable.cohortId, cohortStatsTable.period],
      set: {
        profileCount: stats.profileCount,
        periodStart: stats.periodStart,
        periodEnd: stats.periodEnd,
        likeRateP10: stats.likeRateP10,
        likeRateP25: stats.likeRateP25,
        likeRateP50: stats.likeRateP50,
        likeRateP75: stats.likeRateP75,
        likeRateP90: stats.likeRateP90,
        likeRateMean: stats.likeRateMean,
        matchRateP10: stats.matchRateP10,
        matchRateP25: stats.matchRateP25,
        matchRateP50: stats.matchRateP50,
        matchRateP75: stats.matchRateP75,
        matchRateP90: stats.matchRateP90,
        matchRateMean: stats.matchRateMean,
        swipesPerDayP10: stats.swipesPerDayP10,
        swipesPerDayP25: stats.swipesPerDayP25,
        swipesPerDayP50: stats.swipesPerDayP50,
        swipesPerDayP75: stats.swipesPerDayP75,
        swipesPerDayP90: stats.swipesPerDayP90,
        swipesPerDayMean: stats.swipesPerDayMean,
        computedAt: stats.computedAt,
      },
    });

  // Update cohort metadata
  await db
    .update(cohortDefinitionTable)
    .set({
      profileCount: profiles.length,
      lastComputedAt: new Date(),
    })
    .where(eq(cohortDefinitionTable.id, cohortId));

  console.log(`   Computed stats (${profiles.length} profiles)`);
  return true;
}

export async function computeAllCohortStats(): Promise<void> {
  printHeader("Compute Cohort Stats - Multi-Period");

  try {
    // Get all cohort definitions
    const cohorts = await db.query.cohortDefinitionTable.findMany();

    console.log(`Found ${cohorts.length} cohorts`);
    console.log(
      `Computing stats for ${PERIODS.length} periods: ${PERIODS.map((p) => p.period).join(", ")}\n`,
    );

    const startTime = Date.now();
    let totalStatsComputed = 0;
    let totalSkipped = 0;

    // Process each cohort
    for (let i = 0; i < cohorts.length; i++) {
      const cohort = cohorts[i];

      // Null check for cohort (TS fix)
      if (!cohort) {
        continue;
      }

      console.log(
        `\n[${i + 1}/${cohorts.length}] ${cohort.name} (${cohort.id})`,
      );

      // Compute stats for each period
      for (const period of PERIODS) {
        console.log(`   ${period.period}...`);

        try {
          const wasComputed = await computeCohortStatsForPeriod(
            cohort.id,
            period,
          );
          if (wasComputed) {
            totalStatsComputed++;
          } else {
            totalSkipped++;
          }
        } catch (error) {
          console.error(`   Error: ${error}`);
          totalSkipped++;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    printHeader("Computation Complete!");

    console.log(`Success: ${totalStatsComputed} cohort-period stats computed`);
    console.log(`Skipped: ${totalSkipped} (not enough profiles)`);
    console.log(`Duration: ${duration} seconds\n`);

    printSuccess("Cohort statistics complete!");

    console.log("\nAll cohort benchmarks are ready!");
    console.log(
      "You can now query CohortStats to compare users against their cohorts.\n",
    );
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
}

// ---- STANDALONE EXECUTION -----------------------------------------

if (import.meta.main) {
  computeAllCohortStats()
    .then(() => {
      console.log("\nScript completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nFatal error:", error);
      process.exit(1);
    });
}
