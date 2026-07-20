import { describe, expect, it } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { TransactionClient } from "@/server/db";
import {
  lockHingeAdminProfileMutationInTx,
  hingeProfileUploadLockName,
  lockHingeProviderMutationsInTx,
  lockHingeProviderOwnershipTransferInTx,
  lockHingeProfileUploadsInTx,
} from "./hinge-upload-lock";

describe("Hinge upload locks", () => {
  it("cooperates with the provider-wide repair lock", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: (query: SQL) => {
        queries.push(query);
        return Promise.resolve({ rows: [] });
      },
    } as unknown as TransactionClient;

    await lockHingeProviderMutationsInTx(tx);

    const compiled = new PgDialect().sqlToQuery(queries[0]!);
    expect(compiled.sql).toContain("pg_advisory_xact_lock_shared");
    expect(compiled.params).toEqual(["swipe-rank:HINGE"]);
  });

  it("serializes an ownership transfer against provider uploads", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: (query: SQL) => {
        queries.push(query);
        return Promise.resolve({ rows: [] });
      },
    } as unknown as TransactionClient;

    await lockHingeProviderOwnershipTransferInTx(tx);

    const compiled = new PgDialect().sqlToQuery(queries[0]!);
    expect(compiled.sql).toContain("pg_advisory_xact_lock(");
    expect(compiled.sql).not.toContain("pg_advisory_xact_lock_shared");
    expect(compiled.params).toEqual(["swipe-rank:HINGE"]);
  });

  it("normalizes, deduplicates, and orders profile locks", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: (query: SQL) => {
        queries.push(query);
        return Promise.resolve({ rows: [] });
      },
    } as unknown as TransactionClient;

    await lockHingeProfileUploadsInTx(tx, [
      " profile-b ",
      "profile-a",
      "profile-b",
    ]);

    expect(queries).toHaveLength(2);
    const dialect = new PgDialect();
    const compiled = queries.map((query) => dialect.sqlToQuery(query));
    expect(
      compiled.every(({ sql }) => sql.includes("pg_advisory_xact_lock")),
    ).toBe(true);
    expect(compiled.flatMap(({ params }) => params)).toEqual([
      "hinge-profile-upload:profile-a",
      "hinge-profile-upload:profile-b",
    ]);
  });

  it("rejects an empty profile id", () => {
    expect(() => hingeProfileUploadLockName("  ")).toThrow("profile ID");
  });

  it("gives admin mutations the provider lock before the profile lock", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: (query: SQL) => {
        queries.push(query);
        return Promise.resolve({ rows: [] });
      },
    } as unknown as TransactionClient;

    await lockHingeAdminProfileMutationInTx(tx, "profile-a");

    expect(queries).toHaveLength(2);
    const dialect = new PgDialect();
    const compiled = queries.map((query) => dialect.sqlToQuery(query));
    expect(compiled[0]!.sql).toContain("pg_advisory_xact_lock_shared");
    expect(compiled[0]!.params).toEqual(["swipe-rank:HINGE"]);
    expect(compiled[1]!.sql).toContain("pg_advisory_xact_lock");
    expect(compiled[1]!.params).toEqual(["hinge-profile-upload:profile-a"]);
  });
});
