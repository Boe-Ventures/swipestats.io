export type SwipeRankPeriodKind = "month" | "quarter" | "year" | "all-time";

export interface SwipeRankPeriod {
  label: string;
  kind: SwipeRankPeriodKind;
  startDate: string | null;
  endDate: string | null;
}

export interface EligibilityRule {
  minLikes: number;
  minActiveDays: number;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const QUARTER_PATTERN = /^(\d{4})-Q([1-4])$/;
const YEAR_PATTERN = /^(\d{4})$/;

function isoDate(year: number, month: number, day = 1): string {
  return [
    year,
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

export function parseSwipeRankPeriod(input: string): SwipeRankPeriod {
  if (input === "all-time") {
    return {
      label: input,
      kind: "all-time",
      startDate: null,
      endDate: null,
    };
  }

  const monthMatch = MONTH_PATTERN.exec(input);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;

    return {
      label: input,
      kind: "month",
      startDate: isoDate(year, month),
      endDate: isoDate(nextYear, nextMonth),
    };
  }

  const quarterMatch = QUARTER_PATTERN.exec(input);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3 + 1;
    const nextYear = quarter === 4 ? year + 1 : year;
    const nextMonth = quarter === 4 ? 1 : startMonth + 3;

    return {
      label: input,
      kind: "quarter",
      startDate: isoDate(year, startMonth),
      endDate: isoDate(nextYear, nextMonth),
    };
  }

  const yearMatch = YEAR_PATTERN.exec(input);
  if (yearMatch) {
    const year = Number(yearMatch[1]);

    return {
      label: input,
      kind: "year",
      startDate: isoDate(year, 1),
      endDate: isoDate(year + 1, 1),
    };
  }

  throw new Error(
    `Invalid period "${input}". Use YYYY-MM, YYYY-Q1..Q4, YYYY, or all-time.`,
  );
}

export function getDefaultEligibility(
  kind: SwipeRankPeriodKind,
): EligibilityRule {
  switch (kind) {
    case "month":
      return { minLikes: 100, minActiveDays: 5 };
    case "quarter":
      return { minLikes: 250, minActiveDays: 15 };
    case "year":
      return { minLikes: 500, minActiveDays: 40 };
    case "all-time":
      return { minLikes: 1_000, minActiveDays: 40 };
  }
}

export function getObservedPeriods(
  lastObservedDate: string,
): SwipeRankPeriod[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastObservedDate)) {
    throw new Error(`Invalid observed date "${lastObservedDate}".`);
  }

  const year = Number(lastObservedDate.slice(0, 4));
  const month = Number(lastObservedDate.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;

  return [
    parseSwipeRankPeriod(`${year}-${String(month).padStart(2, "0")}`),
    parseSwipeRankPeriod(`${year}-Q${quarter}`),
    parseSwipeRankPeriod(String(year)),
    parseSwipeRankPeriod("all-time"),
  ];
}
