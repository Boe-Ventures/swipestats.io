import { differenceInDays } from "date-fns";
import type {
  Match,
  Message,
  HingeProfile,
  HingeInteraction,
  ProfileMetaInsert,
} from "@/server/db/schema";
import { getMedian, getRatio } from "../meta-utils.service";

type HingeProfileWithMatchesAndMessages = HingeProfile & {
  matches: (Match & { messages: Message[] })[];
  interactions: HingeInteraction[];
};

/**
 * Calculate conversation statistics from Hinge matches
 */
function getMessagesMetaFromMatches(
  matches: (Match & { messages: Message[] })[],
) {
  const meta = {
    numberOfConversations: matches.length,
    numberOfConversationsWithMessages: 0,
    maxConversationMessageCount: 0,
    longestConversationInDays: 0,
    messageCountInLongestConversationInDays: 0,
    longestConversationInDaysTwoWeekMax: 0,
    messageCountInConversationTwoWeekMax: 0,
    averageConversationMessageCount: 0,
    averageConversationLengthInDays: 0,
    medianConversationMessageCount: 0,
    medianConversationLengthInDays: 0,
    numberOfOneMessageConversations: 0,
    percentageOfOneMessageConversations: 0,
    nrOfGhostingsAfterInitialMatch: 0,
  };

  if (matches.length === 0) return meta;

  const conversationLengths: { days: number; messages: number }[] = [];

  matches.forEach((conversation) => {
    const totalMessages = conversation.messages.length;
    meta.averageConversationMessageCount += totalMessages;

    if (totalMessages === 0) {
      meta.nrOfGhostingsAfterInitialMatch += 1;
      conversationLengths.push({ days: 0, messages: 0 });
    } else {
      if (totalMessages === 1) {
        meta.numberOfOneMessageConversations += 1;
      }

      const conversationStartDate = new Date(
        conversation.messages[0]!.sentDate,
      );
      const conversationEndDate = new Date(
        conversation.messages[totalMessages - 1]!.sentDate,
      );
      const conversationLengthInDays = differenceInDays(
        conversationEndDate,
        conversationStartDate,
      );

      const maxGap = conversation.messages
        .slice(1)
        .reduce((max, message, index) => {
          const previousDate = new Date(conversation.messages[index]!.sentDate);
          const currentDate = new Date(message.sentDate);
          return Math.max(max, differenceInDays(currentDate, previousDate));
        }, 0);

      if (
        maxGap < 14 &&
        conversationLengthInDays > meta.longestConversationInDaysTwoWeekMax
      ) {
        meta.longestConversationInDaysTwoWeekMax = conversationLengthInDays;
        meta.messageCountInConversationTwoWeekMax = totalMessages;
      }

      conversationLengths.push({
        days: conversationLengthInDays,
        messages: totalMessages,
      });

      if (totalMessages > meta.maxConversationMessageCount) {
        meta.maxConversationMessageCount = totalMessages;
      }

      if (conversationLengthInDays > meta.longestConversationInDays) {
        meta.longestConversationInDays = conversationLengthInDays;
        meta.messageCountInLongestConversationInDays = totalMessages;
      }

      meta.averageConversationLengthInDays += conversationLengthInDays;
    }
  });

  // Calculate number of conversations with messages first
  meta.numberOfConversationsWithMessages =
    meta.numberOfConversations - meta.nrOfGhostingsAfterInitialMatch;

  // Calculate medians and averages
  if (conversationLengths.length) {
    const sortedByDays = conversationLengths.sort((a, b) => a.days - b.days);
    const sortedByMessages = conversationLengths.sort(
      (a, b) => a.messages - b.messages,
    );
    const midIndex = Math.floor(conversationLengths.length / 2);

    meta.medianConversationLengthInDays = sortedByDays[midIndex]!.days;
    meta.medianConversationMessageCount = sortedByMessages[midIndex]!.messages;

    meta.averageConversationMessageCount =
      meta.averageConversationMessageCount / meta.numberOfConversations;

    meta.averageConversationLengthInDays =
      meta.averageConversationLengthInDays / meta.numberOfConversations;

    // Fix: Calculate percentage based on conversations WITH messages, not all matches
    meta.percentageOfOneMessageConversations =
      meta.numberOfConversationsWithMessages > 0
        ? Math.round(
            (meta.numberOfOneMessageConversations /
              meta.numberOfConversationsWithMessages) *
              100,
          )
        : 0;
  }

  return meta;
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
  const allTimestamps: Date[] = [];
  matches.forEach((match) => {
    if (match.matchedAt) allTimestamps.push(match.matchedAt);
    if (match.initialMessageAt) allTimestamps.push(match.initialMessageAt);
    if (match.lastMessageAt) allTimestamps.push(match.lastMessageAt);
  });
  interactions.forEach((interaction) => {
    allTimestamps.push(interaction.timestamp);
  });

  const firstActivity =
    allTimestamps.length > 0
      ? new Date(Math.min(...allTimestamps.map((d) => d.getTime())))
      : profile.createDate;
  const lastActivity =
    allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps.map((d) => d.getTime())))
      : profile.createDate;

  const daysInPeriod = Math.max(
    1,
    differenceInDays(lastActivity, firstActivity) + 1,
  );

  // Count likes sent from interactions (LIKE_SENT type)
  const totalLikesSent = interactions.filter(
    (i) => i.type === "LIKE_SENT",
  ).length;

  // Count matches
  const totalMatches = matches.length;

  // GDPR data only contains YOUR messages - all are outgoing (to: 1)
  const totalMessagesSent = matches.reduce((sum, match) => {
    return sum + match.messages.filter((m) => m.to === 1).length;
  }, 0);

  // Calculate rates (simplified)
  const matchRate = getRatio(totalMatches, totalLikesSent);
  const likeRate = 1.0; // Hinge: all interactions are likes (no passes in GDPR data)
  const swipesPerDay = totalLikesSent / daysInPeriod;

  // Get conversation stats
  const messagesMeta = getMessagesMetaFromMatches(matches);

  // SIMPLIFIED SCHEMA: Only 20 essential fields
  return {
    // Time range
    from: firstActivity,
    to: lastActivity,
    daysInPeriod,
    daysActive: 0, // Not available for Hinge GDPR data

    // Core totals
    swipeLikesTotal: totalLikesSent,
    swipePassesTotal: 0, // Not tracked in Hinge GDPR data
    matchesTotal: totalMatches,
    messagesSentTotal: totalMessagesSent,
    messagesReceivedTotal: 0, // Not available in Hinge GDPR data
    appOpensTotal: 0, // Not available for Hinge

    // Core rates (pre-computed for queries)
    likeRate, // 1.0 for Hinge (no pass data)
    matchRate,
    swipesPerDay,

    // Conversation stats
    conversationCount: messagesMeta.numberOfConversations,
    conversationsWithMessages: messagesMeta.numberOfConversationsWithMessages,
    ghostedCount: messagesMeta.nrOfGhostingsAfterInitialMatch,

    computedAt: new Date(),
  };
}
