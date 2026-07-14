"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Gender = "MALE" | "FEMALE" | "OTHER" | "MORE" | "UNKNOWN";
type CohortMode = "GLOBAL" | "PEER";
type PeriodKind = "MONTH" | "QUARTER" | "YEAR" | "ALL_TIME";

const PERIOD_KIND_LABELS: Record<PeriodKind, string> = {
  MONTH: "Month",
  QUARTER: "Quarter",
  YEAR: "Year",
  ALL_TIME: "All time",
};

interface PercentileDistribution {
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  sampleSize: number | null;
  suppressed: boolean;
}

interface ComparisonPlacement {
  rank: number | null;
  fieldSize: number | null;
  percentile: number | null;
  includedInCohort: boolean;
  isHypothetical: boolean;
  suppressed: boolean;
}

const FALLBACK_PERIOD = {
  kind: "ALL_TIME",
  start: "0001-01-01",
  end: "9999-01-01",
} as const;

const BENCHMARK_REFRESH_INTERVAL_MS = 30_000;
const EMPTY_INVENTORY_POLL_INTERVAL_MS = 3_000;

function isGender(value: string | null): value is Gender {
  return (
    value === "MALE" ||
    value === "FEMALE" ||
    value === "OTHER" ||
    value === "MORE" ||
    value === "UNKNOWN"
  );
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return (
    (value * 100).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + "%"
  );
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  });
}

function formatOrdinal(value: number) {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return value + "th";
  switch (value % 10) {
    case 1:
      return value + "st";
    case 2:
      return value + "nd";
    case 3:
      return value + "rd";
    default:
      return value + "th";
  }
}

function BenchmarkMetric({
  label,
  description,
  value,
  distribution,
  placement,
  suppressed,
  format,
}: {
  label: string;
  description: string;
  value: number | null;
  distribution: PercentileDistribution;
  placement: ComparisonPlacement;
  suppressed: boolean;
  format: (value: number | null) => string;
}) {
  const percentileRows = [
    ["P10", distribution.p10],
    ["P25", distribution.p25],
    ["Median", distribution.p50],
    ["P75", distribution.p75],
    ["P90", distribution.p90],
  ] as const;

  return (
    <div className="rounded-xl border bg-white p-5">
      <div>
        <h3 className="font-semibold">{label}</h3>
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      </div>

      <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
        <p className="text-xs font-medium text-slate-400">You</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{format(value)}</p>
        {placement.rank !== null && placement.fieldSize !== null && (
          <p className="mt-2 text-xs text-slate-300">
            {placement.isHypothetical ? "Would place" : "Places"} #
            {placement.rank.toLocaleString()} against{" "}
            {placement.fieldSize.toLocaleString()} profiles
            {placement.percentile !== null && (
              <>
                {" "}
                · {formatOrdinal(Math.round(placement.percentile))} percentile
              </>
            )}
          </p>
        )}
      </div>

      {suppressed ? (
        <p className="text-muted-foreground mt-4 rounded-lg bg-slate-50 p-3 text-xs">
          Distribution hidden until this field reaches the privacy minimum.
        </p>
      ) : (
        <div className="mt-4 space-y-2 text-sm">
          {percentileRows.map(([name, percentileValue]) => (
            <div key={name} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{name}</span>
              <span className="font-mono font-semibold tabular-nums">
                {format(percentileValue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CohortBenchmarksSection() {
  const trpc = useTRPC();
  const { tinderId } = useTinderProfile();
  const [selectedKind, setSelectedKind] = useState<PeriodKind>("MONTH");
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [cohortMode, setCohortMode] = useState<CohortMode>("GLOBAL");

  const inventory = useQuery(
    trpc.swipeRank.availablePeriods.queryOptions(
      { tinderId },
      {
        refetchOnWindowFocus: true,
        refetchInterval: (query) =>
          query.state.data?.periods.length
            ? BENCHMARK_REFRESH_INTERVAL_MS
            : EMPTY_INVENTORY_POLL_INTERVAL_MS,
      },
    ),
  );
  const periods = inventory.data?.periods ?? [];
  const effectiveKind = periods.some(
    (item) => item.period.kind === selectedKind,
  )
    ? selectedKind
    : periods[0]?.period.kind;
  const kindPeriods = periods.filter(
    (item) => item.period.kind === effectiveKind,
  );
  const selected =
    kindPeriods.find(
      (item) => swipeRankPeriodKey(item.period) === selectedPeriodKey,
    ) ?? kindPeriods[0];
  const peerFilters =
    selected && isGender(selected.gender) && isGender(selected.interestedIn)
      ? {
          gender: selected.gender,
          interestedIn: selected.interestedIn,
        }
      : null;
  const effectiveMode =
    cohortMode === "PEER" && peerFilters ? "PEER" : "GLOBAL";
  const benchmark = useQuery(
    trpc.swipeRank.benchmark.queryOptions(
      {
        tinderId,
        period: selected?.period ?? FALLBACK_PERIOD,
        filters:
          effectiveMode === "PEER" ? (peerFilters ?? undefined) : undefined,
      },
      {
        enabled: Boolean(selected),
        refetchOnWindowFocus: true,
        refetchInterval: BENCHMARK_REFRESH_INTERVAL_MS,
      },
    ),
  );

  if (inventory.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (inventory.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>How you compare</CardTitle>
          <CardDescription>
            Your private benchmark could not be loaded right now.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>How you compare</CardTitle>
          <CardDescription>
            Period benchmarks will appear after your first SwipeRank fact build.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <SlidersHorizontal className="h-5 w-5" />
              How you compare
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Period-correct distributions from eligible Tinder SwipeRank facts.
              Your values remain visible even when you compare against a field
              you are not part of.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={effectiveKind}
              onValueChange={(value) => {
                setSelectedKind(value as PeriodKind);
                setSelectedPeriodKey("");
              }}
            >
              <SelectTrigger className="w-[135px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_KIND_LABELS).map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    disabled={
                      !periods.some((item) => item.period.kind === value)
                    }
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={swipeRankPeriodKey(selected.period)}
              onValueChange={setSelectedPeriodKey}
            >
              <SelectTrigger className="w-[180px]">
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
            <div className="flex rounded-md border p-1">
              <Button
                type="button"
                size="sm"
                variant={effectiveMode === "GLOBAL" ? "secondary" : "ghost"}
                onClick={() => setCohortMode("GLOBAL")}
              >
                Global
              </Button>
              <Button
                type="button"
                size="sm"
                variant={effectiveMode === "PEER" ? "secondary" : "ghost"}
                disabled={!peerFilters}
                onClick={() => setCohortMode("PEER")}
              >
                Same gender + interest
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        {benchmark.isLoading && (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        )}

        {benchmark.isError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            This benchmark could not be computed for the selected period.
          </div>
        )}

        {benchmark.data && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <BenchmarkMetric
                label="Match yield"
                description="Matches divided by ordinary right swipes"
                value={benchmark.data.target.values.matchYield}
                distribution={benchmark.data.cohort.metrics.matchYield}
                placement={benchmark.data.target.placements.matchYield}
                suppressed={benchmark.data.cohort.metrics.matchYield.suppressed}
                format={formatMatchYield}
              />
              <BenchmarkMetric
                label="Like rate"
                description="Right swipes divided by ordinary swipes"
                value={benchmark.data.target.values.likeRate}
                distribution={benchmark.data.cohort.metrics.likeRate}
                placement={benchmark.data.target.placements.likeRate}
                suppressed={benchmark.data.cohort.metrics.likeRate.suppressed}
                format={formatPercent}
              />
              <BenchmarkMetric
                label="Swipes per active day"
                description="Ordinary swipes on days with swipe activity"
                value={benchmark.data.target.values.swipesPerActiveDay}
                distribution={benchmark.data.cohort.metrics.swipesPerActiveDay}
                placement={benchmark.data.target.placements.swipesPerActiveDay}
                suppressed={
                  benchmark.data.cohort.metrics.swipesPerActiveDay.suppressed
                }
                format={formatNumber}
              />
            </div>

            {benchmark.data.insufficientSample && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
                This field has fewer than{" "}
                {benchmark.data.minimumPrivateSampleSize.toLocaleString()}{" "}
                eligible profiles. To protect individual privacy, its exact
                size, distributions, and placements are hidden. Your own period
                values remain visible.
              </div>
            )}

            {!benchmark.data.target.eligibility.eligible && (
              <div className="rounded-lg border border-dashed p-4 text-sm">
                Your period values are shown, but placement requires at least{" "}
                {benchmark.data.eligibility.minimumRateDenominator.toLocaleString()}{" "}
                right swipes and{" "}
                {benchmark.data.eligibility.minimumActiveDays.toLocaleString()}{" "}
                active days.
              </div>
            )}

            {benchmark.data.target.eligibility.eligible &&
              !benchmark.data.target.matchesFilters && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                  You are outside this descriptor filter, so your own fact is
                  not inserted into the distribution.{" "}
                  {benchmark.data.insufficientSample
                    ? "Placement is hidden until the comparison field reaches the privacy minimum."
                    : "The placement shown is a hypothetical position against its eligible sample."}
                </div>
              )}

            {benchmark.data.target.hasQualityAnomaly && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Unusual source totals</p>
                  <p className="mt-1 text-amber-800">
                    Match yield is shown as reported and is never capped at
                    100%. Quality flags:{" "}
                    {benchmark.data.target.qualityFlags.join(", ")}.
                  </p>
                </div>
              </div>
            )}

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Eligible sample{" "}
                {benchmark.data.insufficientSample
                  ? `<${benchmark.data.minimumPrivateSampleSize.toLocaleString()}`
                  : benchmark.data.cohort.sampleSize?.toLocaleString()}{" "}
                · minimum{" "}
                {benchmark.data.eligibility.minimumRateDenominator.toLocaleString()}{" "}
                right swipes +{" "}
                {benchmark.data.eligibility.minimumActiveDays.toLocaleString()}{" "}
                active days
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                As of{" "}
                {benchmark.data.cohort.asOf
                  ? new Date(benchmark.data.cohort.asOf).toLocaleString(
                      undefined,
                      { dateStyle: "medium", timeStyle: "short" },
                    )
                  : "—"}
              </span>
              <Badge variant="outline">
                {effectiveMode === "PEER" ? "Same gender + interest" : "Global"}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
