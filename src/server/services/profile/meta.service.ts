import { differenceInDays } from "date-fns";

import type {
  Match,
  Message,
  ProfileMetaInsert,
  TinderProfile,
  TinderUsage,
} from "@/server/db/schema";
import { getMedian, getRatio } from "../meta-utils.service";

type TinderProfileWithUsageAndMatches = TinderProfile & {
  usage: TinderUsage[];
  matches: (Match & { messages: Message[] })[];
};

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
 * Create profile meta for a specific time period
 */
export function createProfileMeta(
  profile: TinderProfileWithUsageAndMatches,
  options: { from: Date; to: Date; period?: string },
): Omit<ProfileMetaInsert, "id" | "tinderProfileId" | "hingeProfileId"> {
  // Filter usage by period if specified
  const filteredUsage = options.period
    ? filterUsageByPeriod(profile.usage, options.period)
    : profile.usage;

  // Create a profile copy with filtered usage for calculation
  const profileForCalc = { ...profile, usage: filteredUsage };

  const daysInPeriod = differenceInDays(options.to, options.from) + 1;

  const individualUsageArrays = {
    appOpens: [] as number[],
    swipeLikes: [] as number[],
    swipeSuperLikes: [] as number[],
    swipePasses: [] as number[],
    combinedSwipes: [] as number[],
    messagesSent: [] as number[],
    messagesReceived: [] as number[],
    matches: [] as number[],
  };

  let previousDate = new Date(options.from);
  const usageReduced = profileForCalc.usage.reduce(
    (acc, cur) => {
      acc.appOpensTotal += cur.appOpens;
      if (cur.appOpens > 0) {
        acc.daysActiveOnApp++;
      } else {
        acc.daysNotActiveOnApp++;
      }

      acc.matchesTotal += cur.matches;
      acc.swipeLikesTotal += cur.swipeLikes;
      acc.swipeSuperLikesTotal += cur.swipeSuperLikes;
      acc.swipePassesTotal += cur.swipePasses;
      acc.messagesSentTotal += cur.messagesSent;
      acc.messagesReceivedTotal += cur.messagesReceived;

      if (cur.swipeLikes > 0) {
        acc.daysYouSwiped++;
      }
      if (cur.messagesSent > 0) {
        acc.daysYouMessaged++;
      }

      if (cur.appOpens > 0 && cur.swipeLikes === 0) {
        acc.daysAppOpenedNoSwipe++;
      }
      if (cur.appOpens > 0 && cur.messagesSent === 0) {
        acc.daysAppOpenedNoMessage++;
      }
      if (cur.appOpens > 0 && cur.swipeLikes === 0 && cur.messagesSent === 0) {
        acc.daysAppOpenedNoSwipeOrMessage++;
      }

      individualUsageArrays.appOpens.push(cur.appOpens);
      individualUsageArrays.swipeLikes.push(cur.swipeLikes);
      individualUsageArrays.swipeSuperLikes.push(cur.swipeSuperLikes);
      individualUsageArrays.swipePasses.push(cur.swipePasses);
      individualUsageArrays.messagesSent.push(cur.messagesSent);
      individualUsageArrays.messagesReceived.push(cur.messagesReceived);
      individualUsageArrays.matches.push(cur.matches);
      individualUsageArrays.combinedSwipes.push(cur.swipesCombined);

      if (cur.matches > acc.peakMatches) {
        acc.peakMatches = cur.matches;
        acc.peakMatchesDate = cur.dateStamp;
      }
      if (cur.appOpens > acc.peakAppOpens) {
        acc.peakAppOpens = cur.appOpens;
        acc.peakAppOpensDate = cur.dateStamp;
      }
      if (cur.swipeLikes > acc.peakSwipeLikes) {
        acc.peakSwipeLikes = cur.swipeLikes;
        acc.peakSwipeLikesDate = cur.dateStamp;
      }
      if (cur.swipePasses > acc.peakSwipePasses) {
        acc.peakSwipePasses = cur.swipePasses;
        acc.peakSwipePassesDate = cur.dateStamp;
      }
      if (cur.swipesCombined > acc.peakCombinedSwipes) {
        acc.peakCombinedSwipes = cur.swipesCombined;
        acc.peakCombinedSwipesDate = cur.dateStamp;
      }
      if (cur.messagesSent > acc.peakMessagesSent) {
        acc.peakMessagesSent = cur.messagesSent;
        acc.peakMessagesSentDate = cur.dateStamp;
      }
      if (cur.messagesReceived > acc.peakMessagesReceived) {
        acc.peakMessagesReceived = cur.messagesReceived;
        acc.peakMessagesReceivedDate = cur.dateStamp;
      }

      if (cur.swipesCombined >= 100) {
        acc.dailySwipeLimitsReached++;
      }

      const currentDate = new Date(cur.dateStamp);
      const diffDays = Math.ceil(
        (currentDate.getTime() - previousDate.getTime()) / (1000 * 3600 * 24),
      );

      if (diffDays === 1) {
        acc.currentActiveOnAppStreak++;
      } else {
        acc.longestActiveOnAppStreak = Math.max(
          acc.longestActiveOnAppStreak,
          acc.currentActiveOnAppStreak,
        );
        acc.currentActiveOnAppStreak = 1;
        acc.longestActiveOnAppGap = Math.max(
          acc.longestActiveOnAppGap,
          diffDays - 1,
        );
      }

      previousDate = currentDate;

      return acc;
    },
    {
      daysActiveOnApp: 0,
      daysNotActiveOnApp: 0,
      appOpensTotal: 0,
      matchesTotal: 0,
      swipeLikesTotal: 0,
      swipeSuperLikesTotal: 0,
      swipePassesTotal: 0,
      messagesSentTotal: 0,
      messagesReceivedTotal: 0,
      daysYouSwiped: 0,
      daysYouMessaged: 0,
      daysAppOpenedNoSwipe: 0,
      daysAppOpenedNoMessage: 0,
      daysAppOpenedNoSwipeOrMessage: 0,
      peakMatches: 0,
      peakMatchesDate: options.from,
      peakAppOpens: 0,
      peakAppOpensDate: options.from,
      peakSwipeLikes: 0,
      peakSwipeLikesDate: options.from,
      peakSwipePasses: 0,
      peakSwipePassesDate: options.from,
      peakCombinedSwipes: 0,
      peakCombinedSwipesDate: options.from,
      peakMessagesSent: 0,
      peakMessagesSentDate: options.from,
      peakMessagesReceived: 0,
      peakMessagesReceivedDate: options.from,
      dailySwipeLimitsReached: 0,
      currentActiveOnAppStreak: 1,
      longestActiveOnAppStreak: 1,
      longestActiveOnAppGap: 0,
    },
  );

  const combinedSwipesTotal =
    usageReduced.swipeLikesTotal + usageReduced.swipePassesTotal;

  const matchRateForPeriod = getRatio(
    usageReduced.matchesTotal,
    usageReduced.swipeLikesTotal,
  );
  const likeRateForPeriod = getRatio(
    usageReduced.swipeLikesTotal,
    combinedSwipesTotal,
  );
  const _totalMessages =
    usageReduced.messagesSentTotal + usageReduced.messagesReceivedTotal;

  const messagesMeta = getMessagesMetaFromMatches(profile.matches);

  // Compute aggregate message metrics from match-level data
  const matchesWithMessages = profile.matches.filter(
    (m) => m.totalMessageCount > 0,
  );

  const responseTimesValid = profile.matches
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

  const durationsValid = profile.matches
    .map((m) => m.conversationDurationDays)
    .filter((d): d is number => d !== null && d !== undefined && d > 0);
  const medianConversationDurationDays =
    durationsValid.length > 0 ? Math.round(getMedian(durationsValid)) : null;
  const longestConversationDays =
    durationsValid.length > 0 ? Math.max(...durationsValid) : null;

  const messageCounts = matchesWithMessages.map((m) => m.totalMessageCount);
  const averageMessagesPerConversation =
    messageCounts.length > 0
      ? messageCounts.reduce((sum, count) => sum + count, 0) /
        messageCounts.length
      : null;
  const medianMessagesPerConversation =
    messageCounts.length > 0 ? Math.round(getMedian(messageCounts)) : null;

  // Return only fields that exist in the simplified ProfileMeta schema
  return {
    from: options.from,
    to: options.to,
    daysInPeriod,
    daysActive: usageReduced.daysActiveOnApp,
    swipeLikesTotal: usageReduced.swipeLikesTotal,
    swipePassesTotal: usageReduced.swipePassesTotal,
    matchesTotal: usageReduced.matchesTotal,
    messagesSentTotal: usageReduced.messagesSentTotal,
    messagesReceivedTotal: usageReduced.messagesReceivedTotal,
    appOpensTotal: usageReduced.appOpensTotal,
    likeRate: likeRateForPeriod,
    matchRate: matchRateForPeriod,
    swipesPerDay: combinedSwipesTotal / daysInPeriod,
    conversationCount: messagesMeta.numberOfConversations,
    conversationsWithMessages: messagesMeta.numberOfConversationsWithMessages,
    ghostedCount: messagesMeta.nrOfGhostingsAfterInitialMatch,
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
 * Create profile meta matching the simplified database schema
 * Only includes fields that exist in profileMetaTable
 */
export function createSimplifiedProfileMeta(
  tp: TinderProfileWithUsageAndMatches,
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
  console.log(`   📊 Creating metadata...`);
  console.log(`      - ${tp.usage.length} usage records`);
  console.log(`      - ${tp.matches.length} matches`);

  // Compute totals from usage data
  const totals = tp.usage.reduce(
    (acc, cur) => {
      acc.appOpensTotal += cur.appOpens;
      acc.matchesTotal += cur.matches;
      acc.swipeLikesTotal += cur.swipeLikes;
      acc.swipePassesTotal += cur.swipePasses;
      acc.messagesSentTotal += cur.messagesSent;
      acc.messagesReceivedTotal += cur.messagesReceived;
      if (cur.appOpens > 0) {
        acc.daysActive++;
      }
      return acc;
    },
    {
      daysActive: 0,
      appOpensTotal: 0,
      matchesTotal: 0,
      swipeLikesTotal: 0,
      swipePassesTotal: 0,
      messagesSentTotal: 0,
      messagesReceivedTotal: 0,
    },
  );

  const daysInPeriod = differenceInDays(tp.lastDayOnApp, tp.firstDayOnApp) + 1;
  const combinedSwipes = totals.swipeLikesTotal + totals.swipePassesTotal;

  // Compute rates
  const likeRate =
    combinedSwipes > 0 ? totals.swipeLikesTotal / combinedSwipes : 0;
  const matchRate =
    totals.swipeLikesTotal > 0
      ? totals.matchesTotal / totals.swipeLikesTotal
      : 0;
  const swipesPerDay = daysInPeriod > 0 ? combinedSwipes / daysInPeriod : 0;

  // Compute conversation stats from matches
  const conversationCount = tp.matches.length;
  const conversationsWithMessages = tp.matches.filter(
    (m) => m.messages.length > 0,
  ).length;
  const ghostedCount = conversationCount - conversationsWithMessages;

  // Compute aggregate message metrics from match-level data
  const matchesWithMessages = tp.matches.filter((m) => m.messages.length > 0);

  // Response time: both median and mean
  const responseTimesValid = tp.matches
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
  const durationsValid = tp.matches
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

  console.log(`      ✓ Meta computed`);

  return {
    from: tp.firstDayOnApp,
    to: tp.lastDayOnApp,
    daysInPeriod,
    daysActive: totals.daysActive,
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
