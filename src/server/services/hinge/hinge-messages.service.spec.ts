import { describe, expect, it } from "bun:test";

import type { ConversationThread } from "@/lib/interfaces/HingeDataJSON";
import { createHingeMessagesAndMatches } from "./hinge-messages.service";

describe("createHingeMessagesAndMatches", () => {
  it("preserves repeated likes and derives message metrics chronologically", () => {
    const conversations: ConversationThread[] = [
      {
        like: [
          {
            timestamp: "2024-01-01T10:00:00.000Z",
            like: [{ timestamp: "2024-01-01T10:00:00.000Z", comment: "first" }],
          },
          {
            timestamp: "2024-01-03T10:00:00.000Z",
            like: [
              { timestamp: "2024-01-03T10:00:00.000Z", comment: "latest" },
            ],
          },
        ],
        match: [{ timestamp: "2024-01-04T10:00:00.000Z" }],
        chats: [
          {
            timestamp: "2024-01-06T10:00:00.000Z",
            body: "second",
          },
          {
            timestamp: "2024-01-05T10:00:00.000Z",
            body: "first",
          },
          {
            timestamp: "2024-01-07T10:00:00.000Z",
            body: "",
          },
        ],
      },
    ];

    const result = createHingeMessagesAndMatches(conversations, "hinge-id");
    const match = result.matchesInput[0]!;
    const likes = result.interactionsInput.filter(
      (interaction) => interaction.type === "LIKE_SENT",
    );

    expect(likes).toHaveLength(2);
    expect(result.matchesInput).toHaveLength(1);
    expect(result.messagesInput).toHaveLength(2);
    expect(match.totalMessageCount).toBe(2);
    expect(match.textCount).toBe(2);
    expect(match.otherMessageTypeCount).toBe(0);
    expect(match.likedAt?.toISOString()).toBe("2024-01-03T10:00:00.000Z");
    expect(match.like).toEqual({
      timestamp: "2024-01-03T10:00:00.000Z",
      comment: "latest",
    });
    expect(match.initialMessageAt?.toISOString()).toBe(
      "2024-01-05T10:00:00.000Z",
    );
    expect(match.lastMessageAt?.toISOString()).toBe("2024-01-06T10:00:00.000Z");
    expect(match).toMatchObject({
      responseTimeMedianSeconds: 86_400,
      conversationDurationDays: 1,
      longestGapHours: 24,
      messageImbalanceRatio: null,
      didMatchReply: null,
      lastMessageFrom: "USER",
    });
    expect(result.messagesInput.map((message) => message.content)).toEqual([
      "first",
      "second",
    ]);
    expect(result.messagesInput.map((message) => message.order)).toEqual([
      1, 0,
    ]);
    expect(
      result.messagesInput.map((message) => message.timeSinceLastMessage),
    ).toEqual([0, 86_400]);
  });

  it("stores an empty chat with a matching voice-note sidecar as a voice note", () => {
    const timestamp = "2024-02-02T10:00:00.000Z";
    const result = createHingeMessagesAndMatches(
      [
        {
          match: [{ timestamp: "2024-02-01T10:00:00.000Z" }],
          chats: [{ timestamp, body: "" }],
          voice_notes: [{ timestamp, url: "https://example.com/voice" }],
        },
      ],
      "hinge-id",
    );

    expect(result.messagesInput).toHaveLength(1);
    expect(result.messagesInput[0]).toMatchObject({
      content: "[Voice Note]",
      messageType: "VOICE_NOTE",
      type: "voice_note",
      gifUrl: "https://example.com/voice",
    });
    expect(result.matchesInput[0]).toMatchObject({
      totalMessageCount: 1,
      textCount: 0,
      otherMessageTypeCount: 1,
      responseTimeMedianSeconds: null,
      conversationDurationDays: 0,
      longestGapHours: null,
      lastMessageFrom: "USER",
    });
  });

  it("stores a standalone voice-note sidecar exactly once", () => {
    const timestamp = "2024-02-03T10:00:00.000Z";
    const result = createHingeMessagesAndMatches(
      [
        {
          match: [{ timestamp: "2024-02-01T10:00:00.000Z" }],
          voice_notes: [{ timestamp, url: "https://example.com/standalone" }],
        },
      ],
      "hinge-id",
    );

    expect(result.messagesInput).toHaveLength(1);
    expect(result.messagesInput[0]).toMatchObject({
      sentDateRaw: timestamp,
      content: "[Voice Note]",
      messageType: "VOICE_NOTE",
      gifUrl: "https://example.com/standalone",
    });
    expect(result.matchesInput[0]?.totalMessageCount).toBe(1);
    expect(
      result.interactionsInput.find(
        (interaction) => interaction.type === "MESSAGE_SENT",
      )?.threadState,
    ).toBe("MESSAGED");
  });

  it("quarantines chats without a match instead of silently dropping them", () => {
    expect(() =>
      createHingeMessagesAndMatches(
        [
          {
            chats: [{ timestamp: "2024-03-01T10:00:00.000Z", body: "orphan" }],
          },
        ],
        "hinge-id",
      ),
    ).toThrow("contains messages without a match event");
  });

  it("does not treat a post-match like as the cause of the match", () => {
    const result = createHingeMessagesAndMatches(
      [
        {
          match: [{ timestamp: "2024-04-01T10:00:00.000Z" }],
          like: [
            {
              timestamp: "2024-04-02T10:00:00.000Z",
              like: [
                {
                  timestamp: "2024-04-02T10:00:00.000Z",
                  comment: "later like",
                },
              ],
            },
          ],
        },
      ],
      "hinge-id",
    );

    expect(result.matchesInput[0]).toMatchObject({
      like: null,
      likedAt: null,
    });
    expect(
      result.interactionsInput.find(
        (interaction) => interaction.type === "MATCH",
      ),
    ).toMatchObject({ threadOrigin: "UNKNOWN" });
    expect(
      result.interactionsInput.find(
        (interaction) => interaction.type === "LIKE_SENT",
      ),
    ).toMatchObject({ threadOrigin: "UNKNOWN" });
  });

  it("uses raw microseconds for match-cause and message chronology", () => {
    const result = createHingeMessagesAndMatches(
      [
        {
          like: [
            {
              timestamp: "2024-04-01 10:00:00.243850",
              like: [
                {
                  timestamp: "2024-04-01 10:00:00.243850",
                  comment: "after",
                },
              ],
            },
            {
              timestamp: "2024-04-01 10:00:00.243522",
              like: [
                {
                  timestamp: "2024-04-01 10:00:00.243522",
                  comment: "before",
                },
              ],
            },
          ],
          match: [{ timestamp: "2024-04-01 10:00:00.243700" }],
          chats: [
            { timestamp: "2024-04-02 10:00:00.243850", body: "later" },
            { timestamp: "2024-04-02 10:00:00.243522", body: "earlier" },
          ],
        },
      ],
      "hinge-id",
    );

    expect(result.matchesInput[0]?.like).toEqual({
      timestamp: "2024-04-01 10:00:00.243522",
      comment: "before",
    });
    expect(result.matchesInput[0]?.matchedAt?.toISOString()).toBe(
      "2024-04-01T10:00:00.243Z",
    );
    expect(result.messagesInput.map((message) => message.content)).toEqual([
      "earlier",
      "later",
    ]);
  });

  it("classifies a pre-match block as a reject, not an unmatch", () => {
    const result = createHingeMessagesAndMatches(
      [
        {
          block: [
            {
              block_type: "remove",
              timestamp: "2024-04-01T10:00:00.000Z",
            },
          ],
          like: [
            {
              timestamp: "2024-04-02T10:00:00.000Z",
              like: [],
            },
          ],
          match: [{ timestamp: "2024-04-03T10:00:00.000Z" }],
        },
      ],
      "hinge-id",
    );

    const block = result.interactionsInput.find(
      (interaction) => interaction.timestampRaw === "2024-04-01T10:00:00.000Z",
    );
    expect(block).toMatchObject({
      type: "REJECT",
      matchId: null,
      threadState: "MATCHED",
    });
  });
});
