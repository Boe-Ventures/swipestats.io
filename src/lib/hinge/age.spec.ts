import { describe, expect, it } from "bun:test";

import { deriveApproximateHingeBirthDate, isPlausibleHingeAge } from "./age";

describe("Hinge age normalization", () => {
  it("anchors export age to last seen rather than account signup", () => {
    expect(
      deriveApproximateHingeBirthDate(
        30,
        "2026-06-15T12:00:00.000Z",
        new Date("2030-01-01T00:00:00.000Z"),
      ).toISOString(),
    ).toBe("1996-01-01T00:00:00.000Z");
  });

  it("uses UTC for a timezone-less Hinge last-seen wall clock", () => {
    expect(
      deriveApproximateHingeBirthDate(
        30,
        "2026-01-01 00:30:00.123456",
        new Date("2030-01-01T00:00:00.000Z"),
      ).toISOString(),
    ).toBe("1996-01-01T00:00:00.000Z");
  });

  it("falls back to processing time when last seen is invalid", () => {
    expect(
      deriveApproximateHingeBirthDate(
        30,
        "not-a-date",
        new Date("2026-07-15T12:00:00.000Z"),
      ).toISOString(),
    ).toBe("1996-01-01T00:00:00.000Z");
  });

  it("rejects ages outside Hinge's plausible adult range", () => {
    expect(isPlausibleHingeAge(17)).toBe(false);
    expect(isPlausibleHingeAge(30)).toBe(true);
    expect(isPlausibleHingeAge(121)).toBe(false);
  });
});
