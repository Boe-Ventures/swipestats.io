export type SwipeRankPeriodKind = "MONTH";

export const DEFAULT_SWIPE_RANK_PERIOD_KIND = "MONTH";

export interface SwipeRankPeriodLabelInput {
  kind: SwipeRankPeriodKind;
  start: string;
}

export function formatSwipeRankPeriodLabel(
  period: SwipeRankPeriodLabelInput,
  locales?: Intl.LocalesArgument,
) {
  const [yearValue, monthValue] = period.start.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
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
