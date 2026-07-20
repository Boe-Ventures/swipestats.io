"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  Filter,
  History,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/lib/utils";
import { GENDERS } from "@/server/db/constants";
import {
  DEFAULT_SWIPE_RANK_PERIOD_KIND,
  formatMatchYield,
  formatSwipeRankPeriodLabel,
  swipeRankPeriodKey,
} from "@/lib/swipe-rank/format";
import { formatSwipeRankOrientation } from "@/lib/swipe-rank/orientation";
import { useTRPC, type RouterInputs } from "@/trpc/react";

import { resolveLeaderboardQuickJumps } from "../../(marketing)/leaderboard/period-options";

type AdminFilters = NonNullable<
  RouterInputs["swipeRank"]["adminAvailablePeriods"]["filters"]
>;

type DraftFilters = {
  gender: string;
  interestedIn: string;
  ageMin: string;
  ageMax: string;
  country: string;
  region: string;
  city: string;
};

type ModerationTarget = {
  providerProfileId: string;
  excluded: boolean;
};

const EMPTY_FILTERS: DraftFilters = {
  gender: "ALL",
  interestedIn: "ALL",
  ageMin: "",
  ageMax: "",
  country: "",
  region: "",
  city: "",
};

const PERCENTILE_BANDS = [1, 5, 10, 25, 50, 100] as const;

function percentileBand(rank: number, fieldSize: number): number {
  return (
    PERCENTILE_BANDS.find(
      (limit) => rank <= Math.max(1, Math.floor((fieldSize * limit) / 100)),
    ) ?? 100
  );
}

function quickJumpIcon(key: string) {
  if (key === "ALL_TIME") return History;
  if (key === "LAST_QUARTER") return Sparkles;
  return CalendarDays;
}

function normalizedFilters(draft: DraftFilters): AdminFilters {
  return {
    gender:
      draft.gender === "ALL"
        ? undefined
        : (draft.gender as AdminFilters["gender"]),
    interestedIn:
      draft.interestedIn === "ALL"
        ? undefined
        : (draft.interestedIn as AdminFilters["interestedIn"]),
    ageMin: draft.ageMin ? Number(draft.ageMin) : undefined,
    ageMax: draft.ageMax ? Number(draft.ageMax) : undefined,
    country: draft.country.trim() || undefined,
    region: draft.region.trim() || undefined,
    city: draft.city.trim() || undefined,
  };
}

export default function AdminSwipeRankPage() {
  const trpc = useTRPC();
  const [draft, setDraft] = useState<DraftFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AdminFilters>({});
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [page, setPage] = useState(1);
  const [moderationTarget, setModerationTarget] =
    useState<ModerationTarget | null>(null);
  const [exclusionReason, setExclusionReason] = useState("");
  const limit = 50;

  const exclusionsQuery = useQuery(
    trpc.swipeRank.adminExclusions.queryOptions(),
  );

  const periodsQuery = useQuery(
    trpc.swipeRank.adminAvailablePeriods.queryOptions({ filters }),
  );
  const periods = periodsQuery.data?.periods ?? [];

  useEffect(() => {
    if (periods.length === 0) {
      setSelectedPeriodKey("");
      return;
    }

    const selectionExists = periods.some(
      (item) => swipeRankPeriodKey(item.period) === selectedPeriodKey,
    );
    if (!selectionExists) {
      const preferredPeriod =
        periods.find(
          (item) =>
            item.period.kind === DEFAULT_SWIPE_RANK_PERIOD_KIND &&
            item.eligibleCount > 0,
        ) ??
        periods.find((item) => item.eligibleCount > 0) ??
        periods[0]!;
      setSelectedPeriodKey(swipeRankPeriodKey(preferredPeriod.period));
      setPage(1);
    }
  }, [periods, selectedPeriodKey]);

  const selectedPeriod = useMemo(
    () =>
      periods.find(
        (item) => swipeRankPeriodKey(item.period) === selectedPeriodKey,
      ),
    [periods, selectedPeriodKey],
  );
  const quickJumps = useMemo(
    () =>
      resolveLeaderboardQuickJumps(
        periods.filter((item) => item.eligibleCount > 0),
      ),
    [periods],
  );

  const leaderboardQuery = useQuery(
    trpc.swipeRank.adminLeaderboard.queryOptions(
      {
        period: selectedPeriod?.period ?? {
          kind: DEFAULT_SWIPE_RANK_PERIOD_KIND,
          start: "2000-01-01",
          end: "2000-04-01",
        },
        filters,
        page,
        limit,
      },
      { enabled: Boolean(selectedPeriod) },
    ),
  );

  const exclusionMutation = useMutation(
    trpc.swipeRank.setAdminExclusion.mutationOptions({
      onSuccess: async () => {
        setModerationTarget(null);
        setExclusionReason("");
        await Promise.all([
          exclusionsQuery.refetch(),
          periodsQuery.refetch(),
          leaderboardQuery.refetch(),
        ]);
      },
    }),
  );

  function openModeration(target: ModerationTarget) {
    exclusionMutation.reset();
    setExclusionReason("");
    setModerationTarget(target);
  }

  function submitModeration() {
    if (!moderationTarget) return;
    exclusionMutation.mutate({
      providerProfileId: moderationTarget.providerProfileId,
      excluded: moderationTarget.excluded,
      reason: moderationTarget.excluded ? exclusionReason.trim() : undefined,
    });
  }

  function applyFilters() {
    const next = normalizedFilters(draft);
    if (
      next.ageMin !== undefined &&
      next.ageMax !== undefined &&
      next.ageMin > next.ageMax
    ) {
      setFilterError("Minimum age cannot be greater than maximum age.");
      return;
    }

    setFilterError(null);
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS);
    setFilters({});
    setFilterError(null);
    setPage(1);
  }

  const leaderboard = leaderboardQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <ButtonLinkBack />
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Trophy className="h-8 w-8 text-amber-500" />
            SwipeRank Explorer
          </h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Private, live rankings over versioned Tinder facts. Observed match
            rate is matches divided by right swipes and is never capped at 100%.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Dynamic cohort filters
          </CardTitle>
          <CardDescription>
            Every filter changes both the eligible sample and the exact rank.
            Location matches are case-insensitive and exact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Gender"
              value={draft.gender}
              onChange={(gender) => setDraft((value) => ({ ...value, gender }))}
            />
            <FilterSelect
              label="Interested in"
              value={draft.interestedIn}
              onChange={(interestedIn) =>
                setDraft((value) => ({ ...value, interestedIn }))
              }
            />
            <FilterInput
              label="Minimum age"
              type="number"
              value={draft.ageMin}
              onChange={(ageMin) => setDraft((value) => ({ ...value, ageMin }))}
            />
            <FilterInput
              label="Maximum age"
              type="number"
              value={draft.ageMax}
              onChange={(ageMax) => setDraft((value) => ({ ...value, ageMax }))}
            />
            <FilterInput
              label="Country"
              value={draft.country}
              onChange={(country) =>
                setDraft((value) => ({ ...value, country }))
              }
            />
            <FilterInput
              label="Region"
              value={draft.region}
              onChange={(region) => setDraft((value) => ({ ...value, region }))}
            />
            <FilterInput
              label="City"
              value={draft.city}
              onChange={(city) => setDraft((value) => ({ ...value, city }))}
            />
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters}>Apply filters</Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
          {filterError && <p className="text-sm text-red-600">{filterError}</p>}
        </CardContent>
      </Card>

      {(exclusionsQuery.data?.length ?? 0) > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="h-4 w-4 text-amber-700" />
              Banned from SwipeRank
            </CardTitle>
            <CardDescription>
              These are reversible ranking bans: facts stay intact for review,
              while the profiles are omitted from every live field and benchmark
              until restored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {exclusionsQuery.data?.map((entry) => (
              <div
                key={entry.profileId}
                className="flex flex-col gap-3 rounded-lg border bg-amber-50/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/insights/tinder/${entry.providerProfileId}`}
                    className="block truncate font-mono text-xs text-blue-700 hover:underline"
                  >
                    {entry.providerProfileId}
                  </Link>
                  <p className="mt-1 text-sm text-gray-800">{entry.reason}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {entry.excludedAt
                      ? new Date(entry.excludedAt).toLocaleString()
                      : "Unknown time"}{" "}
                    · {entry.excludedBy ?? "Unknown actor"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() =>
                    openModeration({
                      providerProfileId: entry.providerProfileId,
                      excluded: false,
                    })
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        {quickJumps.length > 0 && (
          <div className="border-b bg-gradient-to-r from-rose-50/80 via-white to-slate-50 px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rose-500" />
              <p className="text-sm font-semibold text-slate-900">
                Quick jumps
              </p>
              <p className="text-xs text-slate-500">
                The leaderboards worth opening first
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {quickJumps.map((jump) => {
                const Icon = quickJumpIcon(jump.key);
                const key = swipeRankPeriodKey(jump.period);
                const active = key === selectedPeriodKey;
                return (
                  <button
                    key={jump.key}
                    type="button"
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-rose-200 hover:bg-rose-50/30",
                      active && "border-rose-300 bg-rose-50/60",
                    )}
                    onClick={() => {
                      setSelectedPeriodKey(key);
                      setPage(1);
                    }}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500",
                        active && "bg-white text-rose-500",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {jump.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {formatSwipeRankPeriodLabel(jump.period)}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <CardContent className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div className="min-w-[280px]">
            <label
              htmlFor="swipe-rank-period"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Available period
            </label>
            <Select
              value={selectedPeriodKey}
              onValueChange={(value) => {
                setSelectedPeriodKey(value);
                setPage(1);
              }}
              disabled={periods.length === 0}
            >
              <SelectTrigger id="swipe-rank-period">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((item) => (
                  <SelectItem
                    key={swipeRankPeriodKey(item.period)}
                    value={swipeRankPeriodKey(item.period)}
                    disabled={item.eligibleCount === 0}
                  >
                    {formatSwipeRankPeriodLabel(item.period)} ·{" "}
                    {item.eligibleCount.toLocaleString()} eligible
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leaderboard && (
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">
                {leaderboard.fieldSize.toLocaleString()} eligible
              </Badge>
              <Badge variant="outline">
                {leaderboard.totalFactCount.toLocaleString()} facts
              </Badge>
              <Badge variant="outline">
                Minimum {leaderboard.eligibility.minimumRateDenominator} right
                swipes · {leaderboard.eligibility.minimumActiveDays} active days
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {(periodsQuery.isLoading || leaderboardQuery.isLoading) && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {(periodsQuery.isError || leaderboardQuery.isError) && (
        <Card className="border-red-200">
          <CardContent className="flex gap-3 p-5 text-sm text-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            SwipeRank facts could not be loaded. Confirm the migration and a
            completed fact build are present.
          </CardContent>
        </Card>
      )}

      {!periodsQuery.isLoading && periods.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">
            No SwipeRank periods are available for this cohort yet.
          </CardContent>
        </Card>
      )}

      {leaderboard && leaderboard.entries.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b bg-slate-950 py-5 text-white">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>
                  {formatSwipeRankPeriodLabel(leaderboard.period)} leaderboard
                </CardTitle>
                <CardDescription className="mt-1 text-slate-400">
                  Exact ranks in the filtered sample, grouped into percentile
                  bands.
                </CardDescription>
              </div>
              <p className="text-xs text-slate-400">
                As of{" "}
                {leaderboard.asOf
                  ? new Date(leaderboard.asOf).toLocaleString()
                  : "unknown"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-20">Rank</TableHead>
                    <TableHead>Profile & images</TableHead>
                    <TableHead>Orientation</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">
                      Observed match rate
                    </TableHead>
                    <TableHead className="text-right">
                      Matches / right swipes
                    </TableHead>
                    <TableHead className="text-right">Activity</TableHead>
                    <TableHead className="w-24">Quality</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.entries.map((entry, index) => {
                    const band = percentileBand(
                      entry.rank,
                      leaderboard.fieldSize,
                    );
                    const previousBand =
                      index === 0
                        ? null
                        : percentileBand(
                            leaderboard.entries[index - 1]!.rank,
                            leaderboard.fieldSize,
                          );
                    const showBand = index === 0 || band !== previousBand;
                    return (
                      <Fragment key={entry.profileId}>
                        {showBand && (
                          <TableRow className="border-y bg-slate-50 hover:bg-slate-50">
                            <TableCell
                              colSpan={9}
                              className="py-2 font-mono text-[11px] tracking-[0.12em] uppercase"
                            >
                              <span className="font-bold text-slate-900">
                                {band === 100 ? "Full field" : `Top ${band}%`}
                              </span>
                              <span className="ml-3 text-slate-400">
                                up to{" "}
                                {Math.min(
                                  leaderboard.fieldSize,
                                  Math.max(
                                    1,
                                    Math.floor(
                                      (leaderboard.fieldSize * band) / 100,
                                    ),
                                  ),
                                ).toLocaleString()}{" "}
                                entries
                              </span>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className="h-[88px] bg-white hover:bg-rose-50/30">
                          <TableCell>
                            <p
                              className={cn(
                                "flex h-10 min-w-10 items-center justify-center rounded-xl border font-bold tabular-nums",
                                entry.rank === 1
                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                  : entry.rank === 2
                                    ? "border-slate-300 bg-white text-slate-700"
                                    : entry.rank === 3
                                      ? "border-orange-200 bg-orange-50 text-orange-800"
                                      : "border-transparent",
                              )}
                            >
                              {entry.rank <= 3
                                ? entry.rank.toLocaleString()
                                : `#${entry.rank.toLocaleString()}`}
                            </p>
                            {entry.tieCount > 1 && (
                              <p className="text-xs text-gray-500">
                                {entry.tieCount}-way tie
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-56 items-center gap-3">
                              <Link
                                href={`/admin/insights/tinder/${entry.providerProfileId}`}
                                target="_blank"
                                className="relative shrink-0"
                                aria-label="Open profile inspector"
                              >
                                <Avatar className="h-12 w-12 rounded-lg border bg-gray-100">
                                  {entry.photoUrl && (
                                    <AvatarImage
                                      src={entry.photoUrl}
                                      alt=""
                                      className="rounded-lg"
                                    />
                                  )}
                                  <AvatarFallback className="rounded-lg font-mono text-xs">
                                    No image
                                  </AvatarFallback>
                                </Avatar>
                                {entry.photoCount > 1 && (
                                  <span className="absolute -right-1 -bottom-1 rounded-full border bg-white px-1 text-[10px] font-bold shadow-sm">
                                    +{entry.photoCount - 1}
                                  </span>
                                )}
                              </Link>
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/insights/tinder/${entry.providerProfileId}`}
                                  target="_blank"
                                  className="inline-flex max-w-48 items-center gap-1 truncate font-mono text-xs text-blue-700 hover:underline"
                                >
                                  {entry.providerProfileId}
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </Link>
                                <p className="mt-1 text-xs text-gray-500">
                                  {entry.photoCount.toLocaleString()} stored
                                  image
                                  {entry.photoCount === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge
                              variant="outline"
                              title="Inferred from current gender and interested-in preference"
                            >
                              {formatSwipeRankOrientation(
                                entry.gender,
                                entry.interestedIn,
                              )}
                            </Badge>
                            <p className="text-xs text-gray-500">
                              {entry.gender
                                ? entry.gender.charAt(0) +
                                  entry.gender.slice(1).toLowerCase()
                                : "Unknown"}
                              , age {entry.ageInPeriod ?? "—"}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {[entry.city, entry.region, entry.country]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-semibold tabular-nums">
                              {formatMatchYield(entry.matchRate)}
                            </p>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {entry.matchRateNumerator.toLocaleString()} /{" "}
                            {entry.matchRateDenominator.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <p>{entry.activeDays} active days</p>
                            <p className="text-xs text-gray-500">
                              {entry.observedDays} observed
                            </p>
                          </TableCell>
                          <TableCell>
                            {entry.hasQualityAnomaly ? (
                              <Badge
                                title={entry.qualityFlags.join(", ")}
                                className="bg-amber-100 text-amber-900 hover:bg-amber-100"
                              >
                                Review
                              </Badge>
                            ) : (
                              <Badge variant="outline">Clean</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <ButtonLink
                                href={`/admin/insights/tinder/${entry.providerProfileId}`}
                                target="_blank"
                                variant="outline"
                                size="xs"
                                className="gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </ButtonLink>
                              <Button
                                variant="outline"
                                size="xs"
                                className="gap-1.5 text-amber-800"
                                onClick={() =>
                                  openModeration({
                                    providerProfileId: entry.providerProfileId,
                                    excluded: true,
                                  })
                                }
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Ban
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {leaderboard?.fieldSize === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">
            This period has facts, but no profiles meet the eligibility
            thresholds inside the selected cohort.
          </CardContent>
        </Card>
      )}

      {(leaderboard?.fieldSize ?? 0) > 0 && leaderboard && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {leaderboard.page} of {Math.max(leaderboard.totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= leaderboard.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={moderationTarget !== null}
        onOpenChange={(open) => {
          if (!open && !exclusionMutation.isPending) {
            setModerationTarget(null);
            setExclusionReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {moderationTarget?.excluded
                ? "Ban from SwipeRank?"
                : "Restore to SwipeRank?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {moderationTarget?.excluded
                ? "The profile’s data and facts stay intact for review, but it will be removed from every live rank and benchmark."
                : "The existing facts will immediately make this profile eligible for live fields again."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <p className="rounded-md bg-gray-50 p-2 font-mono text-xs break-all">
            {moderationTarget?.providerProfileId}
          </p>

          {moderationTarget?.excluded && (
            <div>
              <label
                htmlFor="swipe-rank-exclusion-reason"
                className="mb-2 block text-sm font-medium"
              >
                Review reason
              </label>
              <Textarea
                id="swipe-rank-exclusion-reason"
                value={exclusionReason}
                maxLength={500}
                placeholder="Why should this profile be excluded?"
                onChange={(event) => setExclusionReason(event.target.value)}
              />
              <p className="mt-1 text-right text-xs text-gray-500">
                {exclusionReason.trim().length}/500
              </p>
            </div>
          )}

          {exclusionMutation.isError && (
            <p className="text-sm text-red-700">
              {exclusionMutation.error.message}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={exclusionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant={moderationTarget?.excluded ? "destructive" : "default"}
              disabled={
                exclusionMutation.isPending ||
                (moderationTarget?.excluded === true &&
                  exclusionReason.trim().length < 3)
              }
              onClick={submitModeration}
            >
              {exclusionMutation.isPending
                ? "Saving…"
                : moderationTarget?.excluded
                  ? "Ban profile"
                  : "Restore profile"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ButtonLinkBack() {
  return (
    <Link href="/admin">
      <Button variant="ghost" size="sm" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>
    </Link>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const controlId = `swipe-rank-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div>
      <label
        htmlFor={controlId}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={controlId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {GENDERS.map((gender) => (
            <SelectItem key={gender} value={gender}>
              {gender}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  const controlId = `swipe-rank-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div>
      <label
        htmlFor={controlId}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <Input
        id={controlId}
        type={type}
        min={type === "number" ? 18 : undefined}
        max={type === "number" ? 100 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
