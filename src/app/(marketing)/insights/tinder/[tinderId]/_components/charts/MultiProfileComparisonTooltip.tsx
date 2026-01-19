"use client";

import * as React from "react";
import { cn } from "@/components/ui/lib/utils";
import {
  getProfileColor,
  getProfileLabel,
} from "../../compare/utils/profileColors";

type MultiProfileComparisonTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    dataKey?: string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  className?: string;
  visibleMetrics?: Set<string>;
  showPreviousPeriod?: boolean;
  profiles?: Array<{ tinderId: string }>;
  myTinderId?: string;
};

export function MultiProfileComparisonTooltip({
  active,
  payload,
  label,
  className,
  visibleMetrics,
  showPreviousPeriod = false,
  profiles = [],
  myTinderId,
}: MultiProfileComparisonTooltipProps) {
  if (!active || !payload?.length || !payload[0]?.payload) {
    return null;
  }

  const data = payload[0].payload;
  const dateHeader = (data.periodDisplay as string) || label || "";

  // Helper to calculate percentage change
  const calculateChange = (current?: number, previous?: number) => {
    if (current === undefined || previous === undefined || previous === 0) {
      return null;
    }
    return ((current - previous) / previous) * 100;
  };

  // Helper to format change display
  const formatChange = (change: number | null) => {
    if (change === null) return null;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  // Metric labels
  const metricLabels: Record<string, string> = {
    matches: "Matches",
    swipeLikes: "Right Swipes",
    swipePasses: "Left Swipes",
    appOpens: "App Opens",
  };

  // Render a profile section
  const renderProfileSection = (
    profile: { tinderId: string },
    index: number,
  ) => {
    const suffix = profile.tinderId === myTinderId ? "you" : profile.tinderId;
    const label = getProfileLabel(profile.tinderId, myTinderId ?? "", index);
    const color = getProfileColor(index);

    const metrics: Array<{
      key: string;
      label: string;
      current?: number;
      previous?: number;
    }> = [];

    // Collect visible metrics for this profile
    visibleMetrics?.forEach((metric) => {
      const currentKey = `${metric}_${suffix}`;
      const prevKey = `prev${capitalize(metric)}_${suffix}`;
      const current = data[currentKey] as number | undefined;
      const previous = showPreviousPeriod
        ? (data[prevKey] as number | undefined)
        : undefined;

      if (current !== undefined || previous !== undefined) {
        metrics.push({
          key: metric,
          label: metricLabels[metric] ?? metric,
          current: current ?? 0,
          previous,
        });
      }
    });

    if (metrics.length === 0) return null;

    // Calculate match rate if we have matches and swipeLikes
    const matches = data[`matches_${suffix}`] as number | undefined;
    const swipeLikes = data[`swipeLikes_${suffix}`] as number | undefined;
    const prevMatches = showPreviousPeriod
      ? (data[`prevMatches_${suffix}`] as number | undefined)
      : undefined;
    const prevSwipeLikes = showPreviousPeriod
      ? (data[`prevSwipeLikes_${suffix}`] as number | undefined)
      : undefined;

    const matchRate =
      swipeLikes && swipeLikes > 0 ? ((matches ?? 0) / swipeLikes) * 100 : null;
    const prevMatchRate =
      prevSwipeLikes && prevSwipeLikes > 0
        ? ((prevMatches ?? 0) / prevSwipeLikes) * 100
        : null;

    return (
      <div key={profile.tinderId} className="space-y-1.5">
        {/* Profile Header */}
        <div className="border-border/50 flex items-center gap-2 border-b pb-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-semibold">{label}</span>
        </div>

        {/* Metrics */}
        {metrics.map((metric) => {
          const change = calculateChange(metric.current, metric.previous);
          const changeFormatted = formatChange(change);

          return (
            <div key={metric.key} className="space-y-0.5 pl-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-xs">
                  {metric.label}
                </span>
                <span className="text-xs font-medium tabular-nums">
                  {metric.current?.toLocaleString() ?? 0}
                </span>
              </div>
              {showPreviousPeriod &&
                metric.previous !== undefined &&
                metric.previous !== null && (
                  <div className="flex items-center justify-end gap-2 pl-4 text-xs">
                    <span className="text-muted-foreground/70">
                      vs. {metric.previous.toLocaleString()}
                    </span>
                    {changeFormatted && (
                      <span
                        className={cn(
                          "font-medium",
                          change! > 0
                            ? "text-green-600 dark:text-green-400"
                            : change! < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground",
                        )}
                      >
                        ({changeFormatted})
                      </span>
                    )}
                  </div>
                )}
            </div>
          );
        })}

        {/* Match Rate */}
        {matchRate !== null && (
          <div className="border-border/30 mt-1.5 space-y-0.5 border-t pt-1.5 pl-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-xs">Match Rate</span>
              <span className="text-xs font-medium tabular-nums">
                {matchRate.toFixed(1)}%
              </span>
            </div>
            {showPreviousPeriod && prevMatchRate !== null && (
              <div className="flex items-center justify-end gap-2 text-xs">
                <span className="text-muted-foreground/70">
                  vs. {prevMatchRate.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "border-border/50 bg-background/95 rounded-lg border p-3 shadow-xl backdrop-blur-sm",
        className,
      )}
    >
      {/* Date Header */}
      <div className="border-border/50 mb-3 border-b pb-2">
        <p className="text-sm font-semibold">{dateHeader}</p>
      </div>

      {/* Profile Sections */}
      <div className="space-y-3">
        {profiles.map((profile, index) => renderProfileSection(profile, index))}
      </div>
    </div>
  );
}

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
