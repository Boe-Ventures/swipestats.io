import { describe, expect, test } from "bun:test";

import {
  DEFAULT_SWIPE_RANK_PERIOD_KIND,
  formatMatchYield,
  formatSwipeRankPeriodLabel,
} from "./format";

describe("SwipeRank formatting", () => {
  test("defaults to the most frequently published season", () => {
    expect(DEFAULT_SWIPE_RANK_PERIOD_KIND).toBe("MONTH");
  });

  test("preserves match yield above 100 percent", () => {
    expect(formatMatchYield(1.41, "en-US")).toBe("141.0%");
  });

  test("formats month, quarter, and year seasons", () => {
    expect(
      formatSwipeRankPeriodLabel(
        { kind: "MONTH", start: "2026-07-01" },
        "en-US",
      ),
    ).toBe("July 2026");
    expect(
      formatSwipeRankPeriodLabel({ kind: "QUARTER", start: "2026-07-01" }),
    ).toBe("Q3 2026");
    expect(
      formatSwipeRankPeriodLabel({ kind: "YEAR", start: "2026-01-01" }),
    ).toBe("2026");
  });
});
