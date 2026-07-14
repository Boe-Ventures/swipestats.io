import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { assertTinderSwipeRankBuildCanActivate } = await import("./readiness");

const cleanState = {
  status: "COMPLETE" as const,
  scope: "FULL" as const,
  latestCompleteFullBuildId: "srb_current",
  foreignFactCount: 0,
  sourceGeneration: 12,
  currentGeneration: 12,
};

describe("SwipeRank build activation", () => {
  test("accepts only the unchanged latest complete FULL build", () => {
    expect(() =>
      assertTinderSwipeRankBuildCanActivate("srb_current", cleanState),
    ).not.toThrow();
  });

  test("a prior activation cannot bless a newer FULL replacement", () => {
    expect(() =>
      assertTinderSwipeRankBuildCanActivate("srb_previous", cleanState),
    ).toThrow("no longer the latest");
  });

  test("rejects scoped fact replacement after validation", () => {
    expect(() =>
      assertTinderSwipeRankBuildCanActivate("srb_current", {
        ...cleanState,
        foreignFactCount: 1,
      }),
    ).toThrow("facts changed");
  });

  test("rejects source mutation after validation", () => {
    expect(() =>
      assertTinderSwipeRankBuildCanActivate("srb_current", {
        ...cleanState,
        currentGeneration: 13,
      }),
    ).toThrow("source data changed");
  });

  test("rejects PROFILE and incomplete builds", () => {
    expect(() =>
      assertTinderSwipeRankBuildCanActivate("srb_current", {
        ...cleanState,
        scope: "PROFILE",
      }),
    ).toThrow("completed FULL");
    expect(() =>
      assertTinderSwipeRankBuildCanActivate("srb_current", {
        ...cleanState,
        status: "FAILED",
      }),
    ).toThrow("completed FULL");
  });
});
