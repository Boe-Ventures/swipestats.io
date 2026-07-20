import { describe, expect, it } from "bun:test";

import type {
  HingeInteractionInsert,
  MatchInsert,
  MessageInsert,
} from "@/server/db/schema";
import {
  appendHingeCrossAccountMatchOrders,
  prepareHingeAdditiveRows,
} from "./hinge-additive-rows";

describe("appendHingeCrossAccountMatchOrders", () => {
  it("appends a new account after retained match display positions", () => {
    const incoming = [
      { id: "new-1", order: 0 },
      { id: "new-2", order: 1 },
    ];

    const appended = appendHingeCrossAccountMatchOrders([0, 2, 1], incoming);

    expect(appended).toEqual([
      { id: "new-1", order: 3 },
      { id: "new-2", order: 4 },
    ]);
    expect(incoming.map((match) => match.order)).toEqual([0, 1]);
  });
});

describe("prepareHingeAdditiveRows", () => {
  it("occurrence-aware relinks pending likes when the thread later matches", () => {
    const matchedAt = new Date("2025-02-01T00:00:00.000Z");
    const likedAt = new Date("2025-01-31T00:00:00.000Z");
    const existingLike = (id: string) => ({
      id,
      type: "LIKE_SENT" as const,
      timestamp: likedAt,
      matchId: null,
      comment: "same comment",
      threadOrigin: "OUTBOUND_LIKE" as const,
      threadState: "PENDING" as const,
    });
    const incomingLike = (id: string) =>
      ({
        id,
        type: "LIKE_SENT",
        timestamp: likedAt,
        timestampRaw: likedAt.toISOString(),
        matchId: "generated-match",
        comment: "same comment",
        hasComment: true,
        threadOrigin: "OUTBOUND_LIKE",
        threadState: "MATCHED",
        hingeProfileId: "profile",
      }) as HingeInteractionInsert;

    const prepared = prepareHingeAdditiveRows(
      new Map([
        [
          matchedAt.getTime(),
          [
            {
              id: "persisted-match",
              like: null,
              likedAt: null,
              weMet: null,
            },
          ],
        ],
      ]),
      [],
      [existingLike("pending-1"), existingLike("pending-2")],
      [
        {
          id: "generated-match",
          matchedAt,
        } as MatchInsert,
      ],
      [],
      [
        incomingLike("incoming-1"),
        incomingLike("incoming-2"),
        incomingLike("incoming-3"),
      ],
    );

    expect(
      prepared.interactionBackfills.map(({ id, row }) => ({
        id,
        matchId: row.matchId,
        state: row.threadState,
      })),
    ).toEqual([
      { id: "pending-1", matchId: "persisted-match", state: "MATCHED" },
      { id: "pending-2", matchId: "persisted-match", state: "MATCHED" },
    ]);
    expect(prepared.interactionsToInsert).toHaveLength(1);
    expect(prepared.interactionsToInsert[0]!.matchId).toBe("persisted-match");
  });

  it("keeps retained message order and cadence on a narrower reupload", () => {
    const firstAt = new Date("2025-03-01T00:00:00.000Z");
    const secondAt = new Date("2025-03-02T00:00:00.000Z");
    const prepared = prepareHingeAdditiveRows(
      new Map(),
      [
        {
          id: "retained-first",
          matchId: "persisted-match",
          sentDate: firstAt,
          messageType: "TEXT",
          contentRaw: "first",
          order: 0,
          timeSinceLastMessage: 0,
          timeSinceLastMessageRelative: null,
        },
        {
          id: "retained-second",
          matchId: "persisted-match",
          sentDate: secondAt,
          messageType: "TEXT",
          contentRaw: "second",
          order: 1,
          timeSinceLastMessage: 86_400,
          timeSinceLastMessageRelative: "1 day",
        },
      ],
      [],
      [],
      [
        {
          id: "incoming-second",
          matchId: "persisted-match",
          sentDate: secondAt,
          sentDateRaw: secondAt.toISOString(),
          messageType: "TEXT",
          contentRaw: "second",
          content: "second",
          charCount: 6,
          order: 0,
          timeSinceLastMessage: 0,
          timeSinceLastMessageRelative: null,
        } as MessageInsert,
      ],
      [],
    );

    expect(prepared.messageBackfills).toHaveLength(1);
    expect(prepared.messageBackfills[0]).toMatchObject({
      id: "retained-second",
      row: {
        order: 1,
        timeSinceLastMessage: 86_400,
        timeSinceLastMessageRelative: "1 day",
      },
    });
    expect(prepared.messageSequenceUpdates).toEqual([]);
  });

  it("does not downgrade origin or lifecycle state on a narrower reupload", () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const prepared = prepareHingeAdditiveRows(
      new Map(),
      [],
      [
        {
          id: "persisted-match-event",
          type: "MATCH",
          timestamp,
          matchId: "persisted-match",
          comment: null,
          threadOrigin: "OUTBOUND_LIKE",
          threadState: "UNMATCHED",
        },
      ],
      [],
      [],
      [
        {
          id: "generated-match-event",
          type: "MATCH",
          timestamp,
          timestampRaw: timestamp.toISOString(),
          matchId: "persisted-match",
          comment: null,
          hasComment: false,
          threadOrigin: "INBOUND_LIKE",
          threadState: "MATCHED",
          hingeProfileId: "profile",
        },
      ],
    );

    expect(prepared.interactionBackfills).toHaveLength(1);
    expect(prepared.interactionBackfills[0]!.row).toMatchObject({
      threadOrigin: "OUTBOUND_LIKE",
      threadState: "UNMATCHED",
    });
  });

  it("preserves multiplicity when matches and interactions share timestamps", () => {
    const timestamp = new Date("2024-01-01T00:00:00.000Z");
    const existingMatches = new Map([
      [
        timestamp.getTime(),
        [
          { id: "db-1", like: null, likedAt: null, weMet: null },
          { id: "db-2", like: null, likedAt: null, weMet: null },
        ],
      ],
    ]);
    const newMatches = [
      { id: "generated-1", matchedAt: timestamp, order: 0 },
      { id: "generated-2", matchedAt: timestamp, order: 1 },
    ] as MatchInsert[];
    const newMessages = [
      {
        id: "new-message-1",
        matchId: "generated-1",
        sentDate: timestamp,
        order: 0,
        messageType: "TEXT",
        contentRaw: "same message",
      },
      {
        id: "new-message-2",
        matchId: "generated-2",
        sentDate: timestamp,
        order: 0,
        messageType: "TEXT",
        contentRaw: "same message",
      },
    ] as MessageInsert[];
    const newInteractions = [
      {
        id: "new-interaction-1",
        type: "MATCH",
        timestamp,
        matchId: "generated-1",
      },
      {
        id: "new-interaction-2",
        type: "MATCH",
        timestamp,
        matchId: "generated-2",
      },
      {
        id: "new-interaction-3",
        type: "MATCH",
        timestamp,
        matchId: null,
      },
    ] as HingeInteractionInsert[];

    const prepared = prepareHingeAdditiveRows(
      existingMatches,
      [
        {
          id: "old-message-1",
          matchId: "db-1",
          sentDate: timestamp,
          messageType: "TEXT",
          contentRaw: "same message",
          order: 0,
        },
        {
          id: "old-message-2",
          matchId: "db-2",
          sentDate: timestamp,
          messageType: "TEXT",
          contentRaw: "same message",
          order: 0,
        },
      ],
      [
        {
          id: "old-interaction-1",
          type: "MATCH",
          timestamp,
          matchId: "db-1",
          comment: null,
        },
        {
          id: "old-interaction-2",
          type: "MATCH",
          timestamp,
          matchId: "db-2",
          comment: null,
        },
      ],
      newMatches,
      newMessages,
      newInteractions,
    );

    expect(prepared.matchesToInsert).toHaveLength(0);
    expect(prepared.matchBackfills.map((backfill) => backfill.id)).toEqual([
      "db-1",
      "db-2",
    ]);
    expect(prepared.messagesToInsert).toHaveLength(0);
    expect(
      prepared.messageBackfills.map((backfill) => backfill.row.matchId),
    ).toEqual(["db-1", "db-2"]);
    expect(prepared.interactionBackfills).toHaveLength(2);
    expect(
      prepared.interactionBackfills.map((backfill) => backfill.row.matchId),
    ).toEqual(["db-1", "db-2"]);
    expect(prepared.interactionsToInsert).toHaveLength(1);
    expect(existingMatches.get(timestamp.getTime())).toHaveLength(2);
  });

  it("does not collapse duplicate message occurrences into a Set", () => {
    const timestamp = new Date("2024-02-01T00:00:00.000Z");
    const message = {
      id: "new-message",
      matchId: "match-1",
      sentDate: timestamp,
      order: 0,
      messageType: "TEXT",
      contentRaw: "duplicate",
    } as MessageInsert;

    const prepared = prepareHingeAdditiveRows(
      new Map(),
      [
        {
          id: "old-message",
          matchId: "match-1",
          sentDate: timestamp,
          messageType: "TEXT",
          contentRaw: "duplicate",
          order: 0,
        },
      ],
      [],
      [],
      [message, { ...message, id: "new-message-2" }],
      [],
    );

    expect(prepared.messageBackfills).toHaveLength(1);
    expect(prepared.messagesToInsert).toHaveLength(1);
  });

  it("does not collapse distinct raw microsecond interaction events", () => {
    const storedDate = new Date("2024-02-01T00:00:00.243Z");
    const prepared = prepareHingeAdditiveRows(
      new Map(),
      [],
      [
        {
          id: "existing-like",
          type: "LIKE_SENT",
          timestamp: storedDate,
          timestampRaw: "2024-02-01 00:00:00.243522",
          matchId: null,
          comment: null,
        },
      ],
      [],
      [],
      [
        {
          id: "incoming-like",
          type: "LIKE_SENT",
          timestamp: storedDate,
          timestampRaw: "2024-02-01 00:00:00.243850",
          matchId: "match-1",
          comment: null,
          hasComment: false,
          hingeProfileId: "profile",
        },
      ],
    );

    expect(prepared.interactionBackfills).toEqual([]);
    expect(prepared.interactionsToInsert).toHaveLength(1);
  });

  it("does not collapse distinct raw microsecond message events", () => {
    const storedDate = new Date("2024-02-01T00:00:00.243Z");
    const prepared = prepareHingeAdditiveRows(
      new Map(),
      [
        {
          id: "existing-message",
          matchId: "match-1",
          sentDate: storedDate,
          sentDateRaw: "2024-02-01 00:00:00.243522",
          messageType: "TEXT",
          contentRaw: "same",
          order: 0,
        },
      ],
      [],
      [],
      [
        {
          id: "incoming-message",
          matchId: "match-1",
          sentDate: storedDate,
          sentDateRaw: "2024-02-01 00:00:00.243850",
          messageType: "TEXT",
          contentRaw: "same",
          order: 0,
        } as MessageInsert,
      ],
      [],
    );

    expect(prepared.messageBackfills).toEqual([]);
    expect(prepared.messagesToInsert).toHaveLength(1);
  });

  it("does not collapse distinct raw microsecond match events", () => {
    const storedDate = new Date("2024-02-01T00:00:00.243Z");
    const prepared = prepareHingeAdditiveRows(
      new Map([
        [
          "raw:2024-02-01 00:00:00.243522",
          [
            {
              id: "existing-match",
              like: null,
              likedAt: null,
              match: { timestamp: "2024-02-01 00:00:00.243522" },
              matchedAt: storedDate,
              weMet: null,
            },
          ],
        ],
      ]),
      [],
      [],
      [
        {
          id: "incoming-match",
          match: { timestamp: "2024-02-01 00:00:00.243850" },
          matchedAt: storedDate,
        } as MatchInsert,
      ],
      [],
      [],
    );

    expect(prepared.matchBackfills).toEqual([]);
    expect(prepared.matchesToInsert).toHaveLength(1);
  });

  it("matches the message multiset when a later export shifts source order", () => {
    const existing = [
      {
        id: "old-a",
        matchId: "match-1",
        sentDate: new Date("2024-03-02T00:00:00.000Z"),
        messageType: "TEXT" as const,
        contentRaw: "A",
        order: 0,
      },
      {
        id: "old-b",
        matchId: "match-1",
        sentDate: new Date("2024-03-03T00:00:00.000Z"),
        messageType: "TEXT" as const,
        contentRaw: "B",
        order: 1,
      },
    ];
    const newMessages = [
      {
        id: "new-c",
        matchId: "match-1",
        sentDate: new Date("2024-03-01T00:00:00.000Z"),
        order: 0,
        messageType: "TEXT",
        contentRaw: "C",
      },
      {
        id: "new-a",
        matchId: "match-1",
        sentDate: new Date("2024-03-02T00:00:00.000Z"),
        order: 1,
        messageType: "TEXT",
        contentRaw: "A",
      },
      {
        id: "new-b",
        matchId: "match-1",
        sentDate: new Date("2024-03-03T00:00:00.000Z"),
        order: 2,
        messageType: "TEXT",
        contentRaw: "B",
      },
    ] as MessageInsert[];

    const prepared = prepareHingeAdditiveRows(
      new Map(),
      existing,
      [],
      [],
      newMessages,
      [],
    );

    expect(
      prepared.messagesToInsert.map((message) => message.contentRaw),
    ).toEqual(["C"]);
    expect(
      prepared.messageBackfills.map(({ id, row }) => [
        id,
        row.order,
        row.timeSinceLastMessage,
      ]),
    ).toEqual([
      ["old-a", 1, 86_400],
      ["old-b", 2, 86_400],
    ]);
    expect(prepared.messagesToInsert[0]).toMatchObject({
      contentRaw: "C",
      order: 0,
      timeSinceLastMessage: 0,
      timeSinceLastMessageRelative: null,
    });
  });

  it("derives an existing match from retained and incoming messages together", () => {
    const matchedAt = new Date("2024-04-01T00:00:00.000Z");
    const retainedAt = new Date("2024-04-02T00:00:00.000Z");
    const incomingAt = new Date("2024-04-03T00:00:00.000Z");
    const generatedMatchId = "generated-match";

    const prepared = prepareHingeAdditiveRows(
      new Map([
        [
          matchedAt.getTime(),
          [
            {
              id: "persisted-match",
              like: null,
              likedAt: null,
              weMet: null,
            },
          ],
        ],
      ]),
      [
        {
          id: "retained-message",
          matchId: "persisted-match",
          sentDate: retainedAt,
          messageType: "TEXT",
          contentRaw: "retained",
          order: 0,
        },
      ],
      [],
      [
        {
          id: generatedMatchId,
          matchedAt,
          totalMessageCount: 1,
        } as MatchInsert,
      ],
      [
        {
          id: "incoming-message",
          matchId: generatedMatchId,
          sentDate: incomingAt,
          messageType: "TEXT",
          contentRaw: "incoming",
          order: 0,
        } as MessageInsert,
      ],
      [],
    );

    expect(prepared.messagesToInsert).toHaveLength(1);
    expect(prepared.matchBackfills[0]?.row).toMatchObject({
      totalMessageCount: 2,
      initialMessageAt: retainedAt,
      lastMessageAt: incomingAt,
      responseTimeMedianSeconds: 86_400,
      conversationDurationDays: 1,
    });
  });

  it("preserves optional evidence across a narrower later export", () => {
    const matchedAt = new Date("2024-05-01T00:00:00.000Z");
    const likedAt = new Date("2024-04-30T00:00:00.000Z");
    const existingLike = {
      timestamp: likedAt.toISOString(),
      comment: "first observed",
    };
    const existingWeMet = { did_meet_subject: "Yes" };

    const prepared = prepareHingeAdditiveRows(
      new Map([
        [
          matchedAt.getTime(),
          [
            {
              id: "persisted-match",
              like: existingLike,
              likedAt,
              weMet: existingWeMet,
            },
          ],
        ],
      ]),
      [],
      [],
      [
        {
          id: "generated-match",
          matchedAt,
          like: null,
          likedAt: null,
          weMet: null,
        } as MatchInsert,
      ],
      [],
      [],
    );

    expect(prepared.matchBackfills[0]?.row).toMatchObject({
      like: existingLike,
      likedAt,
      weMet: existingWeMet,
    });
    expect(prepared.matchEvidenceConflicts).toEqual([]);
  });

  it("keeps first non-null evidence and reports later conflicts", () => {
    const matchedAt = new Date("2024-06-01T00:00:00.000Z");
    const prepared = prepareHingeAdditiveRows(
      new Map([
        [
          matchedAt.getTime(),
          [
            {
              id: "persisted-match",
              like: { timestamp: "2024-05-30", comment: "old" },
              likedAt: new Date("2024-05-30T00:00:00.000Z"),
              weMet: { did_meet_subject: "No" },
            },
          ],
        ],
      ]),
      [],
      [],
      [
        {
          id: "generated-match",
          matchedAt,
          like: { timestamp: "2024-05-31", comment: "new" },
          likedAt: new Date("2024-05-31T00:00:00.000Z"),
          weMet: { did_meet_subject: "Yes" },
        } as MatchInsert,
      ],
      [],
      [],
    );

    expect(prepared.matchBackfills[0]?.row.like).toEqual({
      timestamp: "2024-05-30",
      comment: "old",
    });
    expect(prepared.matchEvidenceConflicts).toEqual([
      { matchId: "persisted-match", field: "like" },
      { matchId: "persisted-match", field: "weMet" },
    ]);
  });
});
