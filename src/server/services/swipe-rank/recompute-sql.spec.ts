import { describe, expect, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";

import { buildSwipeRankSourceWatermarkUpdate } from "./recompute-sql";

describe("SwipeRank source watermark query", () => {
  test("casts the closed month boundary before adding it to JSON", () => {
    const compiled = new PgDialect().sqlToQuery(
      buildSwipeRankSourceWatermarkUpdate({
        closedBefore: "2026-08-01",
        buildId: "srb_test",
      }),
    );

    expect(compiled.sql).toContain("'closedBefore', $1::text");
    expect(compiled.params).toEqual(["2026-08-01", "srb_test"]);
  });
});
