import { describe, expect, test } from "bun:test";

import {
  assertAlignedPeriod,
  assertClosedSwipeRankMonth,
  periodContaining,
  previousCalendarMonth,
} from "./periods";

describe("SwipeRank period bounds", () => {
  test("months are first-class half-open periods", () => {
    expect(periodContaining("MONTH", "2025-12-31")).toEqual({
      kind: "MONTH",
      start: "2025-12-01",
      end: "2026-01-01",
    });
  });

  test("broader periods are rejected", () => {
    expect(() =>
      assertAlignedPeriod({
        kind: "ALL_TIME",
        start: "2014-01-01",
        end: "2026-01-01",
      }),
    ).toThrow("monthly periods only");
  });

  test("the monthly publisher closes the immediately preceding UTC month", () => {
    expect(previousCalendarMonth(new Date("2026-01-01T06:30:00.000Z"))).toEqual(
      {
        kind: "MONTH",
        start: "2025-12-01",
        end: "2026-01-01",
      },
    );
  });

  test("closed-season reads reject open months and every broader period", () => {
    const now = new Date("2026-08-11T12:00:00.000Z");
    expect(() =>
      assertClosedSwipeRankMonth(
        { kind: "MONTH", start: "2026-07-01", end: "2026-08-01" },
        now,
      ),
    ).not.toThrow();
    expect(() =>
      assertClosedSwipeRankMonth(
        { kind: "MONTH", start: "2026-08-01", end: "2026-09-01" },
        now,
      ),
    ).toThrow("open SwipeRank month");
    expect(() =>
      assertClosedSwipeRankMonth(
        { kind: "YEAR", start: "2025-01-01", end: "2026-01-01" },
        now,
      ),
    ).toThrow("completed calendar months only");
  });
});
