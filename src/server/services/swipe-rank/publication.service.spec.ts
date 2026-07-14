import { beforeEach, describe, expect, mock, test } from "bun:test";

const execute = mock(async () => ({ rows: [] as Record<string, unknown>[] }));

await mock.module("@/server/db", () => ({
  db: { execute },
}));

const {
  canPublishSwipeRank,
  getPublicSwipeRankLeaderboard,
  getSwipeRankPublicAgeBand,
  listPublicSwipeRankPeriods,
  normalizeSwipeRankPublicAlias,
} = await import("./publication.service");

const MONTH = {
  kind: "MONTH" as const,
  start: "2025-12-01",
  end: "2026-01-01",
};

function leaderboardRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    ready: true,
    public_key: null,
    alias: null,
    rank: null,
    tie_count: null,
    field_size: "1406",
    published_profiles: "0",
    metric_value: null,
    gender: null,
    interested_in: null,
    age_in_period: null,
    city: null,
    region: null,
    country: null,
    location_granularity: null,
    show_gender: null,
    show_age_band: null,
    show_interested_in: null,
    as_of: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("SwipeRank public publication helpers", () => {
  beforeEach(() => {
    execute.mockClear();
  });

  test("normalizes aliases and refuses invalid age bands", () => {
    expect(normalizeSwipeRankPublicAlias("  Oslo\n dater  ")).toBe(
      "Oslo dater",
    );
    expect(normalizeSwipeRankPublicAlias(" \n ")).toBe("Anonymous dater");
    expect(getSwipeRankPublicAgeBand(18)).toBe("18–24");
    expect(getSwipeRankPublicAgeBand(34)).toBe("25–34");
    expect(getSwipeRankPublicAgeBand(17)).toBeNull();
    expect(getSwipeRankPublicAgeBand(101)).toBeNull();
    expect(getSwipeRankPublicAgeBand(24.5)).toBeNull();
  });

  test("only claimed, non-anonymous accounts can publish", () => {
    expect(
      canPublishSwipeRank({
        email: "person@example.com",
        isAnonymous: false,
      }),
    ).toBeTrue();
    expect(
      canPublishSwipeRank({
        email: "guest@anonymous.swipestats.io",
        isAnonymous: false,
      }),
    ).toBeFalse();
    expect(
      canPublishSwipeRank({
        email: "person@example.com",
        isAnonymous: true,
      }),
    ).toBeFalse();
  });

  test("preserves field metadata when nobody has published", async () => {
    execute.mockResolvedValueOnce({ rows: [leaderboardRow()] });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      limit: 50,
      offset: 0,
    });

    expect(result).toMatchObject({
      ready: true,
      fieldSize: 1406,
      publishedProfiles: 0,
      asOf: "2026-07-14T10:00:00.000Z",
      entries: [],
      countsSuppressed: false,
    });
  });

  test("distinguishes a not-yet-launched field from privacy suppression", async () => {
    execute.mockResolvedValueOnce({
      rows: [leaderboardRow({ ready: false, field_size: "0" })],
    });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      limit: 50,
      offset: 0,
    });

    expect(result.ready).toBeFalse();
    expect(result.countsSuppressed).toBeTrue();
    expect(result.entries).toEqual([]);
  });

  test("suppresses exact counts for a field below the public floor", async () => {
    execute.mockResolvedValueOnce({
      rows: [leaderboardRow({ field_size: "7", published_profiles: "1" })],
    });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      limit: 50,
      offset: 0,
    });

    expect(result).toMatchObject({
      fieldSize: null,
      publishedProfiles: null,
      countsSuppressed: true,
      entries: [],
    });
  });

  test("ranks in the full eligible field and gates every descriptor", async () => {
    execute.mockResolvedValueOnce({
      rows: [
        leaderboardRow({
          public_key: "rank_public",
          alias: "Public dater",
          rank: "122",
          tie_count: "2",
          field_size: "1406",
          published_profiles: "1",
          metric_value: "0.19862857142857143",
          gender: "MALE",
          interested_in: "FEMALE",
          age_in_period: "33",
          city: "Oslo",
          region: "Oslo",
          country: "Norway",
          location_granularity: "REGION",
          show_gender: false,
          show_age_band: true,
          show_interested_in: true,
        }),
      ],
    });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      limit: 50,
      offset: 0,
    });

    const entry = result.entries[0]!;
    expect(entry).toMatchObject({
      rank: 122,
      tieCount: 2,
      fieldSize: 1406,
      gender: null,
      interestedIn: "FEMALE",
      ageBand: "25–34",
      location: "Oslo, Norway",
      matchYieldPercent: 19.9,
    });
    expect(entry.entryKey).toMatch(/^entry_[a-f0-9]{32}$/);
    expect(entry.entryKey).not.toContain("rank_public");
    expect(entry).not.toHaveProperty("publicKey");
    expect(entry).not.toHaveProperty("matchYieldNumerator");
    expect(entry).not.toHaveProperty("matchYieldDenominator");
  });

  test("rejects unsafe pagination before querying", async () => {
    const error = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      limit: 101,
      offset: 0,
    }).then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw error;
    expect(error.message).toContain("limit must be between 1 and 100");
    expect(execute).not.toHaveBeenCalled();
  });

  test("returns every useful public period with v1 thresholds", async () => {
    execute.mockResolvedValueOnce({
      rows: [
        {
          period_kind: "YEAR",
          period_start: "2026-01-01",
          period_end: "2027-01-01",
          as_of: "2026-07-14T10:00:00.000Z",
          field_size: "800",
          published_profiles: "3",
        },
        {
          period_kind: "MONTH",
          period_start: "2026-07-01",
          period_end: "2026-08-01",
          as_of: "2026-07-14T10:00:00.000Z",
          field_size: "70",
          published_profiles: "1",
        },
        {
          period_kind: "MONTH",
          period_start: "2026-06-01",
          period_end: "2026-07-01",
          as_of: "2026-07-14T10:00:00.000Z",
          field_size: "900",
          published_profiles: "2",
        },
      ],
    });

    const result = await listPublicSwipeRankPeriods();

    expect(result.periods.map(({ period }) => period.kind)).toEqual([
      "MONTH",
      "MONTH",
      "YEAR",
    ]);
    expect(result.periods[0]).toMatchObject({
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      fieldSize: 70,
      publishedProfiles: 1,
    });
    expect(result.periods[1]).toMatchObject({
      period: { start: "2026-06-01" },
      fieldSize: 900,
    });
    expect(result.periods[2]).toMatchObject({
      minimumRateDenominator: 500,
      minimumActiveDays: 40,
    });
  });
});
