"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  Trophy,
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
import { GENDERS } from "@/server/db/constants";
import {
  DEFAULT_SWIPE_RANK_PERIOD_KIND,
  formatMatchYield,
  formatSwipeRankPeriodLabel,
  swipeRankPeriodKey,
} from "@/lib/swipe-rank/format";
import { useTRPC, type RouterInputs } from "@/trpc/react";

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

const EMPTY_FILTERS: DraftFilters = {
  gender: "ALL",
  interestedIn: "ALL",
  ageMin: "",
  ageMax: "",
  country: "",
  region: "",
  city: "",
};

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
  const limit = 50;

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
            Private, live rankings over versioned Tinder facts. Match yield is
            matches divided by right swipes and is never capped at 100%.
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

      <Card>
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
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>
                  {formatSwipeRankPeriodLabel(leaderboard.period)} match yield
                </CardTitle>
                <CardDescription className="mt-1">
                  Exact ranks inside the currently filtered eligible sample.
                </CardDescription>
              </div>
              <p className="text-xs text-gray-500">
                As of{" "}
                {leaderboard.asOf
                  ? new Date(leaderboard.asOf).toLocaleString()
                  : "unknown"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Rank</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Peer descriptors</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Match yield</TableHead>
                  <TableHead className="text-right">
                    Matches / right swipes
                  </TableHead>
                  <TableHead className="text-right">Activity</TableHead>
                  <TableHead className="w-24">Quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.entries.map((entry) => (
                  <TableRow key={entry.profileId}>
                    <TableCell>
                      <p className="font-bold tabular-nums">#{entry.rank}</p>
                      {entry.tieCount > 1 && (
                        <p className="text-xs text-gray-500">
                          {entry.tieCount}-way tie
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/insights/tinder/${entry.providerProfileId}`}
                        target="_blank"
                        className="inline-flex max-w-52 items-center gap-1 truncate font-mono text-xs text-blue-700 hover:underline"
                      >
                        {entry.providerProfileId}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>
                        {entry.gender ?? "Unknown"} →{" "}
                        {entry.interestedIn ?? "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Age {entry.ageInPeriod ?? "—"}
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
                      <p className="text-xs text-gray-500">
                        Top {entry.topShare?.toFixed(1) ?? "—"}%
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
