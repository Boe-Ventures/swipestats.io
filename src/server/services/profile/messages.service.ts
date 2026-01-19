import { formatDistance } from "date-fns";
import he from "he";
import { nanoid } from "nanoid";

import type { TinderJsonMatch } from "@/lib/interfaces/TinderDataJSON";
import type {
  MatchInsert,
  MessageInsert,
  MessageType,
} from "@/server/db/schema";

/**
 * Determines message type from Tinder JSON message
 */
function getMessageType(msg: TinderJsonMatch["messages"][number]): MessageType {
  if (!msg.type) return "TEXT";
  switch (msg.type) {
    case "gif":
      return "GIF";
    case "gesture":
      return "GESTURE";
    case "contact_card":
      return "CONTACT_CARD";
    case "activity":
      return "ACTIVITY";
    case "1":
      return "TEXT"; // Number type actually represents text
    // @ts-expect-error - covering edge cases
    case 1:
      return "TEXT";
    case "vibes":
      return "OTHER";
    default:
      return "OTHER";
  }
}

/**
 * Transforms Tinder JSON matches and messages into database insert format
 */
export function createMessagesAndMatches(
  tjms: TinderJsonMatch[],
  tinderProfileId: string,
): {
  matchesInput: MatchInsert[];
  messagesInput: MessageInsert[];
} {
  console.log(`   💬 Processing ${tjms.length} raw matches from JSON...`);
  const sortedMatches = tjms.reverse(); // Chronological order

  const matchesInput: MatchInsert[] = sortedMatches.map((tjm, i) => {
    const totalMessageCount = tjm.messages.length;

    const firstMessage = tjm.messages[0];
    const firstMessageSentAt = firstMessage?.sent_date
      ? new Date(firstMessage.sent_date)
      : undefined;

    const lastMessage = tjm.messages.at(-1);
    const lastMessageSentAt = lastMessage?.sent_date
      ? new Date(lastMessage.sent_date)
      : undefined;

    // Count message types
    const messageCounts = tjm.messages.reduce(
      (acc, cur) => {
        const type = getMessageType(cur);
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {
        TEXT: 0,
        GIF: 0,
        GESTURE: 0,
        CONTACT_CARD: 0,
        ACTIVITY: 0,
        OTHER: 0,
      } as Record<string, number>,
    );

    // Compute server-side metrics for cohort comparison
    // Note: GDPR data only has outgoing messages, so some metrics will be limited

    // Response time calculation (time between consecutive messages)
    const responseTimes: number[] = [];
    for (let j = 1; j < tjm.messages.length; j++) {
      const prevMsg = tjm.messages[j - 1];
      const currMsg = tjm.messages[j];
      if (prevMsg?.sent_date && currMsg?.sent_date) {
        const timeDiff =
          new Date(currMsg.sent_date).getTime() -
          new Date(prevMsg.sent_date).getTime();
        responseTimes.push(Math.floor(timeDiff / 1000)); // Convert to seconds
      }
    }
    const responseTimeMedianSeconds =
      responseTimes.length > 0
        ? responseTimes.sort((a, b) => a - b)[
            Math.floor(responseTimes.length / 2)
          ] || null
        : null;

    // Conversation duration in days
    const conversationDurationDays =
      firstMessageSentAt && lastMessageSentAt
        ? Math.floor(
            (lastMessageSentAt.getTime() - firstMessageSentAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

    // Message imbalance ratio (for Tinder GDPR, all messages are sent by user)
    const messageImbalanceRatio = totalMessageCount > 0 ? null : null; // Always null for GDPR data

    // Longest gap between messages in hours
    const longestGapHours =
      responseTimes.length > 0
        ? Math.floor(Math.max(...responseTimes) / 3600) // Convert seconds to hours
        : null;

    // Did match reply (always false for GDPR data since we only have outgoing)
    const didMatchReply = false;

    // Who sent last message (always 'USER' for GDPR data)
    const lastMessageFrom = totalMessageCount > 0 ? "USER" : null;

    return {
      id: nanoid(),
      tinderMatchId: tjm.match_id,
      tinderProfileId,
      totalMessageCount: totalMessageCount,
      order: i,
      initialMessageAt: firstMessageSentAt,
      lastMessageAt: lastMessageSentAt,
      textCount: messageCounts.TEXT ?? 0,
      gifCount: messageCounts.GIF ?? 0,
      gestureCount: messageCounts.GESTURE ?? 0,
      otherMessageTypeCount:
        (messageCounts.CONTACT_CARD ?? 0) +
        (messageCounts.ACTIVITY ?? 0) +
        (messageCounts.OTHER ?? 0),
      primaryLanguage: null,
      languages: [],
      engagementScore: null,
      // Server-computed metrics
      responseTimeMedianSeconds,
      conversationDurationDays,
      messageImbalanceRatio,
      longestGapHours,
      didMatchReply,
      lastMessageFrom,
      weMet: null,
      like: null,
      match: null,
      likedAt: null,
      matchedAt: null,
      hingeProfileId: null,
    };
  });

  const messagesInput: MessageInsert[] = sortedMatches.flatMap((tjm, i) => {
    const match = matchesInput[i]!;
    return tjm.messages
      .filter((msg) => !!msg.sent_date) // Filter out invalid messages
      .map((msg, messageIndex) => {
        const lastMessage = tjm.messages[messageIndex - 1];

        const timestampOfCurrentMessage = new Date(msg.sent_date).getTime();
        const timestampOfLastMessage = lastMessage
          ? new Date(lastMessage.sent_date).getTime()
          : undefined;
        const timeSinceLastMessage = timestampOfLastMessage
          ? Math.floor(
              (timestampOfCurrentMessage - timestampOfLastMessage) / 1000,
            ) // Seconds
          : 0;

        const messageType = getMessageType(msg);
        const content = msg.message ? he.decode(msg.message) : "";

        return {
          id: nanoid(),
          messageType,
          to: msg.to,
          sentDate: new Date(msg.sent_date),
          sentDateRaw: msg.sent_date,
          content,
          charCount: content?.length ?? 0,
          contentRaw: msg.message ?? "",
          type: msg.type ? String(msg.type) : undefined,
          gifUrl: msg.fixed_height ?? null,
          matchId: match.id,
          tinderProfileId,
          hingeProfileId: null,
          order: messageIndex,
          timeSinceLastMessage: timeSinceLastMessage,
          timeSinceLastMessageRelative: timestampOfLastMessage
            ? formatDistance(timestampOfLastMessage, timestampOfCurrentMessage)
            : null,
          language: null,
          emotionScore: null,
          contentSanitized: null,
        };
      });
  });

  // Calculate statistics
  const matchesWithMessages = matchesInput.filter(
    (m) => m.totalMessageCount > 0,
  ).length;
  const matchesWithoutMessages = matchesInput.length - matchesWithMessages;
  const totalMessages = messagesInput.length;
  const avgMessagesPerMatch =
    matchesWithMessages > 0
      ? (totalMessages / matchesWithMessages).toFixed(1)
      : "0";

  console.log(`   💬 Match breakdown:`);
  console.log(
    `      - ${matchesWithMessages} matches with messages (avg ${avgMessagesPerMatch} msgs/match)`,
  );
  console.log(`      - ${matchesWithoutMessages} matches with no messages`);

  return {
    matchesInput,
    messagesInput,
  };
}
