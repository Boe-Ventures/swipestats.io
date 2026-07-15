import { describe, expect, it } from "bun:test";

import { createHingeProfileMeta } from "./hinge-meta.service";

type HingeMetaInput = Parameters<typeof createHingeProfileMeta>[0];

describe("createHingeProfileMeta", () => {
  it("uses linked outbound matches and active like days for Hinge rates", () => {
    const profile = {
      createDate: new Date("2024-01-01T00:00:00.000Z"),
      matches: [
        {
          id: "match-1",
          matchedAt: new Date("2024-01-02T00:00:00.000Z"),
          messages: [
            {
              id: "message-2",
              sentDate: new Date("2024-01-04T00:00:00.000Z"),
              order: 1,
              messageType: "TEXT",
              to: 1,
            },
            {
              id: "message-1",
              sentDate: new Date("2024-01-03T00:00:00.000Z"),
              order: 0,
              messageType: "TEXT",
              to: 1,
            },
          ],
        },
        {
          id: "match-2",
          matchedAt: new Date("2024-01-05T00:00:00.000Z"),
          messages: [],
        },
      ],
      interactions: [
        {
          type: "LIKE_SENT",
          timestamp: new Date("2024-01-01T10:00:00.000Z"),
          matchId: "match-1",
        },
        {
          type: "LIKE_SENT",
          timestamp: new Date("2024-01-01T11:00:00.000Z"),
          matchId: null,
        },
        {
          type: "LIKE_SENT",
          timestamp: new Date("2024-01-02T11:00:00.000Z"),
          matchId: null,
        },
      ],
    } as HingeMetaInput;

    const meta = createHingeProfileMeta(profile);

    expect(meta.swipeLikesTotal).toBe(3);
    expect(meta.matchesTotal).toBe(2);
    expect(meta.matchRate).toBeCloseTo(1 / 3);
    expect(meta.daysActive).toBe(2);
    expect(meta.swipesPerDay).toBe(1.5);
    expect(meta.likeRate).toBe(1);
    expect(meta.messagesSentTotal).toBe(2);
    expect(meta.conversationsWithMessages).toBe(1);
    expect(meta.ghostedCount).toBe(1);
    expect(meta.from.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(meta.to.toISOString()).toBe("2024-01-05T00:00:00.000Z");
    expect(meta.daysInPeriod).toBe(5);
    expect(meta.averageResponseTimeSeconds).toBe(86_400);
    expect(meta.meanResponseTimeSeconds).toBe(86_400);
    expect(meta.medianConversationDurationDays).toBe(1);
    expect(meta.longestConversationDays).toBe(1);
    expect(meta.averageMessagesPerConversation).toBe(2);
    expect(meta.medianMessagesPerConversation).toBe(2);
  });

  it("does not report a 100% like rate when no like events exist", () => {
    const meta = createHingeProfileMeta({
      createDate: new Date("2024-01-01T00:00:00.000Z"),
      matches: [],
      interactions: [],
    } as unknown as HingeMetaInput);

    expect(meta.likeRate).toBe(0);
    expect(meta.daysActive).toBe(0);
    expect(meta.swipesPerDay).toBe(0);
    expect(meta.matchRate).toBe(0);
  });

  it("includes signup and counts the UTC calendar boundary inclusively", () => {
    const meta = createHingeProfileMeta({
      createDate: new Date("2024-01-01T23:30:00.000Z"),
      matches: [],
      interactions: [
        {
          type: "LIKE_SENT",
          timestamp: new Date("2024-01-02T00:15:00.000Z"),
          matchId: null,
        },
      ],
    } as unknown as HingeMetaInput);

    expect(meta.from.toISOString()).toBe("2024-01-01T23:30:00.000Z");
    expect(meta.to.toISOString()).toBe("2024-01-02T00:15:00.000Z");
    expect(meta.daysInPeriod).toBe(2);
  });

  it("retains the earliest signup across absorbed accounts", () => {
    const meta = createHingeProfileMeta({
      createDate: new Date("2024-01-01T00:00:00.000Z"),
      firstAccountCreateDate: new Date("2020-01-01T00:00:00.000Z"),
      matches: [],
      interactions: [],
    } as unknown as HingeMetaInput);

    expect(meta.from.toISOString()).toBe("2020-01-01T00:00:00.000Z");
    expect(meta.to.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(meta.daysInPeriod).toBe(1462);
  });

  it("includes provider last-seen and we-met evidence in the observed period", () => {
    const meta = createHingeProfileMeta({
      createDate: new Date("2024-01-01T00:00:00.000Z"),
      lastSeenAt: new Date("2024-02-01T00:00:00.000Z"),
      matches: [
        {
          id: "match-1",
          matchedAt: new Date("2024-01-10T00:00:00.000Z"),
          weMet: {
            timestamp: "2024-03-01T00:00:00.000Z",
            did_meet_subject: "Yes",
          },
          messages: [],
        },
      ],
      interactions: [],
    } as unknown as HingeMetaInput);

    expect(meta.to.toISOString()).toBe("2024-03-01T00:00:00.000Z");
    expect(meta.daysInPeriod).toBe(61);
  });
});
