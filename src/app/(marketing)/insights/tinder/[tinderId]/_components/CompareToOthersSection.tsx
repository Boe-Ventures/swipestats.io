"use client";

/**
 * DEPRECATED: This component is not currently used in the app.
 *
 * Kept for potential future use cases:
 * - Marketing/landing pages showing "typical results"
 * - Onboarding flow
 * - Simplified "quick stats" view
 *
 * Deprecated because:
 * - Shows mean (average) values which are skewed by outliers
 * - CohortBenchmarksSection is more accurate (uses median/percentiles)
 * - Redundant UX - both sections showed the same metrics
 *
 * @see CohortBenchmarksSection for the current implementation
 */

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTinderProfile } from "../TinderProfileProvider";

export function CompareToOthersSection() {
  const { meta } = useTinderProfile();
  const trpc = useTRPC();

  // Default to all-time
  const period = "all-time";

  // Fetch cohort stats
  const maleStatsQuery = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: "tinder_male", period },
      { staleTime: 1000 * 60 * 60 },
    ),
  );

  const femaleStatsQuery = useQuery(
    trpc.cohort.getStats.queryOptions(
      { cohortId: "tinder_female", period },
      { staleTime: 1000 * 60 * 60 },
    ),
  );

  if (!meta) return null;
  const globalMeta = meta;

  const maleStats = maleStatsQuery.data;
  const femaleStats = femaleStatsQuery.data;
  if (!maleStats || !femaleStats) return null;

  // Format percentage
  const fmt = (val: number) => `${(val * 100).toFixed(0)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>How do you measure up to others?</CardTitle>
        <p className="text-muted-foreground text-sm">
          * based on other Tinder Insights users
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average Pickiness */}
        <div>
          <p className="mb-3 text-sm font-medium">Average pickiness</p>
          <p className="text-muted-foreground mb-2 text-xs">
            How many people do you swipe right on compared to the average
            male/female user?
          </p>
          <div className="space-y-2">
            <MetricBar label="you" value={fmt(globalMeta.likeRate)} highlight />
            <MetricBar
              label="women"
              value={fmt(femaleStats.likeRateMean || 0)}
            />
            <MetricBar label="men" value={fmt(maleStats.likeRateMean || 0)} />
          </div>
        </div>

        {/* Average Match Rate */}
        <div>
          <p className="mb-3 text-sm font-medium">Average Match Rate</p>
          <div className="space-y-2">
            <MetricBar
              label="You match with"
              value={fmt(globalMeta.matchRate)}
              highlight
            />
            <MetricBar
              label="Women match with"
              value={fmt(femaleStats.matchRateMean || 0)}
            />
            <MetricBar
              label="Men match with"
              value={fmt(maleStats.matchRateMean || 0)}
            />
          </div>
        </div>

        {/* Average Swipes Per Day */}
        <div>
          <p className="mb-3 text-sm font-medium">
            Average number of swipes per day
          </p>
          <p className="text-muted-foreground mb-2 text-xs">
            How many times do you swipe per day compared to the average
            male/female user?
          </p>
          <div className="space-y-2">
            <MetricBar
              label="You"
              value={Math.round(globalMeta.swipesPerDay).toString()}
              highlight
            />
            <MetricBar
              label="Women"
              value={Math.round(femaleStats.swipesPerDayMean || 0).toString()}
            />
            <MetricBar
              label="Men"
              value={Math.round(maleStats.swipesPerDayMean || 0).toString()}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBar({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-20 text-sm capitalize ${highlight ? "font-semibold" : ""}`}
      >
        {label}
      </span>
      <div
        className={`flex h-8 flex-1 items-center rounded-lg px-3 ${
          highlight ? "bg-primary/10 border-primary border-2" : "bg-secondary"
        }`}
      >
        <span
          className={`${highlight ? "text-primary font-bold" : "font-semibold"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
