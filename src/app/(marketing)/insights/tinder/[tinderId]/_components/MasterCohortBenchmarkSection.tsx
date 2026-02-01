"use client";

import { useState } from "react";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useTinderProfile } from "../TinderProfileProvider";
import { useSubscription } from "@/hooks/useSubscription";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MasterBenchmarkUpgradeCTA } from "./MasterBenchmarkUpgradeCTA";
import { cn } from "@/components/ui/lib/utils";

/**
 * How You Compare Section - Tinder Insights Style
 *
 * Shows horizontal bar comparisons: You vs Women vs Men
 * Inspired by the Tinder Insights infographic design
 */
export function MasterCohortBenchmarkSection() {
  const { profile, meta: globalMeta } = useTinderProfile();
  const trpc = useTRPC();
  const { effectiveTier } = useSubscription();
  const [selectedPeriod, setSelectedPeriod] = useState("all-time");

  const hasPremiumAccess =
    effectiveTier === "PLUS" || effectiveTier === "ELITE";

  // Fetch male and female cohort stats
  const maleStatsQuery = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: "tinder_male", period: selectedPeriod },
      { enabled: hasPremiumAccess, staleTime: 1000 * 60 * 60 },
    ),
  );

  const femaleStatsQuery = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: "tinder_female", period: selectedPeriod },
      { enabled: hasPremiumAccess, staleTime: 1000 * 60 * 60 },
    ),
  );

  if (!profile || !globalMeta) {
    return null;
  }

  const maleStats = maleStatsQuery.data;
  const femaleStats = femaleStatsQuery.data;
  const isLoading = maleStatsQuery.isLoading || femaleStatsQuery.isLoading;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle className="text-2xl">How You Compare</CardTitle>
              <CardDescription>
                See how your stats stack up against other users
              </CardDescription>
            </div>
          </div>
          {hasPremiumAccess && (
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All-Time</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {hasPremiumAccess ? (
          isLoading ? (
            <div className="space-y-8">
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Like Rate / Pickiness */}
              <ComparisonSection
                title="Average Pickiness"
                description="How many people do you swipe right on?"
                yourValue={globalMeta.likeRate}
                womenValue={femaleStats?.likeRateP50 ?? null}
                menValue={maleStats?.likeRateP50 ?? null}
                womenPercentiles={
                  femaleStats
                    ? {
                        p10: femaleStats.likeRateP10,
                        p25: femaleStats.likeRateP25,
                        p50: femaleStats.likeRateP50,
                        p75: femaleStats.likeRateP75,
                        p90: femaleStats.likeRateP90,
                      }
                    : null
                }
                menPercentiles={
                  maleStats
                    ? {
                        p10: maleStats.likeRateP10,
                        p25: maleStats.likeRateP25,
                        p50: maleStats.likeRateP50,
                        p75: maleStats.likeRateP75,
                        p90: maleStats.likeRateP90,
                      }
                    : null
                }
                format="percentage"
              />

              <Separator />

              {/* Match Rate */}
              <ComparisonSection
                title="Average Match Rate"
                description="How often your right swipes become matches"
                yourValue={globalMeta.matchRate}
                womenValue={femaleStats?.matchRateP50 ?? null}
                menValue={maleStats?.matchRateP50 ?? null}
                womenPercentiles={
                  femaleStats
                    ? {
                        p10: femaleStats.matchRateP10,
                        p25: femaleStats.matchRateP25,
                        p50: femaleStats.matchRateP50,
                        p75: femaleStats.matchRateP75,
                        p90: femaleStats.matchRateP90,
                      }
                    : null
                }
                menPercentiles={
                  maleStats
                    ? {
                        p10: maleStats.matchRateP10,
                        p25: maleStats.matchRateP25,
                        p50: maleStats.matchRateP50,
                        p75: maleStats.matchRateP75,
                        p90: maleStats.matchRateP90,
                      }
                    : null
                }
                format="percentage"
              />

              <Separator />

              {/* Swipes Per Day */}
              <ComparisonSection
                title="Average Swipes Per Day"
                description="How many times do you swipe per day?"
                yourValue={globalMeta.swipesPerDay}
                womenValue={femaleStats?.swipesPerDayP50 ?? null}
                menValue={maleStats?.swipesPerDayP50 ?? null}
                womenPercentiles={
                  femaleStats
                    ? {
                        p10: femaleStats.swipesPerDayP10,
                        p25: femaleStats.swipesPerDayP25,
                        p50: femaleStats.swipesPerDayP50,
                        p75: femaleStats.swipesPerDayP75,
                        p90: femaleStats.swipesPerDayP90,
                      }
                    : null
                }
                menPercentiles={
                  maleStats
                    ? {
                        p10: maleStats.swipesPerDayP10,
                        p25: maleStats.swipesPerDayP25,
                        p50: maleStats.swipesPerDayP50,
                        p75: maleStats.swipesPerDayP75,
                        p90: maleStats.swipesPerDayP90,
                      }
                    : null
                }
                format="number"
              />
            </div>
          )
        ) : (
          <MasterBenchmarkUpgradeCTA />
        )}
      </CardContent>
    </Card>
  );
}

interface ComparisonSectionProps {
  title: string;
  description: string;
  yourValue: number;
  womenValue: number | null;
  menValue: number | null;
  womenPercentiles: PercentileData | null;
  menPercentiles: PercentileData | null;
  format: "percentage" | "number";
}

function ComparisonSection({
  title,
  description,
  yourValue,
  womenValue,
  menValue,
  womenPercentiles,
  menPercentiles,
  format,
}: ComparisonSectionProps) {
  const formatValue = (value: number) => {
    if (format === "percentage") {
      return `${(value * 100).toFixed(0)}%`;
    }
    return Math.round(value).toLocaleString();
  };

  // Calculate max value for bar scaling
  const allValues = [yourValue, womenValue ?? 0, menValue ?? 0];
  const maxValue = Math.max(...allValues) * 1.1; // Add 10% padding

  const getBarWidth = (value: number) => {
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  };

  // Calculate percentage difference for comparison badges
  const getComparison = (
    cohortValue: number | null,
  ): {
    status: "higher" | "lower" | "similar";
    icon: typeof TrendingUp;
    text: string;
    className: string;
  } | null => {
    if (cohortValue === null) return null;
    const diff = yourValue - cohortValue;
    const percentDiff = cohortValue !== 0 ? (diff / cohortValue) * 100 : 0;

    if (Math.abs(percentDiff) < 5) {
      return {
        status: "similar" as const,
        icon: Minus,
        text: "Similar",
        className: "text-muted-foreground",
      };
    }

    if (diff > 0) {
      return {
        status: "higher" as const,
        icon: TrendingUp,
        text: `+${Math.abs(percentDiff).toFixed(0)}%`,
        className: "text-green-600 dark:text-green-400",
      };
    }

    return {
      status: "lower" as const,
      icon: TrendingDown,
      text: `-${Math.abs(percentDiff).toFixed(0)}%`,
      className: "text-red-600 dark:text-red-400",
    };
  };

  const womenComparison = getComparison(womenValue);
  const menComparison = getComparison(menValue);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            {(womenPercentiles || menPercentiles) && (
              <PercentileDialog
                title={title}
                yourValue={yourValue}
                womenPercentiles={womenPercentiles}
                menPercentiles={menPercentiles}
                format={format}
              />
            )}
          </div>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* You */}
        <ComparisonBar
          label="you"
          formattedValue={formatValue(yourValue)}
          barWidth={getBarWidth(yourValue)}
          color="bg-blue-600 dark:bg-blue-500"
          labelColor="bg-blue-600 text-white dark:bg-blue-500"
          comparison={null}
        />

        {/* Women */}
        {womenValue !== null && (
          <ComparisonBar
            label="women"
            formattedValue={formatValue(womenValue)}
            barWidth={getBarWidth(womenValue)}
            color="bg-pink-500"
            labelColor="bg-pink-500 text-white"
            comparison={womenComparison}
          />
        )}

        {/* Men */}
        {menValue !== null && (
          <ComparisonBar
            label="men"
            formattedValue={formatValue(menValue)}
            barWidth={getBarWidth(menValue)}
            color="bg-gray-800 dark:bg-gray-200"
            labelColor="bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800"
            comparison={menComparison}
          />
        )}
      </div>
    </div>
  );
}

interface ComparisonBarProps {
  label: string;
  formattedValue: string;
  barWidth: number;
  color: string;
  labelColor: string;
  comparison: {
    status: "higher" | "lower" | "similar";
    icon: typeof TrendingUp;
    text: string;
    className: string;
  } | null;
}

function ComparisonBar({
  label,
  formattedValue,
  barWidth,
  color,
  labelColor,
  comparison,
}: ComparisonBarProps) {
  const ComparisonIcon = comparison?.icon;

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <span
        className={cn(
          "w-16 shrink-0 rounded px-2 py-1 text-center text-xs font-medium",
          labelColor,
        )}
      >
        {label}
      </span>

      {/* Bar container */}
      <div className="relative flex-1">
        <div className="h-8 w-full rounded-full bg-gray-100 shadow-inner dark:bg-gray-800">
          {/* Filled bar */}
          <div
            className={cn(
              "h-full rounded-full shadow-sm transition-all duration-500",
              color,
            )}
            style={{ width: `${Math.max(barWidth, 2)}%` }}
          />
          {/* Position marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
            style={{ left: `${Math.max(barWidth, 2)}%` }}
          >
            <div
              className={cn(
                "h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow-md dark:border-gray-900",
                color,
              )}
            />
          </div>
        </div>
      </div>

      {/* Value and comparison badge */}
      <div className="flex shrink-0 items-center gap-2">
        {comparison && ComparisonIcon && (
          <Badge
            variant="outline"
            className={cn("gap-1 text-xs", comparison.className)}
          >
            <ComparisonIcon className="h-3 w-3" />
            {comparison.text}
          </Badge>
        )}
        <span className="w-14 text-right text-lg font-bold tabular-nums">
          {formattedValue}
        </span>
      </div>
    </div>
  );
}

interface PercentileData {
  p10?: number | null;
  p25?: number | null;
  p50: number | null;
  p75?: number | null;
  p90?: number | null;
}

interface PercentileDialogProps {
  title: string;
  yourValue: number;
  womenPercentiles: PercentileData | null;
  menPercentiles: PercentileData | null;
  format: "percentage" | "number";
}

function PercentileDialog({
  title,
  yourValue,
  womenPercentiles,
  menPercentiles,
  format,
}: PercentileDialogProps) {
  const [selectedCohort, setSelectedCohort] = useState<"women" | "men">(
    womenPercentiles ? "women" : "men",
  );

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    if (format === "percentage") {
      return `${(value * 100).toFixed(1)}%`;
    }
    return Math.round(value).toLocaleString();
  };

  const currentPercentiles =
    selectedCohort === "women" ? womenPercentiles : menPercentiles;

  // Calculate percentile position
  const calculatePercentile = () => {
    if (!currentPercentiles?.p50) return null;

    const p50 = currentPercentiles.p50;
    const p25 = currentPercentiles.p25 ?? p50 * 0.7;
    const p75 = currentPercentiles.p75 ?? p50 * 1.3;
    const p90 = currentPercentiles.p90 ?? p50 * 1.5;

    if (yourValue >= p90) return { text: "Top 10%", position: 90 };
    if (yourValue >= p75) return { text: "Top 25%", position: 75 };
    if (yourValue >= p50) return { text: "Above median", position: 50 };
    if (yourValue >= p25) return { text: "Bottom 50%", position: 25 };
    return { text: "Bottom 25%", position: 10 };
  };

  const percentileInfo = calculatePercentile();

  // Calculate visual position (0-100)
  const calculatePosition = () => {
    if (!currentPercentiles?.p50) return 50;

    const min =
      currentPercentiles.p10 ||
      currentPercentiles.p25 ||
      currentPercentiles.p50 * 0.5;
    const max =
      currentPercentiles.p90 ||
      currentPercentiles.p75 ||
      currentPercentiles.p50 * 1.5;

    if (yourValue <= min) return 0;
    if (yourValue >= max) return 100;

    return ((yourValue - min) / (max - min)) * 100;
  };

  const position = calculatePosition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-5 w-5"
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">View percentile details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title} - Percentile Distribution</DialogTitle>
          <DialogDescription>
            See where you rank compared to{" "}
            {selectedCohort === "women" ? "women" : "men"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cohort selector */}
          {womenPercentiles && menPercentiles && (
            <div className="flex gap-2">
              <Button
                variant={selectedCohort === "women" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCohort("women")}
                className="flex-1"
              >
                Women
              </Button>
              <Button
                variant={selectedCohort === "men" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCohort("men")}
                className="flex-1"
              >
                Men
              </Button>
            </div>
          )}

          {/* Your value */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium">
                Your Value
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums">
                  {formatValue(yourValue)}
                </span>
                {percentileInfo && (
                  <Badge
                    variant="outline"
                    className="text-green-600 dark:text-green-400"
                  >
                    {percentileInfo.text}
                  </Badge>
                )}
              </div>
            </div>

            {/* Percentile bar */}
            {currentPercentiles && (
              <div className="space-y-3 pt-4">
                <div className="relative h-4 rounded-full bg-linear-to-r from-red-200 via-yellow-200 to-green-200 dark:from-red-900/30 dark:via-yellow-900/30 dark:to-green-900/30">
                  <div
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                    style={{ left: `${position}%` }}
                  >
                    <div className="border-background h-5 w-5 rounded-full border-2 bg-blue-600 shadow-lg dark:bg-blue-500" />
                  </div>
                </div>

                {/* Percentile values */}
                <div className="grid grid-cols-5 gap-2 text-xs">
                  {currentPercentiles.p10 !== null &&
                    currentPercentiles.p10 !== undefined && (
                      <div className="text-center">
                        <div className="text-muted-foreground">P10</div>
                        <div className="font-mono font-semibold">
                          {formatValue(currentPercentiles.p10)}
                        </div>
                      </div>
                    )}
                  {currentPercentiles.p25 !== null &&
                    currentPercentiles.p25 !== undefined && (
                      <div className="text-center">
                        <div className="text-muted-foreground">P25</div>
                        <div className="font-mono font-semibold">
                          {formatValue(currentPercentiles.p25)}
                        </div>
                      </div>
                    )}
                  <div className="text-center">
                    <div className="text-muted-foreground">P50</div>
                    <div className="font-mono font-semibold">
                      {formatValue(currentPercentiles.p50)}
                    </div>
                  </div>
                  {currentPercentiles.p75 !== null &&
                    currentPercentiles.p75 !== undefined && (
                      <div className="text-center">
                        <div className="text-muted-foreground">P75</div>
                        <div className="font-mono font-semibold">
                          {formatValue(currentPercentiles.p75)}
                        </div>
                      </div>
                    )}
                  {currentPercentiles.p90 !== null &&
                    currentPercentiles.p90 !== undefined && (
                      <div className="text-center">
                        <div className="text-muted-foreground">P90</div>
                        <div className="font-mono font-semibold">
                          {formatValue(currentPercentiles.p90)}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="bg-muted h-5 w-40 animate-pulse rounded" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-6 w-16 animate-pulse rounded" />
          <div className="bg-muted h-8 flex-1 animate-pulse rounded-full" />
          <div className="bg-muted h-6 w-14 animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted h-6 w-16 animate-pulse rounded" />
          <div className="bg-muted h-8 flex-1 animate-pulse rounded-full" />
          <div className="bg-muted h-6 w-14 animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted h-6 w-16 animate-pulse rounded" />
          <div className="bg-muted h-8 flex-1 animate-pulse rounded-full" />
          <div className="bg-muted h-6 w-14 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
