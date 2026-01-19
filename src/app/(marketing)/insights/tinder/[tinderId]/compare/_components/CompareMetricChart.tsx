"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/components/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../../TinderProfileProvider";
import { useComparison } from "../../ComparisonProvider";
import {
  aggregateUsageData,
  type TimeGranularity,
} from "@/lib/utils/aggregateUsage";
import { getProfileColor, getProfileLabel } from "../utils/profileColors";

type MetricKey =
  | "matches"
  | "appOpens"
  | "swipeLikes"
  | "swipePasses"
  | "messagesSent"
  | "messagesReceived";

const metricConfig: Record<
  MetricKey,
  { label: string; color: string; description: string }
> = {
  matches: {
    label: "Matches",
    color: "hsl(4, 90%, 58%)",
    description: "Total matches over time",
  },
  appOpens: {
    label: "App Opens",
    color: "hsl(245, 58%, 51%)",
    description: "App opens over time",
  },
  swipeLikes: {
    label: "Swipe Likes",
    color: "hsl(168, 76%, 42%)",
    description: "Right swipes over time",
  },
  swipePasses: {
    label: "Swipe Passes",
    color: "hsl(45, 93%, 58%)",
    description: "Left swipes over time",
  },
  messagesSent: {
    label: "Messages Sent",
    color: "hsl(142, 71%, 45%)",
    description: "Messages sent over time",
  },
  messagesReceived: {
    label: "Messages Received",
    color: "hsl(217, 91%, 60%)",
    description: "Messages received over time",
  },
};

interface CompareMetricChartProps {
  metric: MetricKey;
  title?: string;
}

export function CompareMetricChart({ metric, title }: CompareMetricChartProps) {
  const { profile, usage, tinderId, usageLoading } = useTinderProfile();
  const {
    comparisonProfiles,
    pendingProfileIds,
    loading: comparisonLoading,
  } = useComparison();
  const profileWithUsage = React.useMemo(
    () => ({ ...profile, usage }),
    [profile, usage],
  );
  const profiles = React.useMemo(
    () => [profileWithUsage, ...comparisonProfiles],
    [profileWithUsage, comparisonProfiles],
  );
  const [timeRange, setTimeRange] = React.useState("all");
  const [granularity, setGranularity] =
    React.useState<TimeGranularity>("monthly");
  const [visibleProfiles, setVisibleProfiles] = React.useState<Set<string>>(
    new Set(profiles.map((p) => p.tinderId)),
  );

  const config = metricConfig[metric];

  // Show loading state when data is being fetched
  const isLoading = usageLoading || comparisonLoading;

  // Aggregate data for ALL profiles
  const allProfilesData = React.useMemo(() => {
    return profiles.map((profile) => ({
      tinderId: profile.tinderId,
      data: profile.usage?.length
        ? aggregateUsageData(profile.usage, granularity)
        : [],
    }));
  }, [profiles, granularity]);

  // Merge all profiles' data into single dataset
  const mergedData = React.useMemo(() => {
    // Collect all unique periods across all profiles
    const allPeriodsSet = new Set<string>();
    allProfilesData.forEach((profileData) => {
      profileData.data.forEach((item) => {
        allPeriodsSet.add(item.period);
      });
    });

    // Sort periods
    const allPeriods = Array.from(allPeriodsSet).sort();

    // Create merged data points
    return allPeriods.map((period) => {
      const dataPoint: Record<string, string | number> = {
        period,
        periodDisplay: "",
      };

      // Add value for each profile
      allProfilesData.forEach((profileData) => {
        const item = profileData.data.find((d) => d.period === period);
        if (item) {
          dataPoint[profileData.tinderId] = item[metric] ?? 0;
          // Use the periodDisplay from any profile (they should match)
          if (!dataPoint.periodDisplay && item.periodDisplay) {
            dataPoint.periodDisplay = item.periodDisplay;
          }
        } else {
          dataPoint[profileData.tinderId] = 0;
        }
      });

      return dataPoint;
    });
  }, [allProfilesData, metric]);

  // Filter by time range
  const filteredData = React.useMemo(() => {
    if (mergedData.length === 0) return [];

    if (timeRange === "all") return mergedData;

    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return mergedData.filter((item) => {
      const period = item.period as string;
      let itemDate: Date;

      if (period.includes("-W")) {
        const [year, weekStr] = period.split("-W");
        const weekNum = parseInt(weekStr ?? "1", 10);
        const yearNum = parseInt(year ?? "2024", 10);
        itemDate = new Date(yearNum, 0, 1 + (weekNum - 1) * 7);
      } else if (period.includes("-Q")) {
        const [year, quarterStr] = period.split("-Q");
        const quarter = parseInt(quarterStr ?? "1", 10);
        const yearNum = parseInt(year ?? "2024", 10);
        itemDate = new Date(yearNum, (quarter - 1) * 3, 1);
      } else if (period.length === 4) {
        itemDate = new Date(parseInt(period, 10), 0, 1);
      } else if (period.length === 7) {
        itemDate = new Date(period + "-01");
      } else {
        itemDate = new Date(period);
      }

      return itemDate >= startDate;
    });
  }, [mergedData, timeRange]);

  // Calculate totals per profile
  const profileTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    profiles.forEach((profile) => {
      totals[profile.tinderId] = filteredData.reduce(
        (sum, item) => sum + ((item[profile.tinderId] as number) ?? 0),
        0,
      );
    });
    return totals;
  }, [filteredData, profiles]);

  const toggleProfile = (tinderId: string) => {
    setVisibleProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(tinderId)) {
        // Don't allow hiding all profiles
        if (next.size > 1) {
          next.delete(tinderId);
        }
      } else {
        next.add(tinderId);
      }
      return next;
    });
  };

  // Update visible profiles when profiles change
  React.useEffect(() => {
    setVisibleProfiles(new Set(profiles.map((p) => p.tinderId)));
  }, [profiles]);

  // Show loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {title ?? config.label}
          </CardTitle>
          <CardDescription>
            {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-muted rounded-full p-4">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-lg font-semibold">
                Loading data...
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Fetching your Tinder insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (
    profiles.length === 0 ||
    allProfilesData.every((p) => p.data.length === 0)
  ) {
    return (
      <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {title ?? config.label}
          </CardTitle>
          <CardDescription>
            {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-muted rounded-full p-4">
              <BarChart3 className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-lg font-semibold">
                No data available
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                This profile doesn't have any usage data yet. Try uploading your
                Tinder data export to see insights here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build chart config dynamically for all profiles
  const chartConfig = profiles.reduce(
    (acc, profile, index) => {
      const label = getProfileLabel(profile.tinderId, tinderId, index);
      acc[profile.tinderId] = {
        label,
        color: getProfileColor(index),
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>,
  );

  return (
    <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              {title ?? config.label}
            </CardTitle>
            <CardDescription>
              {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
              {config.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={granularity}
              onValueChange={(value) =>
                setGranularity(value as TimeGranularity)
              }
            >
              <SelectTrigger
                className="w-[120px]"
                aria-label="Select granularity"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="w-[140px]"
                aria-label="Select time range"
              >
                <SelectValue />
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

        {/* Profile Toggle Pills */}
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile, index) => {
            const isVisible = visibleProfiles.has(profile.tinderId);
            const color = getProfileColor(index);
            const label = getProfileLabel(profile.tinderId, tinderId, index);
            const total = profileTotals[profile.tinderId] ?? 0;

            return (
              <button
                key={profile.tinderId}
                onClick={() => toggleProfile(profile.tinderId)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  isVisible
                    ? "text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                style={isVisible ? { backgroundColor: color } : undefined}
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    isVisible && "border-2 border-white/40",
                  )}
                  style={{
                    backgroundColor: isVisible ? "white" : color,
                  }}
                />
                <span>{label}</span>
                <span className="tabular-nums">{total.toLocaleString()}</span>
              </button>
            );
          })}

          {/* Pending profiles - show loading state */}
          {pendingProfileIds.map((tinderId, idx) => {
            const index = profiles.length + idx;
            const color = getProfileColor(index);
            const label = getProfileLabel(tinderId, tinderId, index);

            return (
              <div
                key={tinderId}
                className="flex items-center gap-2 rounded-full border-2 border-dashed px-4 py-2 text-sm font-medium opacity-60"
                style={{ borderColor: color }}
              >
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>{label}</span>
                <span className="text-muted-foreground text-xs">
                  Loading...
                </span>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="px-6 pt-6 pr-6">
        {filteredData.length === 0 ? (
          // Empty State
          <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-muted rounded-full p-4">
              <BarChart3 className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-lg font-semibold">
                No activity in this timeframe
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                There's no data to display for the selected time range. Try
                adjusting your filters or selecting a different period.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeRange("all")}
                className="gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                View All Time
              </Button>
              {timeRange !== "30d" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeRange("30d")}
                >
                  Last 30 Days
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <AreaChart accessibilityLayer data={filteredData}>
              <defs>
                {profiles.map((profile, index) => {
                  const color = getProfileColor(index);
                  return (
                    <linearGradient
                      key={profile.tinderId}
                      id={`fill-${profile.tinderId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="periodDisplay"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />

              {/* Render an Area for each profile */}
              {profiles.map((profile, index) => {
                if (!visibleProfiles.has(profile.tinderId)) return null;

                const color = getProfileColor(index);
                return (
                  <Area
                    key={profile.tinderId}
                    type="monotone"
                    dataKey={profile.tinderId}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#fill-${profile.tinderId})`}
                    fillOpacity={0.4}
                  />
                );
              })}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
