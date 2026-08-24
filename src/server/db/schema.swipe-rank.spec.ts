import { describe, expect, test } from "bun:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { swipeRankProfileAiReviewTable, swipeRankProfileTable } from "./schema";

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

describe("swipe_rank_profile_ai_review ownership", () => {
  test("stores one versioned review per stable profile", () => {
    const config = getTableConfig(swipeRankProfileAiReviewTable);
    expect(config.columns.map((column) => column.name)).toContain("profileId");
    expect(config.columns.map((column) => column.name)).not.toContain(
      "entryId",
    );
    expect(
      config.indexes.some(
        (index) =>
          index.config.name ===
          "swipe_rank_profile_ai_review_version_model_idx",
      ),
    ).toBeTrue();
  });
});
