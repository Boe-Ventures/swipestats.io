import { describe, expect, it } from "bun:test";

import {
  formatMessageAverage,
  formatRecordRate,
  formatSendingGap,
  getTinderMessageUiMetrics,
} from "./tinder-message-ui-metrics";

describe("Tinder message UI metrics", () => {
  it("keeps an absent message-derived average unavailable", () => {
    const metrics = getTinderMessageUiMetrics({
      conversationCount: 4,
      conversationsWithMessages: 2,
      averageMessagesPerConversation: null,
      medianMessagesPerConversation: null,
    });

    // A separate Usage.messages_sent total must never be substituted here.
    expect(formatMessageAverage(metrics.averageMessagesPerMessagedRecord)).toBe(
      "Unavailable",
    );
  });

  it("formats the average computed from retained message rows", () => {
    const metrics = getTinderMessageUiMetrics({
      conversationCount: 5,
      conversationsWithMessages: 3,
      averageMessagesPerConversation: 7 / 3,
      medianMessagesPerConversation: 2,
    });

    expect(formatMessageAverage(metrics.averageMessagesPerMessagedRecord)).toBe(
      "2.3",
    );
    expect(metrics.medianMessagesPerMessagedRecord).toBe(2);
  });

  it("uses conversation records as the coverage denominator", () => {
    const metrics = getTinderMessageUiMetrics({
      conversationCount: 5,
      conversationsWithMessages: 2,
      averageMessagesPerConversation: 3,
      medianMessagesPerConversation: 3,
    });

    expect(formatRecordRate(metrics.messagedRecordRate)).toBe("40%");
    expect(metrics.recordsWithoutMessages).toBe(3);
    expect(formatRecordRate(metrics.recordsWithoutMessagesRate)).toBe("60%");
  });

  it("does not invent a zero-percent rate when no records are present", () => {
    const metrics = getTinderMessageUiMetrics({
      conversationCount: 0,
      conversationsWithMessages: 0,
      averageMessagesPerConversation: null,
      medianMessagesPerConversation: null,
    });

    expect(formatRecordRate(metrics.messagedRecordRate)).toBe("Unavailable");
    expect(formatRecordRate(metrics.recordsWithoutMessagesRate)).toBe(
      "Unavailable",
    );
  });

  it("preserves a valid zero-second outgoing-message gap", () => {
    expect(formatSendingGap(0)).toBe("0s");
    expect(formatSendingGap(null)).toBeNull();
  });
});
