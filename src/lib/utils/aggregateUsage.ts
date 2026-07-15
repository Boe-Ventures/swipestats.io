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

const CALENDAR_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseCalendarDateKey(dateKey: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = CALENDAR_DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new Error(`Invalid calendar date: ${dateKey}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${dateKey}`);
  }

  return { year, month, day };
}

function isCalendarDateKey(dateKey: string): boolean {
  try {
    parseCalendarDateKey(dateKey);
    return true;
  } catch {
    return false;
  }
}

function utcDateToCalendarDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid date");
  return date.toISOString().slice(0, 10);
}

/**
 * Tinder usage is keyed by a provider calendar day. Historical `dateStamp`
 * values were serialized through local time and can point at the prior UTC
 * day, so the source key must win whenever it contains a valid date prefix.
 */
function getUsageCalendarDateKey(day: TinderUsage): string {
  const sourceDate = day.dateStampRaw?.slice(0, 10);
  if (sourceDate && isCalendarDateKey(sourceDate)) return sourceDate;

  return utcDateToCalendarDateKey(day.dateStamp);
}

function calendarDateKeyToUtcDate(dateKey: string): Date {
  const { year, month, day } = parseCalendarDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day));
}

function calendarDateKeyToLocalDate(dateKey: string): Date {
  const { year, month, day } = parseCalendarDateKey(dateKey);
  return new Date(year, month - 1, day);
}

function localDateToCalendarDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid date");

  return `${String(date.getFullYear()).padStart(4, "0")}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addCalendarDays(dateKey: string, days: number): string {
  const date = calendarDateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToCalendarDateKey(date);
}

/** Return the exact bucket key used by Tinder aggregation for a UI date. */
export function getUsagePeriodKey(
  date: Date,
  granularity: TimeGranularity,
): string {
  const dateKey = localDateToCalendarDateKey(date);
  const { year, month } = parseCalendarDateKey(dateKey);

  switch (granularity) {
    case "daily":
      return dateKey;
    case "weekly":
      return getISOWeekKey(dateKey);
    case "monthly":
      return dateKey.slice(0, 7);
    case "quarterly":
      return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    case "yearly":
      return String(year);
  }
}

/** Return the exact bucket label used by Tinder aggregation for a UI date. */
export function getUsagePeriodDisplay(
  date: Date,
  granularity: TimeGranularity,
): string {
  const period = getUsagePeriodKey(date, granularity);
  return getUsagePeriodDisplayFromKey(period, granularity);
}

export function getUsagePeriodDisplayFromKey(
  period: string,
  granularity: TimeGranularity,
): string {
  switch (granularity) {
    case "daily":
      return formatCalendarDate(period, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "weekly":
      return `Week of ${formatCalendarDate(
        utcDateToCalendarDateKey(weekKeyToDate(period)),
        { month: "short", day: "numeric", year: "numeric" },
      )}`;
    case "monthly":
      return formatCalendarDate(`${period}-01`, {
        month: "short",
        year: "numeric",
      });
    case "quarterly":
      return period.replace("-", " ");
    case "yearly":
      return period;
  }
}

/** Fill the complete selected window, including inactive leading/trailing buckets. */
export function fillUsagePeriodRange(
  data: AggregatedUsageData[],
  granularity: TimeGranularity,
  from: Date,
  to: Date,
): AggregatedUsageData[] {
  const firstPeriod = getUsagePeriodKey(from, granularity);
  const lastPeriod = getUsagePeriodKey(to, granularity);
  if (lastPeriod < firstPeriod) return [];

  let periods: string[];
  switch (granularity) {
    case "daily":
      periods = generateDayRange(firstPeriod, lastPeriod);
      break;
    case "weekly":
      periods = generateWeekRange(firstPeriod, lastPeriod);
      break;
    case "monthly":
      periods = generateMonthRange(firstPeriod, lastPeriod);
      break;
    case "quarterly":
      periods = generateQuarterRange(firstPeriod, lastPeriod);
      break;
    case "yearly": {
      periods = [];
      for (let year = Number(firstPeriod); year <= Number(lastPeriod); year++) {
        periods.push(String(year));
      }
      break;
    }
  }

  const observed = new Map(data.map((period) => [period.period, period]));
  return periods.map(
    (period) =>
      observed.get(period) ?? {
        period,
        periodDisplay: getUsagePeriodDisplayFromKey(period, granularity),
        ...emptyAggregation(),
      },
  );
}

/**
 * Move source rows onto the corresponding elapsed day in a comparison window.
 * Coarse buckets are then rebuilt on the target calendar, avoiding lossy
 * array-index pairing when adjacent windows cross different month boundaries.
 */
export function alignUsageToComparisonPeriod(
  usage: TinderUsage[],
  sourceFrom: Date,
  targetFrom: Date,
): TinderUsage[] {
  const sourceStart = localDateToCalendarDateKey(sourceFrom);
  const targetStart = localDateToCalendarDateKey(targetFrom);

  return usage.map((day) => {
    const offset = differenceInCalendarDays(
      sourceStart,
      getUsageCalendarDateKey(day),
    );
    const targetDate = addCalendarDays(targetStart, offset);
    return {
      ...day,
      dateStampRaw: targetDate,
      dateStamp: calendarDateKeyToUtcDate(targetDate),
    };
  });
}

function differenceInCalendarDays(from: string, to: string): number {
  return Math.round(
    (calendarDateKeyToUtcDate(to).getTime() -
      calendarDateKeyToUtcDate(from).getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

function formatCalendarDate(
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return calendarDateKeyToUtcDate(dateKey).toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });
}

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
  const dailyMap = new Map<string, TinderUsage[]>();
  usage.forEach((day) => {
    const dateKey = getUsageCalendarDateKey(day);
    const existing = dailyMap.get(dateKey) ?? [];
    existing.push(day);
    dailyMap.set(dateKey, existing);
  });

  // Find date range from actual data
  const sortedDates = Array.from(dailyMap.keys()).sort();
  const firstDate = sortedDates[0]!;
  const lastDate = sortedDates[sortedDates.length - 1]!;

  // Generate all days in range (filling gaps)
  const allDays = generateDayRange(firstDate, lastDate);

  return allDays.map((dateKey) => {
    const days = dailyMap.get(dateKey);
    const periodDisplay = formatCalendarDate(dateKey, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (days?.length) {
      return {
        period: dateKey,
        periodDisplay,
        ...aggregateDays(days),
      };
    } else {
      // Gap day - return zeros
      return {
        period: dateKey,
        periodDisplay,
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
    const weekKey = getISOWeekKey(getUsageCalendarDateKey(day));

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
      return {
        period: weekKey,
        periodDisplay: `Week of ${formatCalendarDate(
          utcDateToCalendarDateKey(weekKeyToDate(weekKey)),
          { month: "short", day: "numeric", year: "numeric" },
        )}`,
        ...aggregateDays(days),
      };
    } else {
      // Gap week - calculate display from week key
      const startOfWeek = weekKeyToDate(weekKey);
      return {
        period: weekKey,
        periodDisplay: `Week of ${formatCalendarDate(
          utcDateToCalendarDateKey(startOfWeek),
          { month: "short", day: "numeric", year: "numeric" },
        )}`,
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
    const monthKey = getUsageCalendarDateKey(day).slice(0, 7); // "YYYY-MM"

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
    const periodDisplay = formatCalendarDate(`${monthKey}-01`, {
      month: "short",
      year: "numeric",
    });

    if (days && days.length > 0) {
      return {
        period: monthKey,
        periodDisplay,
        ...aggregateDays(days),
      };
    } else {
      // Gap month - return zeros
      return {
        period: monthKey,
        periodDisplay,
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
    const { year, month } = parseCalendarDateKey(getUsageCalendarDateKey(day));
    const quarter = Math.floor((month - 1) / 3) + 1;
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
    const yearKey = getUsageCalendarDateKey(day).slice(0, 4); // "YYYY"

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
 * Helper: Get ISO week-year key in format "YYYY-W##".
 */
function getISOWeekKey(dateKey: string): string {
  const date = calendarDateKeyToUtcDate(dateKey);
  const isoDay = date.getUTCDay() || 7;

  // ISO week-year is the calendar year containing this week's Thursday.
  date.setUTCDate(date.getUTCDate() + 4 - isoDay);
  const weekYear = date.getUTCFullYear();
  const firstDayOfWeekYear = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(
    ((date.getTime() - firstDayOfWeekYear.getTime()) / MILLISECONDS_PER_DAY +
      1) /
      7,
  );

  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

/**
 * Helper: Convert week key back to date (start of that week)
 */
function weekKeyToDate(weekKey: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) throw new Error(`Invalid ISO week: ${weekKey}`);

  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthIsoDay = januaryFourth.getUTCDay() || 7;
  januaryFourth.setUTCDate(
    januaryFourth.getUTCDate() - januaryFourthIsoDay + 1 + (week - 1) * 7,
  );

  if (getISOWeekKey(utcDateToCalendarDateKey(januaryFourth)) !== weekKey) {
    throw new Error(`Invalid ISO week: ${weekKey}`);
  }

  return januaryFourth;
}

/**
 * Helper: Generate all days between two date keys (inclusive)
 */
function generateDayRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const current = calendarDateKeyToUtcDate(startDate);
  const end = calendarDateKeyToUtcDate(endDate);

  while (current <= end) {
    days.push(utcDateToCalendarDateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
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
    weeks.push(getISOWeekKey(utcDateToCalendarDateKey(current)));
    current.setUTCDate(current.getUTCDate() + 7);
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
 * Filter source calendar-day usage by a local UI date range (inclusive).
 */
export function filterUsageByDateRange(
  usage: TinderUsage[],
  from: Date,
  to: Date,
): TinderUsage[] {
  const fromKey = localDateToCalendarDateKey(from);
  const toKey = localDateToCalendarDateKey(to);
  if (toKey < fromKey) return [];

  return usage.filter((day) => {
    const dayKey = getUsageCalendarDateKey(day);
    return dayKey >= fromKey && dayKey <= toKey;
  });
}

/** Return exactly `dayCount` local calendar days, including `to`. */
export function calculateInclusiveDateRange(
  dayCount: number,
  to = new Date(),
): { from: Date; to: Date } {
  if (!Number.isInteger(dayCount) || dayCount < 1) {
    throw new Error("dayCount must be a positive integer");
  }

  const toKey = localDateToCalendarDateKey(to);
  const fromKey = addCalendarDays(toKey, -(dayCount - 1));

  return {
    from: calendarDateKeyToLocalDate(fromKey),
    to: calendarDateKeyToLocalDate(toKey),
  };
}

/**
 * Calculate the previous period dates given a current period
 * Returns the same number of inclusive calendar days, ending on the calendar
 * day immediately before the current period starts.
 */
export function calculatePreviousPeriod(
  from: Date,
  to: Date,
): { from: Date; to: Date } {
  const fromKey = localDateToCalendarDateKey(from);
  const toKey = localDateToCalendarDateKey(to);
  const durationDays = differenceInCalendarDays(fromKey, toKey) + 1;
  if (durationDays < 1) {
    throw new Error("Current period must end on or after it starts");
  }

  const previousToKey = addCalendarDays(fromKey, -1);
  const previousFromKey = addCalendarDays(previousToKey, -(durationDays - 1));

  return {
    from: calendarDateKeyToLocalDate(previousFromKey),
    to: calendarDateKeyToLocalDate(previousToKey),
  };
}
