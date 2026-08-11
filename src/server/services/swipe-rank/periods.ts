import type { SwipeRankPeriodKind } from "@/server/db/schema";

export interface SwipeRankPeriodBounds {
  kind: SwipeRankPeriodKind;
  start: string;
  end: string;
}

export interface SwipeRankMonthBounds extends SwipeRankPeriodBounds {
  kind: "MONTH";
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatDate(year: number, month: number, day = 1): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function currentUtcMonthStart(now: Date): string {
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

/** Return the aligned half-open period containing an observed calendar date. */
export function periodContaining(
  kind: "MONTH",
  observedDate: string,
): SwipeRankPeriodBounds {
  const { year, month } = parseDate(observedDate);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    kind,
    start: formatDate(year, month),
    end: formatDate(nextYear, nextMonth),
  };
}

/** The one season a monthly publisher may close at a given instant. */
export function previousCalendarMonth(now = new Date()): SwipeRankMonthBounds {
  const currentStart = currentUtcMonthStart(now);
  const previousDay = new Date(`${currentStart}T00:00:00.000Z`);
  previousDay.setUTCDate(0);
  return periodContaining(
    "MONTH",
    formatDate(
      previousDay.getUTCFullYear(),
      previousDay.getUTCMonth() + 1,
      previousDay.getUTCDate(),
    ),
  ) as SwipeRankMonthBounds;
}

export function assertClosedSwipeRankMonth(
  period: SwipeRankPeriodBounds,
  now = new Date(),
): asserts period is SwipeRankMonthBounds {
  if (period.kind !== "MONTH") {
    throw new Error("SwipeRank supports completed calendar months only.");
  }
  assertAlignedPeriod(period);
  if (period.end > currentUtcMonthStart(now)) {
    throw new Error("An open SwipeRank month cannot be ranked or published.");
  }
}

export function assertAlignedPeriod(period: SwipeRankPeriodBounds): void {
  if (period.kind !== "MONTH") {
    throw new Error("SwipeRank supports monthly periods only.");
  }
  const expected = periodContaining("MONTH", period.start);
  if (period.start !== expected.start || period.end !== expected.end) {
    throw new Error(
      `${period.kind} must be aligned; expected [${expected.start}, ${expected.end}).`,
    );
  }
}
