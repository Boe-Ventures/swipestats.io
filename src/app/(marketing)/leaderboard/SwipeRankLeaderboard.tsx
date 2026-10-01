"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countryDisplayName } from "@/lib/swipe-rank/country";
import {
  PUBLIC_AGE_BANDS,
  type PublicAgeBand,
} from "@/lib/swipe-rank/public-filters";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DEFAULT_SWIPE_RANK_PERIOD_KIND,
  formatSwipeRankPeriodLabel,
  swipeRankPeriodKey,
  type SwipeRankPeriodKind,
} from "@/lib/swipe-rank/format";
import { formatSwipeRankOrientation } from "@/lib/swipe-rank/orientation";
import type { SwipeRankGender } from "@/lib/swipe-rank/orientation";
import { cn } from "@/components/ui/lib/utils";
import { useTRPC } from "@/trpc/react";

import {
  generatedPeriodOptions,
  resolveLeaderboardQuickJumps,
  resolveLeaderboardPeriodOptions,
} from "./period-options";

const KIND_LABELS: Record<SwipeRankPeriodKind, string> = {
  MONTH: "Month",
  QUARTER: "Quarter",
  YEAR: "Year",
};

const KIND_NOUNS: Record<SwipeRankPeriodKind, string> = {
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
};

const UNKNOWN_GENDER_PRESENTATION = {
  short: "?",
  label: "Not reported",
  className:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-border dark:bg-background dark:text-muted-foreground",
} as const;

const GENDER_PRESENTATION: Record<
  string,
  { short: string; label: string; className: string }
> = {
  FEMALE: {
    short: "F",
    label: "Woman",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400",
  },
  MALE: {
    short: "M",
    label: "Man",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  },
  OTHER: {
    short: "Other",
    label: "Other",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400",
  },
  MORE: {
    short: "More",
    label: "More",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400",
  },
  UNKNOWN: UNKNOWN_GENDER_PRESENTATION,
};

function OrientationPill({
  gender,
  interestedIn,
}: {
  gender: SwipeRankGender | null;
  interestedIn: SwipeRankGender | null;
}) {
  const label = formatSwipeRankOrientation(gender, interestedIn);
  const className = {
    Straight:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
    Gay: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400",
    Bi: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-400",
    Queer:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
    "Not specified":
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-border dark:bg-background dark:text-muted-foreground",
  }[label];

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-xs font-semibold",
        className,
      )}
      title="Inferred from current gender and interested-in preference"
    >
      {label}
    </span>
  );
}

function MatchRateExplainer() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
          />
        }
        aria-label="Why is this match rate over 100%?"
      >
        <Info className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-w-[calc(100vw-2rem)] space-y-2 text-left"
      >
        <h3 className="font-semibold">Why over 100%?</h3>
        <p className="text-muted-foreground text-sm leading-6">
          Matches and right swipes are counted in the season when Tinder reports
          them. Some matches may come from right swipes in an earlier season, so
          matches can outnumber this season’s right swipes.
        </p>
        <p className="text-muted-foreground text-sm">
          This is an activity ratio, not the percentage of swipes that became
          matches.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function genderLabel(value: string | null): string {
  if (!value) return "Dater";
  return (GENDER_PRESENTATION[value] ?? UNKNOWN_GENDER_PRESENTATION).label;
}

function formatLocation(
  city: string | null,
  region: string | null,
  country: string | null,
): string {
  const locality = city ?? region;
  country = country ? countryDisplayName(country) : null;
  if (locality && country && locality !== country) {
    return `${locality}, ${country}`;
  }
  return locality ?? country ?? "Location not reported";
}

function formatObservedTenure(days: number): string {
  if (days < 61) return `${days.toLocaleString()}d observed`;
  const months = Math.max(1, Math.round(days / 30.4375));
  if (months < 24) return `${months.toLocaleString()}mo observed`;
  const years = days / 365.25;
  return `${years.toLocaleString(undefined, {
    minimumFractionDigits: years < 3 ? 1 : 0,
    maximumFractionDigits: 1,
  })}y observed`;
}

function eligibleSeasonCopy(count: number, kind: SwipeRankPeriodKind): string {
  const noun = KIND_NOUNS[kind];
  return `${count.toLocaleString()} ranked ${noun}${count === 1 ? "" : "s"}`;
}

const PERCENTILE_BANDS = [1, 5, 10, 25, 50, 100] as const;

function percentileBand(rank: number, fieldSize: number): number {
  return (
    PERCENTILE_BANDS.find(
      (limit) => rank <= Math.max(1, Math.floor((fieldSize * limit) / 100)),
    ) ?? 100
  );
}

export function SwipeRankLeaderboard() {
  const trpc = useTRPC();
  const [kind, setKind] = useState<SwipeRankPeriodKind>(
    DEFAULT_SWIPE_RANK_PERIOD_KIND,
  );
  const [page, setPage] = useState(1);
  const [gender, setGender] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [ageBand, setAgeBand] = useState<"ALL" | PublicAgeBand>("ALL");
  const filtered = gender !== "ALL" || ageBand !== "ALL";
  const availablePeriods = useQuery(
    trpc.swipeRank.publicAvailablePeriods.queryOptions(undefined, {
      staleTime: 5 * 60 * 1000,
      refetchInterval: 60 * 1000,
      refetchOnWindowFocus: true,
    }),
  );
  const options = useMemo(() => {
    return resolveLeaderboardPeriodOptions(
      kind,
      availablePeriods.data?.periods,
    );
  }, [availablePeriods.data?.periods, kind]);
  const quickJumps = useMemo(
    () => resolveLeaderboardQuickJumps(availablePeriods.data?.periods),
    [availablePeriods.data?.periods],
  );
  const placeholderPeriod = generatedPeriodOptions(kind)[0]!;
  const defaultPeriod = options[0] ?? placeholderPeriod;
  const [selectedKey, setSelectedKey] = useState(() =>
    swipeRankPeriodKey(defaultPeriod),
  );
  const selected =
    options.find((period) => swipeRankPeriodKey(period) === selectedKey) ??
    defaultPeriod;

  const leaderboard = useQuery(
    trpc.swipeRank.publicLeaderboard.queryOptions(
      {
        period: {
          kind: selected.kind,
          start: selected.start,
          end: selected.end,
        },
        page,
        filters: {
          gender: gender === "ALL" ? undefined : gender,
          ageBand: ageBand === "ALL" ? undefined : ageBand,
        },
      },
      {
        enabled: availablePeriods.isSuccess && options.length > 0,
        placeholderData: keepPreviousData,
        refetchInterval: 60 * 1000,
        refetchOnWindowFocus: true,
      },
    ),
  );

  function chooseKind(nextKind: SwipeRankPeriodKind) {
    const nextOptions = resolveLeaderboardPeriodOptions(
      nextKind,
      availablePeriods.data?.periods,
    );
    const preferred = nextOptions[0] ?? generatedPeriodOptions(nextKind)[0]!;
    setKind(nextKind);
    setSelectedKey(swipeRankPeriodKey(preferred));
    setPage(1);
  }

  function choosePeriod(period: (typeof options)[number]) {
    setKind(period.kind);
    setSelectedKey(swipeRankPeriodKey(period));
    setPage(1);
  }

  const data = leaderboard.data;
  const periodLabel = formatSwipeRankPeriodLabel(selected);

  useEffect(() => {
    if (data && data.totalPages > 0 && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data, page]);

  return (
    <main className="dark:bg-background/70 min-h-screen bg-slate-50/70">
      <section className="dark:bg-card border-b bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Badge
            variant="secondary"
            className="mb-5 gap-2 font-mono tracking-[0.14em] uppercase"
          >
            Tinder · observed match rate
          </Badge>
          <h1 className="max-w-4xl text-5xl font-bold tracking-[-0.04em] sm:text-7xl">
            SwipeRank
          </h1>
          <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
            A playful leaderboard for uploaded Tinder activity. Observed match
            rate is matches reported in a season divided by right swipes
            reported in that season, not a literal per-swipe conversion rate.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink
              href="/upload/tinder"
              className="shadow-[0_10px_30px_rgba(244,0,70,0.22)]"
            >
              Find my SwipeRank
            </ButtonLink>
            <ButtonLink href="/#faq" variant="outline">
              How SwipeStats works
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] space-y-7 px-4 py-9 sm:px-6 lg:px-8">
        <Card className="dark:border-border gap-0 overflow-hidden border-slate-200 py-0 shadow-sm">
          <CardContent className="p-0">
            {quickJumps.length > 0 && (
              <div className="dark:via-card border-b bg-gradient-to-r from-rose-50/80 via-white to-violet-50/60 p-4 sm:p-5 dark:from-rose-950/80 dark:to-violet-950/60">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="text-primary h-4 w-4" />
                  <p className="dark:text-foreground text-sm font-semibold text-slate-950">
                    Quick jumps
                  </p>
                  <p className="text-muted-foreground hidden text-xs sm:block">
                    The leaderboards worth opening first
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {quickJumps.map((jump) => {
                    const active =
                      swipeRankPeriodKey(jump.period) ===
                      swipeRankPeriodKey(selected);
                    return (
                      <button
                        key={jump.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => choosePeriod(jump.period)}
                        className={cn(
                          "group dark:bg-card flex min-w-0 items-center gap-3 rounded-xl border bg-white px-3 py-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-sm dark:hover:border-rose-800",
                          active && "border-primary/40 ring-primary/10 ring-2",
                        )}
                      >
                        <span
                          className={cn(
                            "dark:bg-muted dark:text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600",
                            active && "bg-primary/10 text-primary",
                          )}
                        >
                          <CalendarDays className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="dark:text-foreground block text-sm font-semibold text-slate-950">
                            {jump.label}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {formatSwipeRankPeriodLabel(jump.period)}
                          </span>
                        </span>
                        <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select
                  value={kind}
                  onValueChange={(value) => chooseKind(value!)}
                >
                  <SelectTrigger
                    className="dark:bg-card h-11 bg-white sm:w-44"
                    aria-label="Competition length"
                  >
                    <SelectValue>{KIND_LABELS[kind]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(KIND_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={
                    options.length > 0 ? swipeRankPeriodKey(selected) : null
                  }
                  disabled={options.length === 0}
                  onValueChange={(value) => {
                    if (value === null) return;
                    setSelectedKey(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="dark:bg-card h-11 bg-white sm:w-56"
                    aria-label="Competition season"
                  >
                    <SelectValue>
                      {options.length > 0
                        ? periodLabel
                        : `No published ${KIND_NOUNS[kind]}s`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((period) => (
                      <SelectItem
                        key={swipeRankPeriodKey(period)}
                        value={swipeRankPeriodKey(period)}
                      >
                        {formatSwipeRankPeriodLabel(period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {data && (
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs sm:text-sm">
                  {data.fieldSize !== null && (
                    <span className="dark:text-foreground font-semibold text-slate-950">
                      {data.fieldSize.toLocaleString()} eligible
                    </span>
                  )}
                  <span aria-hidden>·</span>
                  <span>
                    {data.minimumRateDenominator.toLocaleString()}+ right swipes
                  </span>
                  <span aria-hidden>·</span>
                  <span>{data.minimumActiveDays}+ active days</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {leaderboard.isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-20">
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
              Loading {periodLabel}…
            </CardContent>
          </Card>
        )}

        {leaderboard.isError && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="py-8 text-sm text-red-700 dark:text-red-400">
              SwipeRank could not be loaded right now. Please try another period
              or refresh the page.
            </CardContent>
          </Card>
        )}

        {availablePeriods.isSuccess && options.length === 0 && (
          <Card>
            <CardContent>
              <EmptyLeaderboard
                title={`No ${KIND_NOUNS[kind]} season has been published yet`}
                description="Closed seasons appear after the scheduled publication completes."
              />
            </CardContent>
          </Card>
        )}

        {data && (
          <Card className="dark:border-border gap-0 overflow-hidden border-slate-300 py-0 shadow-sm">
            <CardHeader className="border-b border-slate-800 bg-slate-950 py-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <CardTitle className="text-xl leading-tight tracking-tight sm:text-2xl">
                    {periodLabel} leaderboard
                  </CardTitle>
                  {leaderboard.isFetching && (
                    <span className="text-xs text-slate-400" role="status">
                      Updating…
                    </span>
                  )}
                  {filtered && (
                    <p className="text-xs text-slate-400">
                      {data.matchingCount?.toLocaleString()} matching profiles ·
                      season ranks unchanged
                    </p>
                  )}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <Select
                    value={gender}
                    onValueChange={(value) => {
                      if (value) {
                        setGender(value);
                        setPage(1);
                      }
                    }}
                  >
                    <SelectTrigger
                      aria-label="Filter gender"
                      className="w-36 bg-white text-slate-950 hover:bg-slate-50 data-popup-open:bg-slate-50"
                    >
                      <SelectValue>
                        {gender === "ALL"
                          ? "Everyone"
                          : gender === "MALE"
                            ? "Men"
                            : "Women"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Everyone</SelectItem>
                      <SelectItem value="MALE">Men</SelectItem>
                      <SelectItem value="FEMALE">Women</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={ageBand}
                    onValueChange={(value) => {
                      if (value) {
                        setAgeBand(value);
                        setPage(1);
                      }
                    }}
                  >
                    <SelectTrigger
                      aria-label="Filter age"
                      className="w-36 bg-white text-slate-950 hover:bg-slate-50 data-popup-open:bg-slate-50"
                    >
                      <SelectValue>
                        {ageBand === "ALL"
                          ? "All ages"
                          : PUBLIC_AGE_BANDS[ageBand].label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All ages</SelectItem>
                      {Object.entries(PUBLIC_AGE_BANDS).map(([value, band]) => (
                        <SelectItem key={value} value={value}>
                          {band.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!data.ready ? (
                <EmptyLeaderboard
                  title="The first full field is being prepared"
                  description="SwipeRank stays hidden until this closed season has passed validation and publication."
                />
              ) : data.countsSuppressed ? (
                <EmptyLeaderboard
                  title="This field is still too small"
                  description={`At least ${data.minimumPublicFieldSize} eligible profiles are required before public rows are shown.`}
                />
              ) : data.entries.length === 0 ? (
                <EmptyLeaderboard
                  title="No profiles found on this page"
                  description="Try another season, clear the filters, or return to the first page."
                />
              ) : (
                <div>
                  <div
                    aria-busy={leaderboard.isPlaceholderData}
                    className={cn(
                      "overflow-x-auto",
                      leaderboard.isPlaceholderData && "opacity-50",
                    )}
                  >
                    <Table className="min-w-[760px] lg:min-w-[1080px]">
                      <TableHeader>
                        <TableRow className="dark:bg-background/80 dark:hover:bg-background/80 bg-slate-50/80 hover:bg-slate-50/80">
                          <TableHead className="w-36 px-7 font-mono text-[11px] tracking-[0.12em] uppercase">
                            Rank
                          </TableHead>
                          <TableHead className="min-w-[420px] font-mono text-[11px] tracking-[0.12em] uppercase">
                            Dater
                          </TableHead>
                          <TableHead className="w-36 font-mono text-[11px] tracking-[0.12em] uppercase">
                            Orientation
                          </TableHead>
                          <TableHead className="min-w-64 px-7 text-right font-mono text-[11px] tracking-[0.12em] uppercase">
                            Match rate · activity
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.entries.map((entry, index) => {
                          const progress = Math.min(
                            entry.matchYieldPercent,
                            100,
                          );
                          const band = percentileBand(
                            entry.rank,
                            data.fieldSize!,
                          );
                          const previousBand =
                            index === 0
                              ? null
                              : percentileBand(
                                  data.entries[index - 1]!.rank,
                                  data.fieldSize!,
                                );
                          const showBand = index === 0 || band !== previousBand;
                          return (
                            <Fragment key={entry.entryKey}>
                              {showBand && (
                                <TableRow className="dark:bg-background dark:hover:bg-background border-y bg-slate-50 hover:bg-slate-50">
                                  <TableCell
                                    colSpan={4}
                                    className="px-7 py-2 font-mono text-[11px] tracking-[0.12em] uppercase"
                                  >
                                    <span className="dark:text-foreground font-bold text-slate-900">
                                      {band === 100
                                        ? "Full field"
                                        : `Top ${band}%`}
                                    </span>
                                    <span className="dark:text-muted-foreground ml-3 text-slate-400">
                                      Ranks 1–
                                      {Math.min(
                                        data.fieldSize!,
                                        Math.max(
                                          1,
                                          Math.floor(
                                            (data.fieldSize! * band) / 100,
                                          ),
                                        ),
                                      ).toLocaleString()}{" "}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              )}
                              <TableRow className="group dark:bg-card h-[96px] bg-white hover:bg-rose-50/30 dark:hover:bg-rose-950/30">
                                <TableCell className="px-7">
                                  <div className="flex items-center">
                                    <span
                                      className={cn(
                                        "flex h-11 min-w-11 items-center justify-center rounded-xl border text-base font-bold tabular-nums",
                                        entry.rank === 1
                                          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                                          : entry.rank === 2
                                            ? "dark:border-border dark:bg-card dark:text-muted-foreground border-slate-300 bg-white text-slate-700"
                                            : entry.rank === 3
                                              ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200"
                                              : "dark:text-foreground border-transparent bg-transparent text-slate-950",
                                      )}
                                    >
                                      {entry.rank <= 3
                                        ? entry.rank.toLocaleString()
                                        : `#${entry.rank.toLocaleString()}`}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="min-w-0">
                                    <p className="font-semibold">
                                      {genderLabel(entry.gender)}
                                      {entry.age === null
                                        ? ""
                                        : `, ${entry.age}`}{" "}
                                      <span className="text-muted-foreground font-normal">
                                        ·{" "}
                                        {formatLocation(
                                          entry.city,
                                          entry.region,
                                          entry.country,
                                        )}
                                      </span>
                                    </p>
                                    <p className="text-muted-foreground mt-1 font-mono text-xs">
                                      {formatObservedTenure(
                                        entry.observedHistoryDays,
                                      )}{" "}
                                      ·{" "}
                                      {eligibleSeasonCopy(
                                        entry.seasonsRanked,
                                        selected.kind,
                                      )}
                                    </p>
                                    <p className="dark:text-muted-foreground mt-1 text-xs text-slate-400">
                                      {entry.activeDays.toLocaleString()} active
                                      days in this season
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <OrientationPill
                                    gender={entry.gender}
                                    interestedIn={entry.interestedIn}
                                  />
                                </TableCell>
                                <TableCell className="px-7 text-right">
                                  <div className="ml-auto max-w-64">
                                    <div className="flex items-center justify-end gap-2">
                                      {entry.matches > entry.rightSwipes && (
                                        <MatchRateExplainer />
                                      )}
                                      <span className="text-2xl font-bold tabular-nums">
                                        {entry.matchYieldPercent.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                          },
                                        )}
                                        %
                                      </span>
                                    </div>
                                    <p className="text-muted-foreground mt-1 font-mono text-xs whitespace-nowrap tabular-nums">
                                      {entry.matches.toLocaleString()} m /{" "}
                                      {entry.rightSwipes.toLocaleString()} rs ·{" "}
                                      {entry.totalSwipes.toLocaleString()} total{" "}
                                      swipes
                                    </p>
                                    <div className="dark:bg-muted mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="bg-primary h-full rounded-full"
                                        style={{ width: `${progress}%` }}
                                        aria-hidden
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="dark:bg-background/60 flex flex-col gap-4 border-t bg-slate-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <p className="text-muted-foreground max-w-3xl text-xs leading-5">
                      Profiles can recur across seasons. Profile details and
                      exact activity totals come from the uploaded Tinder
                      export. Each monthly field is frozen when that season is
                      published.
                    </p>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-muted-foreground text-xs tabular-nums">
                        Showing{" "}
                        {((data.page - 1) * data.pageSize + 1).toLocaleString()}
                        –
                        {(
                          (data.page - 1) * data.pageSize +
                          data.entries.length
                        ).toLocaleString()}{" "}
                        of {data.matchingCount?.toLocaleString()} profiles · 100
                        per page
                      </p>
                      {data.totalPages > 1 && (
                        <div className="flex shrink-0 items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={data.page <= 1}
                            onClick={() => setPage((current) => current - 1)}
                            aria-label="Previous leaderboard page"
                          >
                            <ChevronLeft />
                          </Button>
                          <p className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
                            Page {data.page.toLocaleString()} of{" "}
                            {data.totalPages.toLocaleString()}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={data.page >= data.totalPages}
                            onClick={() => setPage((current) => current + 1)}
                            aria-label="Next leaderboard page"
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-muted-foreground dark:bg-card flex gap-3 rounded-xl border bg-white p-4 text-sm leading-6">
          <Info className="mt-1 h-4 w-4 shrink-0" />
          <p>
            SwipeRank compares observed activity in a self-selected collection
            of uploaded Tinder exports. It does not measure attractiveness,
            human worth, or dating success. Match events can arrive after the
            right swipe that caused them, so this rate is useful for playful
            comparison but not causal conversion analysis.
          </p>
        </div>
      </div>
    </main>
  );
}

function EmptyLeaderboard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <Trophy className="h-10 w-10 text-amber-400" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-6">
        {description}
      </p>
      <ButtonLink href="/upload/tinder" className="mt-6" size="sm">
        Find my SwipeRank
      </ButtonLink>
    </div>
  );
}
