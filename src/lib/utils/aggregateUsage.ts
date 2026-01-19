import type { TinderUsage } from "@/server/db/schema";

export type TimeGranularity =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type AggregatedUsageData = {
  period: string; // "2024-01-15" | "2024-W03" | "2024-01" | "2024-Q1" | "2024"
  periodDisplay: string; // "Jan 15" | "Week of Jan 15" | "January" | "Q1 2024" | "2024"
  matches: number;
  swipeLikes: number;
  swipePasses: number;
  appOpens: number;
  messagesSent: number;
  messagesReceived: number;
  swipesCombined: number;
  matchRate: number;
  likeRatio: number;
};

/**
 * Main aggregation function that dispatches to specific granularity handlers
 */
export function aggregateUsageData(
  usage: TinderUsage[],
  granularity: TimeGranularity,
): AggregatedUsageData[] {
  switch (granularity) {
    case "daily":
      return aggregateToDaily(usage);
    case "weekly":
      return aggregateToWeekly(usage);
    case "monthly":
      return aggregateToMonthly(usage);
    case "quarterly":
      return aggregateToQuarterly(usage);
    case "yearly":
      return aggregateToYearly(usage);
  }
}

/**
 * Daily aggregation - pass-through with formatting
 */
function aggregateToDaily(usage: TinderUsage[]): AggregatedUsageData[] {
  return usage.map((day) => {
    const date = new Date(day.dateStamp);
    const totalSwipes = day.swipeLikes + day.swipePasses;

    return {
      period: day.dateStampRaw,
      periodDisplay: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      matches: day.matches,
      swipeLikes: day.swipeLikes,
      swipePasses: day.swipePasses,
      appOpens: day.appOpens,
      messagesSent: day.messagesSent,
      messagesReceived: day.messagesReceived,
      swipesCombined: day.swipesCombined,
      matchRate: day.swipeLikes > 0 ? day.matches / day.swipeLikes : 0,
      likeRatio: totalSwipes > 0 ? day.swipeLikes / totalSwipes : 0,
    };
  });
}

/**
 * Weekly aggregation using ISO week numbers
 */
function aggregateToWeekly(usage: TinderUsage[]): AggregatedUsageData[] {
  const weeklyMap = new Map<string, TinderUsage[]>();

  usage.forEach((day) => {
    const date = new Date(day.dateStamp);
    const weekKey = getISOWeekKey(date);

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, []);
    }
    weeklyMap.get(weekKey)!.push(day);
  });

  return Array.from(weeklyMap.entries())
    .map(([weekKey, days]) => {
      // Get start of week for display
      const firstDay = new Date(days[0]!.dateStamp);
      const dayOfWeek = firstDay.getDay();
      const startOfWeek = new Date(firstDay);
      startOfWeek.setDate(firstDay.getDate() - dayOfWeek);

      return {
        period: weekKey,
        periodDisplay: `Week of ${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        ...aggregateDays(days),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Monthly aggregation
 */
function aggregateToMonthly(usage: TinderUsage[]): AggregatedUsageData[] {
  const monthlyMap = new Map<string, TinderUsage[]>();

  usage.forEach((day) => {
    const monthKey = day.dateStampRaw.slice(0, 7); // "YYYY-MM"

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, []);
    }
    monthlyMap.get(monthKey)!.push(day);
  });

  return Array.from(monthlyMap.entries())
    .map(([monthKey, days]) => {
      const date = new Date(monthKey + "-01");
      return {
        period: monthKey,
        periodDisplay: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        ...aggregateDays(days),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Quarterly aggregation
 */
function aggregateToQuarterly(usage: TinderUsage[]): AggregatedUsageData[] {
  const quarterlyMap = new Map<string, TinderUsage[]>();

  usage.forEach((day) => {
    const date = new Date(day.dateStamp);
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const quarterKey = `${year}-Q${quarter}`;

    if (!quarterlyMap.has(quarterKey)) {
      quarterlyMap.set(quarterKey, []);
    }
    quarterlyMap.get(quarterKey)!.push(day);
  });

  return Array.from(quarterlyMap.entries())
    .map(([quarterKey, days]) => {
      return {
        period: quarterKey,
        periodDisplay: quarterKey.replace("-", " "), // "2024 Q1"
        ...aggregateDays(days),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Yearly aggregation
 */
function aggregateToYearly(usage: TinderUsage[]): AggregatedUsageData[] {
  const yearlyMap = new Map<string, TinderUsage[]>();

  usage.forEach((day) => {
    const yearKey = day.dateStampRaw.slice(0, 4); // "YYYY"

    if (!yearlyMap.has(yearKey)) {
      yearlyMap.set(yearKey, []);
    }
    yearlyMap.get(yearKey)!.push(day);
  });

  return Array.from(yearlyMap.entries())
    .map(([yearKey, days]) => {
      return {
        period: yearKey,
        periodDisplay: yearKey,
        ...aggregateDays(days),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Helper: Aggregate an array of daily usage into totals and calculated metrics
 */
function aggregateDays(
  days: TinderUsage[],
): Omit<AggregatedUsageData, "period" | "periodDisplay"> {
  const totals = days.reduce(
    (acc, day) => ({
      matches: acc.matches + day.matches,
      swipeLikes: acc.swipeLikes + day.swipeLikes,
      swipePasses: acc.swipePasses + day.swipePasses,
      appOpens: acc.appOpens + day.appOpens,
      messagesSent: acc.messagesSent + day.messagesSent,
      messagesReceived: acc.messagesReceived + day.messagesReceived,
      swipesCombined: acc.swipesCombined + day.swipesCombined,
    }),
    {
      matches: 0,
      swipeLikes: 0,
      swipePasses: 0,
      appOpens: 0,
      messagesSent: 0,
      messagesReceived: 0,
      swipesCombined: 0,
    },
  );

  const totalSwipes = totals.swipeLikes + totals.swipePasses;

  return {
    ...totals,
    matchRate: totals.swipeLikes > 0 ? totals.matches / totals.swipeLikes : 0,
    likeRatio: totalSwipes > 0 ? totals.swipeLikes / totalSwipes : 0,
  };
}

/**
 * Helper: Get ISO week key in format "YYYY-W##"
 */
function getISOWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Filter usage data by date range (inclusive)
 */
export function filterUsageByDateRange(
  usage: TinderUsage[],
  from: Date,
  to: Date,
): TinderUsage[] {
  // Normalize dates to start/end of day for comparison
  const fromTime = new Date(from);
  fromTime.setHours(0, 0, 0, 0);

  const toTime = new Date(to);
  toTime.setHours(23, 59, 59, 999);

  return usage.filter((day) => {
    const dayDate = new Date(day.dateStamp);
    return dayDate >= fromTime && dayDate <= toTime;
  });
}

/**
 * Calculate the previous period dates given a current period
 * Returns a period with the same duration, ending just before the current period starts
 */
export function calculatePreviousPeriod(
  from: Date,
  to: Date,
): { from: Date; to: Date } {
  const durationMs = to.getTime() - from.getTime();

  const previousTo = new Date(from.getTime() - 1); // End 1ms before current period starts
  const previousFrom = new Date(previousTo.getTime() - durationMs);

  return {
    from: previousFrom,
    to: previousTo,
  };
}
