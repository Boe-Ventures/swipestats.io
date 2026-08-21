import { describe, expect, mock, test } from "bun:test";

import type { SwipeRankPublicationDependencies } from "./publication.service";
import { publishClosedTinderSwipeRankSeasonsWithDependencies } from "./publication.service";

function dependencies(
  overrides: Partial<SwipeRankPublicationDependencies> = {},
): SwipeRankPublicationDependencies {
  return {
    withLock: async (callback) => callback(),
    findPublishedSnapshot: mock(async () => undefined),
    recompute: mock(async () => ({
      buildId: "srb_seasons",
      metricVersion: "tinder-match-yield-v1",
      scope: "FULL" as const,
      profileCount: 10,
      factCount: 30,
      monthFactCount: 20,
      quarterFactCount: 7,
      yearFactCount: 3,
      anomalousFactCount: 0,
    })),
    validate: mock(async () => ({
      metricVersion: "tinder-match-yield-v1",
      closedBefore: "2026-01-01",
      profiles: 10,
      facts: 30,
      duplicateFacts: 0,
      unsupportedPeriodFacts: 0,
      openPeriodFacts: 0,
      rawMonthMismatches: 0,
      rateInputMismatches: 0,
      qualityFlagMismatches: 0,
      registryDescriptorMismatches: 0,
      valid: true,
    })),
    activate: mock(async () => new Date("2026-01-01T06:30:01.000Z")),
    createSnapshot: mock(
      async (
        input: Parameters<
          SwipeRankPublicationDependencies["createSnapshot"]
        >[0],
      ) => ({
        snapshotId: `srs_${input.period.kind.toLowerCase()}`,
        buildId: "srb_seasons",
        metricVersion: "tinder-match-yield-v1",
        eligibilityVersion: "swipe-rank-eligibility-v1",
        period: input.period,
        fieldSize: 10,
        entryCount: 10,
        status: "PUBLISHED" as const,
        sourceCutoff: "2026-01-01T06:30:00.000Z",
        created: true,
      }),
    ),
    invalidatePublicCache: mock(() => true),
    ...overrides,
  };
}

describe("closed-season SwipeRank publication", () => {
  test("publishes month, quarter, and year together on January 1", async () => {
    const deps = dependencies();
    const result = await publishClosedTinderSwipeRankSeasonsWithDependencies(
      new Date("2026-01-01T06:30:00.000Z"),
      deps,
    );

    expect(result.periods.map((period) => period.kind)).toEqual([
      "MONTH",
      "QUARTER",
      "YEAR",
    ]);
    expect(deps.recompute).toHaveBeenCalledTimes(1);
    expect(deps.recompute).toHaveBeenCalledWith({
      metricVersion: "tinder-match-yield-v1",
      closedBefore: "2026-01-01",
    });
    expect(deps.createSnapshot).toHaveBeenCalledTimes(3);
  });

  test("publishes only the month outside a quarter boundary", async () => {
    const deps = dependencies();
    const result = await publishClosedTinderSwipeRankSeasonsWithDependencies(
      new Date("2026-08-01T06:30:00.000Z"),
      deps,
    );
    expect(result.periods).toEqual([
      { kind: "MONTH", start: "2026-07-01", end: "2026-08-01" },
    ]);
    expect(deps.createSnapshot).toHaveBeenCalledTimes(1);
  });

  test("retries only missing snapshots and skips a fully published boundary", async () => {
    const partiallyPublished = dependencies({
      findPublishedSnapshot: mock(
        async (
          period: Parameters<
            SwipeRankPublicationDependencies["findPublishedSnapshot"]
          >[0],
        ) =>
          period.kind === "MONTH"
            ? {
                id: "srs_existing",
                buildId: "srb_existing",
                publishedAt: new Date("2026-07-01T06:30:00.000Z"),
              }
            : undefined,
      ),
    });
    const partialResult =
      await publishClosedTinderSwipeRankSeasonsWithDependencies(
        new Date("2026-07-01T06:30:00.000Z"),
        partiallyPublished,
      );
    expect(partiallyPublished.createSnapshot).toHaveBeenCalledTimes(1);
    expect(partialResult.snapshots?.[0]?.period.kind).toBe("QUARTER");

    const complete = dependencies({
      findPublishedSnapshot: mock(
        async (
          period: Parameters<
            SwipeRankPublicationDependencies["findPublishedSnapshot"]
          >[0],
        ) => ({
          id: `srs_${period.kind}`,
          buildId: "srb_existing",
          publishedAt: new Date("2026-07-01T06:30:00.000Z"),
        }),
      ),
    });
    const result = await publishClosedTinderSwipeRankSeasonsWithDependencies(
      new Date("2026-07-02T06:30:00.000Z"),
      complete,
    );
    expect(result.alreadyPublished).toBe(true);
    expect(complete.recompute).not.toHaveBeenCalled();
  });
});
