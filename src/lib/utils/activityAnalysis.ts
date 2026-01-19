import type { TinderUsage } from "@/server/db/schema";

/**
 * Analyze time-based activity patterns from usage data
 */

export interface ActivityPatterns {
  peakHour: number;
  peakDay: string;
  weekendMultiplier: number;
  hourlyActivity: Record<number, number>;
  dailyActivity: Record<string, number>;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Get the peak swiping hour (0-23) based on combined swipes
 */
export function getPeakSwipingHour(usage: TinderUsage[]): number {
  const hourlyData = groupByHour(usage);
  let maxActivity = 0;
  let peakHour = 0;

  for (const [hour, count] of Object.entries(hourlyData)) {
    if (count > maxActivity) {
      maxActivity = count;
      peakHour = parseInt(hour, 10);
    }
  }

  return peakHour;
}

/**
 * Get the most active day of the week based on combined swipes
 */
export function getMostActiveDay(usage: TinderUsage[]): string {
  const dailyData = groupByDayOfWeek(usage);
  let maxActivity = 0;
  let peakDay = "Sunday";

  for (const [day, count] of Object.entries(dailyData)) {
    if (count > maxActivity) {
      maxActivity = count;
      peakDay = day;
    }
  }

  return peakDay;
}

/**
 * Calculate how much more active user is on weekends vs weekdays
 * Returns multiplier (e.g., 1.5 = 50% more active on weekends)
 */
export function getWeekendMultiplier(usage: TinderUsage[]): number {
  const dailyData = groupByDayOfWeek(usage);

  const weekendActivity =
    (dailyData.Saturday ?? 0) + (dailyData.Sunday ?? 0);
  const weekdayActivity =
    (dailyData.Monday ?? 0) +
    (dailyData.Tuesday ?? 0) +
    (dailyData.Wednesday ?? 0) +
    (dailyData.Thursday ?? 0) +
    (dailyData.Friday ?? 0);

  const weekendAvg = weekendActivity / 2;
  const weekdayAvg = weekdayActivity / 5;

  if (weekdayAvg === 0) return 1;

  return weekendAvg / weekdayAvg;
}

/**
 * Group usage data by day of week, summing combined swipes
 */
export function groupByDayOfWeek(usage: TinderUsage[]): Record<string, number> {
  const grouped: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  for (const day of usage) {
    const date = new Date(day.dateStamp);
    const dayName = DAYS_OF_WEEK[date.getDay()];
    if (dayName) {
      grouped[dayName] = (grouped[dayName] ?? 0) + day.swipesCombined;
    }
  }

  return grouped;
}

/**
 * Group usage data by hour of day (0-23), summing combined swipes
 */
export function groupByHour(usage: TinderUsage[]): Record<number, number> {
  const grouped: Record<number, number> = {};

  for (const day of usage) {
    const date = new Date(day.dateStamp);
    const hour = date.getHours();
    grouped[hour] = (grouped[hour] ?? 0) + day.swipesCombined;
  }

  return grouped;
}

/**
 * Get comprehensive activity patterns analysis
 */
export function analyzeActivityPatterns(
  usage: TinderUsage[],
): ActivityPatterns {
  return {
    peakHour: getPeakSwipingHour(usage),
    peakDay: getMostActiveDay(usage),
    weekendMultiplier: getWeekendMultiplier(usage),
    hourlyActivity: groupByHour(usage),
    dailyActivity: groupByDayOfWeek(usage),
  };
}
