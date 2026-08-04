import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { hingeProfileOwnedBy } from "./hinge-ownership";

describe("Hinge ownership predicates", () => {
  it("binds both the provider profile and current user", () => {
    const query = new PgDialect().sqlToQuery(sql`
      SELECT 1
      FROM hinge_profile
      WHERE ${hingeProfileOwnedBy("hinge-id", "user-id")}
    `);

    expect(query.sql).toContain('"hinge_profile"."hingeId" = $1');
    expect(query.sql).toContain('"hinge_profile"."userId" = $2');
    expect(query.params).toEqual(["hinge-id", "user-id"]);
  });
});
