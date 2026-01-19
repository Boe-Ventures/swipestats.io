"use client";

import * as React from "react";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
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

import { useHingeInsights } from "../HingeInsightsProvider";
import { useMemo, useState } from "react";

type TimeGranularity = "day" | "week" | "month";

const chartConfig = {
  messagesSent: {
    label: "Messages Sent",
    color: "hsl(270, 70%, 60%)", // Purple for Hinge
  },
  messagesReceived: {
    label: "Messages Received",
    color: "hsl(330, 75%, 55%)", // Pink for Hinge
  },
} satisfies ChartConfig;

interface MessageDataPoint {
  date: string;
  messagesSent: number;
  messagesReceived: number;
  timestamp: number;
}

export function HingeMessagingChart() {
  const { profile } = useHingeInsights();
  const [granularity, setGranularity] = useState<TimeGranularity>("week");

  const aggregatedData = useMemo(() => {
    if (!profile?.matches) return [];

    const dataMap = new Map<string, { sent: number; received: number }>();

    // Process all messages - messages are nested inside matches
    profile.matches.forEach((match) => {
      if (!match.messages) return;

      match.messages.forEach((message) => {
        const date = new Date(message.sentDate);
        let key: string;

        switch (granularity) {
          case "day":
            key = date.toISOString().split("T")[0]!; // YYYY-MM-DD
            break;
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

        if (!dataMap.has(key)) {
          dataMap.set(key, { sent: 0, received: 0 });
        }

        const data = dataMap.get(key)!;
        if (message.to === 0) {
          // Message sent by user
          data.sent++;
        } else {
          // Message received
          data.received++;
        }
      });
    });

    // Convert to array and sort
    const result: MessageDataPoint[] = Array.from(dataMap.entries())
      .map(([date, counts]) => ({
        date,
        messagesSent: counts.sent,
        messagesReceived: counts.received,
        timestamp: new Date(date).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return result;
  }, [profile?.matches, granularity]);

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (granularity) {
      case "day":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
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

  const totalSent = aggregatedData.reduce((sum, d) => sum + d.messagesSent, 0);
  const totalReceived = aggregatedData.reduce(
    (sum, d) => sum + d.messagesReceived,
    0,
  );

  if (aggregatedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messaging Activity</CardTitle>
          <CardDescription>
            Messages sent and received over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No messaging data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Messaging Activity</CardTitle>
          <CardDescription>
            Messages sent and received over time
          </CardDescription>
        </div>
        <div className="flex">
          {(["day", "week", "month"] as const).map((key) => (
            <button
              key={key}
              data-active={granularity === key}
              className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setGranularity(key)}
            >
              <span className="text-muted-foreground text-xs uppercase">
                {key}
              </span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {key === "day" && aggregatedData.length}
                {key === "week" && aggregatedData.length}
                {key === "month" && aggregatedData.length}
              </span>
            </button>
          ))}
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

                const data = payload[0]?.payload as MessageDataPoint;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[0.70rem] uppercase">
                          {formatXAxis(data.date)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[0.70rem] uppercase">
                            Sent
                          </span>
                          <span className="font-bold text-purple-600">
                            {data.messagesSent}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[0.70rem] uppercase">
                            Received
                          </span>
                          <span className="font-bold text-pink-600">
                            {data.messagesReceived}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="messagesReceived"
              type="monotone"
              fill="hsl(330, 75%, 55%)"
              fillOpacity={0.2}
              stroke="hsl(330, 75%, 55%)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="messagesSent"
              type="monotone"
              fill="hsl(270, 70%, 60%)"
              fillOpacity={0.2}
              stroke="hsl(270, 70%, 60%)"
              strokeWidth={2}
              stackId="a"
            />
          </ComposedChart>
        </ChartContainer>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Total Sent</p>
            <p className="text-lg font-semibold">
              {totalSent.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Total Received</p>
            <p className="text-lg font-semibold">
              {totalReceived.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
