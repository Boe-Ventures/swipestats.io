import { getMedian } from "../meta-utils.service";

export type HingeMetricMessage = {
  id?: string | null;
  sentDate: Date;
  messageType: string;
  order?: number | null;
};

export type HingeMatchConversationMetrics = {
  totalMessageCount: number;
  initialMessageAt: Date | null;
  lastMessageAt: Date | null;
  textCount: number;
  gifCount: number;
  gestureCount: number;
  otherMessageTypeCount: number;
  responseTimeMedianSeconds: number | null;
  conversationDurationDays: number | null;
  messageImbalanceRatio: null;
  longestGapHours: number | null;
  didMatchReply: null;
  lastMessageFrom: "USER" | null;
};

export type HingeProfileConversationMetrics = {
  conversationCount: number;
  conversationsWithMessages: number;
  ghostedCount: number;
  averageResponseTimeSeconds: number | null;
  meanResponseTimeSeconds: number | null;
  medianConversationDurationDays: number | null;
  longestConversationDays: number | null;
  averageMessagesPerConversation: number | null;
  medianMessagesPerConversation: number | null;
};

function compareMessages(
  left: HingeMetricMessage,
  right: HingeMetricMessage,
): number {
  return (
    left.sentDate.getTime() - right.sentDate.getTime() ||
    (left.order ?? 0) - (right.order ?? 0) ||
    (left.id ?? "").localeCompare(right.id ?? "")
  );
}

function roundedMedian(values: number[]): number | null {
  return values.length > 0 ? Math.round(getMedian(values)) : null;
}

function getMessageGapSeconds(messages: HingeMetricMessage[]): number[] {
  const ordered = [...messages].sort(compareMessages);
  return ordered
    .slice(1)
    .map((message, index) =>
      Math.floor(
        (message.sentDate.getTime() - ordered[index]!.sentDate.getTime()) /
          1000,
      ),
    );
}

/**
 * Derive the durable match fields from the persisted message facts.
 *
 * REVIEW(provider assumption): Hinge GDPR chat rows only contain the uploader's
 * own messages. Inter-message gaps are therefore cadence gaps, not measured
 * reply latency, and `lastMessageFrom` can only be USER when a chat exists.
 * These calculations intentionally mirror the repair SQL.
 */
export function deriveHingeMatchConversationMetrics(
  messages: HingeMetricMessage[],
): HingeMatchConversationMetrics {
  const ordered = [...messages].sort(compareMessages);
  const first = ordered[0];
  const last = ordered.at(-1);
  const gapSeconds = getMessageGapSeconds(ordered);

  const textCount = ordered.filter(
    (message) => message.messageType === "TEXT",
  ).length;
  const gifCount = ordered.filter(
    (message) => message.messageType === "GIF",
  ).length;
  const gestureCount = ordered.filter(
    (message) => message.messageType === "GESTURE",
  ).length;

  return {
    totalMessageCount: ordered.length,
    initialMessageAt: first?.sentDate ?? null,
    lastMessageAt: last?.sentDate ?? null,
    textCount,
    gifCount,
    gestureCount,
    otherMessageTypeCount: ordered.length - textCount - gifCount - gestureCount,
    responseTimeMedianSeconds: roundedMedian(gapSeconds),
    conversationDurationDays:
      first && last
        ? Math.floor(
            (last.sentDate.getTime() - first.sentDate.getTime()) / 86_400_000,
          )
        : null,
    messageImbalanceRatio: null,
    longestGapHours:
      gapSeconds.length > 0
        ? Math.floor(Math.max(...gapSeconds) / 3_600)
        : null,
    didMatchReply: null,
    lastMessageFrom: ordered.length > 0 ? "USER" : null,
  };
}

/** Aggregate the same match derivation used at insert/update time. */
export function deriveHingeProfileConversationMetrics(
  matches: { messages: HingeMetricMessage[] }[],
): HingeProfileConversationMetrics {
  const matchMetrics = matches.map((match) =>
    deriveHingeMatchConversationMetrics(match.messages),
  );
  const withMessages = matchMetrics.filter(
    (metrics) => metrics.totalMessageCount > 0,
  );
  const responseMedians = withMessages.flatMap((metrics) =>
    metrics.responseTimeMedianSeconds === null
      ? []
      : [metrics.responseTimeMedianSeconds],
  );
  const durations = withMessages.flatMap((metrics) =>
    metrics.conversationDurationDays === null
      ? []
      : [metrics.conversationDurationDays],
  );
  const messageCounts = withMessages.map(
    (metrics) => metrics.totalMessageCount,
  );
  const pooledCadenceGaps = matches.flatMap((match) =>
    getMessageGapSeconds(match.messages),
  );

  return {
    conversationCount: matchMetrics.length,
    conversationsWithMessages: withMessages.length,
    ghostedCount: matchMetrics.length - withMessages.length,
    averageResponseTimeSeconds: roundedMedian(responseMedians),
    meanResponseTimeSeconds:
      pooledCadenceGaps.length > 0
        ? Math.round(
            pooledCadenceGaps.reduce((total, value) => total + value, 0) /
              pooledCadenceGaps.length,
          )
        : null,
    medianConversationDurationDays: roundedMedian(durations),
    longestConversationDays:
      durations.length > 0 ? Math.max(...durations) : null,
    averageMessagesPerConversation:
      messageCounts.length > 0
        ? messageCounts.reduce((total, value) => total + value, 0) /
          messageCounts.length
        : null,
    medianMessagesPerConversation: roundedMedian(messageCounts),
  };
}

/** PostgreSQL-compatible inclusive UTC calendar-day span. */
export function getInclusiveUtcCalendarDays(from: Date, to: Date): number {
  const fromUtc = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const toUtc = Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  );

  return Math.max(1, Math.floor((toUtc - fromUtc) / 86_400_000) + 1);
}
