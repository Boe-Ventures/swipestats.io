import type { SwipeRankPeriodKind } from "@/lib/swipe-rank/format";

export interface LeaderboardPeriodOption {
  kind: SwipeRankPeriodKind;
  start: string;
  end: string;
}

export interface ObservedPeriod {
  period: {
    kind: SwipeRankPeriodKind;
    start: string;
    end: string;
  };
}

export interface LeaderboardQuickJump {
  key: "LAST_MONTH" | "LAST_QUARTER" | "LAST_YEAR";
  label: string;
  period: LeaderboardPeriodOption;
}

function dateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

/** Closed placeholders are used only while the published inventory loads. */
export function generatedPeriodOptions(
  kind: SwipeRankPeriodKind,
  today = new Date(),
): LeaderboardPeriodOption[] {
  const currentMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const previousDay = new Date(currentMonth);
  previousDay.setUTCDate(0);
  const year = previousDay.getUTCFullYear();
  const month = previousDay.getUTCMonth();
  if (kind === "MONTH") {
    const start = new Date(Date.UTC(year, month, 1));
    return [
      {
        kind,
        start: dateString(start),
        end: dateString(currentMonth),
      },
    ];
  }
  if (kind === "QUARTER") {
    const startMonth = Math.floor(month / 3) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 1));
    if (end > currentMonth) start.setUTCMonth(start.getUTCMonth() - 3);
    const closedEnd = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1),
    );
    return [
      {
        kind,
        start: dateString(start),
        end: dateString(closedEnd),
      },
    ];
  }
  const closedYear = currentMonth.getUTCMonth() === 0 ? year : year - 1;
  return [
    {
      kind,
      start: `${closedYear}-01-01`,
      end: `${closedYear + 1}-01-01`,
    },
  ];
}

export function resolveLeaderboardPeriodOptions(
  kind: SwipeRankPeriodKind,
  observedPeriods: readonly ObservedPeriod[] | undefined,
): LeaderboardPeriodOption[] {
  return (
    observedPeriods
      ?.filter((item) => item.period.kind === kind)
      .map((item) => item.period)
      .sort((left, right) => right.start.localeCompare(left.start)) ?? []
  );
}

export function preferredLeaderboardPeriod(
  options: readonly LeaderboardPeriodOption[],
  kind: SwipeRankPeriodKind,
): LeaderboardPeriodOption {
  const preferred = options[0];
  if (!preferred) throw new Error(`No ${kind} leaderboard is available.`);
  return preferred;
}

export function resolveLeaderboardQuickJumps(
  observedPeriods: readonly ObservedPeriod[] | undefined,
): LeaderboardQuickJump[] {
  if (!observedPeriods) return [];
  const definitions = [
    {
      kind: "MONTH" as const,
      key: "LAST_MONTH" as const,
      label: "Latest month",
    },
    {
      kind: "QUARTER" as const,
      key: "LAST_QUARTER" as const,
      label: "Latest quarter",
    },
    { kind: "YEAR" as const, key: "LAST_YEAR" as const, label: "Latest year" },
  ];
  return definitions.flatMap((definition) => {
    const period = resolveLeaderboardPeriodOptions(
      definition.kind,
      observedPeriods,
    )[0];
    return period ? [{ ...definition, period }] : [];
  });
}
