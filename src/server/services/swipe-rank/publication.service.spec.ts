import { describe, expect, mock, test } from "bun:test";

import type { SwipeRankPublicationDependencies } from "./publication.service";
import { publishPreviousTinderSwipeRankMonthWithDependencies } from "./publication.service";

function dependencies(
  overrides: Partial<SwipeRankPublicationDependencies> = {},
): SwipeRankPublicationDependencies {
  return {
    withLock: async (callback) => callback(),
    findPublishedSnapshot: mock(async () => undefined),
    recompute: mock(async () => ({
      buildId: "srb_month",
      metricVersion: "tinder-match-yield-v1",
      scope: "FULL" as const,
      profileCount: 10,
      factCount: 20,
      monthFactCount: 20,
      anomalousFactCount: 0,
    })),
    validate: mock(async () => ({
      metricVersion: "tinder-match-yield-v1",
      closedBefore: "2026-08-01",
      profiles: 10,
      facts: 20,
      duplicateFacts: 0,
      nonMonthFacts: 0,
      openMonthFacts: 0,
      rawMonthMismatches: 0,
      rateInputMismatches: 0,
      qualityFlagMismatches: 0,
      registryDescriptorMismatches: 0,
      valid: true,
    })),
    activate: mock(async () => new Date("2026-08-01T06:30:01.000Z")),
    createSnapshot: mock(async () => ({
      snapshotId: "srs_month",
      buildId: "srb_month",
      metricVersion: "tinder-match-yield-v1",
      eligibilityVersion: "swipe-rank-eligibility-v1",
      period: {
        kind: "MONTH" as const,
        start: "2026-07-01",
        end: "2026-08-01",
      },
      fieldSize: 10,
      entryCount: 10,
      status: "PUBLISHED" as const,
      sourceCutoff: "2026-08-01T06:30:00.000Z",
      created: true,
    })),
    invalidatePublicCache: mock(() => true),
    ...overrides,
  };
}

describe("monthly SwipeRank publication", () => {
  test("publishes the immediately preceding calendar month", async () => {
    const deps = dependencies();
    const result = await publishPreviousTinderSwipeRankMonthWithDependencies(
      new Date("2026-08-01T06:30:00.000Z"),
      deps,
    );

    expect(result.period).toEqual({
      kind: "MONTH",
      start: "2026-07-01",
      end: "2026-08-01",
    });
    expect(deps.recompute).toHaveBeenCalledWith({
      metricVersion: "tinder-match-yield-v1",
      closedBefore: "2026-08-01",
    });
    expect(deps.createSnapshot).toHaveBeenCalledWith({
      period: result.period,
      publish: true,
      metricVersion: "tinder-match-yield-v1",
    });
  });

  test("does not rebuild an already published month", async () => {
    const deps = dependencies({
      findPublishedSnapshot: mock(async () => ({
        id: "srs_existing",
        buildId: "srb_existing",
        publishedAt: new Date("2026-08-01T06:30:00.000Z"),
      })),
    });

    const result = await publishPreviousTinderSwipeRankMonthWithDependencies(
      new Date("2026-08-02T12:00:00.000Z"),
      deps,
    );

    expect(result).toMatchObject({
      alreadyPublished: true,
      snapshotId: "srs_existing",
      buildId: "srb_existing",
    });
    expect(deps.recompute).not.toHaveBeenCalled();
    expect(deps.validate).not.toHaveBeenCalled();
    expect(deps.activate).not.toHaveBeenCalled();
    expect(deps.createSnapshot).not.toHaveBeenCalled();
  });
});
