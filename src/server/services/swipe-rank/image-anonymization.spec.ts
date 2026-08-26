import { describe, expect, test } from "bun:test";

import {
  approvedImageIndexes,
  combineImagePrivacyAudits,
  imageAuditChunks,
} from "./image-anonymization.service";

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
  test("reviews large profiles in small attention-preserving chunks", () => {
    expect(imageAuditChunks([1, 2, 3, 4, 5, 6, 7])).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7],
    ]);
  });

  test("turns chunk-level uncertainty into image-level holds", () => {
    expect(
      combineImagePrivacyAudits([
        {
          verdict: "PASS",
          summary: "First chunk passes.",
          images: [image(1, true)],
        },
        {
          verdict: "NEEDS_REVIEW",
          summary: "Second chunk is uncertain.",
          images: [image(2, true), image(3, true)],
        },
      ]),
    ).toMatchObject({
      verdict: "NEEDS_REVIEW",
      images: [
        { imageNumber: 1, safe: true },
        {
          imageNumber: 2,
          safe: false,
          issues: ["OTHER_IDENTIFIER"],
        },
        {
          imageNumber: 3,
          safe: false,
          issues: ["OTHER_IDENTIFIER"],
        },
      ],
    });
  });

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
