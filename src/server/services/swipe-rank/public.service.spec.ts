import { beforeEach, describe, expect, mock, test } from "bun:test";

const execute = mock(async () => ({ rows: [] as Record<string, unknown>[] }));

await mock.module("@/env", () => ({
  env: {
    SWIPE_RANK_PUBLIC_ID_SECRET: "test-only-swipe-rank-public-identity-secret",
    BETTER_AUTH_SECRET: undefined,
  },
}));

await mock.module("@/server/db", () => ({
  db: { execute },
  withTransaction: mock(),
  withAdvisoryLockTransaction: mock(),
}));

const {
  getPublicSwipeRankLeaderboard,
  getPublicSwipeRankPseudonym,
  listPublicSwipeRankPeriods,
} = await import("./public.service");

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
    profile_id: null,
    rank: null,
    field_size: "1406",
    metric_value: null,
    match_rate_numerator: null,
    match_rate_denominator: null,
    active_days: null,
    age_in_period: null,
    gender: null,
    interested_in: null,
    city: null,
    region: null,
    country: null,
    seasons_ranked: null,
    observed_history_days: null,
    photo_url: null,
    photo_count: null,
    as_of: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("SwipeRank public leaderboard", () => {
  beforeEach(() => {
    execute.mockClear();
  });

  test("creates deterministic, cross-season opaque identities", () => {
    const secret = "a sufficiently long test-only secret";
    const identity = getPublicSwipeRankPseudonym(
      "srp_internal-profile-id",
      secret,
    );

    expect(identity).toEqual(
      getPublicSwipeRankPseudonym("srp_internal-profile-id", secret),
    );
    expect(identity.entryKey).toMatch(/^entry_[a-f0-9]{32}$/);
    expect(identity.alias).toMatch(/^Dater #[A-F0-9]{10}$/);
    expect(JSON.stringify(identity)).not.toContain("internal-profile-id");
    expect(
      getPublicSwipeRankPseudonym("srp_internal-profile-id", secret),
    ).toEqual(identity);
  });

  test("fails closed when no identity secret is supplied", () => {
    expect(() => getPublicSwipeRankPseudonym("srp_one", "")).toThrow(
      "must not be empty",
    );
  });

  test("returns every eligible row with only the anonymous public contract", async () => {
    execute.mockResolvedValueOnce({
      rows: [
        leaderboardRow({
          profile_id: "srp_internal-one",
          rank: "122",
          metric_value: "0.19862857142857143",
          match_rate_numerator: "4345",
          match_rate_denominator: "21875",
          active_days: "615",
          age_in_period: "33",
          gender: "MALE",
          interested_in: "FEMALE",
          city: "Oslo",
          region: "Oslo",
          country: "NO",
          seasons_ranked: "7",
          observed_history_days: "4044",
          photo_url: "https://example.com/photo.jpg",
          photo_count: "4",
        }),
      ],
    });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      page: 1,
    });

    expect(result).toMatchObject({
      ready: true,
      fieldSize: 1406,
      page: 1,
      pageSize: 100,
      totalPages: 15,
      countsSuppressed: false,
      asOf: "2026-07-14T10:00:00.000Z",
    });
    const entry = result.entries[0]!;
    expect(Object.keys(entry).sort()).toEqual([
      "activeDays",
      "age",
      "alias",
      "city",
      "country",
      "entryKey",
      "gender",
      "interestedIn",
      "matchYieldPercent",
      "matches",
      "observedHistoryDays",
      "photoCount",
      "photoUrl",
      "rank",
      "region",
      "rightSwipes",
      "seasonsRanked",
      "topShare",
    ]);
    expect(entry).toMatchObject({
      rank: 122,
      matchYieldPercent: 19.9,
      matches: 4_345,
      rightSwipes: 21_875,
      activeDays: 615,
      age: 33,
      gender: "MALE",
      interestedIn: "FEMALE",
      city: "Oslo",
      region: "Oslo",
      country: "NO",
      seasonsRanked: 7,
      observedHistoryDays: 4_044,
      photoUrl: "https://example.com/photo.jpg",
      photoCount: 4,
    });
    expect(entry.topShare).toBeCloseTo((122 / 1406) * 100);
    expect(JSON.stringify(result)).not.toContain("srp_internal-one");
    expect(entry).not.toHaveProperty("profileId");
    expect(entry).not.toHaveProperty("providerProfileId");
    expect(entry).not.toHaveProperty("userId");
    expect(entry).not.toHaveProperty("tinderId");
    expect(entry).not.toHaveProperty("matchYieldNumerator");
    expect(entry).not.toHaveProperty("matchYieldDenominator");
    expect(entry).not.toHaveProperty("hasQualityAnomaly");
  });

  test("publishes exact descriptors even for uncommon combinations", async () => {
    execute.mockResolvedValueOnce({
      rows: [
        leaderboardRow({
          profile_id: "srp_internal-one",
          rank: "1",
          metric_value: "0.5",
          match_rate_numerator: "125",
          match_rate_denominator: "250",
          active_days: "20",
          age_in_period: "58",
          gender: "MORE",
          interested_in: "OTHER",
          city: "Reykjavík",
          region: "Capital Region",
          country: "IS",
          seasons_ranked: "2",
          observed_history_days: "800",
          photo_count: "0",
        }),
      ],
    });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      page: 1,
    });

    expect(result.entries[0]).toMatchObject({
      age: 58,
      gender: "MORE",
      interestedIn: "OTHER",
      city: "Reykjavík",
      region: "Capital Region",
      country: "IS",
      seasonsRanked: 2,
      observedHistoryDays: 800,
      photoUrl: null,
      photoCount: 0,
    });
  });

  test("keeps empty later pages browseable with complete page metadata", async () => {
    execute.mockResolvedValueOnce({ rows: [leaderboardRow()] });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      page: 15,
    });

    expect(result).toMatchObject({
      fieldSize: 1406,
      page: 15,
      pageSize: 100,
      totalPages: 15,
      entries: [],
    });
  });

  test("suppresses exact counts and rows below the public floor", async () => {
    execute.mockResolvedValueOnce({
      rows: [leaderboardRow({ field_size: "7" })],
    });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      page: 1,
    });

    expect(result).toMatchObject({
      fieldSize: null,
      countsSuppressed: true,
      totalPages: 0,
      entries: [],
    });
  });

  test("distinguishes a not-yet-launched field from a populated one", async () => {
    execute.mockResolvedValueOnce({
      rows: [leaderboardRow({ ready: false, field_size: "0", as_of: null })],
    });

    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      page: 1,
    });

    expect(result.ready).toBeFalse();
    expect(result.asOf).toBeNull();
    expect(result.entries).toEqual([]);
  });

  test("rejects unsafe pagination before querying", async () => {
    const error = await getPublicSwipeRankLeaderboard({
      period: MONTH,
      minimumRateDenominator: 100,
      minimumActiveDays: 5,
      page: 0,
    }).then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw error;
    expect(error.message).toContain("page must be a positive integer");
    expect(execute).not.toHaveBeenCalled();
  });

  test("returns every useful period without publication state", async () => {
    execute.mockResolvedValueOnce({
      rows: [
        {
          period_kind: "YEAR",
          period_start: "2026-01-01",
          period_end: "2027-01-01",
          as_of: "2026-07-14T10:00:00.000Z",
          field_size: "800",
        },
        {
          period_kind: "MONTH",
          period_start: "2026-07-01",
          period_end: "2026-08-01",
          as_of: "2026-07-14T10:00:00.000Z",
          field_size: "70",
        },
        {
          period_kind: "MONTH",
          period_start: "2026-06-01",
          period_end: "2026-07-01",
          as_of: "2026-07-14T10:00:00.000Z",
          field_size: "900",
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
    });
    expect(result.periods[0]).not.toHaveProperty("publishedProfiles");
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
