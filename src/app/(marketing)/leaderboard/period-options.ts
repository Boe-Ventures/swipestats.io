import type { SwipeRankPeriodKind } from "@/lib/swipe-rank/format";

export interface LeaderboardPeriodOption {
  kind: SwipeRankPeriodKind;
  start: string;
  end: string;
  live: boolean;
}

export interface ObservedPeriod {
  period: {
    kind: SwipeRankPeriodKind;
    start: string;
    end: string;
  };
}

export interface LeaderboardQuickJump {
  key: "ALL_TIME" | "LAST_QUARTER" | "LAST_MONTH" | "LAST_YEAR";
  label: string;
  period: LeaderboardPeriodOption;
}

function calendarDate(year: number, monthIndex: number, day = 1) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function dateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function generatedPeriodOptions(
  kind: SwipeRankPeriodKind,
  today = new Date(),
): LeaderboardPeriodOption[] {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const todayString = dateString(today);

  if (kind === "ALL_TIME") {
    return [
      {
        kind,
        start: "0001-01-01",
        end: "9999-01-01",
        live: true,
      },
    ];
  }

  const count = kind === "MONTH" ? 36 : kind === "QUARTER" ? 16 : 10;
  return Array.from({ length: count }, (_, index): LeaderboardPeriodOption => {
    if (kind === "MONTH") {
      const start = calendarDate(year, month - index);
      const end = calendarDate(start.getUTCFullYear(), start.getUTCMonth() + 1);
      return {
        kind,
        start: dateString(start),
        end: dateString(end),
        live: todayString < dateString(end),
      };
    }

    if (kind === "QUARTER") {
      const currentQuarterStart = Math.floor(month / 3) * 3;
      const start = calendarDate(year, currentQuarterStart - index * 3);
      const end = calendarDate(start.getUTCFullYear(), start.getUTCMonth() + 3);
      return {
        kind,
        start: dateString(start),
        end: dateString(end),
        live: todayString < dateString(end),
      };
    }

    const start = calendarDate(year - index, 0);
    const end = calendarDate(year - index + 1, 0);
    return {
      kind,
      start: dateString(start),
      end: dateString(end),
      live: todayString < dateString(end),
    };
  });
}

export function resolveLeaderboardPeriodOptions(
  kind: SwipeRankPeriodKind,
  observedPeriods: readonly ObservedPeriod[] | undefined,
  today = new Date(),
): LeaderboardPeriodOption[] {
  const todayString = dateString(today);
  const observed = observedPeriods
    ?.filter((item) => item.period.kind === kind)
    .map(
      (item): LeaderboardPeriodOption => ({
        ...item.period,
        live: kind === "ALL_TIME" || todayString < item.period.end,
      }),
    )
    .sort((left, right) => right.start.localeCompare(left.start));

  return observed && observed.length > 0
    ? observed
    : generatedPeriodOptions(kind, today);
}

export function preferredLeaderboardPeriod(
  options: readonly LeaderboardPeriodOption[],
  kind: SwipeRankPeriodKind,
): LeaderboardPeriodOption {
  const newestFirst = [...options].sort((left, right) =>
    right.start.localeCompare(left.start),
  );
  const preferred =
    kind === "MONTH"
      ? (newestFirst.find((period) => !period.live) ?? newestFirst[0])
      : newestFirst[0];

  if (!preferred) {
    throw new Error(`No ${kind} leaderboard periods are available.`);
  }
  return preferred;
}

/** Curated shortcuts use completed calendar periods, except all time. */
export function resolveLeaderboardQuickJumps(
  observedPeriods: readonly ObservedPeriod[] | undefined,
  today = new Date(),
): LeaderboardQuickJump[] {
  if (!observedPeriods) return [];
  const observed = observedPeriods;
  const todayString = dateString(today);

  function newest(
    kind: SwipeRankPeriodKind,
    completedOnly: boolean,
  ): LeaderboardPeriodOption | undefined {
    return observed
      .filter(
        (item) =>
          item.period.kind === kind &&
          (!completedOnly || item.period.end <= todayString),
      )
      .map((item) => ({
        ...item.period,
        live: kind === "ALL_TIME" || todayString < item.period.end,
      }))
      .sort((left, right) => right.start.localeCompare(left.start))[0];
  }

  return [
    {
      key: "ALL_TIME" as const,
      label: "All time",
      period: newest("ALL_TIME", false),
    },
    {
      key: "LAST_QUARTER" as const,
      label: "Last quarter",
      period: newest("QUARTER", true),
    },
    {
      key: "LAST_MONTH" as const,
      label: "Last month",
      period: newest("MONTH", true),
    },
    {
      key: "LAST_YEAR" as const,
      label: "Last year",
      period: newest("YEAR", true),
    },
  ].flatMap((item) => (item.period ? [item as LeaderboardQuickJump] : []));
}
