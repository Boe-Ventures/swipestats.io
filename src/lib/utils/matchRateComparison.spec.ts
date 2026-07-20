import { describe, expect, test } from "bun:test";

import type { TinderUsage } from "@/server/db/schema";

import { aggregateUsageData } from "./aggregateUsage";
import {
  calculatePooledMatchRatePercent,
  filterMatchRateComparisonUsage,
} from "./matchRateComparison";

function usage(
  dateStampRaw: string,
  likes: number,
  matches: number,
  dateStamp = `${dateStampRaw}T00:00:00.000Z`,
): TinderUsage {
  return {
    dateStamp: new Date(dateStamp),
    dateStampRaw,
    tinderProfileId: "profile",
    appOpens: 1,
    matches,
    swipeLikes: likes,
    swipeSuperLikes: 0,
    swipePasses: 0,
    swipesCombined: likes,
    messagesReceived: 0,
    messagesSent: 0,
    matchRate: likes > 0 ? matches / likes : 0,
    likeRate: likes > 0 ? 1 : 0,
    messagesSentRate: 0,
    responseRate: 0,
    engagementRate: 0,
    userAgeThisDay: 30,
  };
}

describe("calculatePooledMatchRatePercent", () => {
  test("weights periods by right swipes and retains zero-match activity", () => {
    const result = calculatePooledMatchRatePercent([
      usage("2026-06-01", 1, 1),
      usage("2026-06-02", 100, 0),
    ]);

    expect(result).toBeCloseTo((1 / 101) * 100, 10);
  });

  test("returns a genuine zero and distinguishes a missing denominator", () => {
    expect(calculatePooledMatchRatePercent([usage("2026-06-01", 10, 0)])).toBe(
      0,
    );
    expect(
      calculatePooledMatchRatePercent([usage("2026-06-01", 0, 2)]),
    ).toBeNull();
    expect(calculatePooledMatchRatePercent([])).toBeNull();
  });
});

describe("filterMatchRateComparisonUsage", () => {
  test("uses exactly the trailing seven source calendar days", () => {
    const rows = [
      usage("2026-07-08", 1, 0),
      usage("2026-07-09", 1, 0, "2026-07-08T22:00:00.000Z"),
      usage("2026-07-15", 1, 0, "2026-07-14T22:00:00.000Z"),
      usage("2026-07-16", 1, 0),
    ];

    const result = filterMatchRateComparisonUsage(
      rows,
      "7d",
      new Date(2026, 6, 15, 12),
    );

    expect(result.map((row) => row.dateStampRaw)).toEqual([
      "2026-07-09",
      "2026-07-15",
    ]);
  });

  test("clips raw rows before monthly aggregation", () => {
    const rows = [
      usage("2026-06-15", 100, 100),
      usage("2026-06-16", 10, 0),
      usage("2026-07-15", 10, 0),
    ];
    const selected = filterMatchRateComparisonUsage(
      rows,
      "30d",
      new Date(2026, 6, 15, 12),
    );
    const monthly = aggregateUsageData(selected, "monthly");

    expect(selected.map((row) => row.dateStampRaw)).toEqual([
      "2026-06-16",
      "2026-07-15",
    ]);
    expect(monthly.map((period) => period.period)).toEqual([
      "2026-06",
      "2026-07",
    ]);
    expect(calculatePooledMatchRatePercent(selected)).toBe(0);
  });
});
