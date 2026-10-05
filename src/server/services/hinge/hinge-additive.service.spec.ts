import { describe, expect, it } from "bun:test";
import type { MatchInsert, MessageInsert } from "@/server/db/schema";
import { prepareHingeAdditiveRows } from "./hinge-additive-rows";
describe("prepareHingeAdditiveRows", () => {
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
          timeSinceLastMessage: 86400,
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
        timeSinceLastMessage: 86400,
        timeSinceLastMessageRelative: "1 day",
      },
    });
    expect(prepared.messageSequenceUpdates).toEqual([]);
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
});
