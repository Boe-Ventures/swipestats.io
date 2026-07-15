const MAX_PROVIDER_CLOCK_SKEW_MS = 48 * 60 * 60 * 1000;

const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-](\d{2}):(\d{2})))?$/;
const NAIVE_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/;
const RFC_1123_TIMESTAMP_PATTERN =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/;

const RFC_MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  const daysByMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysByMonth[month - 1]!
  );
}

function isClockTime(hour: number, minute: number, second: number): boolean {
  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

export interface ProviderTimestampOptions {
  allowDateOnly?: boolean;
  allowRfc1123?: boolean;
  allowNaiveUtc?: boolean;
  allowFuture?: boolean;
  nowMs?: number;
}

/**
 * Parse only the timestamp shapes emitted by the Tinder/Hinge exports.
 *
 * `Date.parse` alone is not a validity boundary: JavaScript normalizes some
 * impossible dates (for example February 30) into a different calendar day.
 */
export function parseProviderTimestamp(
  value: string,
  options: ProviderTimestampOptions = {},
): number | null {
  let timestamp: number;
  const isoMatch = ISO_TIMESTAMP_PATTERN.exec(value);
  if (isoMatch) {
    const [
      ,
      yearRaw,
      monthRaw,
      dayRaw,
      hourRaw,
      minuteRaw,
      secondRaw,
      ,
      ,
      offsetHourRaw,
      offsetMinuteRaw,
    ] = isoMatch;
    const hasTime = hourRaw !== undefined;
    if (!hasTime && !options.allowDateOnly) return null;

    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (!isCalendarDate(year, month, day)) return null;

    if (hasTime) {
      const hour = Number(hourRaw);
      const minute = Number(minuteRaw);
      const second = Number(secondRaw);
      if (!isClockTime(hour, minute, second)) return null;

      if (offsetHourRaw !== undefined && offsetMinuteRaw !== undefined) {
        const offsetHour = Number(offsetHourRaw);
        const offsetMinute = Number(offsetMinuteRaw);
        if (offsetHour > 23 || offsetMinute > 59) return null;
      }
    }
    timestamp = Date.parse(value);
  } else if (options.allowNaiveUtc) {
    const naiveMatch = NAIVE_TIMESTAMP_PATTERN.exec(value);
    if (!naiveMatch) return null;

    const [
      ,
      yearRaw,
      monthRaw,
      dayRaw,
      hourRaw,
      minuteRaw,
      secondRaw,
      fraction,
    ] = naiveMatch;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const second = Number(secondRaw);
    if (
      !isCalendarDate(year, month, day) ||
      !isClockTime(hour, minute, second)
    ) {
      return null;
    }

    // REVIEW(provider assumption): historical Hinge exports use a SQL-style
    // wall clock without an offset. Existing persisted rows prove that the
    // importer has consistently interpreted this grammar as UTC. Compute UTC
    // explicitly so local development and serverless runtimes agree.
    const millisecond = Number((fraction ?? "").padEnd(3, "0").slice(0, 3));
    timestamp = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      millisecond,
    );
  } else if (options.allowRfc1123) {
    const rfcMatch = RFC_1123_TIMESTAMP_PATTERN.exec(value);
    if (!rfcMatch) return null;

    const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw, secondRaw] =
      rfcMatch;
    const month = RFC_MONTHS[monthRaw!];
    if (
      month === undefined ||
      !isCalendarDate(Number(yearRaw), month, Number(dayRaw)) ||
      !isClockTime(Number(hourRaw), Number(minuteRaw), Number(secondRaw))
    ) {
      return null;
    }
    timestamp = Date.parse(value);
  } else {
    return null;
  }

  if (!Number.isFinite(timestamp)) return null;

  // REVIEW(provider assumption): provider clocks and daily bucket timezones can
  // lead local wall-clock time by a little. A 48-hour tolerance accepts those
  // cases while quarantining clearly future-dated exports instead of allowing
  // them to distort periods, age calculations, or chronology.
  if (
    !options.allowFuture &&
    timestamp > (options.nowMs ?? Date.now()) + MAX_PROVIDER_CLOCK_SKEW_MS
  ) {
    return null;
  }

  return timestamp;
}

export function isProviderTimestamp(
  value: string,
  options: ProviderTimestampOptions = {},
): boolean {
  return parseProviderTimestamp(value, options) !== null;
}

/** Validate Hinge's JSON-encoded array fields before a transform can cast them. */
export function isJsonEncodedStringArray(value: string): boolean {
  if (value === "") return true;

  try {
    const parsed = JSON.parse(value) as unknown;
    return (
      Array.isArray(parsed) &&
      parsed.every((entry) => typeof entry === "string")
    );
  } catch {
    return false;
  }
}
