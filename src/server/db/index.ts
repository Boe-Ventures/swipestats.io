import { sql as drizzleSql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { env } from "@/env";
import * as schema from "./schema";

// Configure WebSocket for Node.js serverless environments
neonConfig.webSocketConstructor = ws;
// Note: poolQueryViaFetch is NOT set. Setting it to true forces Pool connections
// through HTTP fetch, which defeats withWsDb (bypassing the 64MB HTTP limit).

// Augmented schema with Better Auth model name aliases
// Better Auth's experimental.joins feature expects db.query.session, db.query.user, etc.
// but our schema exports sessionTable, userTable, etc.
// This creates aliases so both naming conventions work.
const augmentedSchema = {
  ...schema,
  // Better Auth core model aliases (for experimental.joins)
  user: schema.userTable,
  session: schema.sessionTable,
  account: schema.accountTable,
  verification: schema.verificationTable,
};

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(env.DATABASE_URL);

// Type definitions
type DatabaseClient = NeonDatabase<typeof schema>;
export type TransactionClient = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];

// Main HTTP-based client for regular queries (keeps existing code working)
export const db = drizzle({
  client: sql,
  schema: augmentedSchema,
  casing: "snake_case",
});

// Transaction-capable client that creates WebSocket connections on demand
const createTransactionClient = () => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 1, // Single connection for the transaction
  });

  const wsDb = drizzleWs({
    client: pool,
    schema: augmentedSchema,
    casing: "snake_case",
  });

  return {
    db: wsDb,
    cleanup: () => pool.end(),
  };
};

// Helper function to run transactions with automatic cleanup (fully typed)
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  const { db: wsDb, cleanup } = createTransactionClient();

  try {
    return await wsDb.transaction(callback, config);
  } finally {
    await cleanup();
  }
}

/**
 * Wait for a PostgreSQL transaction advisory lock as the first statement.
 *
 * DATABASE_URL may point at Neon's PgBouncer transaction pool, where
 * session-level advisory locks are unsafe because successive transactions can
 * use different PostgreSQL backends. A transaction-scoped lock is pinned to
 * this transaction. READ COMMITTED is deliberate: if the first lock statement
 * blocks, later statements take their snapshots only after the predecessor has
 * committed. Source writers take the matching shared lock before mutation, so
 * the source remains stable for the rest of this exclusive transaction.
 */
export async function withAdvisoryLockTransaction<T>(
  lockName: string,
  callback: (tx: TransactionClient) => Promise<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  if (
    config?.isolationLevel &&
    config.isolationLevel.toLowerCase() !== "read committed"
  ) {
    throw new Error(
      "Advisory-locked transactions require READ COMMITTED isolation.",
    );
  }

  return withTransaction(
    async (tx) => {
      await tx.execute(drizzleSql`
        SELECT pg_advisory_xact_lock(hashtextextended(${lockName}, 0))
      `);
      return callback(tx);
    },
    { ...config, isolationLevel: "read committed" },
  );
}

// Helper for queries that exceed Neon's HTTP 64MB response limit.
// Uses a WebSocket connection (no size limit) instead of the default HTTP client.
export async function withWsDb<T>(
  callback: (db: NeonDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  const { db: wsDb, cleanup } = createTransactionClient();

  try {
    return await callback(wsDb);
  } finally {
    await cleanup();
  }
}

// Export the SQL client for HTTP-based operations if needed
export { sql };
