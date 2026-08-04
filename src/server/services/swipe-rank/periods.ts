import type { SwipeRankPeriodKind } from "@/server/db/schema";

import {
  SWIPE_RANK_ALL_TIME_END,
  SWIPE_RANK_ALL_TIME_START,
} from "./constants";

export interface SwipeRankPeriodBounds {
  kind: SwipeRankPeriodKind;
  start: string;
  end: string;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatDate(year: number, month: number, day = 1): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
  kind: Exclude<SwipeRankPeriodKind, "ALL_TIME">,
  observedDate: string,
): SwipeRankPeriodBounds {
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

export function allTimePeriod(): SwipeRankPeriodBounds {
  return {
    kind: "ALL_TIME",
    start: SWIPE_RANK_ALL_TIME_START,
    end: SWIPE_RANK_ALL_TIME_END,
  };
}

export function assertAlignedPeriod(period: SwipeRankPeriodBounds): void {
  if (period.kind === "ALL_TIME") {
    if (
      period.start !== SWIPE_RANK_ALL_TIME_START ||
      period.end !== SWIPE_RANK_ALL_TIME_END
    ) {
      throw new Error(
        `ALL_TIME must use [${SWIPE_RANK_ALL_TIME_START}, ${SWIPE_RANK_ALL_TIME_END}).`,
      );
    }
    return;
  }

  const expected = periodContaining(period.kind, period.start);
  if (period.start !== expected.start || period.end !== expected.end) {
    throw new Error(
      `${period.kind} must be aligned; expected [${expected.start}, ${expected.end}).`,
    );
  }
}
