"use client";

import * as React from "react";
import { cn } from "@/components/ui/lib/utils";

type ComparisonTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    dataKey?: string;
    color?: string;
    payload?: {
      period?: string;
      periodDisplay?: string;
      matches?: number;
      swipeLikes?: number;
      swipePasses?: number;
      appOpens?: number;
      // Previous period data
      prevMatches?: number;
      prevSwipeLikes?: number;
      prevSwipePasses?: number;
      prevAppOpens?: number;
      prevPeriodDisplay?: string;
    };
  }>;
  label?: string;
  className?: string;
  visibleMetrics?: Set<string>;
  showPreviousPeriod?: boolean;
};

export function ComparisonTooltipContent({
  active,
  payload,
  label,
  className,
  visibleMetrics,
  showPreviousPeriod = false,
}: ComparisonTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  // Format the date header
  const dateHeader = data.periodDisplay || label || "";

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

  const MetricRow = ({
    label,
    current,
    previous,
    color,
  }: {
    label: string;
    current?: number;
    previous?: number;
    color: string;
  }) => {
    const change = calculateChange(current, previous);
    const changeFormatted = formatChange(change);

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground text-sm">{label}</span>
          </div>
          <span className="text-sm font-medium tabular-nums">
            {current?.toLocaleString() ?? 0}
          </span>
        </div>
        {showPreviousPeriod && previous !== undefined && (
          <div className="flex items-center justify-end gap-2 pl-4 text-xs">
            <span className="text-muted-foreground/70">
              vs. {previous.toLocaleString()}
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
  };

  return (
    <div
      className={cn(
        "border-border/50 bg-background/95 rounded-lg border p-3 shadow-xl backdrop-blur-sm",
        className,
      )}
    >
      {/* Date Header */}
      <div className="border-border/50 mb-2 border-b pb-2">
        <p className="text-sm font-semibold">{dateHeader}</p>
        {showPreviousPeriod && data.prevPeriodDisplay && (
          <p className="text-muted-foreground text-xs">
            vs. {data.prevPeriodDisplay}
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        {/* Matches */}
        {(!visibleMetrics || visibleMetrics.has("matches")) &&
          data.matches !== undefined && (
            <MetricRow
              label="Matches"
              current={data.matches}
              previous={data.prevMatches}
              color="hsl(4, 90%, 58%)"
            />
          )}

        {/* Swipe Likes */}
        {(!visibleMetrics || visibleMetrics.has("swipeLikes")) &&
          data.swipeLikes !== undefined && (
            <MetricRow
              label="Right Swipes"
              current={data.swipeLikes}
              previous={data.prevSwipeLikes}
              color="hsl(168, 76%, 42%)"
            />
          )}

        {/* Swipe Passes */}
        {(!visibleMetrics || visibleMetrics.has("swipePasses")) &&
          data.swipePasses !== undefined && (
            <MetricRow
              label="Left Swipes"
              current={data.swipePasses}
              previous={data.prevSwipePasses}
              color="hsl(45, 93%, 58%)"
            />
          )}

        {/* App Opens */}
        {(!visibleMetrics || visibleMetrics.has("appOpens")) &&
          data.appOpens !== undefined && (
            <MetricRow
              label="App Opens"
              current={data.appOpens}
              previous={data.prevAppOpens}
              color="hsl(245, 58%, 51%)"
            />
          )}
      </div>

      {/* Summary Stats */}
      {showPreviousPeriod &&
        data.matches !== undefined &&
        data.swipeLikes !== undefined && (
          <div className="border-border/50 mt-2 space-y-1 border-t pt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-xs">Match Rate</span>
              <span className="text-xs font-medium tabular-nums">
                {data.swipeLikes > 0
                  ? ((data.matches / data.swipeLikes) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
            {data.prevMatches !== undefined &&
              data.prevSwipeLikes !== undefined &&
              data.prevSwipeLikes > 0 && (
                <div className="flex items-center justify-end gap-2 text-xs">
                  <span className="text-muted-foreground/70">
                    vs.{" "}
                    {((data.prevMatches / data.prevSwipeLikes) * 100).toFixed(
                      1,
                    )}
                    %
                  </span>
                </div>
              )}
          </div>
        )}
    </div>
  );
}
