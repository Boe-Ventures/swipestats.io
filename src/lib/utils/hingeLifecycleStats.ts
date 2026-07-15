import type { Match } from "@/server/db/schema";
import type {
  HingeInsightsInteraction,
  HingeInsightsMatch,
} from "@/lib/types/hinge-profile";

export type HingeMatchOrigin = "OUTBOUND_LIKE" | "INBOUND_LIKE" | "UNKNOWN";

/**
 * Classify persisted matches without turning missing legacy evidence into an
 * inbound claim. New uploads carry an explicit MATCH origin. For older rows, a
 * linked sent-like or likedAt at/before the match is positive evidence of an
 * outbound match; post-match likes cannot classify the earlier match.
 */
export function classifyPersistedHingeMatchOrigins(
  interactions: HingeInsightsInteraction[],
  matches: Pick<Match, "id" | "likedAt" | "matchedAt">[],
): Map<string, HingeMatchOrigin> {
  const persistedMatchIds = new Set(matches.map((match) => match.id));
  const persistedMatches = new Map(matches.map((match) => [match.id, match]));
  const explicitOrigins = new Map<string, Set<HingeMatchOrigin>>();
  const linkedOutboundMatchIds = new Set<string>();

  for (const interaction of interactions) {
    if (!interaction.matchId || !persistedMatchIds.has(interaction.matchId)) {
      continue;
    }
    if (interaction.type === "LIKE_SENT") {
      const match = persistedMatches.get(interaction.matchId)!;
      if (
        !match.matchedAt ||
        interaction.timestamp.getTime() <= match.matchedAt.getTime()
      ) {
        linkedOutboundMatchIds.add(interaction.matchId);
      }
    }
    if (
      interaction.type === "MATCH" &&
      (interaction.threadOrigin === "OUTBOUND_LIKE" ||
        interaction.threadOrigin === "INBOUND_LIKE")
    ) {
      const origins = explicitOrigins.get(interaction.matchId) ?? new Set();
      origins.add(interaction.threadOrigin);
      explicitOrigins.set(interaction.matchId, origins);
    } else if (
      interaction.type === "MATCH" &&
      interaction.threadOrigin === "UNKNOWN"
    ) {
      const origins = explicitOrigins.get(interaction.matchId) ?? new Set();
      origins.add("UNKNOWN");
      explicitOrigins.set(interaction.matchId, origins);
    }
  }

  const result = new Map<string, HingeMatchOrigin>();
  for (const match of matches) {
    const explicit = explicitOrigins.get(match.id);
    if (explicit?.size === 1) {
      result.set(match.id, [...explicit][0]!);
    } else if (explicit && explicit.size > 1) {
      result.set(match.id, "UNKNOWN");
    } else if (
      linkedOutboundMatchIds.has(match.id) ||
      (match.likedAt && (!match.matchedAt || match.likedAt <= match.matchedAt))
    ) {
      result.set(match.id, "OUTBOUND_LIKE");
    } else {
      result.set(match.id, "UNKNOWN");
    }
  }

  return result;
}

export type HingeLifecycleStats = {
  likesSent: number;
  outboundMatches: number;
  inboundMatches: number;
  unclassifiedOriginMatches: number;
  originClassificationCoverage: number;
  totalMatches: number;
  pendingOutboundLikes: number;
  removedWithoutMatch: number;
  unmatchedAfterMatch: number;
  conversationsWithUserMessages: number;
  matchesWithoutUserMessages: number;
  messagesSent: number;
  outboundMatchRate: number;
  conversationRate: number;
};

export function getHingeLifecycleStats(
  interactions: HingeInsightsInteraction[],
  matches: HingeInsightsMatch[],
): HingeLifecycleStats {
  const likesSent = interactions.filter((i) => i.type === "LIKE_SENT").length;
  const origins = classifyPersistedHingeMatchOrigins(interactions, matches);
  const outboundMatches = [...origins.values()].filter(
    (origin) => origin === "OUTBOUND_LIKE",
  ).length;
  const inboundMatches = [...origins.values()].filter(
    (origin) => origin === "INBOUND_LIKE",
  ).length;
  const unclassifiedOriginMatches = [...origins.values()].filter(
    (origin) => origin === "UNKNOWN",
  ).length;
  const originClassificationCoverage =
    matches.length > 0
      ? (outboundMatches + inboundMatches) / matches.length
      : 1;

  const pendingOutboundLikes = interactions.filter(
    (i) => i.type === "LIKE_SENT" && i.threadState === "PENDING",
  ).length;
  const removedWithoutMatch = interactions.filter(
    (i) => i.type === "REJECT",
  ).length;
  const unmatchedAfterMatch = interactions.filter(
    (i) => i.type === "UNMATCH",
  ).length;
  const messagesSent = matches.reduce(
    (sum, match) => sum + match.messages.length,
    0,
  );
  const conversationsWithUserMessages = matches.filter(
    (m) => m.messages.length > 0,
  ).length;
  const totalMatches = matches.length;
  const matchesWithoutUserMessages = Math.max(
    totalMatches - conversationsWithUserMessages,
    0,
  );

  return {
    likesSent,
    outboundMatches,
    inboundMatches,
    unclassifiedOriginMatches,
    originClassificationCoverage,
    totalMatches,
    pendingOutboundLikes,
    removedWithoutMatch,
    unmatchedAfterMatch,
    conversationsWithUserMessages,
    matchesWithoutUserMessages,
    messagesSent,
    outboundMatchRate: likesSent > 0 ? outboundMatches / likesSent : 0,
    conversationRate:
      totalMatches > 0 ? conversationsWithUserMessages / totalMatches : 0,
  };
}
