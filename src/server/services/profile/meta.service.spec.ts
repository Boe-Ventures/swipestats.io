/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import type { TinderUsage } from "@/server/db/schema";

import {
  computeProfileMeta,
  type TinderProfileWithUsageAndMatches,
} from "./meta.service";

function usage(date: string, likes: number, matches: number): TinderUsage {
  return {
    dateStamp: new Date(`${date}T00:00:00.000Z`),
    dateStampRaw: date,
    tinderProfileId: "profile",
    appOpens: 1,
    matches,
    swipeLikes: likes,
    swipeSuperLikes: 0,
    swipePasses: likes,
    swipesCombined: likes * 2,
    messagesReceived: 0,
    messagesSent: 0,
    matchRate: likes > 0 ? matches / likes : 0,
    likeRate: 0.5,
    messagesSentRate: 0,
    responseRate: 0,
    engagementRate: 0,
    userAgeThisDay: 30,
  };
}

describe("computeProfileMeta", () => {
  test("uses the complete observed usage range for all-time metadata", () => {
    const profile = {
      firstDayOnApp: new Date("2026-01-10T00:00:00.000Z"),
      lastDayOnApp: new Date("2026-01-20T00:00:00.000Z"),
      usage: [usage("2026-01-01", 5, 1), usage("2026-01-30", 5, 2)],
      matches: [],
    } as unknown as TinderProfileWithUsageAndMatches;

    const meta = computeProfileMeta(profile);

    expect(meta.from.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(meta.to.toISOString().slice(0, 10)).toBe("2026-01-30");
    expect(meta.daysInPeriod).toBe(30);
    expect(meta.swipeLikesTotal).toBe(10);
    expect(meta.matchesTotal).toBe(3);
  });

  test("does not shrink a sparse profile's stated app-open span", () => {
    const profile = {
      firstDayOnApp: new Date("2025-12-01T00:00:00.000Z"),
      lastDayOnApp: new Date("2026-02-28T00:00:00.000Z"),
      usage: [usage("2026-01-15", 5, 1)],
      matches: [],
    } as unknown as TinderProfileWithUsageAndMatches;

    const meta = computeProfileMeta(profile);

    expect(meta.from.toISOString().slice(0, 10)).toBe("2025-12-01");
    expect(meta.to.toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});
