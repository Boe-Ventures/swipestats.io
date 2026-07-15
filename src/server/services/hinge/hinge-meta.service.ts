import type {
  Match,
  Message,
  HingeProfile,
  HingeInteraction,
  ProfileMetaInsert,
} from "@/server/db/schema";
import { classifyPersistedHingeMatchOrigins } from "@/lib/utils/hingeLifecycleStats";
import { tryParseHingeTimestampToDate } from "@/lib/hinge/timestamp";
import { getRatio } from "../meta-utils.service";
import {
  deriveHingeProfileConversationMetrics,
  getInclusiveUtcCalendarDays,
} from "./hinge-conversation-metrics";

type HingeProfileWithMatchesAndMessages = HingeProfile & {
  matches: (Match & { messages: Message[] })[];
  interactions: HingeInteraction[];
};

function getPersistedWeMetTimestamp(value: unknown): Date | null {
  if (typeof value !== "object" || value === null || !("timestamp" in value)) {
    return null;
  }
  const timestamp = (value as { timestamp?: unknown }).timestamp;
  if (typeof timestamp !== "string") return null;
  return tryParseHingeTimestampToDate(timestamp);
}

/**
 * Create simplified profile meta for Hinge (no daily usage data)
 *
 * SIMPLIFIED SCHEMA (20 fields):
 * - Time range + activity
 * - Core totals (swipes, matches, messages, app opens)
 * - Core rates (like rate, match rate, swipes per day)
 * - Conversation stats (count, with messages, ghosted)
 *
 * GDPR Data Model:
 * - All messages are OUTGOING (to: 1)
 * - Likes come from hingeInteractionTable (type: LIKE_SENT)
 * - No received messages in GDPR data
 */
export function createHingeProfileMeta(
  profile: HingeProfileWithMatchesAndMessages,
): Omit<ProfileMetaInsert, "id" | "tinderProfileId" | "hingeProfileId"> {
  const matches = profile.matches;
  const interactions = profile.interactions;

  // Get date range from matches and interactions
  // Signup is part of the profile period even when the first exported activity
  // happens much later; the UI presents this as the user's time on Hinge.
  const allTimestamps: Date[] = [
    profile.firstAccountCreateDate ?? profile.createDate,
    profile.createDate,
  ];
  if (profile.lastSeenAt) allTimestamps.push(profile.lastSeenAt);
  matches.forEach((match) => {
    if (match.matchedAt) allTimestamps.push(match.matchedAt);
    if (match.likedAt) allTimestamps.push(match.likedAt);
    if (match.initialMessageAt) allTimestamps.push(match.initialMessageAt);
    if (match.lastMessageAt) allTimestamps.push(match.lastMessageAt);
    const weMetAt = getPersistedWeMetTimestamp(match.weMet);
    if (weMetAt) allTimestamps.push(weMetAt);
  });
  interactions.forEach((interaction) => {
    allTimestamps.push(interaction.timestamp);
  });

  const firstActivity = new Date(
    Math.min(...allTimestamps.map((date) => date.getTime())),
  );
  const lastActivity = new Date(
    Math.max(...allTimestamps.map((date) => date.getTime())),
  );

  const daysInPeriod = getInclusiveUtcCalendarDays(firstActivity, lastActivity);

  // Count likes sent from interactions (LIKE_SENT type)
  const likeInteractions = interactions.filter((i) => i.type === "LIKE_SENT");
  const totalLikesSent = likeInteractions.length;

  // Count matches
  const totalMatches = matches.length;
  const matchOrigins = classifyPersistedHingeMatchOrigins(
    interactions,
    matches,
  );
  const outboundMatches = [...matchOrigins.values()].filter(
    (origin) => origin === "OUTBOUND_LIKE",
  ).length;

  // GDPR data only contains YOUR messages - all are outgoing (to: 1)
  const totalMessagesSent = matches.reduce(
    (sum, match) => sum + match.messages.length,
    0,
  );

  // Calculate rates (simplified)
  const matchRate = getRatio(outboundMatches, totalLikesSent);
  // REVIEW(provider assumption): Hinge omits passes, so likeRate represents the
  // share of observed swipe-direction events that are likes. It is not a true
  // behavioral like rate and must not be benchmarked against Tinder.
  const likeRate = totalLikesSent > 0 ? 1 : 0;
  const activeLikeDays = new Set(
    likeInteractions.map((interaction) =>
      interaction.timestamp.toISOString().slice(0, 10),
    ),
  ).size;
  const swipesPerDay = activeLikeDays > 0 ? totalLikesSent / activeLikeDays : 0;

  // Always aggregate from message facts, not potentially stale match columns.
  const conversationMetrics = deriveHingeProfileConversationMetrics(matches);

  // SIMPLIFIED SCHEMA: Only 20 essential fields
  return {
    // Time range
    from: firstActivity,
    to: lastActivity,
    daysInPeriod,
    daysActive: activeLikeDays,

    // Core totals
    swipeLikesTotal: totalLikesSent,
    swipePassesTotal: 0, // Not tracked in Hinge GDPR data
    matchesTotal: totalMatches,
    messagesSentTotal: totalMessagesSent,
    messagesReceivedTotal: 0, // Not available in Hinge GDPR data
    appOpensTotal: 0, // Not available for Hinge

    // Core rates (pre-computed for queries)
    likeRate,
    matchRate,
    swipesPerDay,

    // Conversation stats
    ...conversationMetrics,

    computedAt: new Date(),
  };
}
