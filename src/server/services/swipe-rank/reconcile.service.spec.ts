import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { assertSwipeRankReconcileLimit } = await import("./reconcile.service");

describe("SwipeRank reconciliation contract", () => {
  test("accepts bounded batch sizes", () => {
    expect(assertSwipeRankReconcileLimit(1)).toBe(1);
    expect(assertSwipeRankReconcileLimit(100)).toBe(100);
    expect(assertSwipeRankReconcileLimit(500)).toBe(500);
  });

  test("rejects unsafe or unbounded batch sizes", () => {
    for (const value of [0, 501, 1.5, Number.NaN]) {
      expect(() => assertSwipeRankReconcileLimit(value)).toThrow();
    }
  });
});
