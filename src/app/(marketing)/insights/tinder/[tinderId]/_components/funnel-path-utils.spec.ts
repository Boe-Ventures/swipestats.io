import { describe, expect, it } from "bun:test";

import {
  calculateBubbleDimensions,
  calculateStageWidth,
} from "./funnel-path-utils";

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

describe("funnel bubble text clearance", () => {
  it("pads a multi-digit count even when the flow is narrow", () => {
    const bubble = calculateBubbleDimensions(10, false, 88);
    expect(bubble.width).toBeGreaterThanOrEqual(128);
    expect(bubble.x + bubble.width / 2).toBe(0);
    expect(calculateStageWidth(10, 1000, 320)).toBe(3.2);
  });

  it("expands the complete swipe sentence for large totals", () => {
    const bubble = calculateBubbleDimensions(320, true, 510);
    expect(bubble.width).toBeGreaterThanOrEqual(558);
    expect(bubble.x + bubble.width / 2).toBe(0);
  });
});
