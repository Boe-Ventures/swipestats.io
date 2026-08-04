import { describe, expect, it } from "bun:test";

import {
  deriveHingeMatchConversationMetrics,
  deriveHingeProfileConversationMetrics,
  getInclusiveUtcCalendarDays,
  type HingeMetricMessage,
} from "./hinge-conversation-metrics";

function message(
  id: string,
  sentDate: string,
  order: number,
  messageType = "TEXT",
): HingeMetricMessage {
  return { id, sentDate: new Date(sentDate), order, messageType };
}

describe("Hinge conversation metrics", () => {
  it("uses the repair-compatible chronological ordering and units", () => {
    const metrics = deriveHingeMatchConversationMetrics([
      message("third", "2024-01-02T01:00:00.000Z", 2, "VOICE_NOTE"),
      message("first", "2024-01-01T00:00:00.000Z", 0),
      message("second", "2024-01-01T01:00:01.000Z", 1, "GIF"),
    ]);

    expect(metrics).toMatchObject({
      totalMessageCount: 3,
      textCount: 1,
      gifCount: 1,
      gestureCount: 0,
      otherMessageTypeCount: 1,
      responseTimeMedianSeconds: 45_000,
      conversationDurationDays: 1,
      longestGapHours: 23,
      messageImbalanceRatio: null,
      didMatchReply: null,
      lastMessageFrom: "USER",
    });
    expect(metrics.initialMessageAt?.toISOString()).toBe(
      "2024-01-01T00:00:00.000Z",
    );
    expect(metrics.lastMessageAt?.toISOString()).toBe(
      "2024-01-02T01:00:00.000Z",
    );
  });

  it("keeps empty match metrics nullable and excludes them from aggregates", () => {
    const oneMessage = [message("only", "2024-01-01T00:00:00.000Z", 0)];
    const threeMessages = [
      message("a", "2024-01-01T00:00:00.000Z", 0),
      message("b", "2024-01-01T00:00:01.000Z", 1),
      message("c", "2024-01-01T00:00:04.000Z", 2),
    ];

    expect(deriveHingeMatchConversationMetrics([])).toMatchObject({
      totalMessageCount: 0,
      responseTimeMedianSeconds: null,
      conversationDurationDays: null,
      longestGapHours: null,
      lastMessageFrom: null,
    });
    expect(
      deriveHingeProfileConversationMetrics([
        { messages: [] },
        { messages: oneMessage },
        { messages: threeMessages },
      ]),
    ).toEqual({
      conversationCount: 3,
      conversationsWithMessages: 2,
      ghostedCount: 1,
      averageResponseTimeSeconds: 2,
      meanResponseTimeSeconds: 2,
      medianConversationDurationDays: 0,
      longestConversationDays: 0,
      averageMessagesPerConversation: 2,
      medianMessagesPerConversation: 2,
    });
  });

  it("uses a message-weighted mean instead of averaging conversation medians", () => {
    const metrics = deriveHingeProfileConversationMetrics([
      {
        messages: [
          message("a", "2024-01-01T00:00:00.000Z", 0),
          message("b", "2024-01-01T00:00:10.000Z", 1),
          message("c", "2024-01-01T00:00:20.000Z", 2),
        ],
      },
      {
        messages: [
          message("d", "2024-01-01T00:00:00.000Z", 0),
          message("e", "2024-01-01T00:01:40.000Z", 1),
        ],
      },
    ]);

    expect(metrics.averageResponseTimeSeconds).toBe(55);
    expect(metrics.meanResponseTimeSeconds).toBe(40);
  });

  it("counts inclusive UTC calendar dates instead of elapsed 24-hour chunks", () => {
    expect(
      getInclusiveUtcCalendarDays(
        new Date("2024-01-01T23:30:00.000Z"),
        new Date("2024-01-02T00:15:00.000Z"),
      ),
    ).toBe(2);
    expect(
      getInclusiveUtcCalendarDays(
        new Date("2024-01-02T00:15:00.000Z"),
        new Date("2024-01-02T23:30:00.000Z"),
      ),
    ).toBe(1);
  });
});
