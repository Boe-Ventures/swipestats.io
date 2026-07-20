import { describe, expect, test } from "bun:test";

import {
  preferredLeaderboardPeriod,
  resolveLeaderboardQuickJumps,
  resolveLeaderboardPeriodOptions,
} from "./period-options";

describe("public SwipeRank period selection", () => {
  test("defaults months to the newest completed observed period", () => {
    const options = resolveLeaderboardPeriodOptions(
      "MONTH",
      [
        {
          period: {
            kind: "MONTH",
            start: "2026-05-01",
            end: "2026-06-01",
          },
        },
        {
          period: {
            kind: "MONTH",
            start: "2026-07-01",
            end: "2026-08-01",
          },
        },
        {
          period: {
            kind: "MONTH",
            start: "2026-06-01",
            end: "2026-07-01",
          },
        },
      ],
      new Date("2026-07-14T12:00:00.000Z"),
    );

    expect(preferredLeaderboardPeriod(options, "MONTH")).toMatchObject({
      start: "2026-06-01",
      live: false,
    });
  });

  test("falls back to the newest observed month when none is completed", () => {
    const options = resolveLeaderboardPeriodOptions(
      "MONTH",
      [
        {
          period: {
            kind: "MONTH",
            start: "2026-08-01",
            end: "2026-09-01",
          },
        },
        {
          period: {
            kind: "MONTH",
            start: "2026-07-01",
            end: "2026-08-01",
          },
        },
      ],
      new Date("2026-07-14T12:00:00.000Z"),
    );

    expect(preferredLeaderboardPeriod(options, "MONTH").start).toBe(
      "2026-08-01",
    );
  });

  test("defaults quarters to the newest eligible observed season", () => {
    const options = resolveLeaderboardPeriodOptions(
      "QUARTER",
      [
        {
          period: {
            kind: "QUARTER",
            start: "2026-01-01",
            end: "2026-04-01",
          },
        },
        {
          period: {
            kind: "QUARTER",
            start: "2026-07-01",
            end: "2026-10-01",
          },
        },
        {
          period: {
            kind: "QUARTER",
            start: "2026-04-01",
            end: "2026-07-01",
          },
        },
      ],
      new Date("2026-07-15T12:00:00.000Z"),
    );

    expect(preferredLeaderboardPeriod(options, "QUARTER")).toMatchObject({
      start: "2026-07-01",
      live: true,
    });
  });

  test("builds curated jumps from completed observed periods", () => {
    const periods = [
      ["ALL_TIME", "0001-01-01", "9999-01-01"],
      ["QUARTER", "2026-07-01", "2026-10-01"],
      ["QUARTER", "2026-04-01", "2026-07-01"],
      ["MONTH", "2026-07-01", "2026-08-01"],
      ["MONTH", "2026-06-01", "2026-07-01"],
      ["YEAR", "2026-01-01", "2027-01-01"],
      ["YEAR", "2025-01-01", "2026-01-01"],
    ].map(([kind, start, end]) => ({
      period: {
        kind: kind as "ALL_TIME" | "QUARTER" | "MONTH" | "YEAR",
        start: start!,
        end: end!,
      },
    }));

    expect(
      resolveLeaderboardQuickJumps(
        periods,
        new Date("2026-07-15T12:00:00.000Z"),
      ).map((item) => [item.label, item.period.start]),
    ).toEqual([
      ["All time", "0001-01-01"],
      ["Last quarter", "2026-04-01"],
      ["Last month", "2026-06-01"],
      ["Last year", "2025-01-01"],
    ]);
  });
});
