import { describe, expect, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { TransactionClient } from "@/server/db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { lockTinderProfileUploadInTx, tinderProfileUploadLockName } =
  await import("../profile/upload-lock");

describe("Tinder profile upload lock", () => {
  test("takes an exclusive transaction lock scoped to one Tinder profile", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: (query: SQL) => {
        queries.push(query);
        return Promise.resolve({ rows: [] });
      },
    } as unknown as TransactionClient;

    await lockTinderProfileUploadInTx(tx, " profile-one ");

    expect(queries).toHaveLength(1);
    const compiled = new PgDialect().sqlToQuery(queries[0]!);
    expect(compiled.sql.toLowerCase()).toContain("pg_advisory_xact_lock(");
    expect(compiled.sql.toLowerCase()).not.toContain(
      "pg_advisory_xact_lock_shared",
    );
    expect(compiled.params).toContain("tinder-profile-upload:profile-one");
    expect(tinderProfileUploadLockName("profile-two")).not.toBe(
      tinderProfileUploadLockName("profile-one"),
    );
  });
});
