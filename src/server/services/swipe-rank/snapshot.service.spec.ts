import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  globalSwipeRankCohortSpec,
  hashSwipeRankExclusionSet,
  hashSwipeRankCohortSpec,
  hasCoherentFullSwipeRankLineage,
} = await import("./snapshot.service");

describe("SwipeRank snapshot identity", () => {
  test("global cohort identity is explicit and deterministic", () => {
    const spec = globalSwipeRankCohortSpec();
    expect(spec).toEqual({
      dataProvider: "TINDER",
      population: "REAL_NON_EXCLUDED_PROFILES",
      moderation: { exclusionSetHash: hashSwipeRankExclusionSet([]) },
      dimensions: {},
    });
    expect(hashSwipeRankCohortSpec(spec)).toBe(
      hashSwipeRankCohortSpec(globalSwipeRankCohortSpec()),
    );
    expect(hashSwipeRankCohortSpec(spec)).toHaveLength(64);
  });

  test("moderation changes the edition identity without changing facts", () => {
    const first = globalSwipeRankCohortSpec(
      hashSwipeRankExclusionSet(["srp_one"]),
    );
    const second = globalSwipeRankCohortSpec(
      hashSwipeRankExclusionSet(["srp_one", "srp_two"]),
    );

    expect(hashSwipeRankCohortSpec(first)).not.toBe(
      hashSwipeRankCohortSpec(second),
    );
  });

  test("different cohort specs cannot share an edition identity", () => {
    expect(hashSwipeRankCohortSpec(globalSwipeRankCohortSpec())).not.toBe(
      hashSwipeRankCohortSpec({
        ...globalSwipeRankCohortSpec(),
        dimensions: { gender: "MALE" },
      }),
    );
  });
});

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
