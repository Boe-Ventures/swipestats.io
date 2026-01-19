import type { Match, Message } from "@/server/db/schema";

export type TimeGranularity =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type AggregatedHingeData = {
  period: string; // "2024-01-15" | "2024-W03" | "2024-01" | "2024-Q1" | "2024"
  periodDisplay: string; // "Jan 15" | "Week of Jan 15" | "January" | "Q1 2024" | "2024"
  matches: number;
  likes: number;
  messagesSent: number;
  messagesReceived: number;
  totalMessages: number;
  conversationsStarted: number; // Matches with at least one message
};

type DateEvent = {
  date: Date;
  type: "match" | "like" | "messageSent" | "messageReceived";
  matchId?: string;
};

/**
 * Main aggregation function for Hinge data
 */
export function aggregateHingeData(
  matches: (Match & { messages: Message[] })[],
  granularity: TimeGranularity,
): AggregatedHingeData[] {
  // Extract all date events from matches and messages
  const events: DateEvent[] = [];

  matches.forEach((match) => {
    // Add match event
    if (match.matchedAt) {
      events.push({
        date: new Date(match.matchedAt),
        type: "match",
        matchId: match.id,
      });
    }

    // Add like event
    if (match.likedAt) {
      events.push({
        date: new Date(match.likedAt),
        type: "like",
      });
    }

    // Add message events
    match.messages?.forEach((message) => {
      events.push({
        date: new Date(message.sentDate),
        type: message.to === 0 ? "messageSent" : "messageReceived",
      });
    });
  });

  // Aggregate by granularity
  switch (granularity) {
    case "daily":
      return aggregateToDaily(events, matches);
    case "weekly":
      return aggregateToWeekly(events, matches);
    case "monthly":
      return aggregateToMonthly(events, matches);
    case "quarterly":
      return aggregateToQuarterly(events, matches);
    case "yearly":
      return aggregateToYearly(events, matches);
  }
}

/**
 * Daily aggregation
 */
function aggregateToDaily(
  events: DateEvent[],
  matches: (Match & { messages: Message[] })[],
): AggregatedHingeData[] {
  const dailyMap = new Map<string, DateEvent[]>();

  events.forEach((event) => {
    const dayKey = event.date.toISOString().split("T")[0]!; // "YYYY-MM-DD"

    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, []);
    }
    dailyMap.get(dayKey)!.push(event);
  });

  return Array.from(dailyMap.entries())
    .map(([dayKey, dayEvents]) => {
      const date = new Date(dayKey);
      return {
        period: dayKey,
        periodDisplay: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        ...aggregateEvents(dayEvents, dayKey, matches),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Weekly aggregation
 */
function aggregateToWeekly(
  events: DateEvent[],
  matches: (Match & { messages: Message[] })[],
): AggregatedHingeData[] {
  const weeklyMap = new Map<string, DateEvent[]>();

  events.forEach((event) => {
    const weekKey = getISOWeekKey(event.date);

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, []);
    }
    weeklyMap.get(weekKey)!.push(event);
  });

  return Array.from(weeklyMap.entries())
    .map(([weekKey, weekEvents]) => {
      // Get start of week for display
      const firstEvent = weekEvents[0];
      if (!firstEvent) {
        return null;
      }
      const dayOfWeek = firstEvent.date.getDay();
      const startOfWeek = new Date(firstEvent.date);
      startOfWeek.setDate(firstEvent.date.getDate() - dayOfWeek);

      return {
        period: weekKey,
        periodDisplay: `Week of ${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        ...aggregateEvents(weekEvents, weekKey, matches),
      };
    })
    .filter((item): item is AggregatedHingeData => item !== null)
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Monthly aggregation
 */
function aggregateToMonthly(
  events: DateEvent[],
  matches: (Match & { messages: Message[] })[],
): AggregatedHingeData[] {
  const monthlyMap = new Map<string, DateEvent[]>();

  events.forEach((event) => {
    const monthKey = event.date.toISOString().slice(0, 7); // "YYYY-MM"

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, []);
    }
    monthlyMap.get(monthKey)!.push(event);
  });

  return Array.from(monthlyMap.entries())
    .map(([monthKey, monthEvents]) => {
      const date = new Date(monthKey + "-01");
      return {
        period: monthKey,
        periodDisplay: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        ...aggregateEvents(monthEvents, monthKey, matches),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Quarterly aggregation
 */
function aggregateToQuarterly(
  events: DateEvent[],
  matches: (Match & { messages: Message[] })[],
): AggregatedHingeData[] {
  const quarterlyMap = new Map<string, DateEvent[]>();

  events.forEach((event) => {
    const year = event.date.getFullYear();
    const quarter = Math.floor(event.date.getMonth() / 3) + 1;
    const quarterKey = `${year}-Q${quarter}`;

    if (!quarterlyMap.has(quarterKey)) {
      quarterlyMap.set(quarterKey, []);
    }
    quarterlyMap.get(quarterKey)!.push(event);
  });

  return Array.from(quarterlyMap.entries())
    .map(([quarterKey, quarterEvents]) => {
      return {
        period: quarterKey,
        periodDisplay: quarterKey.replace("-", " "), // "2024 Q1"
        ...aggregateEvents(quarterEvents, quarterKey, matches),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Yearly aggregation
 */
function aggregateToYearly(
  events: DateEvent[],
  matches: (Match & { messages: Message[] })[],
): AggregatedHingeData[] {
  const yearlyMap = new Map<string, DateEvent[]>();

  events.forEach((event) => {
    const yearKey = event.date.getFullYear().toString();

    if (!yearlyMap.has(yearKey)) {
      yearlyMap.set(yearKey, []);
    }
    yearlyMap.get(yearKey)!.push(event);
  });

  return Array.from(yearlyMap.entries())
    .map(([yearKey, yearEvents]) => {
      return {
        period: yearKey,
        periodDisplay: yearKey,
        ...aggregateEvents(yearEvents, yearKey, matches),
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Helper: Aggregate events into metrics
 */
function aggregateEvents(
  events: DateEvent[],
  _periodKey: string,
  _matches: (Match & { messages: Message[] })[],
): Omit<AggregatedHingeData, "period" | "periodDisplay"> {
  const matchIds = new Set<string>();

  const counts = events.reduce(
    (acc, event) => {
      switch (event.type) {
        case "match":
          acc.matches++;
          if (event.matchId) matchIds.add(event.matchId);
          break;
        case "like":
          acc.likes++;
          break;
        case "messageSent":
          acc.messagesSent++;
          break;
        case "messageReceived":
          acc.messagesReceived++;
          break;
      }
      return acc;
    },
    { matches: 0, likes: 0, messagesSent: 0, messagesReceived: 0 },
  );

  const totalMessages = counts.messagesSent + counts.messagesReceived;

  // Count conversations that started (had at least one message) in this period
  const conversationsStarted = matchIds.size;

  return {
    matches: counts.matches,
    likes: counts.likes,
    messagesSent: counts.messagesSent,
    messagesReceived: counts.messagesReceived,
    totalMessages,
    conversationsStarted,
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
