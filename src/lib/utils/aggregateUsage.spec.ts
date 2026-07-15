import { describe, expect, test } from "bun:test";

import type { TinderUsage } from "@/server/db/schema";

import {
  aggregateUsageData,
  alignUsageToComparisonPeriod,
  calculateInclusiveDateRange,
  calculatePreviousPeriod,
  fillUsagePeriodRange,
  filterUsageByDateRange,
  getUsagePeriodKey,
  type TimeGranularity,
} from "./aggregateUsage";

function usage(
  dateStampRaw: string,
  options: {
    dateStamp?: string;
    likes?: number;
    matches?: number;
  } = {},
): TinderUsage {
  const likes = options.likes ?? 1;
  const matches = options.matches ?? 0;

  return {
    dateStamp: new Date(
      options.dateStamp ?? `${dateStampRaw.slice(0, 10)}T00:00:00.000Z`,
    ),
    dateStampRaw,
    tinderProfileId: "profile",
    appOpens: 1,
    matches,
    swipeLikes: likes,
    swipeSuperLikes: 0,
    swipePasses: likes,
    swipesCombined: likes * 2,
    messagesReceived: 0,
    messagesSent: 0,
    matchRate: likes > 0 ? matches / likes : 0,
    likeRate: likes > 0 ? 0.5 : 0,
    messagesSentRate: 0,
    responseRate: 0,
    engagementRate: 0,
    userAgeThisDay: 30,
  };
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

describe("aggregateUsageData source calendar dates", () => {
  test("uses dateStampRaw for every granularity when dateStamp shifted a day", () => {
    const shifted = usage("2024-01-01", {
      dateStamp: "2023-12-31T23:00:00.000Z",
      likes: 10,
      matches: 2,
    });
    const expectedPeriods: Record<TimeGranularity, string> = {
      daily: "2024-01-01",
      weekly: "2024-W01",
      monthly: "2024-01",
      quarterly: "2024-Q1",
      yearly: "2024",
    };

    for (const granularity of Object.keys(
      expectedPeriods,
    ) as TimeGranularity[]) {
      const result = aggregateUsageData([shifted], granularity);
      expect(result).toHaveLength(1);
      expect(result[0]?.period).toBe(expectedPeriods[granularity]);
      expect(result[0]?.matches).toBe(2);
      expect(result[0]?.swipeLikes).toBe(10);
    }
  });

  test("keeps a shifted quarter-boundary row in its source quarter", () => {
    const result = aggregateUsageData(
      [
        usage("2024-04-01", {
          dateStamp: "2024-03-31T22:00:00.000Z",
          likes: 10,
          matches: 2,
        }),
      ],
      "quarterly",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      period: "2024-Q2",
      matches: 2,
      swipeLikes: 10,
    });
  });

  test("uses the ISO week-year across a calendar-year boundary", () => {
    const result = aggregateUsageData(
      [usage("2021-01-01"), usage("2021-01-04")],
      "weekly",
    );

    expect(result.map((period) => period.period)).toEqual([
      "2020-W53",
      "2021-W01",
    ]);
    expect(result.map((period) => period.periodDisplay)).toEqual([
      "Week of Dec 28, 2020",
      "Week of Jan 4, 2021",
    ]);
  });

  test("uses the same ISO bucket for chart annotations", () => {
    expect(getUsagePeriodKey(new Date(2021, 0, 1), "weekly")).toBe("2020-W53");
  });

  test("combines multiple stored rows that resolve to one source day", () => {
    const result = aggregateUsageData(
      [
        usage("2024-04-01", { likes: 2, matches: 1 }),
        usage("2024-04-01T12:00:00.000Z", {
          likes: 3,
          matches: 1,
        }),
      ],
      "daily",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      period: "2024-04-01",
      matches: 2,
      swipeLikes: 5,
      matchRate: 0.4,
    });
  });

  test("fills daily gaps without local-time DST drift", () => {
    const result = aggregateUsageData(
      [usage("2024-03-09"), usage("2024-03-11")],
      "daily",
    );

    expect(result.map((period) => period.period)).toEqual([
      "2024-03-09",
      "2024-03-10",
      "2024-03-11",
    ]);
  });
});

describe("previous-period alignment", () => {
  test("rebuckets elapsed days onto the target calendar before aggregating", () => {
    const aligned = alignUsageToComparisonPeriod(
      [usage("2024-02-01", { likes: 2 }), usage("2024-03-01", { likes: 3 })],
      new Date(2024, 1, 1),
      new Date(2024, 2, 2),
    );

    expect(aligned.map((row) => row.dateStampRaw)).toEqual([
      "2024-03-02",
      "2024-03-31",
    ]);
    expect(aggregateUsageData(aligned, "monthly")).toMatchObject([
      { period: "2024-03", swipeLikes: 5 },
    ]);
  });

  test("fills inactive leading and trailing buckets in a selected range", () => {
    const observed = aggregateUsageData(
      [usage("2024-02-15", { likes: 2 })],
      "monthly",
    );

    expect(
      fillUsagePeriodRange(
        observed,
        "monthly",
        new Date(2024, 0, 1),
        new Date(2024, 2, 31),
      ),
    ).toMatchObject([
      { period: "2024-01", swipeLikes: 0 },
      { period: "2024-02", swipeLikes: 2 },
      { period: "2024-03", swipeLikes: 0 },
    ]);
  });
});

describe("inclusive calendar ranges", () => {
  test("returns exactly seven days including the selected end date", () => {
    const range = calculateInclusiveDateRange(7, new Date(2024, 2, 16, 12));

    expect(localDateKey(range.from)).toBe("2024-03-10");
    expect(localDateKey(range.to)).toBe("2024-03-16");
  });

  test("creates an equal previous range with no shared boundary day", () => {
    const current = calculateInclusiveDateRange(7, new Date(2024, 2, 16, 12));
    const previous = calculatePreviousPeriod(current.from, current.to);

    expect(localDateKey(previous.from)).toBe("2024-03-03");
    expect(localDateKey(previous.to)).toBe("2024-03-09");

    const rows = Array.from({ length: 14 }, (_, index) =>
      usage(`2024-03-${String(index + 3).padStart(2, "0")}`),
    );
    const currentRows = filterUsageByDateRange(rows, current.from, current.to);
    const previousRows = filterUsageByDateRange(
      rows,
      previous.from,
      previous.to,
    );

    expect(currentRows).toHaveLength(7);
    expect(previousRows).toHaveLength(7);
    expect(currentRows.some((row) => previousRows.includes(row))).toBeFalse();
  });

  test("filters by source calendar key instead of shifted dateStamp", () => {
    const rows = [
      usage("2024-03-31", { dateStamp: "2024-03-30T23:00:00.000Z" }),
      usage("2024-04-01", { dateStamp: "2024-03-31T22:00:00.000Z" }),
    ];

    const selected = filterUsageByDateRange(
      rows,
      new Date(2024, 3, 1),
      new Date(2024, 3, 1),
    );

    expect(selected.map((row) => row.dateStampRaw)).toEqual(["2024-04-01"]);
  });
});
