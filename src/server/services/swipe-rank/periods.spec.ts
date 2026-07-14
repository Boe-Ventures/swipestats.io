import { describe, expect, test } from "bun:test";

import {
  allTimePeriod,
  assertAlignedPeriod,
  periodContaining,
} from "./periods";

describe("SwipeRank period bounds", () => {
  test("months are first-class half-open periods", () => {
    expect(periodContaining("MONTH", "2025-12-31")).toEqual({
      kind: "MONTH",
      start: "2025-12-01",
      end: "2026-01-01",
    });
  });

  test("quarters and years are aligned half-open periods", () => {
    expect(periodContaining("QUARTER", "2025-12-31")).toEqual({
      kind: "QUARTER",
      start: "2025-10-01",
      end: "2026-01-01",
    });
    expect(periodContaining("YEAR", "2025-12-31")).toEqual({
      kind: "YEAR",
      start: "2025-01-01",
      end: "2026-01-01",
    });
  });

  test("all-time has one explicit sentinel interval", () => {
    expect(allTimePeriod()).toEqual({
      kind: "ALL_TIME",
      start: "0001-01-01",
      end: "9999-01-01",
    });
    expect(() =>
      assertAlignedPeriod({
        kind: "ALL_TIME",
        start: "2014-01-01",
        end: "2026-01-01",
      }),
    ).toThrow("ALL_TIME must use");
  });

  test("misaligned finite periods are rejected", () => {
    expect(() =>
      assertAlignedPeriod({
        kind: "QUARTER",
        start: "2025-11-01",
        end: "2026-02-01",
      }),
    ).toThrow("QUARTER must be aligned");
  });
});
