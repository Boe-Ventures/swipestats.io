"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  ShieldCheck,
  Trophy,
} from "lucide-react";

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
import { cn } from "@/components/ui/lib/utils";
import { useTRPC } from "@/trpc/react";

import {
  preferredLeaderboardPeriod,
  resolveLeaderboardPeriodOptions,
} from "./period-options";

const KIND_LABELS: Record<SwipeRankPeriodKind, string> = {
  MONTH: "Month",
  QUARTER: "Quarter",
  YEAR: "Year",
  ALL_TIME: "All time",
};

const KIND_NOUNS: Record<SwipeRankPeriodKind, string> = {
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  ALL_TIME: "all-time season",
};

const AVATAR_STYLES = [
  "border-amber-200 bg-amber-50 text-amber-800",
  "border-rose-200 bg-rose-50 text-rose-700",
  "border-sky-200 bg-sky-50 text-sky-700",
  "border-violet-200 bg-violet-50 text-violet-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
] as const;

const UNKNOWN_GENDER_PRESENTATION = {
  short: "?",
  label: "Not reported",
  className: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

const GENDER_PRESENTATION: Record<
  string,
  { short: string; label: string; className: string }
> = {
  FEMALE: {
    short: "F",
    label: "Woman",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  MALE: {
    short: "M",
    label: "Man",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  OTHER: {
    short: "Other",
    label: "Other",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  MORE: {
    short: "More",
    label: "More",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  UNKNOWN: UNKNOWN_GENDER_PRESENTATION,
};

function formatTopShare(value: number) {
  return `Top ${value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 1 : 0,
    maximumFractionDigits: 1,
  })}%`;
}

function avatarCode(alias: string) {
  const digest = alias.split("#")[1];
  return `D${digest?.slice(0, 1) ?? "?"}`;
}

function avatarStyle(entryKey: string) {
  const bucket = Number.parseInt(entryKey.slice(-2), 16);
  return AVATAR_STYLES[
    Number.isNaN(bucket) ? 0 : bucket % AVATAR_STYLES.length
  ];
}

function GenderPill({ value }: { value: string | null }) {
  const presentation =
    (value ? GENDER_PRESENTATION[value] : undefined) ??
    UNKNOWN_GENDER_PRESENTATION;

  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-9 items-center justify-center rounded-full border px-2 text-xs font-semibold",
        presentation.className,
      )}
      title={presentation.label}
      aria-label={presentation.label}
    >
      {presentation.short}
    </span>
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
  if (kind === "ALL_TIME") return "All-time eligible";
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
  const defaultPeriod = preferredLeaderboardPeriod(options, kind);
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
      },
      {
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
    const preferred = preferredLeaderboardPeriod(nextOptions, nextKind);
    setKind(nextKind);
    setSelectedKey(swipeRankPeriodKey(preferred));
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
    <main className="min-h-screen bg-slate-50/70">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Badge
            variant="secondary"
            className="mb-5 gap-2 font-mono tracking-[0.14em] uppercase"
          >
            <span className="bg-primary h-px w-4" />
            Tinder · observed match rate
          </Badge>
          <h1 className="max-w-4xl text-5xl font-bold tracking-[-0.04em] sm:text-7xl">
            SwipeRank
          </h1>
          <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
            A playful leaderboard for uploaded Tinder activity. Observed match
            rate is matches reported in a season divided by right swipes
            reported in that season—not a literal per-swipe conversion rate.
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
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                value={kind}
                onValueChange={(value) =>
                  chooseKind(value as SwipeRankPeriodKind)
                }
              >
                <SelectTrigger
                  className="h-11 bg-white sm:w-44"
                  aria-label="Competition length"
                >
                  <SelectValue />
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
                value={swipeRankPeriodKey(selected)}
                onValueChange={(value) => {
                  setSelectedKey(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="h-11 bg-white sm:w-56"
                  aria-label="Competition season"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((period) => (
                    <SelectItem
                      key={swipeRankPeriodKey(period)}
                      value={swipeRankPeriodKey(period)}
                    >
                      {formatSwipeRankPeriodLabel(period)}
                      {period.live ? " · live" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {data && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs sm:text-sm">
                {data.fieldSize !== null && (
                  <span className="font-semibold text-slate-950">
                    {data.fieldSize.toLocaleString()} eligible
                  </span>
                )}
                <span aria-hidden>·</span>
                <span>
                  {data.minimumRateDenominator.toLocaleString()}+ right swipes
                </span>
                <span aria-hidden>·</span>
                <span>{data.minimumActiveDays}+ active days</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> stable pseudonyms
                </span>
              </div>
            )}
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
          <Card className="border-red-200">
            <CardContent className="py-8 text-sm text-red-700">
              SwipeRank could not be loaded right now. Please try another period
              or refresh the page.
            </CardContent>
          </Card>
        )}

        {data && (
          <Card className="overflow-hidden border-slate-300 shadow-sm">
            <CardHeader className="border-b border-slate-800 bg-slate-950 py-5 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <CardTitle>{periodLabel} leaderboard</CardTitle>
                  <CardDescription className="text-slate-400">
                    Exact rank at the top; the field is divided into percentile
                    bands.
                  </CardDescription>
                </div>
                {selected.live && <Badge>Live period</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!data.ready ? (
                <EmptyLeaderboard
                  title="The first full field is being prepared"
                  description="SwipeRank stays hidden until the complete historical backfill and its validation checks have finished."
                />
              ) : data.countsSuppressed ? (
                <EmptyLeaderboard
                  title="This field is still too small"
                  description={`At least ${data.minimumPublicFieldSize} eligible profiles are required before public rows are shown.`}
                />
              ) : data.entries.length === 0 ? (
                <EmptyLeaderboard
                  title="No profiles found on this page"
                  description="Try another season or return to the first page of this leaderboard."
                />
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[760px] lg:min-w-[1080px]">
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                          <TableHead className="w-36 px-7 font-mono text-[11px] tracking-[0.12em] uppercase">
                            Rank
                          </TableHead>
                          <TableHead className="min-w-[420px] font-mono text-[11px] tracking-[0.12em] uppercase">
                            Dater
                          </TableHead>
                          <TableHead className="w-36 font-mono text-[11px] tracking-[0.12em] uppercase">
                            Seeking
                          </TableHead>
                          <TableHead className="min-w-64 px-7 text-right font-mono text-[11px] tracking-[0.12em] uppercase">
                            Match rate · M / RS
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
                          const podium = entry.rank <= 3;
                          return (
                            <Fragment key={entry.entryKey}>
                              {showBand && (
                                <TableRow className="border-y bg-slate-50 hover:bg-slate-50">
                                  <TableCell
                                    colSpan={4}
                                    className="px-7 py-2 font-mono text-[11px] tracking-[0.12em] uppercase"
                                  >
                                    <span className="font-bold text-slate-900">
                                      {band === 100
                                        ? "Full field"
                                        : `Top ${band}%`}
                                    </span>
                                    <span className="ml-3 text-slate-400">
                                      up to{" "}
                                      {Math.min(
                                        data.fieldSize!,
                                        Math.max(
                                          1,
                                          Math.floor(
                                            (data.fieldSize! * band) / 100,
                                          ),
                                        ),
                                      ).toLocaleString()}{" "}
                                      entries
                                    </span>
                                  </TableCell>
                                </TableRow>
                              )}
                              <TableRow
                                className={cn(
                                  "group h-[96px]",
                                  podium
                                    ? "border-slate-700 bg-slate-950 text-white hover:bg-slate-900"
                                    : "bg-white hover:bg-rose-50/30",
                                )}
                              >
                                <TableCell className="px-7">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={cn(
                                        "flex h-11 min-w-11 items-center justify-center rounded-xl border text-base font-bold tabular-nums",
                                        entry.rank === 1
                                          ? "border-amber-300 bg-amber-50 text-amber-800"
                                          : entry.rank === 2
                                            ? "border-slate-300 bg-white text-slate-700"
                                            : entry.rank === 3
                                              ? "border-orange-200 bg-orange-50 text-orange-800"
                                              : "border-transparent bg-transparent text-slate-950",
                                      )}
                                    >
                                      {entry.rank <= 3
                                        ? entry.rank.toLocaleString()
                                        : `#${entry.rank.toLocaleString()}`}
                                    </span>
                                    <span
                                      className={cn(
                                        "font-mono text-[11px] font-semibold whitespace-nowrap uppercase",
                                        podium
                                          ? "text-slate-400"
                                          : "text-muted-foreground",
                                      )}
                                    >
                                      {formatTopShare(entry.topShare)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                      <Avatar className="h-14 w-14 border-2 border-white/80 shadow-sm">
                                        {entry.photoUrl && (
                                          <AvatarImage
                                            src={entry.photoUrl}
                                            alt=""
                                          />
                                        )}
                                        <AvatarFallback
                                          className={cn(
                                            "text-sm font-bold",
                                            avatarStyle(entry.entryKey),
                                          )}
                                        >
                                          {avatarCode(entry.alias)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {entry.photoCount > 1 && (
                                        <span className="absolute -right-1 -bottom-1 rounded-full border bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">
                                          +{entry.photoCount - 1}
                                        </span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold">
                                        {genderLabel(entry.gender)}
                                        {entry.age === null
                                          ? ""
                                          : `, ${entry.age}`}{" "}
                                        <span
                                          className={cn(
                                            "font-normal",
                                            podium
                                              ? "text-slate-400"
                                              : "text-muted-foreground",
                                          )}
                                        >
                                          ·{" "}
                                          {formatLocation(
                                            entry.city,
                                            entry.region,
                                            entry.country,
                                          )}
                                        </span>
                                      </p>
                                      <p
                                        className={cn(
                                          "mt-1 font-mono text-xs",
                                          podium
                                            ? "text-slate-400"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        {entry.alias} ·{" "}
                                        {formatObservedTenure(
                                          entry.observedHistoryDays,
                                        )}{" "}
                                        ·{" "}
                                        {eligibleSeasonCopy(
                                          entry.seasonsRanked,
                                          selected.kind,
                                        )}
                                      </p>
                                      <p
                                        className={cn(
                                          "mt-1 text-xs",
                                          podium
                                            ? "text-slate-500"
                                            : "text-slate-400",
                                        )}
                                      >
                                        {entry.activeDays.toLocaleString()}{" "}
                                        active days in this season
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <GenderPill value={entry.interestedIn} />
                                </TableCell>
                                <TableCell className="px-7 text-right">
                                  <div className="ml-auto max-w-64">
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
                                    <p
                                      className={cn(
                                        "mt-1 font-mono text-xs whitespace-nowrap tabular-nums",
                                        podium
                                          ? "text-slate-400"
                                          : "text-muted-foreground",
                                      )}
                                    >
                                      {entry.matches.toLocaleString()} m /{" "}
                                      {entry.rightSwipes.toLocaleString()} rs
                                    </p>
                                    <div
                                      className={cn(
                                        "mt-3 h-1.5 overflow-hidden rounded-full",
                                        podium
                                          ? "bg-slate-700"
                                          : "bg-slate-100",
                                      )}
                                    >
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

                  <div className="flex flex-col gap-4 border-t bg-slate-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <p className="text-muted-foreground max-w-3xl text-xs leading-5">
                      Stable pseudonyms link the same profile across seasons.
                      Profile details and exact activity totals come from the
                      uploaded Tinder export; late uploads can revise history.
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
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-muted-foreground flex gap-3 rounded-xl border bg-white p-4 text-sm leading-6">
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
