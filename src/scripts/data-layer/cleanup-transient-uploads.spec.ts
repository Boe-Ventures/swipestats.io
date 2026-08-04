import { describe, expect, it } from "bun:test";

import { shouldCleanupTransientUpload } from "@/lib/upload/transient-upload";

describe("transient provider-upload cleanup selection", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");

  it("cleans committed uploads immediately", () => {
    expect(
      shouldCleanupTransientUpload({
        status: "COMMITTED",
        expiresAt: new Date("2026-07-16T12:00:00.000Z"),
        now,
      }),
    ).toBe(true);
  });

  it("cleans expired abandoned uploads but preserves active leases", () => {
    expect(
      shouldCleanupTransientUpload({
        status: "UPLOADED",
        expiresAt: new Date("2026-07-15T11:59:59.000Z"),
        now,
      }),
    ).toBe(true);
    expect(
      shouldCleanupTransientUpload({
        status: "UPLOADED",
        expiresAt: new Date("2026-07-15T12:00:01.000Z"),
        now,
      }),
    ).toBe(false);
  });

  it("retries a failed ABANDONED cleanup but not a completed one", () => {
    const expiresAt = new Date("2026-07-15T11:00:00.000Z");
    expect(
      shouldCleanupTransientUpload({
        status: "ABANDONED",
        expiresAt,
        cleanedAt: null,
        now,
      }),
    ).toBe(true);
    expect(
      shouldCleanupTransientUpload({
        status: "ABANDONED",
        expiresAt,
        cleanedAt: now,
        now,
      }),
    ).toBe(false);
  });
});
