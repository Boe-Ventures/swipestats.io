import { describe, expect, test } from "bun:test";

import { formatSwipeRankOrientation } from "./orientation";

describe("SwipeRank orientation labels", () => {
  test("labels binary same- and different-gender preferences", () => {
    expect(formatSwipeRankOrientation("MALE", "FEMALE")).toBe("Straight");
    expect(formatSwipeRankOrientation("FEMALE", "FEMALE")).toBe("Gay");
  });

  test("labels Tinder's multi-gender preference as bi", () => {
    expect(formatSwipeRankOrientation("MALE", "MORE")).toBe("Bi");
  });

  test("keeps non-binary and missing combinations honest", () => {
    expect(formatSwipeRankOrientation("OTHER", "FEMALE")).toBe("Queer");
    expect(formatSwipeRankOrientation("UNKNOWN", "FEMALE")).toBe(
      "Not specified",
    );
  });
});
