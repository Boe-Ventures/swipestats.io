import { describe, expect, test } from "bun:test";

import {
  generatedPeriodOptions,
  preferredLeaderboardPeriod,
  resolveLeaderboardPeriodOptions,
} from "./period-options";

describe("public SwipeRank monthly selection", () => {
  test("generated placeholders begin with the preceding closed month", () => {
    expect(
      generatedPeriodOptions("MONTH", new Date("2026-08-11T12:00:00.000Z"))[0],
    ).toEqual({
      kind: "MONTH",
      start: "2026-07-01",
      end: "2026-08-01",
      live: false,
    });
  });

  test("does not advertise a month when nothing is published", () => {
    expect(resolveLeaderboardPeriodOptions("MONTH", [])).toEqual([]);
  });

  test("published inventory is ordered newest first", () => {
    const options = resolveLeaderboardPeriodOptions("MONTH", [
      { period: { kind: "MONTH", start: "2026-05-01", end: "2026-06-01" } },
      { period: { kind: "MONTH", start: "2026-07-01", end: "2026-08-01" } },
    ]);
    expect(preferredLeaderboardPeriod(options, "MONTH").start).toBe(
      "2026-07-01",
    );
    expect(options.every((period) => period.live === false)).toBeTrue();
  });
});
