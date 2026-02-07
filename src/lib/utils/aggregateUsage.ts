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
 * Daily aggregation - fills gaps with zero values to show accurate timeline
 */
function aggregateToDaily(usage: TinderUsage[]): AggregatedUsageData[] {
  if (usage.length === 0) return [];

  // Build a map of existing days
  const dailyMap = new Map<string, TinderUsage>();
  usage.forEach((day) => {
    dailyMap.set(day.dateStampRaw, day);
  });

  // Find date range from actual data
  const sortedDates = Array.from(dailyMap.keys()).sort();
  const firstDate = sortedDates[0]!;
  const lastDate = sortedDates[sortedDates.length - 1]!;

  // Generate all days in range (filling gaps)
  const allDays = generateDayRange(firstDate, lastDate);

  return allDays.map((dateKey) => {
    const day = dailyMap.get(dateKey);
    const date = new Date(dateKey);

    if (day) {
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
    } else {
      // Gap day - return zeros
      return {
        period: dateKey,
        periodDisplay: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        ...emptyAggregation(),
      };
    }
  });
}

/**
 * Weekly aggregation using ISO week numbers - fills gaps with zero values
 */
function aggregateToWeekly(usage: TinderUsage[]): AggregatedUsageData[] {
  if (usage.length === 0) return [];

  const weeklyMap = new Map<string, TinderUsage[]>();

  usage.forEach((day) => {
    const date = new Date(day.dateStamp);
    const weekKey = getISOWeekKey(date);

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, []);
    }
    weeklyMap.get(weekKey)!.push(day);
  });

  // Find date range from actual data
  const sortedWeeks = Array.from(weeklyMap.keys()).sort();
  const firstWeek = sortedWeeks[0]!;
  const lastWeek = sortedWeeks[sortedWeeks.length - 1]!;

  // Generate all weeks in range (filling gaps)
  const allWeeks = generateWeekRange(firstWeek, lastWeek);

  return allWeeks.map((weekKey) => {
    const days = weeklyMap.get(weekKey);

    if (days && days.length > 0) {
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
    } else {
      // Gap week - calculate display from week key
      const startOfWeek = weekKeyToDate(weekKey);
      return {
        period: weekKey,
        periodDisplay: `Week of ${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        ...emptyAggregation(),
      };
    }
  });
}

/**
 * Monthly aggregation - fills gaps with zero values to show accurate timeline
 */
function aggregateToMonthly(usage: TinderUsage[]): AggregatedUsageData[] {
  if (usage.length === 0) return [];

  const monthlyMap = new Map<string, TinderUsage[]>();

  usage.forEach((day) => {
    const monthKey = day.dateStampRaw.slice(0, 7); // "YYYY-MM"

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, []);
    }
    monthlyMap.get(monthKey)!.push(day);
  });

  // Find date range from actual data
  const sortedMonths = Array.from(monthlyMap.keys()).sort();
  const firstMonth = sortedMonths[0]!;
  const lastMonth = sortedMonths[sortedMonths.length - 1]!;

  // Generate all months in range (filling gaps)
  const allMonths = generateMonthRange(firstMonth, lastMonth);

  return allMonths.map((monthKey) => {
    const days = monthlyMap.get(monthKey);
    const date = new Date(monthKey + "-01");

    if (days && days.length > 0) {
      return {
        period: monthKey,
        periodDisplay: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        ...aggregateDays(days),
      };
    } else {
      // Gap month - return zeros
      return {
        period: monthKey,
        periodDisplay: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        ...emptyAggregation(),
      };
    }
  });
}

/**
 * Quarterly aggregation - fills gaps with zero values to show accurate timeline
 */
function aggregateToQuarterly(usage: TinderUsage[]): AggregatedUsageData[] {
  if (usage.length === 0) return [];

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

  // Find date range from actual data
  const sortedQuarters = Array.from(quarterlyMap.keys()).sort();
  const firstQuarter = sortedQuarters[0]!;
  const lastQuarter = sortedQuarters[sortedQuarters.length - 1]!;

  // Generate all quarters in range (filling gaps)
  const allQuarters = generateQuarterRange(firstQuarter, lastQuarter);

  return allQuarters.map((quarterKey) => {
    const days = quarterlyMap.get(quarterKey);

    if (days && days.length > 0) {
      return {
        period: quarterKey,
        periodDisplay: quarterKey.replace("-", " "), // "2024 Q1"
        ...aggregateDays(days),
      };
    } else {
      return {
        period: quarterKey,
        periodDisplay: quarterKey.replace("-", " "),
        ...emptyAggregation(),
      };
    }
  });
}

/**
 * Yearly aggregation - fills gaps with zero values to show accurate timeline
 */
function aggregateToYearly(usage: TinderUsage[]): AggregatedUsageData[] {
  if (usage.length === 0) return [];

  const yearlyMap = new Map<string, TinderUsage[]>();

  usage.forEach((day) => {
    const yearKey = day.dateStampRaw.slice(0, 4); // "YYYY"

    if (!yearlyMap.has(yearKey)) {
      yearlyMap.set(yearKey, []);
    }
    yearlyMap.get(yearKey)!.push(day);
  });

  // Find date range from actual data
  const sortedYears = Array.from(yearlyMap.keys()).sort();
  const firstYear = parseInt(sortedYears[0]!);
  const lastYear = parseInt(sortedYears[sortedYears.length - 1]!);

  // Generate all years in range (filling gaps)
  const allYears: string[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    allYears.push(year.toString());
  }

  return allYears.map((yearKey) => {
    const days = yearlyMap.get(yearKey);

    if (days && days.length > 0) {
      return {
        period: yearKey,
        periodDisplay: yearKey,
        ...aggregateDays(days),
      };
    } else {
      return {
        period: yearKey,
        periodDisplay: yearKey,
        ...emptyAggregation(),
      };
    }
  });
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
 * Helper: Convert week key back to date (start of that week)
 */
function weekKeyToDate(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = parseInt(yearStr!);
  const week = parseInt(weekStr!);

  // Get Jan 1 of the year
  const jan1 = new Date(year, 0, 1);
  // Calculate days to add (week number * 7, adjusted for Jan 1's day of week)
  const daysToAdd = (week - 1) * 7 - jan1.getDay();

  const result = new Date(year, 0, 1 + daysToAdd);
  return result;
}

/**
 * Helper: Generate all days between two date keys (inclusive)
 */
function generateDayRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    days.push(current.toISOString().split("T")[0]!);
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Helper: Generate all months between two month keys (inclusive)
 */
function generateMonthRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  const [startYear, startMo] = startMonth.split("-").map(Number) as [
    number,
    number,
  ];
  const [endYear, endMo] = endMonth.split("-").map(Number) as [number, number];

  let year = startYear;
  let month = startMo;

  while (year < endYear || (year === endYear && month <= endMo)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

/**
 * Helper: Generate all quarters between two quarter keys (inclusive)
 */
function generateQuarterRange(
  startQuarter: string,
  endQuarter: string,
): string[] {
  const quarters: string[] = [];
  const [startYear, startQ] = startQuarter.split("-Q").map(Number) as [
    number,
    number,
  ];
  const [endYear, endQ] = endQuarter.split("-Q").map(Number) as [
    number,
    number,
  ];

  let year = startYear;
  let quarter = startQ;

  while (year < endYear || (year === endYear && quarter <= endQ)) {
    quarters.push(`${year}-Q${quarter}`);
    quarter++;
    if (quarter > 4) {
      quarter = 1;
      year++;
    }
  }

  return quarters;
}

/**
 * Helper: Generate all weeks between two week keys (inclusive)
 */
function generateWeekRange(startWeek: string, endWeek: string): string[] {
  const weeks: string[] = [];

  // Convert week keys to dates, then iterate
  const current = weekKeyToDate(startWeek);
  const end = weekKeyToDate(endWeek);

  while (current <= end) {
    weeks.push(getISOWeekKey(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * Helper: Return an empty aggregation object (for gap periods)
 */
function emptyAggregation(): Omit<
  AggregatedUsageData,
  "period" | "periodDisplay"
> {
  return {
    matches: 0,
    swipeLikes: 0,
    swipePasses: 0,
    appOpens: 0,
    messagesSent: 0,
    messagesReceived: 0,
    swipesCombined: 0,
    matchRate: 0,
    likeRatio: 0,
  };
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
