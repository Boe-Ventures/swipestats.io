import { describe, expect, test } from "bun:test";

import {
  assertClosedSwipeRankPeriod,
  parseClosedSwipeRankPeriod,
  periodContaining,
  previousCalendarMonth,
  swipeRankSeasonsToPublish,
} from "./periods";

describe("closed SwipeRank seasons", () => {
  test("aligns month, quarter, and year periods", () => {
    expect(periodContaining("MONTH", "2026-08-11")).toEqual({
      kind: "MONTH",
      start: "2026-08-01",
      end: "2026-09-01",
    });
    expect(periodContaining("QUARTER", "2026-08-11")).toEqual({
      kind: "QUARTER",
      start: "2026-07-01",
      end: "2026-10-01",
    });
    expect(periodContaining("YEAR", "2026-08-11")).toEqual({
      kind: "YEAR",
      start: "2026-01-01",
      end: "2027-01-01",
    });
  });

  test("parses closed season labels for internal tools", () => {
    expect(parseClosedSwipeRankPeriod("2026-07")).toEqual({
      label: "2026-07",
      kind: "MONTH",
      start: "2026-07-01",
      end: "2026-08-01",
    });
    expect(parseClosedSwipeRankPeriod("2026-Q2")).toEqual({
      label: "2026-Q2",
      kind: "QUARTER",
      start: "2026-04-01",
      end: "2026-07-01",
    });
    expect(parseClosedSwipeRankPeriod("2025")).toEqual({
      label: "2025",
      kind: "YEAR",
      start: "2025-01-01",
      end: "2026-01-01",
    });
    expect(() => parseClosedSwipeRankPeriod("all-time")).toThrow(
      "Invalid closed SwipeRank period",
    );
  });

  test("always closes the immediately preceding UTC month", () => {
    expect(previousCalendarMonth(new Date("2026-01-01T00:00:00.000Z"))).toEqual(
      {
        kind: "MONTH",
        start: "2025-12-01",
        end: "2026-01-01",
      },
    );
  });

  test("adds quarter and year only at their calendar boundaries", () => {
    expect(
      swipeRankSeasonsToPublish(new Date("2026-08-01T06:00:00.000Z")).map(
        (period) => period.kind,
      ),
    ).toEqual(["MONTH"]);
    expect(
      swipeRankSeasonsToPublish(new Date("2026-07-01T06:00:00.000Z")),
    ).toEqual([
      { kind: "MONTH", start: "2026-06-01", end: "2026-07-01" },
      { kind: "QUARTER", start: "2026-04-01", end: "2026-07-01" },
    ]);
    expect(
      swipeRankSeasonsToPublish(new Date("2026-01-01T06:00:00.000Z")),
    ).toEqual([
      { kind: "MONTH", start: "2025-12-01", end: "2026-01-01" },
      { kind: "QUARTER", start: "2025-10-01", end: "2026-01-01" },
      { kind: "YEAR", start: "2025-01-01", end: "2026-01-01" },
    ]);
  });

  test("rejects open and all-time periods", () => {
    expect(() =>
      assertClosedSwipeRankPeriod(
        { kind: "MONTH", start: "2026-08-01", end: "2026-09-01" },
        new Date("2026-08-11T00:00:00.000Z"),
      ),
    ).toThrow("open SwipeRank season");
    expect(() =>
      assertClosedSwipeRankPeriod(
        { kind: "ALL_TIME", start: "0001-01-01", end: "9999-01-01" },
        new Date("2026-08-11T00:00:00.000Z"),
      ),
    ).toThrow("completed calendar seasons only");
  });
});
