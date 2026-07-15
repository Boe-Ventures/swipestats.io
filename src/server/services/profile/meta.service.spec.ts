/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import type { Match, Message, TinderUsage } from "@/server/db/schema";

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

function conversation(params: {
  messageDates: string[];
  storedMessageCount: number;
  durationDays: number | null;
  responseSeconds: number | null;
}): Match & { messages: Message[] } {
  return {
    totalMessageCount: params.storedMessageCount,
    conversationDurationDays: params.durationDays,
    responseTimeMedianSeconds: params.responseSeconds,
    messages: params.messageDates.map(
      (date) => ({ sentDate: new Date(date) }) as Message,
    ),
  } as Match & { messages: Message[] };
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

  test("uses raw provider dates instead of historically shifted timestamps", () => {
    const profile = {
      firstDayOnApp: new Date("2025-12-31T00:00:00.000Z"),
      lastDayOnApp: new Date("2026-01-29T00:00:00.000Z"),
      usage: [
        {
          ...usage("2026-01-01", 5, 1),
          dateStamp: new Date("2025-12-31T23:00:00.000Z"),
        },
        {
          ...usage("2026-01-30", 5, 1),
          dateStamp: new Date("2026-01-29T23:00:00.000Z"),
        },
      ],
      matches: [],
    } as unknown as TinderProfileWithUsageAndMatches;

    const meta = computeProfileMeta(profile);

    expect(meta.from.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(meta.to.toISOString().slice(0, 10)).toBe("2026-01-30");
    expect(meta.daysInPeriod).toBe(30);
  });

  test("derives conversation aggregates from actual rows and valid metrics", () => {
    const profile = {
      firstDayOnApp: new Date("2026-01-01T00:00:00.000Z"),
      lastDayOnApp: new Date("2026-01-01T00:00:00.000Z"),
      usage: [usage("2026-01-01", 5, 1)],
      matches: [
        conversation({
          messageDates: ["2026-01-01T00:00:00.000Z"],
          storedMessageCount: 999,
          durationDays: 0,
          responseSeconds: -10,
        }),
        conversation({
          messageDates: [
            "2026-01-01T00:00:00.000Z",
            "2026-01-01T00:01:00.000Z",
            "2026-01-01T00:02:00.000Z",
          ],
          storedMessageCount: 0,
          durationDays: 2,
          responseSeconds: 30,
        }),
        conversation({
          messageDates: [],
          storedMessageCount: 10,
          durationDays: null,
          responseSeconds: null,
        }),
      ],
    } as unknown as TinderProfileWithUsageAndMatches;

    const meta = computeProfileMeta(profile);

    expect(meta.conversationCount).toBe(3);
    expect(meta.conversationsWithMessages).toBe(2);
    expect(meta.ghostedCount).toBe(1);
    expect(meta.averageMessagesPerConversation).toBe(2);
    expect(meta.medianMessagesPerConversation).toBe(2);
    expect(meta.medianConversationDurationDays).toBe(1);
    expect(meta.longestConversationDays).toBe(2);
    expect(meta.averageResponseTimeSeconds).toBe(30);
    expect(meta.meanResponseTimeSeconds).toBe(60);
  });

  test("rejects a reversed explicit period", () => {
    const profile = {
      firstDayOnApp: new Date("2026-01-01T00:00:00.000Z"),
      lastDayOnApp: new Date("2026-01-01T00:00:00.000Z"),
      usage: [usage("2026-01-01", 5, 1)],
      matches: [],
    } as unknown as TinderProfileWithUsageAndMatches;

    expect(() =>
      computeProfileMeta(profile, {
        from: new Date("2026-01-02T00:00:00.000Z"),
        to: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toThrow("period start must not be after its end");
  });
});
