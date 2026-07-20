import { describe, expect, it } from "bun:test";

import { calculateStageWidth } from "./funnel-path-utils";

describe("calculateStageWidth", () => {
  it("keeps inconsistent export counts inside the drawable funnel", () => {
    expect(calculateStageWidth(-5, 100, 320)).toBe(0);
    expect(calculateStageWidth(50, 100, 320)).toBe(160);
    expect(calculateStageWidth(120, 100, 320)).toBe(320);
  });

  it("returns zero when the reference population has no observations", () => {
    expect(calculateStageWidth(1, 0, 320)).toBe(0);
  });
});
