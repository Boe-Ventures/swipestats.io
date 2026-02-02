import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { env } from "@/env";
import * as schema from "./schema";

// Configure for serverless environments (Vercel Edge, Cloudflare Workers, etc.)
neonConfig.webSocketConstructor = ws;
// Enable querying over fetch for edge environments
neonConfig.poolQueryViaFetch = true;

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
): Promise<T> {
  const { db: wsDb, cleanup } = createTransactionClient();

  try {
    return await wsDb.transaction(callback);
  } finally {
    await cleanup();
  }
}

// Export the SQL client for HTTP-based operations if needed
export { sql };
