"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

function formatTopShare(value: number) {
  return `Top ${value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 1 : 0,
    maximumFractionDigits: 1,
  })}%`;
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
    <main className="min-h-screen bg-slate-50/50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Badge variant="secondary" className="mb-5 gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            Tinder · match yield v1
          </Badge>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            SwipeRank
          </h1>
          <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
            A playful leaderboard for uploaded Tinder activity. Match yield is
            observed matches divided by right swipes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/upload/tinder">Find my SwipeRank</ButtonLink>
            <ButtonLink href="/#faq" variant="outline">
              How SwipeStats works
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Choose a season</CardTitle>
            <CardDescription>
              Months are first-class competitions. Live periods can change as
              people upload new or older exports.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Select
              value={kind}
              onValueChange={(value) =>
                chooseKind(value as SwipeRankPeriodKind)
              }
            >
              <SelectTrigger className="sm:w-52">
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
              <SelectTrigger className="sm:w-64">
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
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                icon={<Users className="h-4 w-4" />}
                label="Eligible field"
                value={
                  data.fieldSize === null
                    ? `<${data.minimumPublicFieldSize}`
                    : data.fieldSize.toLocaleString()
                }
                detail={`${data.minimumRateDenominator.toLocaleString()}+ right swipes · ${data.minimumActiveDays}+ active days`}
              />
              <MetricCard
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Visibility"
                value="Pseudonymous"
                detail="Every eligible profile is included"
              />
              <MetricCard
                icon={<CalendarClock className="h-4 w-4" />}
                label="As of"
                value={
                  data.asOf
                    ? new Date(data.asOf).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "No build yet"
                }
                detail={
                  selected.live
                    ? "Live and revisable"
                    : "Late uploads can revise history"
                }
              />
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{periodLabel} leaderboard</CardTitle>
                    <CardDescription className="mt-1">
                      Exact competition rank across the full eligible field;
                      tied yields share a position.
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
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24">Rank</TableHead>
                            <TableHead>Anonymous entry</TableHead>
                            <TableHead className="text-right">
                              Match yield
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.entries.map((entry) => (
                            <TableRow key={entry.entryKey}>
                              <TableCell>
                                <span className="text-lg font-bold tabular-nums">
                                  #{entry.rank.toLocaleString()}
                                </span>
                                <span className="text-muted-foreground mt-0.5 block text-xs">
                                  {formatTopShare(entry.topShare)}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">
                                {entry.alias}
                              </TableCell>
                              <TableCell className="text-right text-base font-semibold tabular-nums">
                                {entry.matchYieldPercent.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1,
                                  },
                                )}
                                %
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {data.totalPages > 1 && (
                      <div className="flex items-center justify-between gap-4 border-t px-4 py-4 sm:px-6">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={data.page <= 1}
                          onClick={() => setPage((current) => current - 1)}
                        >
                          <ChevronLeft />
                          Previous
                        </Button>
                        <p className="text-muted-foreground text-sm tabular-nums">
                          Page {data.page.toLocaleString()} of{" "}
                          {data.totalPages.toLocaleString()}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={data.page >= data.totalPages}
                          onClick={() => setPage((current) => current + 1)}
                        >
                          Next
                          <ChevronRight />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="text-muted-foreground flex gap-3 rounded-xl border bg-white p-4 text-sm leading-6">
          <Info className="mt-1 h-4 w-4 shrink-0" />
          <p>
            SwipeRank measures activity in a self-selected collection of
            uploaded Tinder exports. It does not measure attractiveness, human
            worth, or dating success. Field sizes vary sharply by period and
            recent upload vintages are much larger, so every result keeps its
            safe field-size context and eligibility cutoff visible.
          </p>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
          {icon}
          {label}
        </p>
        <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
      </CardContent>
    </Card>
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
