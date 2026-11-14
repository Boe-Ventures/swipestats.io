import { formatDistance } from "date-fns";
import he from "he";
import { nanoid } from "nanoid";

import type { TinderJsonMatch } from "@/lib/interfaces/TinderDataJSON";
import type {
  MatchInsert,
  MessageInsert,
  MessageType,
} from "@/server/db/schema";
import { getMedian } from "../meta-utils.service";

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
    case 1:
      return "TEXT";
    case "vibes":
      return "OTHER";
    default:
      return "OTHER";
  }
}

type TinderMetricMessage = Pick<MessageInsert, "messageType" | "sentDate">;

export type TinderMatchDerivedMetrics = Pick<
  MatchInsert,
  | "totalMessageCount"
  | "initialMessageAt"
  | "lastMessageAt"
  | "textCount"
  | "gifCount"
  | "gestureCount"
  | "otherMessageTypeCount"
  | "responseTimeMedianSeconds"
  | "conversationDurationDays"
  | "messageImbalanceRatio"
  | "longestGapHours"
  | "didMatchReply"
  | "lastMessageFrom"
>;

/** Compute Tinder match metrics from validated, chronologically sortable rows. */
export function computeTinderMatchDerivedMetrics(
  input: TinderMetricMessage[],
): TinderMatchDerivedMetrics {
  const messages = [...input].sort(
    (a, b) => a.sentDate.getTime() - b.sentDate.getTime(),
  );
  const totalMessageCount = messages.length;
  const firstMessageSentAt = messages[0]?.sentDate;
  const lastMessageSentAt = messages.at(-1)?.sentDate;

  const messageCounts = messages.reduce(
    (acc, message) => {
      acc[message.messageType] = (acc[message.messageType] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<MessageType, number>>,
  );

  const gapsSeconds = messages
    .slice(1)
    .map((message, index) =>
      Math.floor(
        (message.sentDate.getTime() - messages[index]!.sentDate.getTime()) /
          1000,
      ),
    );

  // REVIEW(provider assumption): Tinder exports uploader-sent messages only.
  // These legacy "response time" fields therefore measure gaps between the
  // uploader's messages; they must not be interpreted as reply latency.
  const responseTimeMedianSeconds =
    gapsSeconds.length > 0 ? Math.round(getMedian(gapsSeconds)) : null;
  const conversationDurationDays =
    firstMessageSentAt && lastMessageSentAt
      ? Math.floor(
          (lastMessageSentAt.getTime() - firstMessageSentAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  return {
    totalMessageCount,
    initialMessageAt: firstMessageSentAt,
    lastMessageAt: lastMessageSentAt,
    textCount: messageCounts.TEXT ?? 0,
    gifCount: messageCounts.GIF ?? 0,
    gestureCount: messageCounts.GESTURE ?? 0,
    otherMessageTypeCount:
      (messageCounts.CONTACT_CARD ?? 0) +
      (messageCounts.ACTIVITY ?? 0) +
      (messageCounts.OTHER ?? 0),
    responseTimeMedianSeconds,
    conversationDurationDays,
    messageImbalanceRatio: null,
    longestGapHours:
      gapsSeconds.length > 0
        ? Math.floor(Math.max(...gapsSeconds) / 3600)
        : null,
    // Incoming message bodies are absent, so reply behavior is unknown.
    didMatchReply: null,
    lastMessageFrom: totalMessageCount > 0 ? "USER" : null,
  };
}

function parseMessageTimestamp(sentDate: string): number {
  const timestamp = Date.parse(sentDate);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid Tinder message sent_date: ${sentDate}`);
  }
  return timestamp;
}

/** Transforms Tinder matches and outgoing messages into database rows. */
export function createMessagesAndMatches(
  tjms: TinderJsonMatch[],
  tinderProfileId: string,
): {
  matchesInput: MatchInsert[];
  messagesInput: MessageInsert[];
} {
  console.log(`   💬 Processing ${tjms.length} raw matches from JSON...`);
  const sortedMatches = [...tjms].reverse().map((match) => ({
    ...match,
    messages: [...match.messages].sort(
      (a, b) =>
        parseMessageTimestamp(a.sent_date) - parseMessageTimestamp(b.sent_date),
    ),
  }));

  const matchesInput: MatchInsert[] = [];
  const messagesInput: MessageInsert[] = [];

  sortedMatches.forEach((tjm, matchIndex) => {
    const matchId = nanoid();
    const matchMessages = tjm.messages.map((message, messageIndex) => {
      const timestampOfCurrentMessage = parseMessageTimestamp(
        message.sent_date,
      );
      const previousMessage = tjm.messages[messageIndex - 1];
      const timestampOfPreviousMessage = previousMessage
        ? parseMessageTimestamp(previousMessage.sent_date)
        : undefined;
      const content = message.message ? he.decode(message.message) : "";

      return {
        id: nanoid(),
        messageType: getMessageType(message),
        to: message.to,
        sentDate: new Date(timestampOfCurrentMessage),
        sentDateRaw: message.sent_date,
        content,
        charCount: content.length,
        contentRaw: message.message ?? "",
        type: message.type === undefined ? undefined : String(message.type),
        gifUrl: message.fixed_height ?? null,
        matchId,
        tinderProfileId,
        hingeProfileId: null,
        order: messageIndex,
        timeSinceLastMessage:
          timestampOfPreviousMessage === undefined
            ? 0
            : Math.floor(
                (timestampOfCurrentMessage - timestampOfPreviousMessage) / 1000,
              ),
        timeSinceLastMessageRelative:
          timestampOfPreviousMessage === undefined
            ? null
            : formatDistance(
                timestampOfPreviousMessage,
                timestampOfCurrentMessage,
              ),
        language: null,
        emotionScore: null,
        contentSanitized: null,
      } satisfies MessageInsert;
    });

    const metrics = computeTinderMatchDerivedMetrics(matchMessages);
    matchesInput.push({
      id: matchId,
      tinderMatchId: tjm.match_id,
      tinderProfileId,
      order: matchIndex,
      ...metrics,
      primaryLanguage: null,
      languages: [],
      engagementScore: null,
      weMet: null,
      like: null,
      match: null,
      likedAt: null,
      matchedAt: null,
      hingeProfileId: null,
    });
    messagesInput.push(...matchMessages);
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
