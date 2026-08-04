import { describe, expect, it } from "bun:test";

import { shouldApplyHingeProfileSnapshot } from "./hinge-profile-snapshot";

describe("shouldApplyHingeProfileSnapshot", () => {
  it("accepts equal/newer snapshots and quarantines demographic regression", () => {
    const current = new Date("2026-01-02T00:00:00.000Z");

    expect(shouldApplyHingeProfileSnapshot(null, current)).toBe(true);
    expect(shouldApplyHingeProfileSnapshot(current, new Date(current))).toBe(
      true,
    );
    expect(
      shouldApplyHingeProfileSnapshot(
        current,
        new Date("2026-01-03T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      shouldApplyHingeProfileSnapshot(
        current,
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
