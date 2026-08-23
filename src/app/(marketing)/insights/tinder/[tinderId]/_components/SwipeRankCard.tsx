"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMatchYield,
  formatSwipeRankPeriodLabel,
  swipeRankPeriodKey,
} from "@/lib/swipe-rank/format";
import { useTRPC } from "@/trpc/react";

import { useTinderProfile } from "../TinderProfileProvider";

const FALLBACK_PERIOD = {
  kind: "MONTH",
  start: "2000-01-01",
  end: "2000-02-01",
} as const;

function formatTopShare(value: number | null) {
  if (value === null) return null;
  return `Top ${value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 1 : 0,
    maximumFractionDigits: 1,
  })}%`;
}

function RankBlock({
  title,
  definition,
  placement,
}: {
  title: string;
  definition: string;
  placement: {
    rank: number | null;
    fieldSize: number;
    topShare: number | null;
  };
}) {
  const topShare = formatTopShare(placement.topShare);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground mt-1 text-xs">{definition}</p>
        </div>
        {topShare && <Badge variant="secondary">{topShare}</Badge>}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">
          {placement.rank === null
            ? "—"
            : `#${placement.rank.toLocaleString()}`}
        </span>
        <span className="text-muted-foreground text-sm">
          of {placement.fieldSize.toLocaleString()} eligible profiles
        </span>
      </div>
    </div>
  );
}

export function SwipeRankCard() {
  const trpc = useTRPC();
  const { tinderId } = useTinderProfile();
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const inventory = useQuery(
    trpc.swipeRank.availablePeriods.queryOptions(
      { tinderId },
      {
        staleTime: 5 * 60 * 1_000,
        refetchOnWindowFocus: true,
      },
    ),
  );
  const periods = inventory.data?.periods ?? [];
  const kindPeriods = periods;
  const selectedPeriod =
    kindPeriods.find(
      (item) => swipeRankPeriodKey(item.period) === selectedPeriodKey,
    ) ?? kindPeriods[0];
  const placement = useQuery(
    trpc.swipeRank.placement.queryOptions(
      {
        tinderId,
        period: selectedPeriod?.period ?? FALLBACK_PERIOD,
      },
      {
        enabled: Boolean(selectedPeriod),
        staleTime: 5 * 60 * 1_000,
        refetchOnWindowFocus: true,
      },
    ),
  );
  const selected = placement.data;

  if (inventory.isLoading || (selectedPeriod && placement.isLoading)) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (inventory.isError || placement.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            SwipeRank
          </CardTitle>
          <CardDescription>
            SwipeRank could not be loaded right now.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!selectedPeriod || !selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            SwipeRank
          </CardTitle>
          <CardDescription>
            Your first ranking will appear after a completed month is published.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const asOf = new Date(selected.asOf).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-amber-50 via-white to-rose-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="h-6 w-6 text-amber-500" />
              SwipeRank
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Match yield is matches divided by right swipes. It describes the
              uploaded activity data—not human worth or attractiveness.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={swipeRankPeriodKey(selectedPeriod.period)}
              onValueChange={(next) =>
                next !== null && setSelectedPeriodKey(next)
              }
            >
              <SelectTrigger className="w-[190px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindPeriods.map((item) => (
                  <SelectItem
                    key={swipeRankPeriodKey(item.period)}
                    value={swipeRankPeriodKey(item.period)}
                  >
                    {formatSwipeRankPeriodLabel(item.period)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="rounded-xl bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-300">
                {formatSwipeRankPeriodLabel(selected.period)} match yield
              </p>
              <Badge
                className={
                  selected.excludedFromSwipeRank
                    ? "bg-amber-500 text-white"
                    : selected.eligible
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-100"
                }
              >
                {selected.excludedFromSwipeRank
                  ? "Not included"
                  : selected.eligible
                    ? "Eligible"
                    : "Not ranked yet"}
              </Badge>
            </div>
            <p className="mt-5 text-5xl font-bold tracking-tight tabular-nums">
              {formatMatchYield(selected.matchRate)}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              {selected.matchRateNumerator.toLocaleString()} matches /{" "}
              {selected.matchRateDenominator.toLocaleString()} right swipes
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {selected.activeDays.toLocaleString()} active days ·{" "}
              {selected.observedDays.toLocaleString()} observed days
            </p>
          </div>

          {selected.excludedFromSwipeRank ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-950">
                This profile is not currently included in SwipeRank
              </p>
              <p className="mt-2 text-sm text-amber-800">
                Your underlying activity and private insights remain available,
                but this profile is omitted from published ranks and benchmarks.
              </p>
            </div>
          ) : selected.eligible ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <RankBlock
                title="Global rank"
                definition="All eligible Tinder profiles in this period"
                placement={selected.global}
              />
              <RankBlock
                title="Peer rank"
                definition={selected.peer.definition}
                placement={selected.peer}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-5">
              <p className="font-semibold">A little more activity is needed</p>
              <p className="text-muted-foreground mt-2 text-sm">
                {formatSwipeRankPeriodLabel(selected.period)} requires at least{" "}
                {selected.eligibility.minimumRateDenominator.toLocaleString()}{" "}
                right swipes and {selected.eligibility.minimumActiveDays} active
                days.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <span className="font-semibold tabular-nums">
                    {selected.matchRateDenominator.toLocaleString()}
                  </span>{" "}
                  /{" "}
                  {selected.eligibility.minimumRateDenominator.toLocaleString()}{" "}
                  right swipes
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <span className="font-semibold tabular-nums">
                    {selected.activeDays.toLocaleString()}
                  </span>{" "}
                  / {selected.eligibility.minimumActiveDays} active days
                </div>
              </div>
            </div>
          )}
        </div>

        {selected.hasQualityAnomaly && (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Unusual source totals</p>
              <p className="mt-1 text-amber-800">
                The value is shown as reported and is not capped at 100%.
                Quality flags: {selected.qualityFlags.join(", ")}.
              </p>
            </div>
          </div>
        )}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Published {asOf}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Global sample {selected.global.fieldSize.toLocaleString()} · peer
            sample {selected.peer.fieldSize.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
