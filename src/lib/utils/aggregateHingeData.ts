import type {
  HingeInsightsInteraction,
  HingeInsightsMatch,
} from "@/lib/types/hinge-profile";

export { calculatePreviousPeriod } from "./aggregateUsage";

export type TimeGranularity =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type AggregatedHingeData = {
  period: string;
  periodDisplay: string;
  matches: number;
  likes: number;
  rejects: number;
  messagesSent: number;
  totalMessages: number;
  conversationsStarted: number;
};

type DateEvent = {
  date: Date;
  type: "match" | "like" | "remove" | "messageSent";
  matchId?: string;
};

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function localSelectionDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function utcKeyToLocalSelectionDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Represent the current UTC provider bucket as a date-picker calendar value. */
export function getHingeUtcSelectionDate(now = new Date()): Date {
  return utcKeyToLocalSelectionDate(now);
}

export function calculateInclusiveHingeDateRange(
  dayCount: number,
  now = new Date(),
): { from: Date; to: Date } {
  if (!Number.isInteger(dayCount) || dayCount < 1) {
    throw new Error("dayCount must be a positive integer");
  }
  const toUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const fromUtc = addUtcCalendarDays(toUtc, -(dayCount - 1));
  return {
    from: utcKeyToLocalSelectionDate(fromUtc),
    to: utcKeyToLocalSelectionDate(toUtc),
  };
}

function addUtcCalendarDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function alignHingeDateToComparisonPeriod(
  date: Date,
  sourceFrom: Date,
  targetFrom: Date,
): Date {
  const sourceStart = new Date(
    `${localSelectionDateKey(sourceFrom)}T00:00:00Z`,
  );
  const targetStart = new Date(
    `${localSelectionDateKey(targetFrom)}T00:00:00Z`,
  );
  const sourceDay = new Date(`${utcDateKey(date)}T00:00:00Z`);
  const offset = Math.round(
    (sourceDay.getTime() - sourceStart.getTime()) / 86_400_000,
  );
  const targetDay = addUtcCalendarDays(targetStart, offset);
  targetDay.setUTCHours(
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  return targetDay;
}

/**
 * Move Hinge events onto the same elapsed day in the current comparison
 * window, preserving time-of-day and rebuilding coarse buckets afterwards.
 */
export function alignHingeInteractionsToComparisonPeriod(
  interactions: HingeInsightsInteraction[],
  sourceFrom: Date,
  targetFrom: Date,
): HingeInsightsInteraction[] {
  return interactions.map((interaction) => {
    const timestamp = new Date(interaction.timestamp);
    return {
      ...interaction,
      timestamp: alignHingeDateToComparisonPeriod(
        timestamp,
        sourceFrom,
        targetFrom,
      ),
    };
  });
}

/**
 * Move canonical match and message facts onto the same elapsed day in the
 * target window. This is a chart-only projection; raw provider timestamps are
 * deliberately left unchanged in persistence.
 */
export function alignHingeMatchesToComparisonPeriod(
  matches: HingeInsightsMatch[],
  sourceFrom: Date,
  targetFrom: Date,
): HingeInsightsMatch[] {
  return matches.map((match) => ({
    ...match,
    matchedAt: match.matchedAt
      ? alignHingeDateToComparisonPeriod(
          match.matchedAt,
          sourceFrom,
          targetFrom,
        )
      : null,
    messages: match.messages.map((message) => ({
      ...message,
      sentDate: alignHingeDateToComparisonPeriod(
        message.sentDate,
        sourceFrom,
        targetFrom,
      ),
    })),
  }));
}

function getUtcIsoWeek(date: Date): { key: string; monday: Date } {
  const calendarDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const isoDay = calendarDate.getUTCDay() || 7;
  const monday = new Date(calendarDate);
  monday.setUTCDate(calendarDate.getUTCDate() - (isoDay - 1));

  const thursday = new Date(calendarDate);
  thursday.setUTCDate(calendarDate.getUTCDate() + (4 - isoDay));
  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );

  return {
    key: `${isoYear}-W${String(week).padStart(2, "0")}`,
    monday,
  };
}

// REVIEW(provider assumption): Hinge timestamps are bucketed in UTC until the
// uploader timezone is persisted. Mixing browser-local and UTC buckets would
// otherwise move events between days, quarters, or years depending on viewer.
export function getHingePeriodKey(
  date: Date,
  granularity: TimeGranularity,
): string {
  const dayKey = utcDateKey(date);
  switch (granularity) {
    case "daily":
      return dayKey;
    case "weekly":
      return getUtcIsoWeek(date).key;
    case "monthly":
      return dayKey.slice(0, 7);
    case "quarterly":
      return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
    case "yearly":
      return String(date.getUTCFullYear());
  }
}

function getHingeSelectionPeriodKey(
  date: Date,
  granularity: TimeGranularity,
): string {
  return getHingePeriodKey(
    new Date(`${localSelectionDateKey(date)}T00:00:00Z`),
    granularity,
  );
}

export function getHingePeriodDisplay(
  date: Date,
  granularity: TimeGranularity,
): string {
  const utcOptions = { timeZone: "UTC" } as const;
  switch (granularity) {
    case "daily":
      return date.toLocaleDateString("en-US", {
        ...utcOptions,
        month: "short",
        day: "numeric",
      });
    case "weekly":
      return `Week of ${getUtcIsoWeek(date).monday.toLocaleDateString("en-US", {
        ...utcOptions,
        month: "short",
        day: "numeric",
      })}`;
    case "monthly":
      return date.toLocaleDateString("en-US", {
        ...utcOptions,
        month: "short",
        year: "numeric",
      });
    case "quarterly":
      return `${date.getUTCFullYear()} Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
    case "yearly":
      return String(date.getUTCFullYear());
  }
}

function getHingePeriodStartFromKey(
  period: string,
  granularity: TimeGranularity,
): Date | null {
  if (granularity === "weekly") {
    const match = /^(\d{4})-W(\d{2})$/.exec(period);
    if (!match?.[1] || !match[2]) return null;
    const isoYear = Number(match[1]);
    const isoWeek = Number(match[2]);
    const januaryFourth = new Date(Date.UTC(isoYear, 0, 4));
    const januaryFourthIsoDay = januaryFourth.getUTCDay() || 7;
    return addUtcCalendarDays(
      januaryFourth,
      -(januaryFourthIsoDay - 1) + (isoWeek - 1) * 7,
    );
  }

  const normalized =
    granularity === "daily"
      ? period
      : granularity === "monthly"
        ? `${period}-01`
        : granularity === "quarterly"
          ? `${period.slice(0, 4)}-${String((Number(period.slice(-1)) - 1) * 3 + 1).padStart(2, "0")}-01`
          : `${period}-01-01`;
  const periodStart = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(periodStart.getTime()) ? null : periodStart;
}

export function getHingePeriodDisplayFromKey(
  period: string,
  granularity: TimeGranularity,
): string {
  const periodStart = getHingePeriodStartFromKey(period, granularity);
  return periodStart ? getHingePeriodDisplay(periodStart, granularity) : period;
}

function nextHingePeriod(
  periodStart: Date,
  granularity: TimeGranularity,
): Date {
  const next = new Date(periodStart);
  switch (granularity) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "quarterly":
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
    case "yearly":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
  }
  return next;
}

/** Fill all provider-UTC buckets represented by a selected calendar range. */
export function fillHingePeriodRange(
  data: AggregatedHingeData[],
  granularity: TimeGranularity,
  from: Date,
  to: Date,
): AggregatedHingeData[] {
  const firstPeriod = getHingeSelectionPeriodKey(from, granularity);
  const lastPeriod = getHingeSelectionPeriodKey(to, granularity);
  if (lastPeriod < firstPeriod) return [];

  let cursor = getHingePeriodStartFromKey(firstPeriod, granularity);
  if (!cursor) return [];
  const observed = new Map(data.map((period) => [period.period, period]));
  const result: AggregatedHingeData[] = [];

  while (getHingePeriodKey(cursor, granularity) <= lastPeriod) {
    const period = getHingePeriodKey(cursor, granularity);
    result.push(
      observed.get(period) ?? {
        period,
        periodDisplay: getHingePeriodDisplay(cursor, granularity),
        ...aggregateEvents([]),
      },
    );
    cursor = nextHingePeriod(cursor, granularity);
  }

  return result;
}

export function aggregateHingeData(
  matches: HingeInsightsMatch[],
  interactions: HingeInsightsInteraction[],
  granularity: TimeGranularity,
): AggregatedHingeData[] {
  const events: DateEvent[] = [];
  for (const interaction of interactions) {
    const common = {
      date: new Date(interaction.timestamp),
      matchId: interaction.matchId ?? undefined,
    };
    switch (interaction.type) {
      case "LIKE_SENT":
        events.push({ ...common, type: "like" });
        break;
      case "REJECT":
      case "UNMATCH":
        events.push({ ...common, type: "remove" });
        break;
      case "MATCH":
      case "MESSAGE_SENT":
        // Match/message rows are the durable canonical facts. Their mirrored
        // interactions are useful for lifecycle context but are not guaranteed
        // one-for-one on legacy uploads, so counting both would drift from the
        // summary cards.
        break;
    }
  }

  for (const match of matches) {
    if (match.matchedAt) {
      events.push({ date: match.matchedAt, type: "match", matchId: match.id });
    }
    for (const message of match.messages) {
      events.push({
        date: message.sentDate,
        type: "messageSent",
        matchId: match.id,
      });
    }
  }

  const grouped = new Map<string, DateEvent[]>();
  for (const event of events) {
    const key = getHingePeriodKey(event.date, granularity);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }

  const sortedPeriods = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
  const firstPeriod = sortedPeriods[0];
  const lastPeriod = sortedPeriods.at(-1);
  if (!firstPeriod || !lastPeriod) return [];

  let cursor = getHingePeriodStartFromKey(firstPeriod, granularity);
  if (!cursor) return [];

  const result: AggregatedHingeData[] = [];
  while (getHingePeriodKey(cursor, granularity) <= lastPeriod) {
    const period = getHingePeriodKey(cursor, granularity);
    const periodEvents = grouped.get(period) ?? [];
    result.push({
      period,
      periodDisplay: getHingePeriodDisplay(cursor, granularity),
      ...aggregateEvents(periodEvents),
    });
    cursor = nextHingePeriod(cursor, granularity);
  }

  return result;
}

function aggregateEvents(
  events: DateEvent[],
): Omit<AggregatedHingeData, "period" | "periodDisplay"> {
  const messagedMatchIds = new Set<string>();
  const counts = {
    matches: 0,
    likes: 0,
    rejects: 0,
    messagesSent: 0,
  };

  for (const event of events) {
    switch (event.type) {
      case "match":
        counts.matches++;
        break;
      case "like":
        counts.likes++;
        break;
      case "remove":
        counts.rejects++;
        break;
      case "messageSent":
        counts.messagesSent++;
        if (event.matchId) messagedMatchIds.add(event.matchId);
        break;
    }
  }

  return {
    ...counts,
    totalMessages: counts.messagesSent,
    conversationsStarted: messagedMatchIds.size,
  };
}

export function filterMatchesByDateRange(
  matches: HingeInsightsMatch[],
  from: Date,
  to: Date,
): HingeInsightsMatch[] {
  const fromKey = localSelectionDateKey(from);
  const toKey = localSelectionDateKey(to);
  if (toKey < fromKey) return [];

  return matches.flatMap((match) => {
    const matchedAt =
      match.matchedAt &&
      utcDateKey(match.matchedAt) >= fromKey &&
      utcDateKey(match.matchedAt) <= toKey
        ? match.matchedAt
        : null;
    const messages = match.messages.filter((message) => {
      const key = utcDateKey(message.sentDate);
      return key >= fromKey && key <= toKey;
    });

    // Match creation and sent messages are independent dated facts. Retaining
    // the whole conversation based only on matchedAt either loses later
    // messages or leaks messages from outside the selected window.
    return matchedAt || messages.length > 0
      ? [{ ...match, matchedAt, messages }]
      : [];
  });
}

export function filterHingeInteractionsByDateRange(
  interactions: HingeInsightsInteraction[],
  from: Date,
  to: Date,
): HingeInsightsInteraction[] {
  const fromKey = localSelectionDateKey(from);
  const toKey = localSelectionDateKey(to);
  return interactions.filter((interaction) => {
    const key = utcDateKey(interaction.timestamp);
    return key >= fromKey && key <= toKey;
  });
}
