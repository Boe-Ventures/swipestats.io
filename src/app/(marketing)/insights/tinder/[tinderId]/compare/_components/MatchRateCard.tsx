"use client";

import { Crown, TrendingUp, BarChart3, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../../TinderProfileProvider";
import { useComparison } from "../../ComparisonProvider";
import {
  getGlobalMeta,
  type TinderProfileWithUsage,
} from "@/lib/types/profile";
import { cn } from "@/components/ui/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { getProfileColor, getProfileLabel } from "../utils/profileColors";

export function MatchRateCard() {
  const { profile, tinderId, meta: globalMeta } = useTinderProfile();
  const { comparisonProfiles } = useComparison();
  const trpc = useTRPC();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();

  const hasPremiumAccess =
    effectiveTier === "PLUS" || effectiveTier === "ELITE";

  // Fetch relevant cohorts for this profile
  const { data: relevantCohorts } = useQuery(
    trpc.cohort.getRelevantCohorts.queryOptions(
      { profileId: tinderId },
      { enabled: !!tinderId },
    ),
  );

  // Find different cohort types
  const primaryCohort = relevantCohorts?.find(
    (c) =>
      c.id.includes(profile?.gender?.toLowerCase() ?? "") && c.id.includes("-"),
  );

  const genderCohort = relevantCohorts?.find(
    (c) =>
      c.id.includes(profile?.gender?.toLowerCase() ?? "") &&
      !c.id.includes("-"),
  );

  const globalCohort = relevantCohorts?.find((c) => c.id === "all");

  // Fetch stats for all cohorts
  const { data: primaryStats } = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: primaryCohort?.id ?? "", period: "all-time" },
      { enabled: !!primaryCohort },
    ),
  );

  const { data: genderStats } = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: genderCohort?.id ?? "", period: "all-time" },
      { enabled: !!genderCohort && hasPremiumAccess },
    ),
  );

  const { data: globalStats } = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: globalCohort?.id ?? "", period: "all-time" },
      { enabled: !!globalCohort && hasPremiumAccess },
    ),
  );

  if (!profile) {
    return null;
  }

  if (!globalMeta) {
    return null;
  }

  const matchRate = globalMeta.matchRate * 100;

  // Get comparison profiles' match rates
  const comparisonMatchRates = comparisonProfiles
    .filter(
      (p): p is TinderProfileWithUsage =>
        "usage" in p && "profileMeta" in p && Array.isArray(p.usage),
    )
    .map((p, index) => {
      const meta = getGlobalMeta(p);
      if (!meta) return null;
      return {
        tinderId: p.tinderId,
        matchRate: meta.matchRate * 100,
        label: getProfileLabel(p.tinderId, tinderId, index + 1),
        color: getProfileColor(index + 1),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Helper function to calculate cohort comparison data
  const getCohortComparison = (
    cohortMedianRate: number | null,
    cohortP25?: number | null,
    cohortP75?: number | null,
  ) => {
    if (cohortMedianRate === null) return null;

    const isAboveAverage = matchRate > cohortMedianRate;
    const multiplier =
      cohortMedianRate > 0 ? matchRate / cohortMedianRate : null;

    // Calculate approximate percentile
    let percentile: number | null = null;
    if (cohortP25 && cohortP75) {
      const p25 = cohortP25 * 100;
      const p50 = cohortMedianRate;
      const p75 = cohortP75 * 100;

      if (matchRate <= p25) {
        percentile = Math.round((matchRate / p25) * 25);
      } else if (matchRate <= p50) {
        percentile = Math.round(25 + ((matchRate - p25) / (p50 - p25)) * 25);
      } else if (matchRate <= p75) {
        percentile = Math.round(50 + ((matchRate - p50) / (p75 - p50)) * 25);
      } else {
        percentile = Math.round(
          75 + Math.min(((matchRate - p75) / p75) * 25, 25),
        );
      }
    }

    return { isAboveAverage, multiplier, percentile };
  };

  const primaryComparison = getCohortComparison(
    primaryStats?.matchRateP50 ? primaryStats.matchRateP50 * 100 : null,
    primaryStats?.matchRateP25,
    primaryStats?.matchRateP75,
  );

  const genderComparison = getCohortComparison(
    genderStats?.matchRateP50 ? genderStats.matchRateP50 * 100 : null,
    genderStats?.matchRateP25,
    genderStats?.matchRateP75,
  );

  const globalComparison = getCohortComparison(
    globalStats?.matchRateP50 ? globalStats.matchRateP50 * 100 : null,
    globalStats?.matchRateP25,
    globalStats?.matchRateP75,
  );

  return (
    <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <TrendingUp className="h-5 w-5" />
          Match Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Free Section - Your Match Rate */}
        <div>
          <div className="flex items-end gap-4">
            <div className="text-5xl font-bold tabular-nums">
              {matchRate.toFixed(2)}%
            </div>
            {comparisonMatchRates.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-3">
                {comparisonMatchRates.map((comparison) => (
                  <div
                    key={comparison.tinderId}
                    className="flex items-center gap-1.5"
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: comparison.color }}
                    />
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {comparison.label}: {comparison.matchRate.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Based on your swipe activity
          </p>
        </div>

        <Separator className="my-6" />

        {/* Plus Features Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Plus Features</h3>
          </div>

          {hasPremiumAccess ? (
            <div className="space-y-6">
              {/* Cohort Benchmarks - Plus Feature */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4" />
                  Cohort Benchmarks
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Primary Cohort (Gender + Age) */}
                  {primaryStats &&
                    primaryCohort &&
                    primaryComparison &&
                    primaryStats.matchRateP50 !== null && (
                      <CohortComparisonCard
                        title="Your Age Group"
                        cohortName={primaryCohort.name}
                        cohortMedian={primaryStats.matchRateP50 * 100}
                        profileCount={primaryStats.profileCount}
                        multiplier={primaryComparison.multiplier}
                        percentile={primaryComparison.percentile}
                        isAboveAverage={primaryComparison.isAboveAverage}
                      />
                    )}

                  {/* Gender Cohort */}
                  {genderStats &&
                    genderCohort &&
                    genderComparison &&
                    genderStats.matchRateP50 !== null && (
                      <CohortComparisonCard
                        title="Your Gender"
                        cohortName={genderCohort.name}
                        cohortMedian={genderStats.matchRateP50 * 100}
                        profileCount={genderStats.profileCount}
                        multiplier={genderComparison.multiplier}
                        percentile={genderComparison.percentile}
                        isAboveAverage={genderComparison.isAboveAverage}
                      />
                    )}

                  {/* Global Cohort */}
                  {globalStats &&
                    globalCohort &&
                    globalComparison &&
                    globalStats.matchRateP50 !== null && (
                      <CohortComparisonCard
                        title="Global Average"
                        cohortName="All users"
                        cohortMedian={globalStats.matchRateP50 * 100}
                        profileCount={globalStats.profileCount}
                        multiplier={globalComparison.multiplier}
                        percentile={globalComparison.percentile}
                        isAboveAverage={globalComparison.isAboveAverage}
                      />
                    )}
                </div>
              </div>

              {/* SwipeRank Coming Soon - Plus Feature */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Crown className="h-4 w-4" />
                  SwipeRank
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">
                    Global rankings coming soon!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-linear-to-r from-pink-50 to-rose-50 p-6 dark:from-pink-950/50 dark:to-rose-950/50">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-semibold">
                    Unlock Premium Insights
                  </h4>
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <BarChart3 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <strong>Cohort Benchmarks:</strong> Compare to your age
                        group, gender, and globally
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Crown className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <strong>SwipeRank:</strong> See your percentile rankings
                      </span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() =>
                    openUpgradeModal({
                      tier: "PLUS",
                      feature: "Match Rate Insights",
                    })
                  }
                  className="w-full"
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

interface CohortComparisonCardProps {
  title: string;
  cohortName: string;
  cohortMedian: number;
  profileCount: number;
  multiplier: number | null;
  percentile: number | null;
  isAboveAverage: boolean;
}

function CohortComparisonCard({
  title,
  cohortName,
  cohortMedian,
  profileCount,
  multiplier,
  percentile,
  isAboveAverage,
}: CohortComparisonCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {title}
        </CardTitle>
        <BarChart3 className="text-muted-foreground h-3.5 w-3.5" />
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <div className="text-xl font-bold tabular-nums">
            {cohortMedian.toFixed(2)}%
          </div>
          {multiplier !== null && (
            <div
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-medium",
                isAboveAverage
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              )}
            >
              {multiplier.toFixed(1)}×
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-xs">{cohortName} median</p>

        <div className="flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" />
            <span>{profileCount.toLocaleString()}</span>
          </div>
          {percentile !== null && (
            <span className="text-muted-foreground text-xs">
              Top {100 - percentile}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
