/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import type { TinderJsonMatch } from "@/lib/interfaces/TinderDataJSON";

import {
  computeTinderMatchDerivedMetrics,
  createMessagesAndMatches,
} from "./messages.service";

describe("Tinder message transformation", () => {
  test("sorts source rows without mutating them and derives nonnegative gaps", () => {
    const match: TinderJsonMatch = {
      match_id: "provider-match-1",
      messages: [
        {
          to: 1,
          from: "You",
          message: "third",
          sent_date: "2026-01-01T00:00:40.000Z",
          type: "sticker",
        },
        {
          to: 1,
          from: "You",
          message: "first",
          sent_date: "2026-01-01T00:00:00.000Z",
        },
        {
          to: 1,
          from: "You",
          message: "second",
          sent_date: "2026-01-01T00:00:10.000Z",
          type: "gesture",
        },
      ],
    };
    const originalOrder = match.messages.map((message) => message.sent_date);

    const { matchesInput, messagesInput } = createMessagesAndMatches(
      [match],
      "tinder-profile",
    );

    expect(match.messages.map((message) => message.sent_date)).toEqual(
      originalOrder,
    );
    expect(messagesInput.map((message) => message.contentRaw)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(messagesInput.map((message) => message.order)).toEqual([0, 1, 2]);
    expect(
      messagesInput.map((message) => message.timeSinceLastMessage),
    ).toEqual([0, 10, 30]);

    const metrics = matchesInput[0]!;
    expect(metrics.totalMessageCount).toBe(3);
    expect(metrics.initialMessageAt?.toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(metrics.lastMessageAt?.toISOString()).toBe(
      "2026-01-01T00:00:40.000Z",
    );
    expect(metrics.responseTimeMedianSeconds).toBe(20);
    expect(metrics.conversationDurationDays).toBe(0);
    expect(metrics.textCount).toBe(1);
    expect(metrics.gestureCount).toBe(1);
    expect(metrics.otherMessageTypeCount).toBe(1);
    expect(metrics.didMatchReply).toBeNull();
    expect(metrics.lastMessageFrom).toBe("USER");
  });

  test("uses the true median for an even number of message gaps", () => {
    const metrics = computeTinderMatchDerivedMetrics([
      { messageType: "TEXT", sentDate: new Date("2026-01-01T00:00:00Z") },
      { messageType: "TEXT", sentDate: new Date("2026-01-01T00:00:10Z") },
      { messageType: "TEXT", sentDate: new Date("2026-01-01T00:00:40Z") },
    ]);

    expect(metrics.responseTimeMedianSeconds).toBe(20);
  });

  test("rejects invalid timestamps before constructing database rows", () => {
    expect(() =>
      createMessagesAndMatches(
        [
          {
            match_id: "provider-match-invalid",
            messages: [
              {
                to: 1,
                from: "You",
                message: "hello",
                sent_date: "not-a-date",
              },
            ],
          },
        ],
        "tinder-profile",
      ),
    ).toThrow("Invalid Tinder message sent_date");
  });
});
