/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import type {
  MatchInsert,
  MediaInsert,
  Message,
  MessageInsert,
  TinderUsage,
  TinderUsageInsert,
} from "@/server/db/schema";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  mergeTinderUsageRow,
  planTinderMediaReconciliation,
  planTinderUsageReconciliation,
  reconcileTinderCreateDateSnapshot,
  reconcileTinderMatches,
} = await import("./additive.service");

const allUsageMetricsPresent = {
  swipeLikes: true,
  swipePasses: true,
  superLikes: true,
  matches: true,
  messagesSent: true,
  messagesReceived: true,
};

describe("reconcileTinderCreateDateSnapshot", () => {
  test("does not replace a provider signup with inferred usage", () => {
    const providerDate = new Date("2025-01-01T12:00:00.000Z");

    expect(
      reconcileTinderCreateDateSnapshot(
        { createDate: providerDate, createDateSource: "PROVIDER" },
        {
          createDate: new Date("2024-12-01T00:00:00.000Z"),
          createDateSource: "INFERRED_FROM_USAGE",
        },
      ),
    ).toEqual({ createDate: providerDate, createDateSource: "PROVIDER" });
  });

  test("allows stronger provider evidence and broader inferred history", () => {
    const provider = {
      createDate: new Date("2025-01-01T12:00:00.000Z"),
      createDateSource: "PROVIDER" as const,
    };
    expect(
      reconcileTinderCreateDateSnapshot(
        {
          createDate: new Date("2025-02-01T00:00:00.000Z"),
          createDateSource: "INFERRED_FROM_USAGE",
        },
        provider,
      ),
    ).toEqual(provider);

    const broaderHistory = {
      createDate: new Date("2024-12-01T00:00:00.000Z"),
      createDateSource: "INFERRED_FROM_USAGE" as const,
    };
    expect(
      reconcileTinderCreateDateSnapshot(
        {
          createDate: new Date("2025-02-01T00:00:00.000Z"),
          createDateSource: "INFERRED_FROM_USAGE",
        },
        broaderHistory,
      ),
    ).toEqual(broaderHistory);
  });

  test("preserves legacy unknown provenance against weaker inference", () => {
    const legacy = {
      createDate: new Date("2025-01-01T12:00:00.000Z"),
      createDateSource: null,
    };

    expect(
      reconcileTinderCreateDateSnapshot(legacy, {
        createDate: new Date("2024-12-01T00:00:00.000Z"),
        createDateSource: "INFERRED_FROM_USAGE",
      }),
    ).toEqual(legacy);
  });
});

function usageRow(
  rawDate: string,
  overrides: Partial<TinderUsageInsert> = {},
): TinderUsageInsert {
  return {
    tinderProfileId: "profile",
    dateStamp: new Date(`${rawDate.slice(0, 10)}T00:00:00.000Z`),
    dateStampRaw: rawDate,
    appOpens: 4,
    swipeLikes: 6,
    swipePasses: 8,
    swipeSuperLikes: 1,
    matches: 2,
    messagesSent: 5,
    messagesReceived: 4,
    swipesCombined: 14,
    matchRate: 2 / 6,
    likeRate: 6 / 14,
    messagesSentRate: 5 / 9,
    responseRate: 5 / 4,
    engagementRate: 19 / 4,
    userAgeThisDay: 25,
    ...overrides,
  };
}

function media(id: string, url: string): MediaInsert {
  return {
    id,
    type: "photo",
    prompt: null,
    caption: null,
    url,
    originalUrl: null,
    fromSoMe: null,
    tinderProfileId: "profile",
    hingeProfileId: null,
  };
}

function newMessage(params: {
  id: string;
  matchId: string;
  at: string;
  content?: string;
  to?: number;
}): MessageInsert {
  const content = params.content ?? "hello";
  return {
    id: params.id,
    matchId: params.matchId,
    tinderProfileId: "profile",
    hingeProfileId: null,
    to: params.to ?? 1,
    sentDate: new Date(params.at),
    sentDateRaw: params.at,
    content,
    contentRaw: content,
    charCount: content.length,
    messageType: "TEXT",
    type: null,
    gifUrl: null,
    order: 0,
    language: null,
    timeSinceLastMessage: 0,
    timeSinceLastMessageRelative: null,
    emotionScore: null,
    contentSanitized: null,
  };
}

function existingMessage(params: {
  id: string;
  matchId: string;
  at: string;
  content?: string;
  to?: number;
}): Message {
  return newMessage(params) as Message;
}

function newMatch(id: string, tinderMatchId: string): MatchInsert {
  return {
    id,
    tinderMatchId,
    tinderProfileId: "profile",
    hingeProfileId: null,
    order: 0,
    totalMessageCount: 0,
    textCount: 0,
    gifCount: 0,
    gestureCount: 0,
    otherMessageTypeCount: 0,
    primaryLanguage: null,
    languages: [],
    initialMessageAt: null,
    lastMessageAt: null,
    engagementScore: null,
    responseTimeMedianSeconds: null,
    conversationDurationDays: null,
    messageImbalanceRatio: null,
    longestGapHours: null,
    didMatchReply: null,
    lastMessageFrom: null,
    weMet: null,
    like: null,
    match: null,
    likedAt: null,
    matchedAt: null,
  };
}

describe("reconcileTinderMatches", () => {
  test("ignores provider match-reference reindexing when deduplicating", () => {
    const generatedMatch = newMatch("generated-match", "provider-match");
    const original = existingMessage({
      id: "existing-message",
      matchId: "existing-match",
      at: "2026-01-01T00:00:00.000Z",
      to: 3,
    });
    const reindexed = newMessage({
      id: "generated-message",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:00.000Z",
      to: 9,
    });

    const result = reconcileTinderMatches(
      [
        {
          id: "existing-match",
          tinderMatchId: "provider-match",
          order: 0,
          messages: [original],
        },
      ],
      [generatedMatch],
      [reindexed],
    );

    expect(result.messagesToInsert).toEqual([]);
    expect(result.matchesToUpdate).toEqual([]);
  });

  test("adds newly exported messages to an existing provider match", () => {
    const generatedMatch = newMatch("generated-match", "provider-match");
    const original = existingMessage({
      id: "existing-message",
      matchId: "existing-match",
      at: "2026-01-01T00:00:00.000Z",
      content: "first",
    });
    const exportedOriginal = newMessage({
      id: "generated-original",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:00.000Z",
      content: "first",
    });
    const exportedNew = newMessage({
      id: "generated-new",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:10.000Z",
      content: "second",
    });

    const result = reconcileTinderMatches(
      [
        {
          id: "existing-match",
          tinderMatchId: "provider-match",
          order: 0,
          messages: [original],
        },
      ],
      [generatedMatch],
      [exportedOriginal, exportedNew],
    );

    expect(result.matchesToInsert).toEqual([]);
    expect(result.messagesToInsert).toHaveLength(1);
    expect(result.messagesToInsert[0]?.contentRaw).toBe("second");
    expect(result.messagesToInsert[0]?.matchId).toBe("existing-match");
    expect(result.matchesToUpdate[0]?.metrics.totalMessageCount).toBe(2);
    expect(
      result.matchesToUpdate[0]?.metrics.initialMessageAt?.toISOString(),
    ).toBe("2026-01-01T00:00:00.000Z");
    expect(
      result.matchesToUpdate[0]?.metrics.lastMessageAt?.toISOString(),
    ).toBe("2026-01-01T00:00:10.000Z");
  });

  test("is idempotent and never deletes rows absent from a later export", () => {
    const generatedMatch = newMatch("generated-match", "provider-match");
    const original = existingMessage({
      id: "existing-original",
      matchId: "existing-match",
      at: "2026-01-01T00:00:00.000Z",
      content: "first",
    });
    const retainedOnlyInDatabase = existingMessage({
      id: "existing-later",
      matchId: "existing-match",
      at: "2026-01-02T00:00:00.000Z",
      content: "later",
    });
    const exportedOriginal = newMessage({
      id: "generated-original",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:00.000Z",
      content: "first",
    });

    const result = reconcileTinderMatches(
      [
        {
          id: "existing-match",
          tinderMatchId: "provider-match",
          order: 0,
          messages: [original, retainedOnlyInDatabase],
        },
      ],
      [generatedMatch],
      [exportedOriginal],
    );

    expect(result).toEqual({
      matchesToInsert: [],
      messagesToInsert: [],
      matchesToUpdate: [],
      messagesToUpdate: [],
    });
  });

  test("resequences stored rows when an older message appears later", () => {
    const generatedMatch = newMatch("generated-match", "provider-match");
    const existing = existingMessage({
      id: "existing-message",
      matchId: "existing-match",
      at: "2026-01-01T00:00:10.000Z",
      content: "later",
    });
    const exportedExisting = newMessage({
      id: "generated-existing",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:10.000Z",
      content: "later",
    });
    const exportedEarlier = newMessage({
      id: "generated-earlier",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:00.000Z",
      content: "earlier",
    });

    const result = reconcileTinderMatches(
      [
        {
          id: "existing-match",
          tinderMatchId: "provider-match",
          order: 0,
          messages: [existing],
        },
      ],
      [generatedMatch],
      [exportedEarlier, exportedExisting],
    );

    expect(result.messagesToInsert[0]?.order).toBe(0);
    expect(result.messagesToInsert[0]?.timeSinceLastMessage).toBe(0);
    expect(result.messagesToUpdate).toEqual([
      {
        id: "existing-message",
        metrics: {
          order: 1,
          timeSinceLastMessage: 10,
          timeSinceLastMessageRelative: "less than a minute",
        },
      },
    ]);
  });

  test("preserves the multiplicity of identical message occurrences", () => {
    const generatedMatch = newMatch("generated-match", "provider-match");
    const existing = existingMessage({
      id: "existing-message",
      matchId: "existing-match",
      at: "2026-01-01T00:00:00.000Z",
    });
    const occurrenceOne = newMessage({
      id: "generated-one",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:00.000Z",
    });
    const occurrenceTwo = newMessage({
      id: "generated-two",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:00.000Z",
    });

    const result = reconcileTinderMatches(
      [
        {
          id: "existing-match",
          tinderMatchId: "provider-match",
          order: 0,
          messages: [existing],
        },
      ],
      [generatedMatch],
      [occurrenceOne, occurrenceTwo],
    );

    expect(result.messagesToInsert).toHaveLength(1);
    expect(result.matchesToUpdate[0]?.metrics.totalMessageCount).toBe(2);
  });

  test("inserts every row for a genuinely new provider match", () => {
    const generatedMatch = newMatch("generated-match", "new-provider-match");
    const message = newMessage({
      id: "generated-message",
      matchId: generatedMatch.id,
      at: "2026-01-01T00:00:00.000Z",
    });

    const result = reconcileTinderMatches([], [generatedMatch], [message]);

    expect(result.matchesToInsert).toEqual([generatedMatch]);
    expect(result.messagesToInsert).toEqual([message]);
    expect(result.matchesToUpdate).toEqual([]);
    expect(result.messagesToUpdate).toEqual([]);
  });

  test("appends new match records after the highest retained order", () => {
    const generatedMatch = newMatch("generated-match", "new-provider-match");

    const result = reconcileTinderMatches(
      [
        {
          id: "existing-match",
          tinderMatchId: "existing-provider-match",
          order: 7,
          messages: [],
        },
      ],
      [generatedMatch],
      [],
    );

    expect(result.matchesToInsert[0]?.order).toBe(8);
  });
});

describe("mergeTinderUsageRow", () => {
  test("preserves existing categories omitted from an additive export", () => {
    const incoming: TinderUsageInsert = {
      tinderProfileId: "profile",
      dateStamp: new Date("2026-01-01T00:00:00.000Z"),
      dateStampRaw: "2026-01-01",
      appOpens: 4,
      swipeLikes: 0,
      swipePasses: 8,
      swipeSuperLikes: 0,
      matches: 0,
      messagesSent: 0,
      messagesReceived: 0,
      swipesCombined: 8,
      matchRate: 0,
      likeRate: 0,
      messagesSentRate: 0,
      responseRate: 0,
      engagementRate: 2,
      userAgeThisDay: 25,
    };
    const existing = {
      ...incoming,
      swipeLikes: 6,
      swipePasses: 3,
      matches: 2,
      messagesSent: 5,
      messagesReceived: 4,
    } as TinderUsage;

    const merged = mergeTinderUsageRow(existing, incoming, {
      swipeLikes: false,
      swipePasses: true,
      superLikes: false,
      matches: false,
      messagesSent: false,
      messagesReceived: false,
    });

    expect(merged.appOpens).toBe(4);
    expect(merged.swipeLikes).toBe(6);
    expect(merged.swipePasses).toBe(8);
    expect(merged.matches).toBe(2);
    expect(merged.messagesSent).toBe(5);
    expect(merged.messagesReceived).toBe(4);
    expect(merged.swipesCombined).toBe(14);
    expect(merged.matchRate).toBeCloseTo(2 / 6);
    expect(merged.likeRate).toBeCloseTo(6 / 14);
    expect(merged.messagesSentRate).toBeCloseTo(5 / 9);
    expect(merged.responseRate).toBeCloseTo(5 / 4);
    expect(merged.engagementRate).toBeCloseTo(19 / 4);
  });

  test("rejects a combined-swipe overflow created across export vintages", () => {
    const incoming = usageRow("2026-01-01", {
      swipeLikes: 0,
      swipePasses: 1,
      swipesCombined: 1,
    });
    const existing = usageRow("2026-01-01", {
      swipeLikes: 2_147_483_647,
      swipePasses: 0,
      swipesCombined: 2_147_483_647,
    }) as TinderUsage;

    expect(() =>
      mergeTinderUsageRow(existing, incoming, {
        ...allUsageMetricsPresent,
        swipeLikes: false,
      }),
    ).toThrow(
      "Merged Tinder likes plus passes exceed the database integer range.",
    );
  });
});

describe("planTinderUsageReconciliation", () => {
  test("preserves omitted metrics from a touched legacy date key", () => {
    const existing = usageRow("2026-01-01T00:00:00.000Z", {
      swipeLikes: 11,
      matches: 3,
    }) as TinderUsage;
    const incoming = usageRow("2026-01-01", {
      swipeLikes: 0,
      swipePasses: 20,
      matches: 0,
    });

    const result = planTinderUsageReconciliation([existing], [incoming], {
      ...allUsageMetricsPresent,
      swipeLikes: false,
      matches: false,
    });

    expect(result.legacyDateKeysToDelete).toEqual(["2026-01-01T00:00:00.000Z"]);
    expect(result.rowsToUpsert).toHaveLength(1);
    expect(result.rowsToUpsert[0]?.dateStampRaw).toBe("2026-01-01");
    expect(result.rowsToUpsert[0]?.swipeLikes).toBe(11);
    expect(result.rowsToUpsert[0]?.swipePasses).toBe(20);
    expect(result.rowsToUpsert[0]?.matches).toBe(3);
    expect(result.rowsToUpsert[0]?.matchRate).toBeCloseTo(3 / 11);
  });

  test("replaces a present metric on a touched legacy date key", () => {
    const existing = usageRow("2026-01-01T00:00:00.000Z", {
      swipeLikes: 11,
    }) as TinderUsage;
    const incoming = usageRow("2026-01-01", { swipeLikes: 4 });

    const result = planTinderUsageReconciliation(
      [existing],
      [incoming],
      allUsageMetricsPresent,
    );

    expect(result.rowsToUpsert[0]?.swipeLikes).toBe(4);
    expect(result.rowsToUpsert[0]?.likeRate).toBeCloseTo(4 / 12);
  });

  test("fails before mutation when stored raw keys collide canonically", () => {
    const legacy = usageRow("2026-01-01T00:00:00.000Z") as TinderUsage;
    const canonical = usageRow("2026-01-01") as TinderUsage;
    const incoming = usageRow("2026-01-01");

    expect(() =>
      planTinderUsageReconciliation(
        [legacy, canonical],
        [incoming],
        allUsageMetricsPresent,
      ),
    ).toThrow(
      "Multiple stored Tinder usage keys resolve to 2026-01-01: 2026-01-01, 2026-01-01T00:00:00.000Z",
    );
  });
});

describe("planTinderMediaReconciliation", () => {
  test("removes existing media when photo consent is withdrawn", () => {
    expect(
      planTinderMediaReconciliation(
        ["https://example.com/old.jpg"],
        [media("new", "https://example.com/new.jpg")],
        false,
      ),
    ).toEqual({
      removeExisting: true,
      rowsToInsert: [],
      hasPhotosAfter: false,
    });
  });

  test("deduplicates retained URLs and inserts only new consented media", () => {
    const newPhoto = media("new", "https://example.com/new.jpg");
    const result = planTinderMediaReconciliation(
      ["https://example.com/existing.jpg"],
      [
        media("duplicate", "https://example.com/existing.jpg"),
        newPhoto,
        media("duplicate-new", "https://example.com/new.jpg"),
      ],
      true,
    );

    expect(result).toEqual({
      removeExisting: false,
      rowsToInsert: [newPhoto],
      hasPhotosAfter: true,
    });
  });
});
