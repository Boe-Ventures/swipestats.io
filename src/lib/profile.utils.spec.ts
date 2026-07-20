/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import type { Usage } from "./interfaces/TinderDataJSON";
import {
  differenceInUtcCalendarYears,
  getTinderObservedUsageRange,
  normalizeTinderDateValueMap,
  normalizeTinderUsageDateKey,
} from "./profile.utils";

describe("UTC calendar age", () => {
  test("turns a year older on the birthday regardless of birth clock time", () => {
    const birth = new Date("1990-05-20T18:45:00.000Z");

    expect(
      differenceInUtcCalendarYears(new Date("2026-05-19T23:59:59.999Z"), birth),
    ).toBe(35);
    expect(
      differenceInUtcCalendarYears(new Date("2026-05-20T00:00:00.000Z"), birth),
    ).toBe(36);
  });
});

describe("Tinder usage date normalization", () => {
  test("keeps calendar keys and canonicalizes ISO timestamp keys", () => {
    expect(normalizeTinderUsageDateKey("2026-03-04")).toBe("2026-03-04");
    expect(normalizeTinderUsageDateKey("2026-03-04T00:00:00.000Z")).toBe(
      "2026-03-04",
    );
    expect(normalizeTinderUsageDateKey("2026-03-04T01:00:00.000+02:00")).toBe(
      "2026-03-04",
    );
  });

  test("rejects impossible and ambiguous date keys", () => {
    expect(() => normalizeTinderUsageDateKey("2026-02-30")).toThrow();
    expect(() => normalizeTinderUsageDateKey("03/04/2026")).toThrow();
    expect(() =>
      normalizeTinderDateValueMap({
        "2026-03-04": 1,
        "2026-03-04T00:00:00.000Z": 2,
      }),
    ).toThrow("Multiple Tinder usage keys resolve to 2026-03-04");
  });

  test("rejects negative and fractional counts", () => {
    expect(() => normalizeTinderDateValueMap({ "2026-03-04": -1 })).toThrow();
    expect(() => normalizeTinderDateValueMap({ "2026-03-04": 1.5 })).toThrow();
  });

  test("derives the range from the union of every metric", () => {
    const usage = {
      app_opens: { "2026-02-01": 1 },
      swipes_likes: { "2026-01-31": 2 },
      swipes_passes: {},
      superlikes: {},
      matches: { "2026-03-01": 1 },
      messages_sent: {},
      messages_received: {},
      advertising_id: {},
      idfa: {},
    } satisfies Usage;

    const range = getTinderObservedUsageRange(usage);
    expect(range.firstDayOnApp.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(range.lastDayOnApp.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});
