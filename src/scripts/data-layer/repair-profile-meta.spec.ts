import { describe, expect, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { TransactionClient } from "@/server/db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { applyProfileMetaRepair } = await import("./repair-profile-meta");

function queryText(query: SQL): string {
  return new PgDialect().sqlToQuery(query).sql.toLowerCase();
}

describe("profile metadata repair", () => {
  test("locks and journals before repairing profile and metadata rows", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: async (query: SQL) => {
        queries.push(query);
        return { rows: [] };
      },
    } as unknown as TransactionClient;

    await applyProfileMetaRepair(tx, "profile-1");

    expect(queries).toHaveLength(5);
    expect(queryText(queries[0]!)).toContain("pg_advisory_xact_lock_shared");
    expect(queryText(queries[1]!)).toContain(
      "insert into swipe_rank_source_mutation",
    );

    const profileUpdate = queryText(queries[2]!);
    expect(profileUpdate).toContain("update tinder_profile");
    expect(profileUpdate).toContain("updated_at = now()");

    const missingMetaInsert = queryText(queries[3]!);
    expect(missingMetaInsert).toContain("insert into profile_meta");
    expect(missingMetaInsert).toContain("where not exists");
    expect(missingMetaInsert).toContain("conversation_count");
    expect(missingMetaInsert).toContain("on conflict (id) do nothing");

    expect(queryText(queries[4]!)).toContain("update profile_meta");
  });
});
