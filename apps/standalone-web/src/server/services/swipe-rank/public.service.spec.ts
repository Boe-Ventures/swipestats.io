import { beforeEach, describe, expect, mock, test } from "bun:test";
const execute = mock(async () => ({ rows: [] as Record<string, unknown>[] }));
await mock.module("@/server/db", () => ({
  db: { execute },
  withTransaction: mock(),
  withAdvisoryLockTransaction: mock(),
}));
const { getPublicSwipeRankLeaderboard, getPublicSwipeRankPseudonym } =
  await import("./public.service");
const MONTH = {
  kind: "MONTH" as const,
  start: "2025-12-01",
  end: "2026-01-01",
};
function leaderboardRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    snapshot_id: "srs_month",
    profile_id: null,
    rank: null,
    top_share: null,
    field_size: "1406",
    metric_value: null,
    metric_numerator: null,
    metric_denominator: null,
    like_rate_denominator: null,
    active_days: null,
    age_in_period: null,
    gender: null,
    interested_in: null,
    city: null,
    region: null,
    country: null,
    seasons_ranked: null,
    observed_history_days: null,
    photo_count: null,
    as_of: "2026-07-14T10:00:00.000Z",
    minimum_rate_denominator: "100",
    minimum_active_days: "5",
    ...overrides,
  };
}
describe("SwipeRank public leaderboard", () => {
  beforeEach(() => {
    execute.mockClear();
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
          top_share: String((122 / 1406) * 100),
          metric_value: "0.19862857142857143",
          metric_numerator: "4345",
          metric_denominator: "21875",
          like_rate_denominator: "91250",
          active_days: "615",
          age_in_period: "33",
          gender: "MALE",
          interested_in: "FEMALE",
          city: "Oslo",
          region: "Oslo",
          country: "NO",
          seasons_ranked: "7",
          observed_history_days: "4044",
          photo_count: "4",
        }),
      ],
    });
    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
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
      "city",
      "country",
      "entryKey",
      "gender",
      "interestedIn",
      "matchYieldPercent",
      "matches",
      "observedHistoryDays",
      "photoCount",
      "rank",
      "region",
      "rightSwipes",
      "seasonsRanked",
      "topShare",
      "totalSwipes",
    ]);
    expect(entry).toMatchObject({
      rank: 122,
      matchYieldPercent: 19.9,
      matches: 4345,
      rightSwipes: 21875,
      totalSwipes: 91250,
      activeDays: 615,
      age: 33,
      gender: "MALE",
      interestedIn: "FEMALE",
      city: "Oslo",
      region: "Oslo",
      country: "NO",
      seasonsRanked: 7,
      observedHistoryDays: 4044,
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
  test("keeps empty later pages browseable with complete page metadata", async () => {
    execute.mockResolvedValueOnce({ rows: [leaderboardRow()] });
    const result = await getPublicSwipeRankLeaderboard({
      period: MONTH,
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
});
