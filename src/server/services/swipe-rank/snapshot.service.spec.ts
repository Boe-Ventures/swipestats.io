import { describe, expect, test } from "bun:test";
process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
const { hasCoherentFullSwipeRankLineage } = await import("./snapshot.service");
describe("SwipeRank snapshot lineage", () => {
  test("accepts the exact validated full monthly build", () => {
    expect(
      hasCoherentFullSwipeRankLineage({
        buildId: "srb_validated",
        expectedBuildId: "srb_validated",
        distinctBuilds: 1,
        buildScope: "FULL",
      }),
    ).toBeTrue();
  });
  test("rejects scoped, mixed, and replaced lineage", () => {
    const baseline = {
      buildId: "srb_validated",
      expectedBuildId: "srb_validated",
      distinctBuilds: 1,
      buildScope: "FULL" as const,
    };
    expect(
      hasCoherentFullSwipeRankLineage({
        ...baseline,
        distinctBuilds: 2,
      }),
    ).toBeFalse();
    expect(
      hasCoherentFullSwipeRankLineage({
        ...baseline,
        buildScope: "PROFILE",
      }),
    ).toBeFalse();
    expect(
      hasCoherentFullSwipeRankLineage({
        ...baseline,
        buildId: "srb_replacement",
      }),
    ).toBeFalse();
  });
});
