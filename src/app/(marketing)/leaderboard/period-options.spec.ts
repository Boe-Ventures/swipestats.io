import { describe, expect, test } from "bun:test";

import {
  generatedPeriodOptions,
  preferredLeaderboardPeriod,
  resolveLeaderboardPeriodOptions,
} from "./period-options";

describe("public SwipeRank closed-season selection", () => {
  test("generated placeholders begin with the preceding closed month", () => {
    expect(
      generatedPeriodOptions("MONTH", new Date("2026-08-11T12:00:00.000Z"))[0],
    ).toEqual({
      kind: "MONTH",
      start: "2026-07-01",
      end: "2026-08-01",
    });
  });

  test("does not advertise a month when nothing is published", () => {
    expect(resolveLeaderboardPeriodOptions("MONTH", [])).toEqual([]);
  });

  test("selects published quarter and year inventories independently", () => {
    const observed = [
      {
        period: {
          kind: "MONTH" as const,
          start: "2026-06-01",
          end: "2026-07-01",
        },
      },
      {
        period: {
          kind: "QUARTER" as const,
          start: "2026-04-01",
          end: "2026-07-01",
        },
      },
      {
        period: {
          kind: "YEAR" as const,
          start: "2025-01-01",
          end: "2026-01-01",
        },
      },
    ];
    expect(resolveLeaderboardPeriodOptions("QUARTER", observed)).toEqual([
      { kind: "QUARTER", start: "2026-04-01", end: "2026-07-01" },
    ]);
    expect(resolveLeaderboardPeriodOptions("YEAR", observed)[0]?.start).toBe(
      "2025-01-01",
    );
  });

  test("published inventory is ordered newest first", () => {
    const options = resolveLeaderboardPeriodOptions("MONTH", [
      { period: { kind: "MONTH", start: "2026-05-01", end: "2026-06-01" } },
      { period: { kind: "MONTH", start: "2026-07-01", end: "2026-08-01" } },
    ]);
    expect(preferredLeaderboardPeriod(options, "MONTH").start).toBe(
      "2026-07-01",
    );
  });
});
