import { describe, expect, test } from "bun:test";

import {
  getRecomputeScope,
  normalizeRecomputeProfileIds,
} from "./recompute-options";

describe("SwipeRank recompute scope", () => {
  test("undefined is the only full reconciliation scope", () => {
    expect(normalizeRecomputeProfileIds(undefined)).toBeUndefined();
    expect(getRecomputeScope(undefined)).toBe("FULL");
  });

  test("profile rebuild IDs are normalized and deduplicated", () => {
    const ids = normalizeRecomputeProfileIds([" one ", "two", "one"]);
    expect(ids).toEqual(["one", "two"]);
    expect(getRecomputeScope(ids)).toBe("PROFILE");
  });

  test("an empty scoped request cannot become an accidental full build", () => {
    expect(() => normalizeRecomputeProfileIds([])).toThrow(
      "profileIds must contain",
    );
    expect(() => normalizeRecomputeProfileIds([" "])).toThrow(
      "profileIds must contain",
    );
  });
});
