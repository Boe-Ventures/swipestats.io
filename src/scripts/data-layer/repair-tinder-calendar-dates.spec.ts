import { describe, expect, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { TransactionClient } from "@/server/db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { applyTinderCalendarDateRepair } =
  await import("./repair-tinder-calendar-dates");

function queryText(query: SQL): string {
  return new PgDialect().sqlToQuery(query).sql.toLowerCase();
}

describe("Tinder calendar-date repair", () => {
  test("journals, canonicalizes usage dates, and repairs profile aggregates", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: async (query: SQL) => {
        queries.push(query);
        return { rows: [] };
      },
    } as unknown as TransactionClient;

    await applyTinderCalendarDateRepair(tx, "profile-1");

    expect(queries).toHaveLength(6);
    expect(queryText(queries[0]!)).toContain("pg_advisory_xact_lock");
    expect(queryText(queries[0]!)).not.toContain(
      "pg_advisory_xact_lock_shared",
    );
    const usageUpdate = queryText(queries[1]!);
    expect(usageUpdate).toContain("update tinder_usage");
    expect(usageUpdate).toContain("left(usage.date_stamp_raw, 10)::date");
    expect(usageUpdate).toContain("user_age_this_day");
    expect(usageUpdate).toContain("profile.birth_date::date");
    expect(usageUpdate).toContain(
      "usage.tinder_profile_id = canonical.tinder_profile_id",
    );
    expect(usageUpdate).not.toContain("usage.id");

    expect(queryText(queries[2]!)).toContain("update tinder_profile");
    expect(queryText(queries[3]!)).toContain("update profile_meta");
    expect(queryText(queries[4]!)).toContain(
      "insert into swipe_rank_source_mutation",
    );
    expect(queryText(queries[4]!)).toContain("where");
    expect(queryText(queries[5]!)).toContain("missing_meta");
    expect(queryText(queries[5]!)).toContain("usage_mismatches");
    expect(queryText(queries[5]!)).toContain("metadata_mismatches");
  });

  test("rolls back when a selected profile still lacks metadata", async () => {
    let queryCount = 0;
    const tx = {
      execute: async () => {
        queryCount++;
        return queryCount === 6
          ? {
              rows: [
                {
                  usage_mismatches: 0,
                  profile_mismatches: 0,
                  missing_meta: 1,
                  metadata_mismatches: 0,
                },
              ],
            }
          : { rows: [] };
      },
    } as unknown as TransactionClient;

    const error = await applyTinderCalendarDateRepair(tx, "profile-1").then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("missing_meta=1");
  });
});
