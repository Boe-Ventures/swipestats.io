import { describe, expect, test } from "bun:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { tinderProfileTable } from "./schema";

describe("tinder_profile constraints", () => {
  test("limits inferred signup provenance to the reviewed vocabulary", () => {
    const check = getTableConfig(tinderProfileTable).checks.find(
      (candidate) => candidate.name === "tinder_profile_create_date_source",
    );
    if (!check) throw new Error("Missing Tinder create-date source check");

    const sql = new PgDialect().sqlToQuery(check.value).sql.toLowerCase();
    expect(sql).toContain("'provider'");
    expect(sql).toContain("'inferred_from_usage'");
  });
});
