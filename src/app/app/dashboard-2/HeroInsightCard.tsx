"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Lock, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTRPC } from "@/trpc/react";
import { cn } from "@/components/ui/lib/utils";

import type { RouterOutputs } from "@/trpc/react";

type UploadedProfiles = RouterOutputs["user"]["getUploadedProfiles"];
type UploadedTinderProfile = UploadedProfiles["tinder"][number];
type UploadedHingeProfile = UploadedProfiles["hinge"][number];
type CohortStats = RouterOutputs["cohort"]["getStats"];

interface HeroInsightCardProps {
  tinder?: UploadedTinderProfile;
  hinge?: UploadedHingeProfile;
  hasPremiumAccess: boolean;
  onUpgradeClick: () => void;
}

/** Bucket the user's match rate against cohort percentiles ("Top 10%" etc.). */
function matchRateStanding(value: number, cohort: CohortStats) {
  if (cohort.matchRateP50 == null) return null;

  if (cohort.matchRateP90 != null && value >= cohort.matchRateP90) {
    return {
      label: "Top 10%",
      className:
        "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    };
  }
  if (cohort.matchRateP75 != null && value >= cohort.matchRateP75) {
    return {
      label: "Top 25%",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    };
  }
  if (value >= cohort.matchRateP50) {
    return {
      label: "Above average",
      className:
        "border-emerald-200 bg-emerald-50/60 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
    };
  }
  if (cohort.matchRateP25 != null && value >= cohort.matchRateP25) {
    return { label: "Below average", className: "" };
  }
  return { label: "Bottom 25%", className: "" };
}

/**
 * The dashboard headline: one computed stat the user didn't already know,
 * instead of a welcome banner. Match rate + cohort standing for Tinder,
 * with a 12-month swipe sparkline; falls back gracefully for Hinge-only
 * users and to an upload CTA when nothing is uploaded yet.
 */
export function HeroInsightCard({
  tinder,
  hinge,
  hasPremiumAccess,
  onUpgradeClick,
}: HeroInsightCardProps) {
  const trpc = useTRPC();

  // Own-gender cohort ("how do I rank among men/women"); skipped for other genders.
  const cohortId =
    tinder?.gender === "MALE"
      ? "tinder_male"
      : tinder?.gender === "FEMALE"
        ? "tinder_female"
        : null;
  const cohortNoun = tinder?.gender === "MALE" ? "men" : "women";

  const cohortQuery = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: cohortId ?? "", period: "all-time" },
      {
        enabled: hasPremiumAccess && !!cohortId && !!tinder?.stats?.matchRate,
        staleTime: 1000 * 60 * 60,
      },
    ),
  );

  const usageQuery = useQuery(
    trpc.profile.getUsage.queryOptions(
      { tinderId: tinder?.tinderId ?? "" },
      { enabled: !!tinder, staleTime: 1000 * 60 * 60 },
    ),
  );

  // Monthly swipe volume for the sparkline — last 12 months with data.
  const monthlySwipes = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const row of usageQuery.data ?? []) {
      const date = new Date(row.dateStamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + row.swipeLikes + row.swipePasses);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, swipes]) => ({ month, swipes }));
  }, [usageQuery.data]);

  // Nothing uploaded yet — the headline slot becomes the upload CTA.
  if (!tinder && !hinge) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/40">
            <Upload className="h-6 w-6 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Upload your data to get started</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Your headline stats will show up here once your first export is in.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/upload?provider=tinder">
              <Button>Upload Tinder data</Button>
            </Link>
            <Link href="/upload?provider=hinge">
              <Button variant="outline">Upload Hinge data</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tinderStats = tinder?.stats;
  const hingeStats = hinge?.stats;

  const standing =
    tinderStats?.matchRate != null && cohortQuery.data
      ? matchRateStanding(tinderStats.matchRate, cohortQuery.data)
      : null;

  const totalSwipes =
    tinderStats?.swipeLikesTotal != null && tinderStats.swipePassesTotal != null
      ? tinderStats.swipeLikesTotal + tinderStats.swipePassesTotal
      : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1 space-y-3">
          {tinderStats?.matchRate != null ? (
            <>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Match rate · Tinder · all time
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-5xl font-bold tabular-nums">
                  {(tinderStats.matchRate * 100).toFixed(1)}%
                </span>
                {standing ? (
                  <Badge
                    variant="outline"
                    className={cn("text-sm", standing.className)}
                  >
                    {standing.label} of {cohortNoun} on Tinder
                  </Badge>
                ) : (
                  cohortId &&
                  !hasPremiumAccess && (
                    <button
                      onClick={onUpgradeClick}
                      className="text-muted-foreground hover:border-pink-300 hover:text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                    >
                      <Lock className="h-3 w-3" />
                      See how you rank among {cohortNoun}
                    </button>
                  )
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {tinderStats.matchesTotal?.toLocaleString() ?? "—"} matches from{" "}
                {totalSwipes?.toLocaleString() ?? "—"} swipes ·{" "}
                {tinderStats.messagesSentTotal?.toLocaleString() ?? "—"} messages
                sent
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Matches · Hinge · all time
              </p>
              <span className="text-5xl font-bold tabular-nums">
                {hingeStats?.matchesTotal?.toLocaleString() ?? "—"}
              </span>
              <p className="text-muted-foreground text-sm">
                {hingeStats?.messagesSentTotal?.toLocaleString() ?? "—"} messages
                sent · {hingeStats?.messagesReceivedTotal?.toLocaleString() ?? "—"}{" "}
                received
              </p>
            </>
          )}
        </div>

        {monthlySwipes.length >= 2 && (
          <div className="w-full shrink-0 md:w-80">
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlySwipes}
                  margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="heroSwipes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" hide />
                  <Tooltip
                    formatter={(value) => [
                      Number(value).toLocaleString(),
                      "Swipes",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="swipes"
                    stroke="#e11d48"
                    strokeWidth={2}
                    fill="url(#heroSwipes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted-foreground mt-1 text-right text-xs">
              Swipes per month · last {monthlySwipes.length} months of data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
