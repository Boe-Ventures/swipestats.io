import type { SwipeRankPeriodKind } from "@/lib/swipe-rank/format";

export interface LeaderboardPeriodOption {
  kind: SwipeRankPeriodKind;
  start: string;
  end: string;
  live: false;
}

export interface ObservedPeriod {
  period: {
    kind: SwipeRankPeriodKind;
    start: string;
    end: string;
  };
}

function dateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function generatedPeriodOptions(
  _kind: SwipeRankPeriodKind,
  today = new Date(),
): LeaderboardPeriodOption[] {
  const currentMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  return Array.from({ length: 36 }, (_, index) => {
    const start = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - index - 1,
        1,
      ),
    );
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    return {
      kind: "MONTH" as const,
      start: dateString(start),
      end: dateString(end),
      live: false as const,
    };
  });
}

export function resolveLeaderboardPeriodOptions(
  _kind: SwipeRankPeriodKind,
  observedPeriods: readonly ObservedPeriod[] | undefined,
  _today = new Date(),
): LeaderboardPeriodOption[] {
  const observed = observedPeriods
    ?.filter((item) => item.period.kind === "MONTH")
    .map((item) => ({ ...item.period, live: false as const }))
    .sort((left, right) => right.start.localeCompare(left.start));
  return observed ?? [];
}

export function preferredLeaderboardPeriod(
  options: readonly LeaderboardPeriodOption[],
  _kind: SwipeRankPeriodKind,
): LeaderboardPeriodOption {
  const preferred = options[0];
  if (!preferred) throw new Error("No monthly leaderboard is available.");
  return preferred;
}

export function resolveLeaderboardQuickJumps(
  observedPeriods: readonly ObservedPeriod[] | undefined,
): Array<{
  key: "LAST_MONTH";
  label: "Latest month";
  period: LeaderboardPeriodOption;
}> {
  const period = observedPeriods?.[0]?.period;
  return period
    ? [
        {
          key: "LAST_MONTH",
          label: "Latest month",
          period: { ...period, live: false },
        },
      ]
    : [];
}
