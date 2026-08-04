type TinderMessageMeta = {
  conversationCount: number;
  conversationsWithMessages: number;
  averageMessagesPerConversation: number | null;
  medianMessagesPerConversation: number | null;
};

export type TinderMessageUiMetrics = {
  averageMessagesPerMessagedRecord: number | null;
  medianMessagesPerMessagedRecord: number | null;
  messagedRecordRate: number | null;
  recordsWithoutMessages: number;
  recordsWithoutMessagesRate: number | null;
};

function availableNonNegative(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Derive display-only metrics without crossing Tinder's independent ledgers.
 *
 * `averageMessagesPerConversation` is populated from retained message rows by
 * the profile-meta calculator. Tinder's daily `Usage.messages_sent` aggregate
 * is intentionally not an input here, because dividing that ledger by records
 * from the Messages collection produces a ratio with incompatible grains.
 */
export function getTinderMessageUiMetrics(
  meta: TinderMessageMeta,
): TinderMessageUiMetrics {
  const recordsWithoutMessages = Math.max(
    0,
    meta.conversationCount - meta.conversationsWithMessages,
  );

  return {
    averageMessagesPerMessagedRecord: availableNonNegative(
      meta.averageMessagesPerConversation,
    ),
    medianMessagesPerMessagedRecord: availableNonNegative(
      meta.medianMessagesPerConversation,
    ),
    messagedRecordRate:
      meta.conversationCount > 0
        ? (meta.conversationsWithMessages / meta.conversationCount) * 100
        : null,
    recordsWithoutMessages,
    recordsWithoutMessagesRate:
      meta.conversationCount > 0
        ? (recordsWithoutMessages / meta.conversationCount) * 100
        : null,
  };
}

export function formatMessageAverage(value: number | null): string {
  return value === null ? "Unavailable" : value.toFixed(1);
}

export function formatRecordRate(value: number | null): string {
  return value === null ? "Unavailable" : `${Math.round(value)}%`;
}

export function formatSendingGap(
  seconds: number | null | undefined,
): string | null {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return null;
  }
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
