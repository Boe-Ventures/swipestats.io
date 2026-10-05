/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import type {
  MatchInsert,
  MediaInsert,
  Message,
  MessageInsert,
} from "@/server/db/schema";
process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
const { planTinderMediaReconciliation, reconcileTinderMatches } =
  await import("./additive.service");
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
});
