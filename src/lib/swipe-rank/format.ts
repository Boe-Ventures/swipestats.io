export type SwipeRankPeriodKind = "MONTH" | "QUARTER" | "YEAR" | "ALL_TIME";

export interface SwipeRankPeriodLabelInput {
  kind: SwipeRankPeriodKind;
  start: string;
}

export function formatSwipeRankPeriodLabel(
  period: SwipeRankPeriodLabelInput,
  locales?: Intl.LocalesArgument,
) {
  if (period.kind === "ALL_TIME") return "All time";

  const [yearValue, monthValue] = period.start.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  if (period.kind === "YEAR") return String(year);
  if (period.kind === "QUARTER") {
    return `Q${Math.floor((month - 1) / 3) + 1} ${year}`;
  }

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locales, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Deliberately does not clamp unusual source-backed yields above 100%. */
export function formatMatchYield(
  value: number | null,
  locales?: Intl.LocalesArgument,
) {
  if (value === null) return "—";
  return `${(value * 100).toLocaleString(locales, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function swipeRankPeriodKey(period: {
  kind: SwipeRankPeriodKind;
  start: string;
  end: string;
}) {
  return `${period.kind}:${period.start}:${period.end}`;
}
