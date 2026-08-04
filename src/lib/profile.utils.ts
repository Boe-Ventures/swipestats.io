import {
  type DateKeyString,
  type DateValueMap,
} from "./interfaces/utilInterfaces";
import type { Usage } from "./interfaces/TinderDataJSON";

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Whole years between two UTC calendar dates, ignoring clock time. */
export function differenceInUtcCalendarYears(
  observedAt: Date,
  birthDate: Date,
): number {
  if (
    !Number.isFinite(observedAt.getTime()) ||
    !Number.isFinite(birthDate.getTime())
  ) {
    throw new Error("Age calculation requires valid dates.");
  }

  let age = observedAt.getUTCFullYear() - birthDate.getUTCFullYear();
  const observedMonth = observedAt.getUTCMonth();
  const birthMonth = birthDate.getUTCMonth();
  if (
    observedMonth < birthMonth ||
    (observedMonth === birthMonth &&
      observedAt.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

/** Normalize a Tinder daily-usage key to its provider calendar date. */
export function normalizeTinderUsageDateKey(rawDate: string): string {
  const calendarDate = rawDate.slice(0, 10);
  if (
    (!CALENDAR_DATE_PATTERN.test(rawDate) &&
      !ISO_TIMESTAMP_PATTERN.test(rawDate)) ||
    !CALENDAR_DATE_PATTERN.test(calendarDate)
  ) {
    throw new Error(`Invalid Tinder usage date key: ${rawDate}`);
  }

  const calendarDateValue = new Date(`${calendarDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(calendarDateValue.getTime()) ||
    calendarDateValue.toISOString().slice(0, 10) !== calendarDate
  ) {
    throw new Error(`Invalid Tinder usage date key: ${rawDate}`);
  }

  if (CALENDAR_DATE_PATTERN.test(rawDate)) return rawDate;

  const timestamp = new Date(rawDate);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error(`Invalid Tinder usage date key: ${rawDate}`);
  }

  // REVIEW(provider assumption): Tinder usage keys are calendar-day buckets.
  // Preserve their explicit calendar prefix instead of converting the instant
  // through either the server or viewer timezone.
  return calendarDate;
}

/** Canonicalize one Tinder usage map without merging ambiguous day buckets. */
export function normalizeTinderDateValueMap(
  usageMap: DateValueMap,
): DateValueMap {
  const normalized: DateValueMap = {};

  for (const [rawDate, count] of Object.entries(usageMap)) {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid Tinder usage count for ${rawDate}`);
    }

    const date = normalizeTinderUsageDateKey(rawDate);
    if (Object.hasOwn(normalized, date)) {
      throw new Error(`Multiple Tinder usage keys resolve to ${date}`);
    }
    normalized[date] = count;
  }

  return normalized;
}

export function getFirstAndLastDayOnApp(appOpens: DateValueMap): {
  firstDayOnApp: Date;
  lastDayOnApp: Date;
} {
  return getFirstAndLastObservedUsageDay([appOpens]);
}

/**
 * Return the full observed usage range across every Tinder usage map.
 *
 * Tinder exports occasionally contain swipes, matches, or messages on dates
 * that are absent from `app_opens`. Those rows are still observed source data
 * and must be included in all-time aggregates. `app_opens` remains required by
 * validation, so this helper always has at least one date for a valid export.
 */
export function getFirstAndLastObservedUsageDay(
  usageMaps: Array<DateValueMap | undefined>,
): {
  firstDayOnApp: Date;
  lastDayOnApp: Date;
} {
  const observedDates = new Set<string>();

  for (const usageMap of usageMaps) {
    if (!usageMap) continue;
    for (const date of Object.keys(usageMap)) {
      observedDates.add(normalizeTinderUsageDateKey(date));
    }
  }

  const sortedDates = [...observedDates].sort((a, b) => a.localeCompare(b));
  const firstDate = sortedDates[0];
  const lastDate = sortedDates.at(-1);

  if (!firstDate || !lastDate) {
    throw new Error("Tinder usage must contain at least one observed date.");
  }

  return {
    firstDayOnApp: new Date(`${firstDate}T00:00:00.000Z`),
    lastDayOnApp: new Date(`${lastDate}T00:00:00.000Z`),
  };
}

/** Return the complete observed range for one Tinder Usage object. */
export function getTinderObservedUsageRange(usage: Usage): {
  firstDayOnApp: Date;
  lastDayOnApp: Date;
} {
  return getFirstAndLastObservedUsageDay([
    usage.app_opens,
    usage.swipes_likes,
    usage.swipes_passes,
    usage.superlikes,
    usage.matches,
    usage.messages_sent,
    usage.messages_received,
  ]);
}

/**
 * @deprecated This type is no longer used. Activity metadata fields were removed from the schema.
 */
export type ExpandedUsageValue = {
  dateIsMissingFromOriginalData: boolean;
  activeUser: boolean;
  daysSinceLastActive: number | null;
  activeUserInLast7Days: boolean;
  activeUserInLast14Days: boolean;
  activeUserInLast30Days: boolean;
};

/**
 * @deprecated This function is no longer used for new uploads.
 * We now store only real usage data from the original Tinder JSON.
 * The frontend aggregation handles sparse data correctly through period grouping.
 *
 * Previously expanded the profile's date range to include all days between
 * first and last day on app, filling gaps with synthetic zero records.
 * This resulted in ~50% of stored data being fake zeros.
 *
 * Kept for reference and potential use in migration scripts for existing data.
 */
export function expandAndAugmentProfileWithMissingDays(dateValueMaps: {
  appOpens: DateValueMap;
  swipeLikes: DateValueMap;
  swipePasses: DateValueMap;
}): Record<DateKeyString, ExpandedUsageValue> {
  // true if data is extended
  const expandedMap: Record<DateKeyString, ExpandedUsageValue> = {};
  const { firstDayOnApp, lastDayOnApp } = getFirstAndLastDayOnApp(
    dateValueMaps.appOpens,
  );

  const currentDate = new Date(firstDayOnApp);
  const endDate = new Date(lastDayOnApp);

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0]!; // Converts date to YYYY-MM-DD format
    const appOpens = dateValueMaps.appOpens[dateKey];

    const dateIsMissingFromOriginalData = appOpens === undefined;

    const activity = isConsideredActiveUserOnDate(dateKey, dateValueMaps);

    expandedMap[dateKey] = {
      activeUser: activity.activeUser,
      daysSinceLastActive: activity.daysSinceLastActive,
      activeUserInLast7Days: activity.activeUserInLast7Days,
      activeUserInLast14Days: activity.activeUserInLast14Days,
      activeUserInLast30Days: activity.activeUserInLast30Days,

      dateIsMissingFromOriginalData,
    };
    currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
  }

  return expandedMap;
}

function isConsideredActiveUserOnDate(
  dateKey: string,
  dateValueMaps: {
    appOpens: DateValueMap;
    swipeLikes: DateValueMap;
    swipePasses: DateValueMap;
  },
) {
  const targetDate = new Date(dateKey);
  let daysSinceLastActive = null;
  let activeLast30Days = false;
  let activeLast14Days = false;
  let activeLast7Days = false;

  for (let i = -30; i <= 0; i++) {
    // Check preceding dates and the current date
    const date = new Date(targetDate);
    date.setDate(date.getDate() + i);
    const currentKey = date.toISOString().split("T")[0]!;
    const appOpens = dateValueMaps.appOpens[currentKey];
    const swipeLikes = dateValueMaps.swipeLikes[currentKey];
    const swipePasses = dateValueMaps.swipePasses[currentKey];
    const activityDetected = !!appOpens || !!swipeLikes || !!swipePasses;

    if (activityDetected) {
      daysSinceLastActive = Math.abs(i);
    }

    if (i >= -30 && activityDetected) {
      activeLast30Days = true;
    }
    if (i >= -14 && i <= 0 && activityDetected) {
      activeLast14Days = true;
    }
    if (i >= -7 && i <= 0 && activityDetected) {
      activeLast7Days = true;
    }
  }

  return {
    activeUser: activeLast7Days || activeLast14Days || activeLast30Days,
    daysSinceLastActive,
    activeUserInLast7Days: activeLast7Days,
    activeUserInLast14Days: activeLast14Days,
    activeUserInLast30Days: activeLast30Days,
  };
}
