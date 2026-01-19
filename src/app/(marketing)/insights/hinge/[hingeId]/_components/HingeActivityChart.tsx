"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
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

import { useHingeInsights } from "../HingeInsightsProvider";
import { GranularitySelector } from "../../../tinder/[tinderId]/_components/charts/GranularitySelector";
import {
  aggregateHingeData,
  type TimeGranularity,
} from "@/lib/utils/aggregateHingeData";

interface ActivityDataPoint {
  periodDisplay: string;
  matches: number;
  likes: number;
  messagesSent: number;
  messagesReceived: number;
}

// Hinge brand colors - purple/pink theme
const chartConfig = {
  matches: {
    label: "Matches",
    // Warm coral-red for matches - the hero metric
    color: "hsl(4, 90%, 58%)",
  },
  likes: {
    label: "Likes",
    // Purple for Hinge brand
    color: "hsl(270, 70%, 60%)",
  },
  messagesSent: {
    label: "Messages Sent",
    // Vibrant teal for positive actions
    color: "hsl(168, 76%, 42%)",
  },
  messagesReceived: {
    label: "Messages Received",
    // Pink accent
    color: "hsl(330, 75%, 55%)",
  },
} satisfies ChartConfig;

function HingeActivityTooltipContent({
  active,
  payload,
  visibleMetrics,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    payload?: ActivityDataPoint;
  }>;
  visibleMetrics: Set<string>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-background rounded-lg border p-3 shadow-lg">
      <div className="mb-2 border-b pb-2">
        <p className="text-muted-foreground text-sm font-medium">
          {data.periodDisplay}
        </p>
      </div>
      <div className="grid gap-2">
        {visibleMetrics.has("matches") && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: chartConfig.matches.color }}
              />
              <span className="text-sm">{chartConfig.matches.label}</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {data.matches}
            </span>
          </div>
        )}
        {visibleMetrics.has("likes") && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: chartConfig.likes.color }}
              />
              <span className="text-sm">{chartConfig.likes.label}</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {data.likes}
            </span>
          </div>
        )}
        {visibleMetrics.has("messagesSent") && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: chartConfig.messagesSent.color }}
              />
              <span className="text-sm">{chartConfig.messagesSent.label}</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {data.messagesSent}
            </span>
          </div>
        )}
        {visibleMetrics.has("messagesReceived") && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: chartConfig.messagesReceived.color }}
              />
              <span className="text-sm">
                {chartConfig.messagesReceived.label}
              </span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {data.messagesReceived}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function HingeActivityChart() {
  const { profile } = useHingeInsights();
  const [timeRange, setTimeRange] = React.useState("all");
  const [granularity, setGranularity] =
    React.useState<TimeGranularity>("weekly");
  const [visibleMetrics, setVisibleMetrics] = React.useState<Set<string>>(
    new Set(["matches", "likes"]),
  );

  const aggregatedData = React.useMemo(() => {
    if (!profile?.matches?.length) return [];
    return aggregateHingeData(profile.matches, granularity);
  }, [profile?.matches, granularity]);

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
        likes: acc.likes + item.likes,
        messagesSent: acc.messagesSent + item.messagesSent,
        messagesReceived: acc.messagesReceived + item.messagesReceived,
      }),
      { matches: 0, likes: 0, messagesSent: 0, messagesReceived: 0 },
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

  if (!profile?.matches?.length) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>No activity data available</CardDescription>
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
              Hinge Activity
            </CardTitle>
            <CardDescription>
              {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
              matches, likes, and messages
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
                <HingeActivityTooltipContent visibleMetrics={visibleMetrics} />
              }
            />

            {/* Stacked Bars for Messages */}
            {visibleMetrics.has("messagesSent") && (
              <Bar
                dataKey="messagesSent"
                stackId="messages"
                fill="var(--color-messagesSent)"
                radius={[0, 0, 0, 0]}
              />
            )}
            {visibleMetrics.has("messagesReceived") && (
              <Bar
                dataKey="messagesReceived"
                stackId="messages"
                fill="var(--color-messagesReceived)"
                radius={[4, 4, 0, 0]}
              />
            )}

            {/* Lines for Matches and Likes */}
            {visibleMetrics.has("matches") && (
              <Line
                dataKey="matches"
                type="monotone"
                stroke="var(--color-matches)"
                strokeWidth={2}
                dot={false}
              />
            )}
            {visibleMetrics.has("likes") && (
              <Line
                dataKey="likes"
                type="monotone"
                stroke="var(--color-likes)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
