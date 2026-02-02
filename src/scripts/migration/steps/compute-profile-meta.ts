/**
 * Compute Profile Meta Step
 *
 * Computes aggregated metadata for all Tinder profiles using the canonical
 * computeProfileMeta() function from meta.service.ts.
 *
 * This ensures migration statistics match production calculations exactly.
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
} from "@/server/db/schema";
import type { ProfileMetaInsert } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@/server/db/utils";
import { computeProfileMeta } from "@/server/services/profile/meta.service";
import { printHeader, printSuccess } from "../utils/cli";

export interface ComputeProfileMetaOptions {
  force?: boolean;
}

async function computeProfileMetaForTinderId(
  tinderId: string,
): Promise<ProfileMetaInsert> {
  // Fetch profile with usage data and matches with messages
  const profile = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    with: {
      usage: true,
      matches: {
        with: {
          messages: true,
        },
      },
    },
  });

  if (!profile) {
    throw new Error(`Profile not found: ${tinderId}`);
  }

  // Use the shared service function to compute metadata
  // This ensures consistency between migration and production code
  const meta = computeProfileMeta(profile);

  return {
    id: createId("pm"),
    tinderProfileId: tinderId,
    hingeProfileId: null,
    ...meta,
  };
}

export async function computeAllProfileMeta(
  options?: ComputeProfileMetaOptions,
): Promise<void> {
  printHeader("Compute Profile Metadata");

  const force = options?.force ?? process.env.FORCE === "true";

  try {
    // Get all profiles (only real user profiles exist after migration)
    // Synthetic profiles are generated separately via generate-cohort-profiles.ts
    const profiles = await db.query.tinderProfileTable.findMany({
      where: eq(tinderProfileTable.computed, false),
    });

    console.log(
      `Found ${profiles.length} real user profiles to process${force ? " (FORCE recompute mode)" : ""}\n`,
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

        const meta = await computeProfileMetaForTinderId(profile.tinderId);

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
