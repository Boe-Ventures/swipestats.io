/**
 * Migrate Subscription & SwipeStats+ Data
 *
 * Upgrades all old paid users (PLUS tier) to ELITE with lifetime access.
 * Old database only had swipestatsTier field - no subscription provider integration.
 * This migration gives all legacy paid users lifetime ELITE access.
 *
 * Usage:
 *   # Dry run (preview)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=10 DRY_RUN=true \
 *     bun run src/scripts/migration/migrate-subscriptions.ts
 *
 *   # Migrate 100 records (testing)
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> RECORD_LIMIT=100 \
 *     bun run src/scripts/migration/migrate-subscriptions.ts
 *
 *   # Full migration
 *   OLD_DATABASE_URL=<old-db> DATABASE_URL=<new-db> \
 *     bun run src/scripts/migration/migrate-subscriptions.ts
 */

import { neon, Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import ws from "ws";
import * as schema from "@/server/db/schema";
import {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  log,
  formatDuration,
  printStep,
} from "./utils/cli";

// Enable WebSocket for large payload support
neonConfig.webSocketConstructor = ws;

// ---- TYPES --------------------------------------------------------

interface OldUserWithProfile {
  userId: string;
  email: string | null;
  swipestatsTier: string; // OLD: 'FREE' | 'PLUS' | 'ELITE'
  tinderId: string;
  profileLastDay: Date | string;
}

interface MigrationStats {
  totalPaidUsers: number;
  usersUpgraded: number;
  usersFailed: number;
  usersSkipped: number;
  usersNotMigrated: number;
}

// ---- CONFIGURATION ------------------------------------------------

const DEFAULT_BATCH_SIZE = 50;

// ---- QUERY FUNCTIONS ----------------------------------------------

async function queryPaidUsersFromOldDb(
  oldPool: Pool,
  recordLimit?: number,
): Promise<OldUserWithProfile[]> {
  log("Querying paid users with profiles from old database...");

  const client = await oldPool.connect();
  try {
    // Get users with PLUS or ELITE tier + their TinderProfile
    // Note: Old DB uses Prisma naming (PascalCase table names)
    const query = `
      SELECT 
        u.id as "userId",
        u.email,
        u."swipestatsTier",
        tp."tinderId",
        tp."lastDayOnApp" as "profileLastDay"
      FROM "User" u
      INNER JOIN "TinderProfile" tp ON u.id = tp."userId"
      WHERE 
        u."swipestatsTier" != 'FREE'
      ORDER BY tp."lastDayOnApp" DESC
      ${recordLimit ? `LIMIT ${recordLimit}` : ""}
    `;

    const result = await client.query(query);
    log(`Found ${result.rows.length} paid users with profiles`);
    return result.rows as OldUserWithProfile[];
  } finally {
    client.release();
  }
}

// ---- MIGRATION FUNCTIONS ------------------------------------------

async function upgradeUsersToElite(
  usersWithProfiles: OldUserWithProfile[],
  newDb: NeonHttpDatabase<typeof schema>,
  dryRun: boolean,
): Promise<{
  upgraded: number;
  failed: number;
  skipped: number;
  notMigrated: number;
}> {
  let upgraded = 0;
  let failed = 0;
  let skipped = 0;
  let notMigrated = 0;

  for (const oldUser of usersWithProfiles) {
    let existingProfile;
    let profileUser;

    try {
      // Look up profile by tinderId in new DB (no relations due to snake_case issue)
      existingProfile = await newDb.query.tinderProfileTable.findFirst({
        where: eq(schema.tinderProfileTable.tinderId, oldUser.tinderId),
        columns: {
          tinderId: true,
          userId: true,
        },
      });

      if (!existingProfile?.userId) {
        // Profile doesn't exist or has no userId
        notMigrated++;
        continue;
      }

      // Fetch user separately
      profileUser = await newDb.query.userTable.findFirst({
        where: eq(schema.userTable.id, existingProfile.userId),
        columns: {
          id: true,
          email: true,
          swipestatsTier: true,
          isLifetime: true,
        },
      });

      if (!profileUser) {
        // User doesn't exist (orphaned profile?)
        notMigrated++;
        continue;
      }
    } catch (queryError) {
      console.error(queryError);
      // Query error
      notMigrated++;
      continue;
    }

    try {
      // Skip if already ELITE and lifetime
      if (profileUser.swipestatsTier === "ELITE" && profileUser.isLifetime) {
        if (dryRun && skipped < 5) {
          log(
            `[DRY RUN] User ${profileUser.email || profileUser.id} (${oldUser.tinderId.slice(0, 8)}...) already ELITE + lifetime, skipping`,
          );
        }
        skipped++;
        continue;
      }

      if (dryRun) {
        log(
          `[DRY RUN] Would upgrade ${profileUser.email || profileUser.id} (${oldUser.tinderId.slice(0, 8)}...): ${oldUser.swipestatsTier} → ELITE (lifetime)`,
        );
        upgraded++;
        continue;
      }

      // Upgrade to ELITE with lifetime access
      await newDb
        .update(schema.userTable)
        .set({
          swipestatsTier: "ELITE",
          isLifetime: true,
        })
        .where(eq(schema.userTable.id, profileUser.id));

      upgraded++;

      if (upgraded % 10 === 0) {
        log(`Upgraded ${upgraded} users...`);
      }
    } catch (error) {
      printError(
        `Failed to upgrade user for tinderId ${oldUser.tinderId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      failed++;
    }
  }

  return { upgraded, failed, skipped, notMigrated };
}

// ---- MAIN ---------------------------------------------------------

async function main() {
  const startTime = Date.now();

  // Read environment variables
  const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;
  const NEW_DATABASE_URL = process.env.DATABASE_URL;
  const DRY_RUN = process.env.DRY_RUN === "true";
  const RECORD_LIMIT = process.env.RECORD_LIMIT
    ? parseInt(process.env.RECORD_LIMIT, 10)
    : undefined;

  if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) {
    printError(
      "Missing required environment variables: OLD_DATABASE_URL, DATABASE_URL",
    );
    process.exit(1);
  }

  printHeader("SwipeStats Subscription Migration");
  log(`Mode: ${DRY_RUN ? "DRY RUN (preview only)" : "LIVE MIGRATION"}`);
  log(`Record limit: ${RECORD_LIMIT || "unlimited"}`);
  log("");

  // Connect to databases
  printStep("Connecting to databases...");
  const oldPool = new Pool({ connectionString: OLD_DATABASE_URL });
  const newSql = neon(NEW_DATABASE_URL);
  const newDb = drizzle(newSql, {
    schema,
    casing: "snake_case", // CRITICAL: Must match drizzle.config.ts
    logger: false,
  });

  const stats: MigrationStats = {
    totalPaidUsers: 0,
    usersUpgraded: 0,
    usersFailed: 0,
    usersSkipped: 0,
    usersNotMigrated: 0,
  };

  try {
    // Upgrade all paid users to ELITE + lifetime
    printStep("Upgrading paid users to ELITE with lifetime access...");
    const users = await queryPaidUsersFromOldDb(oldPool, RECORD_LIMIT);
    stats.totalPaidUsers = users.length;

    if (users.length === 0) {
      log("No paid users found");
    } else {
      log(`Found ${users.length} paid users to upgrade`);
      log("Upgrading all to ELITE tier with lifetime access...");
      log("");

      const result = await upgradeUsersToElite(users, newDb, DRY_RUN);
      stats.usersUpgraded = result.upgraded;
      stats.usersFailed = result.failed;
      stats.usersSkipped = result.skipped;
      stats.usersNotMigrated = result.notMigrated;

      printSuccess(
        `Upgraded: ${stats.usersUpgraded}, Skipped: ${stats.usersSkipped}, Not yet migrated: ${stats.usersNotMigrated}, Failed: ${stats.usersFailed}`,
      );
    }

    // Print summary
    printHeader("Migration Summary");
    log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
    log(`Duration: ${formatDuration(Date.now() - startTime)}`);
    log("");
    log("Legacy Paid Users → ELITE (Lifetime):");
    log(`  Total found in old DB: ${stats.totalPaidUsers}`);
    log(`  Upgraded: ${stats.usersUpgraded}`);
    log(`  Already upgraded: ${stats.usersSkipped}`);
    log(`  Not yet migrated: ${stats.usersNotMigrated}`);
    log(`  Failed: ${stats.usersFailed}`);
    log("");

    if (stats.usersNotMigrated > 0) {
      printWarning(
        `${stats.usersNotMigrated} users haven't been migrated yet. Run user/profile migration first.`,
      );
    }

    if (DRY_RUN) {
      printWarning("This was a DRY RUN - no changes were made");
      printWarning("Run without DRY_RUN=true to apply changes");
    } else {
      printSuccess("Migration completed successfully!");
    }
  } catch (error) {
    printError(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  } finally {
    await oldPool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
