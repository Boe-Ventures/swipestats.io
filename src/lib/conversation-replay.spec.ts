import { describe, expect, test } from "bun:test";

import { buildConversationReplay } from "./conversation-replay";

const at = (value: string) => new Date(value);

describe("buildConversationReplay", () => {
  test("finds explainable highlights from outgoing message activity", () => {
    const replay = buildConversationReplay([
      {
        id: "short",
        order: 1,
        messages: [
          {
            sentDate: at("2025-01-01T12:00:00Z"),
            content: "Hi",
            charCount: 2,
          },
        ],
      },
      {
        id: "busy",
        order: 2,
        messages: Array.from({ length: 6 }, (_, index) => ({
          sentDate: at(`2025-01-02T1${index}:00:00Z`),
          content: index === 0 ? "How is your week?" : `Message ${index}`,
          charCount: index === 0 ? 17 : 9,
        })),
      },
      {
        id: "revisited",
        order: 3,
        messages: [
          {
            sentDate: at("2025-01-03T12:00:00Z"),
            content: "Hello?",
            charCount: 6,
          },
          {
            sentDate: at("2025-01-06T12:00:00Z"),
            content: "Still around",
            charCount: 12,
          },
        ],
      },
    ]);

    expect(replay.highlights.mostMessages?.matchId).toBe("busy");
    expect(replay.highlights.mostMessages?.matchOrder).toBe(3);
    expect(replay.highlights.longestRunning?.matchId).toBe("revisited");
    expect(replay.highlights.mostRevisited?.matchId).toBe("revisited");
    expect(replay.highlights.longestRunning?.durationDays).toBe(3);
    expect(replay.sustainedConversationCount).toBe(2);
  });

  test("compares question and length patterns without labeling success", () => {
    const replay = buildConversationReplay([
      {
        id: "one",
        order: 1,
        messages: [
          {
            sentDate: at("2025-01-01T12:00:00Z"),
            content: "Hey",
            charCount: 3,
          },
        ],
      },
      {
        id: "sustained",
        order: 2,
        messages: Array.from({ length: 5 }, (_, index) => ({
          sentDate: at(`2025-01-02T1${index}:00:00Z`),
          content: index === 0 ? "What are you reading?" : "Nice",
          charCount: index === 0 ? 21 : 4,
        })),
      },
    ]);

    expect(replay.openerComparison).toEqual({
      sustained: { sampleSize: 1, questionRate: 100, averageLength: 21 },
      oneMessage: { sampleSize: 1, questionRate: 0, averageLength: 3 },
    });
  });

  test("returns no comparison unless both groups have text openers", () => {
    const replay = buildConversationReplay([
      {
        id: "only",
        order: 1,
        messages: [
          {
            sentDate: at("2025-01-01T12:00:00Z"),
            content: "Hello",
            charCount: 5,
          },
        ],
      },
    ]);

    expect(replay.openerComparison).toBeNull();
  });
});
