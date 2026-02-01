"use client";

import * as React from "react";
import { CartesianGrid, ComposedChart, XAxis, YAxis, Bar } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

import { useHingeInsights } from "../HingeInsightsProvider";
import { useMemo, useState } from "react";

type TimeGranularity = "week" | "month";

const chartConfig = {
  matches: {
    label: "Matches",
    color: "hsl(270, 70%, 60%)", // Purple for Hinge
  },
} satisfies ChartConfig;

interface MatchDataPoint {
  date: string;
  matches: number;
  timestamp: number;
}

export function EnhancedMatchTimeline() {
  const { profile } = useHingeInsights();
  const [granularity, setGranularity] = useState<TimeGranularity>("month");

  const aggregatedData = useMemo(() => {
    if (!profile?.matches) return [];

    const dataMap = new Map<string, number>();

    // Process all matches
    profile.matches.forEach((match) => {
      if (!match.matchedAt) return;

      const date = new Date(match.matchedAt);
      let key: string;

      switch (granularity) {
        case "week": {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          key = weekStart.toISOString().split("T")[0]!;
          break;
        }
        case "month":
          key = date.toISOString().substring(0, 7); // YYYY-MM
          break;
      }

      dataMap.set(key, (dataMap.get(key) || 0) + 1);
    });

    // Convert to array and sort
    const result: MatchDataPoint[] = Array.from(dataMap.entries())
      .map(([date, count]) => ({
        date,
        matches: count,
        timestamp: new Date(date).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return result;
  }, [profile?.matches, granularity]);

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (granularity) {
      case "week":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      case "month":
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
    }
  };

  const totalMatches = profile?.matches?.length || 0;
  const avgPerPeriod =
    aggregatedData.length > 0
      ? (totalMatches / aggregatedData.length).toFixed(1)
      : "0";

  if (aggregatedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Timeline</CardTitle>
          <CardDescription>Your matches over time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No match data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Match Timeline</CardTitle>
          <CardDescription>Your matches over time</CardDescription>
        </div>
        <div className="flex">
          {(["week", "month"] as const).map((key) => {
            const isActive = granularity === key;
            return (
              <button
                key={key}
                data-active={isActive}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setGranularity(key)}
              >
                <span className="text-muted-foreground text-xs uppercase">
                  By {key}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {aggregatedData.length}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <ComposedChart
            data={aggregatedData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatXAxis}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toString()}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0]?.payload as MatchDataPoint;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[0.70rem] uppercase">
                          {formatXAxis(data.date)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[0.70rem] uppercase">
                          Matches
                        </span>
                        <span className="font-bold text-purple-600">
                          {data.matches}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="matches"
              fill="hsl(270, 70%, 60%)"
              radius={[4, 4, 0, 0]}
            />
          </ComposedChart>
        </ChartContainer>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Total Matches</p>
            <p className="text-lg font-semibold">{totalMatches}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">
              Avg per {granularity}
            </p>
            <p className="text-lg font-semibold">{avgPerPeriod}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
