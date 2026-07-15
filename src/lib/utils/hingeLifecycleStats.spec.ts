import { describe, expect, it } from "bun:test";

import type { HingeInteraction, Match, Message } from "@/server/db/schema";
import { getHingeLifecycleStats } from "./hingeLifecycleStats";

type MatchWithMessages = Match & { messages: Message[] };

describe("getHingeLifecycleStats", () => {
  it("does not drop unclassified matches when classification is partial", () => {
    const matches = [
      { id: "outbound", likedAt: new Date(), messages: [{}] },
      { id: "inbound", likedAt: null, messages: [{}, {}] },
    ] as unknown as MatchWithMessages[];
    const interactions = [
      {
        type: "LIKE_SENT",
        matchId: "outbound",
        timestamp: new Date("2024-01-01T00:00:00.000Z"),
        threadOrigin: "OUTBOUND_LIKE",
      },
      {
        type: "MATCH",
        matchId: "outbound",
        threadOrigin: "OUTBOUND_LIKE",
      },
      {
        type: "MATCH",
        matchId: "inbound",
        threadOrigin: null,
      },
    ] as HingeInteraction[];

    const stats = getHingeLifecycleStats(interactions, matches);

    expect(stats.outboundMatches).toBe(1);
    expect(stats.inboundMatches).toBe(0);
    expect(stats.unclassifiedOriginMatches).toBe(1);
    expect(stats.originClassificationCoverage).toBe(0.5);
    expect(stats.messagesSent).toBe(3);
  });

  it("keeps explicit inbound and unknown legacy matches separate", () => {
    const matches = [
      { id: "inbound", likedAt: null, messages: [] },
      { id: "unknown", likedAt: null, messages: [] },
    ] as unknown as MatchWithMessages[];
    const interactions = [
      {
        type: "MATCH",
        matchId: "inbound",
        threadOrigin: "INBOUND_LIKE",
      },
      { type: "MATCH", matchId: "unknown", threadOrigin: null },
    ] as HingeInteraction[];

    const stats = getHingeLifecycleStats(interactions, matches);

    expect(stats.outboundMatches).toBe(0);
    expect(stats.inboundMatches).toBe(1);
    expect(stats.unclassifiedOriginMatches).toBe(1);
    expect(stats.originClassificationCoverage).toBe(0.5);
  });

  it("does not use post-match likes as outbound origin evidence", () => {
    const matchedAt = new Date("2024-01-01T00:00:00.000Z");
    const matches = [
      {
        id: "post-match-like",
        likedAt: new Date("2024-01-02T00:00:00.000Z"),
        matchedAt,
        messages: [],
      },
      {
        id: "legacy-pre-match-like",
        likedAt: new Date("2023-12-31T00:00:00.000Z"),
        matchedAt,
        messages: [],
      },
    ] as unknown as MatchWithMessages[];
    const interactions = [
      {
        type: "LIKE_SENT",
        matchId: "post-match-like",
        timestamp: new Date("2024-01-02T00:00:00.000Z"),
      },
      {
        type: "MATCH",
        matchId: "post-match-like",
        timestamp: matchedAt,
        threadOrigin: "UNKNOWN",
      },
      {
        type: "LIKE_SENT",
        matchId: "legacy-pre-match-like",
        timestamp: new Date("2023-12-31T00:00:00.000Z"),
      },
      {
        type: "MATCH",
        matchId: "legacy-pre-match-like",
        timestamp: matchedAt,
        threadOrigin: null,
      },
    ] as HingeInteraction[];

    const stats = getHingeLifecycleStats(interactions, matches);

    expect(stats.likesSent).toBe(2);
    expect(stats.outboundMatches).toBe(1);
    expect(stats.unclassifiedOriginMatches).toBe(1);
    expect(stats.outboundMatchRate).toBe(0.5);
  });
});
