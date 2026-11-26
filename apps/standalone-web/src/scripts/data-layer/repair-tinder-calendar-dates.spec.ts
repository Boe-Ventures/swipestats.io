import { describe, expect, test } from "bun:test";
import type {} from "drizzle-orm";
import type { TransactionClient } from "@/server/db";
process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
const { applyTinderCalendarDateRepair } =
  await import("./repair-tinder-calendar-dates");
describe("Tinder calendar-date repair", () => {
  test("rolls back when a selected profile still lacks metadata", async () => {
    let queryCount = 0;
    const tx = {
      execute: async () => {
        queryCount++;
        return queryCount === 5
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
