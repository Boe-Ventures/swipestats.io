"use client";

import * as React from "react";
import { cn } from "@/components/ui/lib/utils";

type SwipeStatsTooltipProps = {
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
      messagesSent?: number;
      messagesReceived?: number;
      matchRate?: number;
      likeRatio?: number;
    };
  }>;
  label?: string;
  className?: string;
  visibleMetrics?: Set<string>;
};

export function SwipeStatsTooltipContent({
  active,
  payload,
  label,
  className,
  visibleMetrics,
}: SwipeStatsTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  // Format the date header - use periodDisplay which handles all granularities
  const dateHeader = data.periodDisplay || label || "";

  // Calculate totals and derived metrics
  const totalSwipes = (data.swipeLikes ?? 0) + (data.swipePasses ?? 0);
  const matchRate =
    data.swipeLikes && data.matches
      ? ((data.matches / data.swipeLikes) * 100).toFixed(1)
      : "0.0";
  const likeRatio =
    totalSwipes > 0
      ? (((data.swipeLikes ?? 0) / totalSwipes) * 100).toFixed(1)
      : "0.0";
  const responseRate =
    data.messagesReceived && data.messagesSent
      ? ((data.messagesSent / data.messagesReceived) * 100).toFixed(1)
      : "0.0";

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
      </div>

      {/* Primary Metrics */}
      <div className="space-y-1.5">
        {/* Matches (Line) */}
        {(!visibleMetrics || visibleMetrics.has("matches")) &&
          data.matches !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--chart-1)" }}
                />
                <span className="text-muted-foreground text-sm">Matches</span>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {data.matches.toLocaleString()}
              </span>
            </div>
          )}

        {/* Swipes Section */}
        {(!visibleMetrics ||
          visibleMetrics.has("swipeLikes") ||
          !visibleMetrics ||
          visibleMetrics.has("swipePasses")) &&
          totalSwipes > 0 && (
            <>
              <div className="mt-2 flex items-center justify-between gap-4 pt-1">
                <span className="text-muted-foreground/70 text-xs font-semibold tracking-wider uppercase">
                  Swipes
                </span>
                <span className="text-muted-foreground text-xs font-medium tabular-nums">
                  {totalSwipes.toLocaleString()}
                </span>
              </div>

              {(!visibleMetrics || visibleMetrics.has("swipeLikes")) &&
                data.swipeLikes !== undefined && (
                  <div className="flex items-center justify-between gap-4 pl-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--chart-2)" }}
                      />
                      <span className="text-muted-foreground text-sm">
                        Right Swipes
                      </span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {data.swipeLikes.toLocaleString()}
                    </span>
                  </div>
                )}

              {(!visibleMetrics || visibleMetrics.has("swipePasses")) &&
                data.swipePasses !== undefined && (
                  <div className="flex items-center justify-between gap-4 pl-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--chart-4)" }}
                      />
                      <span className="text-muted-foreground text-sm">
                        Left Swipes
                      </span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {data.swipePasses.toLocaleString()}
                    </span>
                  </div>
                )}
            </>
          )}

        {/* App Opens */}
        {(!visibleMetrics || visibleMetrics.has("appOpens")) &&
          data.appOpens !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--chart-3)" }}
                />
                <span className="text-muted-foreground text-sm">App Opens</span>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {data.appOpens.toLocaleString()}
              </span>
            </div>
          )}

        {/* Messages Section */}
        {(data.messagesSent !== undefined ||
          data.messagesReceived !== undefined) && (
          <>
            <div className="mt-2 flex items-center justify-between gap-4 pt-1">
              <span className="text-muted-foreground/70 text-xs font-semibold tracking-wider uppercase">
                Messages
              </span>
              <span className="text-muted-foreground text-xs font-medium tabular-nums">
                {(
                  (data.messagesSent ?? 0) + (data.messagesReceived ?? 0)
                ).toLocaleString()}
              </span>
            </div>

            {data.messagesSent !== undefined && (
              <div className="flex items-center justify-between gap-4 pl-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--chart-1)" }}
                  />
                  <span className="text-muted-foreground text-sm">Sent</span>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {data.messagesSent.toLocaleString()}
                </span>
              </div>
            )}

            {data.messagesReceived !== undefined && (
              <div className="flex items-center justify-between gap-4 pl-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--chart-2)" }}
                  />
                  <span className="text-muted-foreground text-sm">
                    Received
                  </span>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {data.messagesReceived.toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}

        {/* Calculated Metrics */}
        {data.matches !== undefined && data.swipeLikes !== undefined && (
          <div className="border-border/50 mt-2 space-y-1 border-t pt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-xs">Match Rate</span>
              <span className="text-xs font-medium tabular-nums">
                {matchRate}%
              </span>
            </div>
            {totalSwipes > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-xs">
                  Like Ratio
                </span>
                <span className="text-xs font-medium tabular-nums">
                  {likeRatio}%
                </span>
              </div>
            )}
            {data.messagesSent !== undefined &&
              data.messagesReceived !== undefined &&
              data.messagesReceived > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-xs">
                    Response Rate
                  </span>
                  <span className="text-xs font-medium tabular-nums">
                    {responseRate}%
                  </span>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
