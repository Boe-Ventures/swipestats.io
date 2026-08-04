import { describe, expect, test } from "bun:test";

import {
  getDefaultEligibility,
  getObservedPeriods,
  parseSwipeRankPeriod,
} from "./periods";

describe("parseSwipeRankPeriod", () => {
  test("parses a month across a year boundary", () => {
    expect(parseSwipeRankPeriod("2025-12")).toEqual({
      label: "2025-12",
      kind: "month",
      startDate: "2025-12-01",
      endDate: "2026-01-01",
    });
  });

  test("parses a quarter across a year boundary", () => {
    expect(parseSwipeRankPeriod("2025-Q4")).toEqual({
      label: "2025-Q4",
      kind: "quarter",
      startDate: "2025-10-01",
      endDate: "2026-01-01",
    });
  });

  test("parses a year and all-time", () => {
    expect(parseSwipeRankPeriod("2025")).toEqual({
      label: "2025",
      kind: "year",
      startDate: "2025-01-01",
      endDate: "2026-01-01",
    });
    expect(parseSwipeRankPeriod("all-time")).toEqual({
      label: "all-time",
      kind: "all-time",
      startDate: null,
      endDate: null,
    });
  });

  test("rejects invalid periods", () => {
    expect(() => parseSwipeRankPeriod("2025-13")).toThrow("Invalid period");
    expect(() => parseSwipeRankPeriod("2025-Q5")).toThrow("Invalid period");
    expect(() => parseSwipeRankPeriod("week")).toThrow("Invalid period");
  });
});

describe("period defaults", () => {
  test("keeps months first-class with a reachable eligibility floor", () => {
    expect(getDefaultEligibility("month")).toEqual({
      minLikes: 100,
      minActiveDays: 5,
    });
  });

  test("scales eligibility without discarding sustained lower-volume use", () => {
    expect(getDefaultEligibility("quarter")).toEqual({
      minLikes: 250,
      minActiveDays: 15,
    });
    expect(getDefaultEligibility("year")).toEqual({
      minLikes: 500,
      minActiveDays: 40,
    });
  });

  test("derives the latest observed month, quarter, and year", () => {
    expect(
      getObservedPeriods("2025-12-30").map((period) => period.label),
    ).toEqual(["2025-12", "2025-Q4", "2025", "all-time"]);
  });
});
