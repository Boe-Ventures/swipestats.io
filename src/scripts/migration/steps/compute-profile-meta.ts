/**
 * Compute Profile Meta Step
 *
 * Computes aggregated metadata for all Tinder profiles.
 * This script generates one ProfileMeta record per profile with all-time stats.
 *
 * Usage (standalone):
 *   bun run src/scripts/migration/steps/compute-profile-meta.ts
 *
 * Usage (as module):
 *   import { computeAllProfileMeta } from "./steps/compute-profile-meta";
 *   await computeAllProfileMeta();
 */

import { db } from "@/server/db";
import {
  tinderProfileTable,
  profileMetaTable,
  matchTable,
} from "@/server/db/schema";
import type { ProfileMetaInsert } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@/server/db/utils";
import { printHeader, printSuccess } from "../utils/cli";

export interface ComputeProfileMetaOptions {
  force?: boolean;
}

async function computeProfileMeta(
  tinderId: string,
): Promise<ProfileMetaInsert> {
  // Fetch profile with usage data
  const profile = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    with: {
      usage: true,
    },
  });

  if (!profile) {
    throw new Error(`Profile not found: ${tinderId}`);
  }

  // Fetch matches for conversation stats
  const matches = await db.query.matchTable.findMany({
    where: eq(matchTable.tinderProfileId, tinderId),
  });

  // IMPORTANT: Filter out days where data is missing/inferred from original file
  // These are synthetic zeros that would skew statistics
  const realUsageDays = profile.usage.filter(
    (day) => !day.dateIsMissingFromOriginalData,
  );

  // Further filter to only days where user was actually active (appOpens > 0)
  // Useful for "per-active-day" metrics which are more meaningful for comparisons
  const activeDays = realUsageDays.filter((day) => day.appOpens > 0);

  // Aggregate totals from ALL real usage days (including real zeros)
  // Real zeros are meaningful - they show user had the app but chose not to use it
  const totals = realUsageDays.reduce(
    (acc, day) => ({
      swipeLikes: acc.swipeLikes + day.swipeLikes,
      swipePasses: acc.swipePasses + day.swipePasses,
      matches: acc.matches + day.matches,
      messagesSent: acc.messagesSent + day.messagesSent,
      messagesReceived: acc.messagesReceived + day.messagesReceived,
      appOpens: acc.appOpens + day.appOpens,
    }),
    {
      swipeLikes: 0,
      swipePasses: 0,
      matches: 0,
      messagesSent: 0,
      messagesReceived: 0,
      appOpens: 0,
    },
  );

  const totalSwipes = totals.swipeLikes + totals.swipePasses;

  // Conversation stats
  const conversationsWithMessages = matches.filter(
    (m) => m.totalMessageCount > 0,
  ).length;
  const ghostedCount = matches.filter((m) => m.totalMessageCount === 0).length;

  // Compute rates and per-day metrics
  const likeRate = totalSwipes > 0 ? totals.swipeLikes / totalSwipes : 0;
  const matchRate =
    totals.swipeLikes > 0 ? totals.matches / totals.swipeLikes : 0;

  // Per-active-day is more meaningful for comparisons
  // (only counts days they actually opened the app)
  const daysActive = activeDays.length;
  const swipesPerDay = daysActive > 0 ? totalSwipes / daysActive : 0;

  return {
    id: createId("pm"),
    tinderProfileId: tinderId,
    hingeProfileId: null,
    from: profile.firstDayOnApp,
    to: profile.lastDayOnApp,
    daysInPeriod: profile.daysInProfilePeriod,
    daysActive: daysActive,
    swipeLikesTotal: totals.swipeLikes,
    swipePassesTotal: totals.swipePasses,
    matchesTotal: totals.matches,
    messagesSentTotal: totals.messagesSent,
    messagesReceivedTotal: totals.messagesReceived,
    appOpensTotal: totals.appOpens,
    likeRate,
    matchRate,
    swipesPerDay, // This is now per-active-day for more meaningful comparisons
    conversationCount: matches.length,
    conversationsWithMessages,
    ghostedCount,
    computedAt: new Date(),
  };
}

export async function computeAllProfileMeta(
  options?: ComputeProfileMetaOptions,
): Promise<void> {
  printHeader("Compute Profile Metadata");

  const force = options?.force ?? process.env.FORCE === "true";

  try {
    // Get profiles that don't have ProfileMeta yet (or all if force=true)
    const profiles = force
      ? await db.query.tinderProfileTable.findMany()
      : await db.query.tinderProfileTable.findMany({
          where: eq(tinderProfileTable.computed, false),
        });

    console.log(
      `Found ${profiles.length} profiles to process${force ? " (FORCE mode)" : ""}\n`,
    );

    if (profiles.length === 0) {
      console.log("No profiles to compute! All done.\n");
      return;
    }

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    // Process each profile
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];

      // Null check for profile (TS fix)
      if (!profile) {
        continue;
      }

      try {
        console.log(
          `[${i + 1}/${profiles.length}] Processing ${profile.tinderId}...`,
        );

        // Check if ProfileMeta already exists
        const existingMeta = await db.query.profileMetaTable.findFirst({
          where: eq(profileMetaTable.tinderProfileId, profile.tinderId),
        });

        if (existingMeta && !force) {
          console.log(`   Skip - ProfileMeta already exists\n`);
          continue;
        }

        const meta = await computeProfileMeta(profile.tinderId);

        if (existingMeta && force) {
          // Delete old and insert new
          await db
            .delete(profileMetaTable)
            .where(eq(profileMetaTable.id, existingMeta.id));
        }

        await db.insert(profileMetaTable).values(meta);

        successCount++;
        console.log(`   Computed metadata\n`);
      } catch (error) {
        errorCount++;
        console.error(`   Error: ${String(error)}\n`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    printHeader("Computation Complete!");

    console.log(`Success: ${successCount} profiles`);
    console.log(`Errors: ${errorCount} profiles`);
    console.log(`Duration: ${duration} seconds\n`);

    printSuccess("ProfileMeta computation complete!");
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
}

// ---- STANDALONE EXECUTION -----------------------------------------

if (import.meta.main) {
  computeAllProfileMeta()
    .then(() => {
      console.log("\nScript completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nFatal error:", error);
      process.exit(1);
    });
}
