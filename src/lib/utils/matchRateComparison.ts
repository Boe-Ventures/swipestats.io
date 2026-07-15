import type { TinderUsage } from "@/server/db/schema";

import {
  calculateInclusiveDateRange,
  filterUsageByDateRange,
} from "./aggregateUsage";

export type MatchRateComparisonTimeRange = "7d" | "30d" | "90d" | "all";

const TRAILING_DAYS_BY_RANGE = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} satisfies Record<Exclude<MatchRateComparisonTimeRange, "all">, number>;

/** Filter raw calendar-day rows before they are grouped for the chart. */
export function filterMatchRateComparisonUsage(
  usage: TinderUsage[],
  timeRange: MatchRateComparisonTimeRange,
  referenceDate = new Date(),
): TinderUsage[] {
  if (timeRange === "all") return usage;

  const range = calculateInclusiveDateRange(
    TRAILING_DAYS_BY_RANGE[timeRange],
    referenceDate,
  );
  return filterUsageByDateRange(usage, range.from, range.to);
}

/**
 * Pool the selected observations before dividing. This preserves zero-match
 * days and prevents low-volume periods from receiving disproportionate weight.
 */
export function calculatePooledMatchRatePercent(
  usage: TinderUsage[],
): number | null {
  const totals = usage.reduce(
    (acc, day) => ({
      matches: acc.matches + day.matches,
      swipeLikes: acc.swipeLikes + day.swipeLikes,
    }),
    { matches: 0, swipeLikes: 0 },
  );

  return totals.swipeLikes > 0
    ? (totals.matches / totals.swipeLikes) * 100
    : null;
}
