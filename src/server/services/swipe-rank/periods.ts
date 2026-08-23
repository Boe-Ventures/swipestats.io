import type { SwipeRankPeriodKind } from "@/server/db/schema";

export type ClosedSwipeRankPeriodKind = Extract<
  SwipeRankPeriodKind,
  "MONTH" | "QUARTER" | "YEAR"
>;

export interface SwipeRankPeriodBounds {
  kind: SwipeRankPeriodKind;
  start: string;
  end: string;
}

export interface ClosedSwipeRankPeriodBounds extends SwipeRankPeriodBounds {
  kind: ClosedSwipeRankPeriodKind;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_LABEL_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const QUARTER_LABEL_PATTERN = /^(\d{4})-Q([1-4])$/;
const YEAR_LABEL_PATTERN = /^(\d{4})$/;

export interface ParsedClosedSwipeRankPeriod extends ClosedSwipeRankPeriodBounds {
  label: string;
}

function formatDate(year: number, month: number, day = 1): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function currentUtcMonthStart(now: Date): string {
  return formatDate(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

function parseDate(input: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = ISO_DATE_PATTERN.exec(input);
  if (!match) throw new Error(`Invalid ISO date: ${input}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${input}`);
  }
  return { year, month, day };
}

export function periodContaining(
  kind: ClosedSwipeRankPeriodKind,
  observedDate: string,
): ClosedSwipeRankPeriodBounds {
  const { year, month } = parseDate(observedDate);
  if (kind === "MONTH") {
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    return {
      kind,
      start: formatDate(year, month),
      end: formatDate(nextYear, nextMonth),
    };
  }
  if (kind === "QUARTER") {
    const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const nextYear = startMonth === 10 ? year + 1 : year;
    const nextMonth = startMonth === 10 ? 1 : startMonth + 3;
    return {
      kind,
      start: formatDate(year, startMonth),
      end: formatDate(nextYear, nextMonth),
    };
  }
  return {
    kind,
    start: formatDate(year, 1),
    end: formatDate(year + 1, 1),
  };
}

function previousDayAtCurrentMonthBoundary(now: Date): string {
  const current = new Date(`${currentUtcMonthStart(now)}T00:00:00.000Z`);
  current.setUTCDate(0);
  return formatDate(
    current.getUTCFullYear(),
    current.getUTCMonth() + 1,
    current.getUTCDate(),
  );
}

export function previousCalendarMonth(
  now = new Date(),
): ClosedSwipeRankPeriodBounds {
  return periodContaining("MONTH", previousDayAtCurrentMonthBoundary(now));
}

export function parseClosedSwipeRankPeriod(
  label: string,
): ParsedClosedSwipeRankPeriod {
  const month = MONTH_LABEL_PATTERN.exec(label);
  if (month) {
    return {
      label,
      ...periodContaining("MONTH", `${month[1]}-${month[2]}-01`),
    };
  }

  const quarter = QUARTER_LABEL_PATTERN.exec(label);
  if (quarter) {
    const startMonth = (Number(quarter[2]) - 1) * 3 + 1;
    return {
      label,
      ...periodContaining(
        "QUARTER",
        `${quarter[1]}-${String(startMonth).padStart(2, "0")}-01`,
      ),
    };
  }

  const year = YEAR_LABEL_PATTERN.exec(label);
  if (year) {
    return {
      label,
      ...periodContaining("YEAR", `${year[1]}-01-01`),
    };
  }

  throw new Error(
    `Invalid closed SwipeRank period "${label}". Use YYYY-MM, YYYY-Q1..Q4, or YYYY.`,
  );
}

/** Seasons closed by the one first-of-month publisher invocation. */
export function swipeRankSeasonsToPublish(
  now = new Date(),
): ClosedSwipeRankPeriodBounds[] {
  const month = now.getUTCMonth() + 1;
  const previousDay = previousDayAtCurrentMonthBoundary(now);
  const periods: ClosedSwipeRankPeriodBounds[] = [previousCalendarMonth(now)];
  if ([1, 4, 7, 10].includes(month)) {
    periods.push(periodContaining("QUARTER", previousDay));
  }
  if (month === 1) periods.push(periodContaining("YEAR", previousDay));
  return periods;
}

export function assertClosedSwipeRankPeriod(
  period: SwipeRankPeriodBounds,
  now = new Date(),
): asserts period is ClosedSwipeRankPeriodBounds {
  if (!(["MONTH", "QUARTER", "YEAR"] as string[]).includes(period.kind)) {
    throw new Error("SwipeRank publishes completed calendar seasons only.");
  }
  assertAlignedPeriod(period);
  if (period.end > currentUtcMonthStart(now)) {
    throw new Error("An open SwipeRank season cannot be ranked or published.");
  }
}

export function assertAlignedPeriod(period: SwipeRankPeriodBounds): void {
  if (!(["MONTH", "QUARTER", "YEAR"] as string[]).includes(period.kind)) {
    throw new Error(
      "SwipeRank supports month, quarter, and year seasons only.",
    );
  }
  const expected = periodContaining(
    period.kind as ClosedSwipeRankPeriodKind,
    period.start,
  );
  if (period.start !== expected.start || period.end !== expected.end) {
    throw new Error(
      `${period.kind} must be aligned; expected [${expected.start}, ${expected.end}).`,
    );
  }
}
