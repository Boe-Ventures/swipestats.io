import { describe, expect, it } from "bun:test";

import {
  compareHingeTimestamps,
  getCanonicalHingeTimestampIdentity,
  parseHingeTimestampToDate,
  tryParseHingeTimestampToDate,
} from "./timestamp";

describe("Hinge provider timestamps", () => {
  it("treats timezone-less provider wall time as UTC", () => {
    const raw = "2026-06-27 11:55:38.243522";

    expect(parseHingeTimestampToDate(raw).toISOString()).toBe(
      "2026-06-27T11:55:38.243Z",
    );
    expect(getCanonicalHingeTimestampIdentity(raw)).toBe(
      "2026-06-27T11:55:38.243522Z",
    );
  });

  it("accepts explicit provider offsets without changing the instant", () => {
    expect(
      parseHingeTimestampToDate("2026-06-27T13:55:38.243+02:00").toISOString(),
    ).toBe("2026-06-27T11:55:38.243Z");
  });

  it("retains microseconds when ordering instants in the same millisecond", () => {
    expect(
      compareHingeTimestamps(
        "2026-06-27 11:55:38.243522",
        "2026-06-27 11:55:38.243850",
      ),
    ).toBeLessThan(0);
  });

  it("rejects invalid calendar values", () => {
    expect(tryParseHingeTimestampToDate("2026-02-30 12:00:00")).toBeNull();
    expect(() => parseHingeTimestampToDate("not-a-timestamp")).toThrow(
      "Hinge timestamp is invalid",
    );
  });
});
