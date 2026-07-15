import { describe, expect, test } from "bun:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { swipeRankProfileTable } from "./schema";

describe("swipe_rank_profile constraints", () => {
  test("requires complete moderation metadata for an active exclusion", () => {
    const check = getTableConfig(swipeRankProfileTable).checks.find(
      (candidate) => candidate.name === "swipe_rank_profile_exclusion_state",
    );
    if (!check) throw new Error("Missing SwipeRank exclusion-state check");

    const sql = new PgDialect().sqlToQuery(check.value).sql.toLowerCase();
    expect(sql).toContain('"isswiperankexcluded" = true');
    expect(sql).toContain('"swiperankexclusionreason"');
    expect(sql).toContain('"swiperankexcludedat" is not null');
    expect(sql).toContain('"swiperankexcludedby"');
  });
});
