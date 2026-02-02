/**
 * SwipeStats Migration Pipeline
 *
 * Single entry point for running the complete migration or stats-only computation.
 *
 * ============================================================================
 * PRE-MIGRATION STEPS (Optional)
 * ============================================================================
 *
 *   # Reset target database (drops all tables, recreates schema)
 *   bun run src/scripts/migration/reset-schema.ts
 *
 * ============================================================================
 * USAGE
 * ============================================================================
 *
 *   # Full migration (all 4 steps)
 *   OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts
 *
 *   # Stats only (steps 2-4, skip data migration)
 *   DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only
 *
 *   # With options
 *   PROFILE_LIMIT=100 DRY_RUN=true bun run src/scripts/migration/run.ts
 *   FORCE=true bun run src/scripts/migration/run.ts --stats-only
 *
 * ============================================================================
 * ENVIRONMENT VARIABLES
 * ============================================================================
 *
 *   OLD_DATABASE_URL  - Source database connection string (required for full migration)
 *   DATABASE_URL      - Target database connection string (required)
 *   PROFILE_LIMIT     - Limit number of profiles to migrate (default: all)
 *   DRY_RUN           - Set to "true" for validation run without writing data
 *   FORCE             - Set to "true" to recompute all ProfileMeta (even existing)
 *
 * ============================================================================
 * STEPS
 * ============================================================================
 *
 *   Step 1: Migrate Core Data (--stats-only skips this)
 *           - Users (synthetic anonymous users)
 *           - TinderProfiles, Jobs, Schools
 *           - Matches, Messages, Media
 *           - TinderUsage
 *
 *   Step 2: Compute ProfileMeta
 *           - Aggregated statistics for each profile
 *           - Enables quick analytics queries
 *
 *   Step 3: Seed Cohorts
 *           - System cohort definitions (gender, age brackets)
 *           - Required for "How You Compare" feature
 *
 *   Step 4: Compute Cohort Statistics
 *           - Percentile distributions for all cohorts
 *           - Multi-period support (all-time + yearly)
 *
 * ============================================================================
 * POST-MIGRATION
 * ============================================================================
 *
 *   1. Start your dev server: bun dev
 *   2. Visit any profile insights page
 *   3. Verify the "How You Compare" section shows correct data
 *
 */

import { migrateData } from "./steps/migrate-data";
import { computeAllProfileMeta } from "./steps/compute-profile-meta";
import { seedCohorts } from "./steps/seed-cohorts";
import { computeAllCohortStats } from "./steps/compute-cohort-stats";
import {
  printHeader,
  printStep,
  printSuccess,
  printWarning,
  printError,
  formatDuration,
} from "./utils/cli";

async function main() {
  const migrationStart = Date.now();
  const args = process.argv.slice(2);
  const statsOnly = args.includes("--stats-only");

  printHeader("SwipeStats V4 - Migration Pipeline");

  // Validate environment
  const DATABASE_URL = process.env.DATABASE_URL;
  const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;
  const PROFILE_LIMIT = process.env.PROFILE_LIMIT;
  const DRY_RUN = process.env.DRY_RUN === "true";
  const FORCE = process.env.FORCE === "true";

  if (!DATABASE_URL) {
    printError("DATABASE_URL environment variable is required");
    console.log("\nUsage:");
    console.log(
      "  DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only",
    );
    console.log(
      "  OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts",
    );
    process.exit(1);
  }

  if (!statsOnly && !OLD_DATABASE_URL) {
    printError(
      "OLD_DATABASE_URL environment variable is required for full migration",
    );
    console.log("\nUsage:");
    console.log(
      "  OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts",
    );
    console.log("\nOr run stats-only mode:");
    console.log(
      "  DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only",
    );
    process.exit(1);
  }

  printSuccess("Environment validated");

  // Show configuration
  console.log("");
  console.log("Configuration:");
  console.log(
    `  Mode: ${statsOnly ? "Stats Only (steps 2-4)" : "Full Migration (steps 1-4)"}`,
  );
  if (!statsOnly) {
    console.log(`  PROFILE_LIMIT: ${PROFILE_LIMIT || "all"}`);
    console.log(`  DRY_RUN: ${DRY_RUN}`);
  }
  console.log(`  FORCE: ${FORCE}`);
  console.log("");

  if (DRY_RUN && !statsOnly) {
    printWarning("DRY RUN MODE - No data will be written during migration\n");
  }

  try {
    // ============================================================================
    // STEP 1: Migrate Core Data (skip if --stats-only)
    // ============================================================================

    if (!statsOnly) {
      printHeader("Step 1/4: Migrate Core Data");

      console.log("Migrating:");
      console.log("  - Users (synthetic anonymous users)");
      console.log("  - TinderProfiles (real users only)");
      console.log("  - Matches, Messages, Media");
      console.log("  - Jobs, Schools");
      console.log("  - TinderUsage");
      console.log("");
      printWarning("Skipping:");
      console.log("  - OriginalAnonymizedFiles (HTTP size limit)");
      console.log("  - Synthetic/computed profiles (regenerate if needed)");
      console.log("  - ProfileMeta (will be recomputed in step 2)");
      console.log("");

      printStep("Running data migration...");
      const stepStart = Date.now();

      await migrateData({
        profileLimit: PROFILE_LIMIT ? parseInt(PROFILE_LIMIT, 10) : undefined,
        dryRun: DRY_RUN,
      });

      printSuccess(
        `Data migration complete (${formatDuration(Date.now() - stepStart)})`,
      );
    } else {
      console.log(
        "Step 1/4: Migrate Core Data - SKIPPED (--stats-only mode)\n",
      );
    }

    // ============================================================================
    // STEP 2: Compute ProfileMeta
    // ============================================================================

    printHeader(
      statsOnly
        ? "Step 1/3: Compute ProfileMeta"
        : "Step 2/4: Compute ProfileMeta",
    );

    console.log("Computing metadata for all profiles...");
    console.log("  This generates aggregated statistics from raw usage data");
    console.log("");

    printStep("Running ProfileMeta computation...");
    const step2Start = Date.now();

    await computeAllProfileMeta({ force: FORCE });

    printSuccess(
      `ProfileMeta computation complete (${formatDuration(Date.now() - step2Start)})`,
    );

    // ============================================================================
    // STEP 3: Seed Cohorts
    // ============================================================================

    printHeader(
      statsOnly
        ? "Step 2/3: Seed System Cohorts"
        : "Step 3/4: Seed System Cohorts",
    );

    console.log("Creating cohort definitions...");
    console.log("  - 3 basic cohorts (All, Men, Women)");
    console.log("  - 9 age bracket cohorts (18-24, 25-34, 35-44, 45+)");
    console.log("");

    printStep("Running cohort seeding...");
    const step3Start = Date.now();

    await seedCohorts();

    printSuccess(
      `Cohort seeding complete (${formatDuration(Date.now() - step3Start)})`,
    );

    // ============================================================================
    // STEP 4: Compute Cohort Statistics
    // ============================================================================

    printHeader(
      statsOnly
        ? "Step 3/3: Compute Cohort Statistics"
        : "Step 4/4: Compute Cohort Statistics",
    );

    console.log("Computing percentile benchmarks for all cohorts...");
    console.log("  This enables the 'How You Compare' feature");
    console.log("");

    printStep("Running cohort statistics computation...");
    const step4Start = Date.now();

    await computeAllCohortStats();

    printSuccess(
      `Cohort statistics complete (${formatDuration(Date.now() - step4Start)})`,
    );

    // ============================================================================
    // COMPLETION
    // ============================================================================

    const totalDuration = Date.now() - migrationStart;

    printHeader("Migration Complete!");

    console.log(`Total time: ${formatDuration(totalDuration)}`);
    console.log("");
    console.log("Next steps:");
    console.log("  1. Start your dev server: bun dev");
    console.log("  2. Visit any profile insights page");
    console.log("  3. Verify the 'How You Compare' section shows correct data");
    console.log("");
    printSuccess("Your database is ready to use!");
  } catch (error) {
    printError("Migration failed");
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
main().catch((error) => {
  console.error("\nMigration failed:");
  console.error(error);
  process.exit(1);
});
