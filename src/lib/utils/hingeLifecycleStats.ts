import type { HingeInteraction, Match, Message } from "@/server/db/schema";

type HingeMatchWithMessages = Match & { messages: Message[] };

export type HingeLifecycleStats = {
  likesSent: number;
  outboundMatches: number;
  inboundMatches: number;
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
  interactions: HingeInteraction[],
  matches: HingeMatchWithMessages[],
): HingeLifecycleStats {
  const likesSent = interactions.filter((i) => i.type === "LIKE_SENT").length;
  const matchInteractions = interactions.filter((i) => i.type === "MATCH");
  const classifiedMatchCount = matchInteractions.filter(
    (i) => i.threadOrigin != null,
  ).length;

  const outboundMatchesFromInteractions = matchInteractions.filter(
    (i) => i.threadOrigin === "OUTBOUND_LIKE",
  ).length;
  const inboundMatchesFromInteractions = matchInteractions.filter(
    (i) => i.threadOrigin === "INBOUND_LIKE",
  ).length;

  const outboundMatches =
    classifiedMatchCount > 0
      ? outboundMatchesFromInteractions
      : matches.filter((m) => m.likedAt != null).length;
  const inboundMatches =
    classifiedMatchCount > 0
      ? inboundMatchesFromInteractions
      : Math.max(matches.length - outboundMatches, 0);

  const pendingOutboundLikes = interactions.filter(
    (i) => i.type === "LIKE_SENT" && i.threadState === "PENDING",
  ).length;
  const removedWithoutMatch = interactions.filter(
    (i) => i.type === "REJECT",
  ).length;
  const unmatchedAfterMatch = interactions.filter(
    (i) => i.type === "UNMATCH",
  ).length;
  const messagesSent = interactions.filter(
    (i) => i.type === "MESSAGE_SENT",
  ).length;
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
