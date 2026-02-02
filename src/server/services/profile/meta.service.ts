import { differenceInDays } from "date-fns";

import type {
  Match,
  Message,
  TinderProfile,
  TinderUsage,
} from "@/server/db/schema";
import { getMedian } from "../meta-utils.service";

export type TinderProfileWithUsageAndMatches = TinderProfile & {
  usage: TinderUsage[];
  matches: (Match & { messages: Message[] })[];
};

export interface ComputeProfileMetaOptions {
  from?: Date;
  to?: Date;
}

type UsageAndMessages = {
  usage: TinderUsage[];
  matches: (Match & { messages: Message[] })[];
};

type UsageAndMessagesByPeriod = Record<string, UsageAndMessages>;

/**
 * Filter usage records by period
 */
export function filterUsageByPeriod(
  usage: TinderUsage[],
  period: string,
): TinderUsage[] {
  if (period === "all-time") return usage;

  const now = new Date();

  // Rolling periods
  if (period === "last-365-days") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 365);
    return usage.filter((u) => u.dateStamp >= cutoff);
  }
  if (period === "last-90-days") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);
    return usage.filter((u) => u.dateStamp >= cutoff);
  }
  if (period === "last-30-days") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    return usage.filter((u) => u.dateStamp >= cutoff);
  }

  // Year: "2024"
  if (/^\d{4}$/.test(period)) {
    const year = parseInt(period);
    return usage.filter((u) => u.dateStamp.getFullYear() === year);
  }

  // Quarter: "2024-Q1"
  if (/^\d{4}-Q[1-4]$/.test(period)) {
    const [yearStr, quarterStr] = period.split("-");
    const year = parseInt(yearStr!);
    const quarter = parseInt(quarterStr!.replace("Q", ""));
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 3;

    return usage.filter((u) => {
      const uYear = u.dateStamp.getFullYear();
      const uMonth = u.dateStamp.getMonth();
      return uYear === year && uMonth >= startMonth && uMonth < endMonth;
    });
  }

  return usage;
}

/**
 * Calculate conversation statistics from matches
 */
export function getMessagesMetaFromMatches(
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
    const messagesSent = conversation.messages.length;
    meta.averageConversationMessageCount += messagesSent;

    if (messagesSent === 0) {
      meta.nrOfGhostingsAfterInitialMatch += 1;
      conversationLengths.push({ days: 0, messages: 0 });
    } else {
      if (messagesSent === 1) {
        meta.numberOfOneMessageConversations += 1;
      }

      const conversationStartDate = new Date(
        conversation.messages[0]!.sentDate,
      );
      const conversationEndDate = new Date(
        conversation.messages[messagesSent - 1]!.sentDate,
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
        meta.messageCountInConversationTwoWeekMax = messagesSent;
      }

      conversationLengths.push({
        days: conversationLengthInDays,
        messages: messagesSent,
      });

      if (messagesSent > meta.maxConversationMessageCount) {
        meta.maxConversationMessageCount = messagesSent;
      }

      if (conversationLengthInDays > meta.longestConversationInDays) {
        meta.longestConversationInDays = conversationLengthInDays;
        meta.messageCountInLongestConversationInDays = messagesSent;
      }

      meta.averageConversationLengthInDays += conversationLengthInDays;
    }
  });

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

    meta.percentageOfOneMessageConversations = Math.round(
      (meta.numberOfOneMessageConversations / meta.numberOfConversations) * 100,
    );
  }
  meta.numberOfConversationsWithMessages =
    meta.numberOfConversations - meta.nrOfGhostingsAfterInitialMatch;

  return meta;
}

/**
 * Aggregate usage and messages by time period (month/year)
 */
export function aggregateUsageAndMessages(params: {
  usage: TinderUsage[];
  matches: (Match & { messages: Message[] })[];
}): {
  byMonth: UsageAndMessagesByPeriod;
  byYear: UsageAndMessagesByPeriod;
} {
  const startDate = params.usage[0]!.dateStamp;
  const endDate = params.usage[params.usage.length - 1]!.dateStamp;

  const aggregationByMonth = initializeMonthlyAggregations(startDate, endDate);
  const aggregationByYear = initializeYearlyAggregations(startDate, endDate);

  params.usage.forEach((usageDay) => {
    const month = usageDay.dateStampRaw.substring(0, 7); // YYYY-MM
    const year = usageDay.dateStampRaw.substring(0, 4); // YYYY

    aggregationByMonth[month]?.usage.push(usageDay);
    aggregationByYear[year]?.usage.push(usageDay);
  });

  params.matches.forEach((match) => {
    if (match.initialMessageAt) {
      const month = match.initialMessageAt.toISOString().substring(0, 7);
      const year = match.initialMessageAt.toISOString().substring(0, 4);

      aggregationByMonth[month]?.matches.push(match);
      aggregationByYear[year]?.matches.push(match);
    }
  });

  return {
    byMonth: aggregationByMonth,
    byYear: aggregationByYear,
  };
}

function initializeMonthlyAggregations(
  startDate: Date,
  endDate: Date,
): UsageAndMessagesByPeriod {
  const aggregationByMonth: UsageAndMessagesByPeriod = {};

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  for (
    let date = new Date(start);
    date <= end;
    date.setMonth(date.getMonth() + 1)
  ) {
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
    aggregationByMonth[monthKey] = {
      usage: [],
      matches: [],
    };
  }

  return aggregationByMonth;
}

function initializeYearlyAggregations(
  startDate: Date,
  endDate: Date,
): UsageAndMessagesByPeriod {
  const aggregationByYear: UsageAndMessagesByPeriod = {};

  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const yearKey = year.toString(); // YYYY
    aggregationByYear[yearKey] = {
      usage: [],
      matches: [],
    };
  }

  return aggregationByYear;
}

/**
 * Compute ProfileMeta for database storage.
 *
 * This is the canonical function for calculating Tinder profile statistics.
 * Returns only fields that exist in the profileMetaTable schema.
 *
 * Data sources:
 * - USAGE TABLE: Core totals (swipes, matches, messages, appOpens, daysActive)
 * - MATCHES TABLE: Conversation metrics (response times, durations, ghosting)
 *
 * Key features:
 * - All usage data is now real (no synthetic days since removal of expansion)
 * - Supports optional date range filtering via `options.from` and `options.to`
 * - Uses daysActive (appOpens > 0) for swipesPerDay calculation
 * - Computes conversation stats from pre-computed match-level data
 *
 * @param profile - Tinder profile with usage and matches data
 * @param options - Optional date range to filter data (defaults to all-time)
 */
export function computeProfileMeta(
  profile: TinderProfileWithUsageAndMatches,
  options?: ComputeProfileMetaOptions,
): {
  from: Date;
  to: Date;
  daysInPeriod: number;
  daysActive: number;
  swipeLikesTotal: number;
  swipePassesTotal: number;
  matchesTotal: number;
  messagesSentTotal: number;
  messagesReceivedTotal: number;
  appOpensTotal: number;
  likeRate: number;
  matchRate: number;
  swipesPerDay: number;
  conversationCount: number;
  conversationsWithMessages: number;
  ghostedCount: number;
  averageResponseTimeSeconds: number | null;
  medianConversationDurationDays: number | null;
  longestConversationDays: number | null;
  averageMessagesPerConversation: number | null;
  medianMessagesPerConversation: number | null;
  meanResponseTimeSeconds: number | null;
  computedAt: Date;
} {
  // Determine date range (default = all-time from profile dates)
  const from = options?.from ?? profile.firstDayOnApp;
  const to = options?.to ?? profile.lastDayOnApp;

  console.log(`   📊 Computing ProfileMeta...`);
  console.log(
    `      - Date range: ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
  );
  console.log(`      - ${profile.usage.length} usage records`);
  console.log(`      - ${profile.matches.length} matches`);

  // ═══════════════════════════════════════════════════════════════════
  // USAGE TABLE: Core totals
  // ═══════════════════════════════════════════════════════════════════
  // Apply date range filter (all usage data is now real - no synthetic days)
  const usageInRange = profile.usage.filter(
    (day) => day.dateStamp >= from && day.dateStamp <= to,
  );

  console.log(`      - ${usageInRange.length} usage days in range`);

  // Compute totals from usage data
  const totals = usageInRange.reduce(
    (acc, cur) => {
      acc.appOpensTotal += cur.appOpens;
      acc.matchesTotal += cur.matches;
      acc.swipeLikesTotal += cur.swipeLikes;
      acc.swipePassesTotal += cur.swipePasses;
      acc.messagesSentTotal += cur.messagesSent;
      acc.messagesReceivedTotal += cur.messagesReceived;
      // Count days with swipes for swipesPerDay calculation
      const hasSwipes = cur.swipeLikes > 0 || cur.swipePasses > 0;
      if (hasSwipes) {
        acc.daysWithSwipes++;
      }
      return acc;
    },
    {
      daysWithSwipes: 0,
      appOpensTotal: 0,
      matchesTotal: 0,
      swipeLikesTotal: 0,
      swipePassesTotal: 0,
      messagesSentTotal: 0,
      messagesReceivedTotal: 0,
    },
  );

  const daysInPeriod = differenceInDays(to, from) + 1;
  const combinedSwipes = totals.swipeLikesTotal + totals.swipePassesTotal;

  // Compute rates
  const likeRate =
    combinedSwipes > 0 ? totals.swipeLikesTotal / combinedSwipes : 0;
  const matchRate =
    totals.swipeLikesTotal > 0
      ? totals.matchesTotal / totals.swipeLikesTotal
      : 0;
  // Use daysWithSwipes for accurate "swipes per swiping day" metric
  const swipesPerDay =
    totals.daysWithSwipes > 0 ? combinedSwipes / totals.daysWithSwipes : 0;

  // ═══════════════════════════════════════════════════════════════════
  // MATCHES TABLE: Conversation metrics
  // ═══════════════════════════════════════════════════════════════════
  // Apply date range filter to matches (filter by matchedAt or initialMessageAt)
  const matchesInRange = options
    ? profile.matches.filter((m) => {
        // Use matchedAt if available, otherwise initialMessageAt
        const matchDate = m.matchedAt ?? m.initialMessageAt;
        if (!matchDate) return false; // Skip matches without any date
        return matchDate >= from && matchDate <= to;
      })
    : profile.matches; // All-time: no filtering needed

  // Compute conversation stats from matches
  const conversationCount = matchesInRange.length;
  const conversationsWithMessages = matchesInRange.filter(
    (m) => m.messages.length > 0,
  ).length;
  const ghostedCount = conversationCount - conversationsWithMessages;

  // Compute aggregate message metrics from match-level data
  const matchesWithMessages = matchesInRange.filter(
    (m) => m.messages.length > 0,
  );

  // Response time: both median and mean
  const responseTimesValid = matchesInRange
    .map((m) => m.responseTimeMedianSeconds)
    .filter((t): t is number => t !== null && t !== undefined);
  const averageResponseTimeSeconds =
    responseTimesValid.length > 0
      ? Math.round(getMedian(responseTimesValid))
      : null;
  const meanResponseTimeSeconds =
    responseTimesValid.length > 0
      ? Math.round(
          responseTimesValid.reduce((sum, t) => sum + t, 0) /
            responseTimesValid.length,
        )
      : null;

  // Conversation duration stats
  const durationsValid = matchesInRange
    .map((m) => m.conversationDurationDays)
    .filter((d): d is number => d !== null && d !== undefined && d > 0);
  const medianConversationDurationDays =
    durationsValid.length > 0 ? Math.round(getMedian(durationsValid)) : null;
  const longestConversationDays =
    durationsValid.length > 0 ? Math.max(...durationsValid) : null;

  // Average and median messages per conversation (only counting conversations with messages)
  const messageCounts = matchesWithMessages.map((m) => m.totalMessageCount);
  const averageMessagesPerConversation =
    messageCounts.length > 0
      ? messageCounts.reduce((sum, count) => sum + count, 0) /
        messageCounts.length
      : null;
  const medianMessagesPerConversation =
    messageCounts.length > 0 ? Math.round(getMedian(messageCounts)) : null;

  console.log(`      ✓ ProfileMeta computed`);

  return {
    from,
    to,
    daysInPeriod,
    daysActive: totals.daysWithSwipes,
    swipeLikesTotal: totals.swipeLikesTotal,
    swipePassesTotal: totals.swipePassesTotal,
    matchesTotal: totals.matchesTotal,
    messagesSentTotal: totals.messagesSentTotal,
    messagesReceivedTotal: totals.messagesReceivedTotal,
    appOpensTotal: totals.appOpensTotal,
    likeRate,
    matchRate,
    swipesPerDay,
    conversationCount,
    conversationsWithMessages,
    ghostedCount,
    // Aggregate message metrics
    averageResponseTimeSeconds,
    meanResponseTimeSeconds,
    medianConversationDurationDays,
    longestConversationDays,
    averageMessagesPerConversation,
    medianMessagesPerConversation,
    computedAt: new Date(),
  };
}
