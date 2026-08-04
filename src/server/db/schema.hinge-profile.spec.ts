import { describe, expect, it } from "bun:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { hingeProfileTable } from "./schema";

describe("hinge_profile constraints", () => {
  it("keeps earliest merged signup at or before the current account signup", () => {
    const constraint = getTableConfig(hingeProfileTable).checks.find(
      (candidate) => candidate.name === "hinge_profile_account_signup_order",
    );
    expect(constraint).toBeDefined();
    const sql = new PgDialect().sqlToQuery(constraint!.value).sql.toLowerCase();
    expect(sql).toContain('"firstaccountcreatedate" is null');
    expect(sql).toContain('"firstaccountcreatedate" <=');
    expect(sql).toContain('"createdate"');
  });
});
