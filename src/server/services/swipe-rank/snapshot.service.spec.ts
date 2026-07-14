import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  globalSwipeRankCohortSpec,
  hashSwipeRankCohortSpec,
  hasCoherentFullSwipeRankLineage,
} = await import("./snapshot.service");

describe("SwipeRank snapshot identity", () => {
  test("global cohort identity is explicit and deterministic", () => {
    const spec = globalSwipeRankCohortSpec();
    expect(spec).toEqual({
      dataProvider: "TINDER",
      population: "REAL_PROFILES",
      dimensions: {},
    });
    expect(hashSwipeRankCohortSpec(spec)).toBe(
      hashSwipeRankCohortSpec(globalSwipeRankCohortSpec()),
    );
    expect(hashSwipeRankCohortSpec(spec)).toHaveLength(64);
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
  test("accepts only one current full source generation", () => {
    expect(
      hasCoherentFullSwipeRankLineage({
        distinctBuilds: 1,
        buildScope: "FULL",
        buildActivated: true,
        sourceGeneration: 9,
        currentGeneration: 9,
      }),
    ).toBeTrue();
  });

  test("rejects scoped, mixed, missing, and superseded lineage", () => {
    const baseline = {
      distinctBuilds: 1,
      buildScope: "FULL" as const,
      buildActivated: true,
      sourceGeneration: 9,
      currentGeneration: 9,
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
        buildActivated: false,
      }),
    ).toBeFalse();
    expect(
      hasCoherentFullSwipeRankLineage({
        ...baseline,
        sourceGeneration: null,
      }),
    ).toBeFalse();
    expect(
      hasCoherentFullSwipeRankLineage({
        ...baseline,
        currentGeneration: 10,
      }),
    ).toBeFalse();
  });
});
