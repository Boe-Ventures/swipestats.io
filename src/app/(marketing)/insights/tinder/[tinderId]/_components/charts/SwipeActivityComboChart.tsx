"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { cn } from "@/components/ui";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTinderProfile } from "../../TinderProfileProvider";
import { SwipeStatsTooltipContent } from "./SwipeStatsTooltipContent";
import { GranularitySelector } from "./GranularitySelector";
import {
  aggregateUsageData,
  type TimeGranularity,
} from "@/lib/utils/aggregateUsage";

// Semantic color palette for dating app metrics
const chartConfig = {
  matches: {
    label: "Matches",
    // Warm coral-red for love/matches - the hero metric
    color: "hsl(4, 90%, 58%)",
  },
  swipeLikes: {
    label: "Right Swipes",
    // Vibrant teal for positive actions
    color: "hsl(168, 76%, 42%)",
  },
  swipePasses: {
    label: "Left Swipes",
    // Soft amber/gold - neutral but visible
    color: "hsl(45, 93%, 58%)",
  },
  appOpens: {
    label: "App Opens",
    // Deep indigo for activity tracking
    color: "hsl(245, 58%, 51%)",
  },
} satisfies ChartConfig;

export function SwipeActivityComboChart() {
  const { profile, usage, tinderId, events } = useTinderProfile();
  const [timeRange, setTimeRange] = React.useState("all");
  const [granularity, setGranularity] =
    React.useState<TimeGranularity>("weekly");
  const [visibleMetrics, setVisibleMetrics] = React.useState<Set<string>>(
    new Set(["matches", "swipeLikes"]),
  );

  const aggregatedData = React.useMemo(() => {
    if (!usage?.length) return [];
    return aggregateUsageData(usage, granularity);
  }, [usage, granularity]);

  const filteredData = React.useMemo(() => {
    if (aggregatedData.length === 0) return [];

    if (timeRange === "all") return aggregatedData;

    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return aggregatedData.filter((item) => {
      // Parse different period formats
      let itemDate: Date;

      if (item.period.includes("-W")) {
        // Weekly: "2024-W52"
        const [year, weekStr] = item.period.split("-W");
        const weekNum = parseInt(weekStr ?? "1", 10);
        const yearNum = parseInt(year ?? "2024", 10);
        itemDate = new Date(yearNum, 0, 1 + (weekNum - 1) * 7);
      } else if (item.period.includes("-Q")) {
        // Quarterly: "2024-Q1"
        const [year, quarterStr] = item.period.split("-Q");
        const quarter = parseInt(quarterStr ?? "1", 10);
        const yearNum = parseInt(year ?? "2024", 10);
        itemDate = new Date(yearNum, (quarter - 1) * 3, 1);
      } else if (item.period.length === 4) {
        // Yearly: "2024"
        itemDate = new Date(parseInt(item.period, 10), 0, 1);
      } else if (item.period.length === 7) {
        // Monthly: "2024-01"
        itemDate = new Date(item.period + "-01");
      } else {
        // Daily: "2024-01-15"
        itemDate = new Date(item.period);
      }

      return itemDate >= startDate;
    });
  }, [aggregatedData, timeRange]);

  // Calculate period totals for metric cards
  const periodTotals = React.useMemo(() => {
    return filteredData.reduce(
      (acc, item) => ({
        matches: acc.matches + item.matches,
        swipeLikes: acc.swipeLikes + item.swipeLikes,
        swipePasses: acc.swipePasses + item.swipePasses,
        appOpens: acc.appOpens + item.appOpens,
      }),
      { matches: 0, swipeLikes: 0, swipePasses: 0, appOpens: 0 },
    );
  }, [filteredData]);

  const toggleMetric = (metric: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  // Helper to convert event date to period display format
  // Must match the EXACT format used by aggregateUsageData
  const dateToPeriodDisplay = React.useCallback(
    (date: Date): string | null => {
      switch (granularity) {
        case "daily":
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        case "weekly": {
          // Get start of week (Sunday) for display - matches aggregateToWeekly logic
          const dayOfWeek = date.getDay();
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - dayOfWeek);
          return `Week of ${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        }
        case "monthly":
          return date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
        case "quarterly": {
          const year = date.getFullYear();
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${year} Q${quarter}`;
        }
        case "yearly":
          return date.getFullYear().toString();
        default:
          return null;
      }
    },
    [granularity],
  );

  // Filter and format events for the current date range
  const visibleEvents = React.useMemo(() => {
    console.log("SwipeActivityComboChart - Events from provider:", events);
    console.log(
      "SwipeActivityComboChart - Filtered data length:",
      filteredData.length,
    );

    if (!events.length || !filteredData.length) {
      console.log("SwipeActivityComboChart - No events or no data");
      return [];
    }

    // Create a set of available periods in the chart
    const availablePeriods = new Set(filteredData.map((d) => d.periodDisplay));

    const mappedEvents = events
      .map((event) => {
        const startDate = new Date(event.startDate);
        const endDate = event.endDate ? new Date(event.endDate) : null;

        const startPeriodDisplay = dateToPeriodDisplay(startDate);
        const endPeriodDisplay = endDate ? dateToPeriodDisplay(endDate) : null;

        // Check if the event's period exists in the chart data
        if (startPeriodDisplay && !availablePeriods.has(startPeriodDisplay)) {
          console.log(
            `Event "${event.name}" period "${startPeriodDisplay}" not found in chart. Available periods:`,
            Array.from(availablePeriods).slice(0, 5),
          );
        }

        return {
          ...event,
          startPeriodDisplay,
          endPeriodDisplay,
        };
      })
      .filter((event) => {
        // Only show events that have a period that exists in the chart
        return (
          event.startPeriodDisplay !== null &&
          availablePeriods.has(event.startPeriodDisplay)
        );
      });

    console.log("SwipeActivityComboChart - Mapped events:", mappedEvents);
    console.log(
      "SwipeActivityComboChart - Chart periods:",
      filteredData.slice(0, 5).map((d) => d.periodDisplay),
    );

    return mappedEvents;
  }, [events, filteredData, dateToPeriodDisplay]);

  if (!usage?.length) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Swipe Activity</CardTitle>
          <CardDescription>No usage data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              Swipe Activity
            </CardTitle>
            <CardDescription>
              {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
              matches, swipes, and app opens
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <GranularitySelector
              value={granularity}
              onChange={setGranularity}
            />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="w-[160px]"
                aria-label="Select time range"
              >
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metric Toggle Pills */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(chartConfig).map(([key, config]) => {
            const isVisible = visibleMetrics.has(key);
            const total = periodTotals[key as keyof typeof periodTotals];
            return (
              <button
                key={key}
                onClick={() => toggleMetric(key)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  isVisible
                    ? "text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                style={
                  isVisible ? { backgroundColor: config.color } : undefined
                }
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    isVisible && "border-2 border-white/40",
                  )}
                  style={{
                    backgroundColor: isVisible ? "white" : config.color,
                  }}
                />
                <span>{config.label}</span>
                <span className="tabular-nums">{total.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <ComposedChart accessibilityLayer data={filteredData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="periodDisplay"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={
                <SwipeStatsTooltipContent visibleMetrics={visibleMetrics} />
              }
            />

            {/* Stacked Bars */}
            {visibleMetrics.has("swipeLikes") && (
              <Bar
                dataKey="swipeLikes"
                stackId="swipes"
                fill="var(--color-swipeLikes)"
                radius={[0, 0, 0, 0]}
              />
            )}
            {visibleMetrics.has("swipePasses") && (
              <Bar
                dataKey="swipePasses"
                stackId="swipes"
                fill="var(--color-swipePasses)"
                radius={[4, 4, 0, 0]}
              />
            )}

            {/* Lines */}
            {visibleMetrics.has("matches") && (
              <Line
                dataKey="matches"
                type="monotone"
                stroke="var(--color-matches)"
                strokeWidth={2}
                dot={false}
              />
            )}
            {visibleMetrics.has("appOpens") && (
              <Line
                dataKey="appOpens"
                type="monotone"
                stroke="var(--color-appOpens)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}

            {/* Event Overlays */}
            {visibleEvents.map((event) => {
              if (!event.startPeriodDisplay) return null;

              if (
                event.endPeriodDisplay &&
                event.endPeriodDisplay !== event.startPeriodDisplay
              ) {
                return (
                  <ReferenceArea
                    key={event.id}
                    x1={event.startPeriodDisplay}
                    x2={event.endPeriodDisplay}
                    fill="hsl(280, 70%, 50%)"
                    fillOpacity={0.08}
                    label={{
                      value: event.name,
                      position: "insideTop",
                      fontSize: 11,
                      fill: "hsl(280, 70%, 35%)",
                    }}
                  />
                );
              } else {
                return (
                  <ReferenceLine
                    key={event.id}
                    x={event.startPeriodDisplay}
                    stroke="hsl(280, 70%, 50%)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: event.name,
                      position: "insideTopLeft",
                      fontSize: 12,
                      fill: "hsl(280, 70%, 35%)",
                      fontWeight: 600,
                      offset: 5,
                    }}
                  />
                );
              }
            })}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
