/**
 * Reset Database Schema
 *
 * Drops all tables and recreates the schema.
 *
 * USAGE:
 *   bun run src/scripts/migration/reset-schema.ts
 *
 * WARNING: This will DELETE ALL DATA in the database!
 */

import { db } from "@/server/db";
import * as readline from "readline";

// Declare Bun global for TypeScript (available at runtime with Bun)
declare const Bun: {
  spawn: (
    cmd: string[],
    options?: { stdout?: string; stderr?: string; stdin?: string },
  ) => { exited: Promise<number> };
};

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m",
};

function printHeader(text: string) {
  console.log(
    `\n${colors.blue}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(`${colors.blue}║${colors.reset} ${text}`);
  console.log(
    `${colors.blue}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`,
  );
}

function printWarning(text: string) {
  console.log(`${colors.yellow}⚠${colors.reset}  ${text}`);
}

function printError(text: string) {
  console.log(`${colors.red}✗${colors.reset} ${text}`);
}

function printSuccess(text: string) {
  console.log(`${colors.green}✓${colors.reset} ${text}`);
}

async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes");
    });
  });
}

async function main() {
  printHeader("Reset Database Schema");

  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    printError("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Check what tables exist
  const result = await db.execute<{ table_name: string }>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);

  if (result.rows.length === 0) {
    printSuccess("No tables found - database is already empty!");
    printWarning("Running drizzle-kit push to create schema...");
    console.log("");
  } else {
    printWarning(`Found ${result.rows.length} tables that will be dropped:`);
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
    console.log("");
  }

  const confirmed = await promptUser(
    "Are you sure you want to continue? (yes/no): ",
  );

  if (!confirmed) {
    printError("Schema reset cancelled by user");
    process.exit(0);
  }

  const startTime = Date.now();

  // Drop all tables if they exist
  if (result.rows.length > 0) {
    console.log("");
    console.log("🔨 Dropping all tables...");

    try {
      await db.execute(`DROP SCHEMA public CASCADE`);
      await db.execute(`CREATE SCHEMA public`);
      await db.execute(`GRANT ALL ON SCHEMA public TO neondb_owner`);
      await db.execute(`GRANT ALL ON SCHEMA public TO public`);

      printSuccess("All tables dropped");
    } catch (error) {
      printError("Failed to drop tables");
      console.error(error);
      process.exit(1);
    }
  }

  console.log("");
  console.log("📋 Recreating schema with drizzle-kit push...");
  console.log("");

  // Use Bun.spawn for real-time output
  const proc = Bun.spawn(["bunx", "drizzle-kit", "push"], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    printError(`Schema creation failed with exit code ${exitCode}`);
    process.exit(exitCode);
  }

  const duration = Math.floor((Date.now() - startTime) / 1000);
  printSuccess(`Schema reset complete (${duration}s)`);

  console.log("");
  console.log("Next step:");
  console.log("  bun run src/scripts/migration/run.ts");
}

main().catch((error) => {
  console.error("\n❌ Schema reset failed:");
  console.error(error);
  process.exit(1);
});
