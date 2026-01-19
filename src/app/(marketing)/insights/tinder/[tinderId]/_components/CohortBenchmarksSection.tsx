"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useTinderProfile } from "../TinderProfileProvider";
import { CohortBenchmarkCard } from "./CohortBenchmarkCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";

export function CohortBenchmarksSection() {
  const { meta } = useTinderProfile();
  const trpc = useTRPC();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();

  const hasPremiumAccess =
    effectiveTier === "PLUS" || effectiveTier === "ELITE";

  // Period selector state
  const [selectedPeriod, setSelectedPeriod] = useState("all-time");

  // Fetch cohort stats with new IDs
  const maleStatsQuery = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: "tinder_male", period: selectedPeriod },
      { staleTime: 1000 * 60 * 60 },
    ),
  );

  const femaleStatsQuery = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: "tinder_female", period: selectedPeriod },
      { staleTime: 1000 * 60 * 60 },
    ),
  );

  if (!meta) return null;

  const globalMeta = meta;

  const maleStats = maleStatsQuery.data;
  const femaleStats = femaleStatsQuery.data;

  if (!maleStats || !femaleStats) return null;

  // Helper function to format values based on format type
  const formatValue = (value: number, format: "percentage" | "number") => {
    switch (format) {
      case "percentage":
        return `${(value * 100).toFixed(1)}%`;
      case "number":
        const rounded = Math.round(value);
        // Remove commas for values < 1000
        return rounded < 1000 ? rounded.toString() : rounded.toLocaleString();
      default:
        return value.toString();
    }
  };

  // Collect percentile data for both genders
  const malePercentileData = [
    {
      metric: "Match Rate",
      format: "percentage" as const,
      percentiles: {
        p10: maleStats.matchRateP10,
        p25: maleStats.matchRateP25,
        p75: maleStats.matchRateP75,
        p90: maleStats.matchRateP90,
      },
    },
    {
      metric: "Like Rate",
      format: "percentage" as const,
      percentiles: {
        p10: maleStats.likeRateP10,
        p25: maleStats.likeRateP25,
        p75: maleStats.likeRateP75,
        p90: maleStats.likeRateP90,
      },
    },
    {
      metric: "Swipes Per Day",
      format: "number" as const,
      percentiles: {
        p10: maleStats.swipesPerDayP10,
        p25: maleStats.swipesPerDayP25,
        p75: maleStats.swipesPerDayP75,
        p90: maleStats.swipesPerDayP90,
      },
    },
  ];

  const femalePercentileData = [
    {
      metric: "Match Rate",
      format: "percentage" as const,
      percentiles: {
        p10: femaleStats.matchRateP10,
        p25: femaleStats.matchRateP25,
        p75: femaleStats.matchRateP75,
        p90: femaleStats.matchRateP90,
      },
    },
    {
      metric: "Like Rate",
      format: "percentage" as const,
      percentiles: {
        p10: femaleStats.likeRateP10,
        p25: femaleStats.likeRateP25,
        p75: femaleStats.likeRateP75,
        p90: femaleStats.likeRateP90,
      },
    },
    {
      metric: "Swipes Per Day",
      format: "number" as const,
      percentiles: {
        p10: femaleStats.swipesPerDayP10,
        p25: femaleStats.swipesPerDayP25,
        p75: femaleStats.swipesPerDayP75,
        p90: femaleStats.swipesPerDayP90,
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">How You Compare</CardTitle>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All-Time</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
              <SelectItem value="2021">2021</SelectItem>
              <SelectItem value="2020">2020</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Benchmark cards - 3 hero metrics only */}
        <div className="grid gap-6 md:grid-cols-3">
          <CohortBenchmarkCard
            metric="Match Rate"
            yourValue={globalMeta.matchRate}
            cohorts={[
              {
                name: "Men (median)",
                value: maleStats.matchRateP50 ?? 0,
              },
              {
                name: "Women (median)",
                value: femaleStats.matchRateP50 ?? 0,
              },
            ]}
            format="percentage"
            description="How often your right swipes become matches"
          />

          <CohortBenchmarkCard
            metric="Like Rate"
            yourValue={globalMeta.likeRate}
            cohorts={[
              {
                name: "Men (median)",
                value: maleStats.likeRateP50 ?? 0,
              },
              {
                name: "Women (median)",
                value: femaleStats.likeRateP50 ?? 0,
              },
            ]}
            format="percentage"
            description="How often you swipe right (pickiness)"
          />

          <CohortBenchmarkCard
            metric="Swipes Per Day"
            yourValue={globalMeta.swipesPerDay}
            cohorts={[
              {
                name: "Men (median)",
                value: maleStats.swipesPerDayP50 ?? 0,
              },
              {
                name: "Women (median)",
                value: femaleStats.swipesPerDayP50 ?? 0,
              },
            ]}
            format="number"
            description="Average swipes per calendar day"
          />
        </div>

        <Separator className="my-6" />

        {/* Shared Premium Section - Percentile Distribution */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Percentile Distribution</h3>
          </div>

          {hasPremiumAccess ? (
            <div className="space-y-8">
              {/* Men Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Men</h4>
                <div className="grid gap-6 md:grid-cols-3">
                  {malePercentileData.map((data) => (
                    <div key={data.metric} className="space-y-3">
                      <h5 className="text-muted-foreground text-sm font-medium">
                        {data.metric}
                      </h5>
                      <div className="space-y-2 text-sm">
                        {data.percentiles.p90 !== undefined &&
                          data.percentiles.p90 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Top 10% (P90)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p90, data.format)}
                              </span>
                            </div>
                          )}
                        {data.percentiles.p75 !== undefined &&
                          data.percentiles.p75 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Top 25% (P75)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p75, data.format)}
                              </span>
                            </div>
                          )}
                        {data.percentiles.p25 !== undefined &&
                          data.percentiles.p25 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Bottom 25% (P25)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p25, data.format)}
                              </span>
                            </div>
                          )}
                        {data.percentiles.p10 !== undefined &&
                          data.percentiles.p10 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Bottom 10% (P10)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p10, data.format)}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Women Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Women</h4>
                <div className="grid gap-6 md:grid-cols-3">
                  {femalePercentileData.map((data) => (
                    <div key={data.metric} className="space-y-3">
                      <h5 className="text-muted-foreground text-sm font-medium">
                        {data.metric}
                      </h5>
                      <div className="space-y-2 text-sm">
                        {data.percentiles.p90 !== undefined &&
                          data.percentiles.p90 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Top 10% (P90)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p90, data.format)}
                              </span>
                            </div>
                          )}
                        {data.percentiles.p75 !== undefined &&
                          data.percentiles.p75 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Top 25% (P75)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p75, data.format)}
                              </span>
                            </div>
                          )}
                        {data.percentiles.p25 !== undefined &&
                          data.percentiles.p25 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Bottom 25% (P25)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p25, data.format)}
                              </span>
                            </div>
                          )}
                        {data.percentiles.p10 !== undefined &&
                          data.percentiles.p10 !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Bottom 10% (P10)
                              </span>
                              <span className="font-mono font-semibold">
                                {formatValue(data.percentiles.p10, data.format)}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-gradient-to-r from-pink-50 to-rose-50 p-6 dark:from-pink-950/50 dark:to-rose-950/50">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-semibold">
                    Unlock Percentile Rankings
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    See your exact percentile rank and full distribution across
                    all metrics for both men and women with SwipeStats Plus
                  </p>
                </div>
                <Button
                  onClick={() =>
                    openUpgradeModal({
                      tier: "PLUS",
                      feature: "Percentile Distribution",
                    })
                  }
                  className="w-full sm:w-auto"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Plus
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
