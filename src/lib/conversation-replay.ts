const DAY_MS = 24 * 60 * 60 * 1000;

export type ConversationReplayInput = {
  id: string;
  order: number;
  messages: Array<{
    sentDate: Date;
    content: string;
    charCount: number;
  }>;
};

export type ConversationReplayMetric = {
  matchId: string;
  matchOrder: number;
  messageCount: number;
  activeDays: number;
  durationDays: number;
};

export type ConversationReplay = {
  conversationCount: number;
  sustainedConversationCount: number;
  oneMessageConversationCount: number;
  highlights: {
    mostMessages: ConversationReplayMetric | null;
    longestRunning: ConversationReplayMetric | null;
    mostRevisited: ConversationReplayMetric | null;
  };
  openerComparison: {
    sustained: {
      sampleSize: number;
      questionRate: number;
      averageLength: number;
    };
    oneMessage: {
      sampleSize: number;
      questionRate: number;
      averageLength: number;
    };
  } | null;
};

type ConversationMetric = ConversationReplayMetric & {
  durationMs: number;
  firstTextMessage: { content: string; charCount: number } | null;
};

function percentage(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function toMetric(metric: ConversationMetric): ConversationReplayMetric {
  const {
    durationMs: _durationMs,
    firstTextMessage: _firstTextMessage,
    ...result
  } = metric;
  return result;
}

function buildMetric(
  conversation: ConversationReplayInput,
): ConversationMetric | null {
  const messages = [...conversation.messages].sort(
    (a, b) => a.sentDate.getTime() - b.sentDate.getTime(),
  );

  if (messages.length === 0) return null;

  const first = messages[0]!;
  const last = messages[messages.length - 1]!;
  const durationMs = Math.max(
    0,
    last.sentDate.getTime() - first.sentDate.getTime(),
  );
  const activeDays = new Set(
    messages.map((message) => message.sentDate.toISOString().slice(0, 10)),
  ).size;
  const firstTextMessage =
    messages.find((message) => message.content.trim().length > 0) ?? null;

  return {
    matchId: conversation.id,
    matchOrder: conversation.order,
    messageCount: messages.length,
    activeDays,
    durationDays: Math.floor(durationMs / DAY_MS),
    durationMs,
    firstTextMessage,
  };
}

function openerStats(conversations: ConversationMetric[]) {
  const openers = conversations.flatMap((conversation) =>
    conversation.firstTextMessage ? [conversation.firstTextMessage] : [],
  );

  return {
    sampleSize: openers.length,
    questionRate: percentage(
      openers.filter((opener) => opener.content.includes("?")).length,
      openers.length,
    ),
    averageLength: average(openers.map((opener) => opener.charCount)),
  };
}

/**
 * Builds an explainable replay from outgoing messages only.
 *
 * A sustained conversation is a behavioral proxy, not proof of a reply or a
 * successful interaction: it has either five sent messages or activity on at
 * least two separate UTC dates. One-message conversations form the comparison
 * group. Conversations in between remain in the highlights but are excluded
 * from the opener comparison so the groups stay meaningfully distinct.
 */
export function buildConversationReplay(
  conversations: ConversationReplayInput[],
): ConversationReplay {
  const metrics = conversations
    .map(buildMetric)
    .filter((metric): metric is ConversationMetric => metric !== null);

  const sustained = metrics.filter(
    (metric) => metric.messageCount >= 5 || metric.activeDays >= 2,
  );
  const oneMessage = metrics.filter((metric) => metric.messageCount === 1);

  const mostMessages = [...metrics].sort(
    (a, b) => b.messageCount - a.messageCount || b.activeDays - a.activeDays,
  )[0];
  const longestRunning = [...metrics].sort(
    (a, b) => b.durationMs - a.durationMs || b.messageCount - a.messageCount,
  )[0];
  const mostRevisited = [...metrics].sort(
    (a, b) => b.activeDays - a.activeDays || b.messageCount - a.messageCount,
  )[0];

  const sustainedStats = openerStats(sustained);
  const oneMessageStats = openerStats(oneMessage);
  const hasComparableOpeners =
    sustainedStats.sampleSize > 0 && oneMessageStats.sampleSize > 0;

  return {
    conversationCount: metrics.length,
    sustainedConversationCount: sustained.length,
    oneMessageConversationCount: oneMessage.length,
    highlights: {
      mostMessages: mostMessages ? toMetric(mostMessages) : null,
      longestRunning: longestRunning ? toMetric(longestRunning) : null,
      mostRevisited: mostRevisited ? toMetric(mostRevisited) : null,
    },
    openerComparison: hasComparableOpeners
      ? {
          sustained: sustainedStats,
          oneMessage: oneMessageStats,
        }
      : null,
  };
}
