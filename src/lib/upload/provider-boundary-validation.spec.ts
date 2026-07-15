import { describe, expect, it } from "bun:test";

import {
  isJsonEncodedStringArray,
  parseProviderTimestamp,
} from "./provider-boundary-validation";

describe("parseProviderTimestamp", () => {
  it("accepts the provider timestamp formats retained by the pipeline", () => {
    const nowMs = Date.parse("2026-07-15T00:00:00.000Z");

    expect(parseProviderTimestamp("2024-02-29T23:59:59.123Z", { nowMs })).toBe(
      Date.parse("2024-02-29T23:59:59.123Z"),
    );
    expect(
      parseProviderTimestamp("2024-02-29", {
        allowDateOnly: true,
        nowMs,
      }),
    ).toBe(Date.parse("2024-02-29"));
    expect(
      parseProviderTimestamp("Mon, 12 Jan 2026 18:22:45 GMT", {
        allowRfc1123: true,
        nowMs,
      }),
    ).toBe(Date.parse("Mon, 12 Jan 2026 18:22:45 GMT"));
    expect(
      parseProviderTimestamp("2024-02-29 23:59:59.123522", {
        allowNaiveUtc: true,
        nowMs,
      }),
    ).toBe(Date.parse("2024-02-29T23:59:59.123Z"));
  });

  it("keeps timezone-less parsing deterministic and opt-in", () => {
    const value = "2024-07-01 12:34:56.987654";
    const nowMs = Date.parse("2026-07-15T00:00:00.000Z");

    expect(parseProviderTimestamp(value, { nowMs })).toBeNull();
    expect(parseProviderTimestamp(value, { allowNaiveUtc: true, nowMs })).toBe(
      Date.parse("2024-07-01T12:34:56.987Z"),
    );
  });

  it("rejects normalized calendar dates and invalid clock components", () => {
    const nowMs = Date.parse("2026-07-15T00:00:00.000Z");
    for (const value of [
      "2026-02-30T12:00:00.000Z",
      "2026-01-01T24:00:00.000Z",
      "2026-01-01T12:60:00.000Z",
      "Mon, 31 Feb 2026 18:22:45 GMT",
    ]) {
      expect(
        parseProviderTimestamp(value, {
          allowDateOnly: true,
          allowRfc1123: true,
          nowMs,
        }),
      ).toBeNull();
    }
  });

  it("quarantines clearly future timestamps but allows provider clock skew", () => {
    const nowMs = Date.parse("2026-07-15T00:00:00.000Z");

    expect(
      parseProviderTimestamp("2026-07-16T23:59:59.000Z", { nowMs }),
    ).not.toBeNull();
    expect(
      parseProviderTimestamp("2026-07-18T00:00:01.000Z", { nowMs }),
    ).toBeNull();
  });
});

describe("isJsonEncodedStringArray", () => {
  it("accepts only JSON arrays whose entries are strings", () => {
    expect(isJsonEncodedStringArray('["Norwegian","English"]')).toBe(true);
    expect(isJsonEncodedStringArray("[]")).toBe(true);
    expect(isJsonEncodedStringArray("")).toBe(true);
    expect(isJsonEncodedStringArray('["Norwegian",42]')).toBe(false);
    expect(isJsonEncodedStringArray('{"language":"Norwegian"}')).toBe(false);
    expect(isJsonEncodedStringArray("not-json")).toBe(false);
  });
});
