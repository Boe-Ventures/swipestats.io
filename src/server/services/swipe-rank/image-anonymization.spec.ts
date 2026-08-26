import { describe, expect, test } from "bun:test";

import { approvedImageIndexes } from "./image-anonymization.service";

function image(imageNumber: number, safe: boolean) {
  const issues: Array<"RECOGNIZABLE_FACE"> = safe ? [] : ["RECOGNIZABLE_FACE"];
  return {
    imageNumber,
    safe,
    issues,
    note: "",
  };
}

describe("SwipeRank image review persistence", () => {
  test("approves every safe image when the audit identifies unsafe peers", () => {
    expect([
      ...approvedImageIndexes({
        verdict: "NEEDS_REVIEW",
        summary: "One image needs review.",
        images: [image(1, true), image(2, false), image(3, true)],
      }),
    ]).toEqual([0, 2]);
  });

  test("holds the complete set when the overall audit is uncertain", () => {
    expect([
      ...approvedImageIndexes({
        verdict: "NEEDS_REVIEW",
        summary: "The set is uncertain.",
        images: [image(1, true), image(2, true)],
      }),
    ]).toEqual([]);
  });

  test("approves a complete passing audit", () => {
    expect([
      ...approvedImageIndexes({
        verdict: "PASS",
        summary: "Every image is safe.",
        images: [image(1, true), image(2, true)],
      }),
    ]).toEqual([0, 1]);
  });
});
