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
import { X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useTinderProfile } from "../../TinderProfileProvider";
import { useComparison } from "../../ComparisonProvider";
import { GranularitySelector } from "./GranularitySelector";
import { ComparisonDialog } from "../../compare/_components/ComparisonDialog";
import {
  aggregateUsageData,
  type TimeGranularity,
  type AggregatedUsageData,
} from "@/lib/utils/aggregateUsage";
import {
  getProfileColor,
  getProfileLabel,
} from "../../compare/utils/profileColors";

// Semantic color palette for metrics
const METRIC_COLORS = {
  matches: "hsl(4, 90%, 58%)", // Warm coral-red
  swipeLikes: "hsl(168, 76%, 42%)", // Vibrant teal
  swipePasses: "hsl(45, 93%, 58%)", // Soft amber
  appOpens: "hsl(245, 58%, 51%)", // Deep indigo
} as const;

const METRIC_LABELS = {
  matches: "Matches",
  swipeLikes: "Right Swipes",
  swipePasses: "Left Swipes",
  appOpens: "App Opens",
} as const;

type MetricKey = keyof typeof METRIC_LABELS;

export function SwipeComparisonChart() {
  const { profile, usage, tinderId, events } = useTinderProfile();
  const { comparisonProfiles, pendingProfileIds, removeComparisonId } =
    useComparison();
  // Main profile needs usage attached (comparison profiles already have it from getWithUsage)
  const profileWithUsage = { ...profile, usage };
  const profiles = [profileWithUsage, ...comparisonProfiles];

  const [timeRange, setTimeRange] = React.useState("all");
  const [granularity, setGranularity] =
    React.useState<TimeGranularity>("weekly");
  const [visibleMetrics, setVisibleMetrics] = React.useState<Set<MetricKey>>(
    new Set(["matches", "swipeLikes", "swipePasses"]),
  );
  // Track HIDDEN profiles instead - this way all profiles are visible by default
  const [hiddenProfileIds, setHiddenProfileIds] = React.useState<Set<string>>(
    new Set(),
  );

  // Compute visible profiles from profiles minus hidden
  const visibleProfileIds = React.useMemo(() => {
    const visible = new Set<string>();
    profiles.forEach((p) => {
      if (!hiddenProfileIds.has(p.tinderId)) {
        visible.add(p.tinderId);
      }
    });
    return visible;
  }, [profiles, hiddenProfileIds]);

  // Aggregate data for each profile
  const profileDataMap = React.useMemo(() => {
    const map = new Map<string, AggregatedUsageData[]>();

    profiles.forEach((profile) => {
      if (!profile.usage?.length) {
        map.set(profile.tinderId, []);
        return;
      }

      let data = aggregateUsageData(profile.usage, granularity);

      // Filter by time range
      if (timeRange !== "all") {
        const now = new Date();
        let daysToSubtract = 90;
        if (timeRange === "30d") daysToSubtract = 30;
        else if (timeRange === "7d") daysToSubtract = 7;
        else if (timeRange === "1y") daysToSubtract = 365;

        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysToSubtract);

        data = data.filter((item) => {
          const itemDate = parsePeriodToDate(item.period);
          return itemDate >= startDate;
        });
      }

      map.set(profile.tinderId, data);
    });

    return map;
  }, [profiles, granularity, timeRange]);

  // Merge all profile data into unified chart data
  const mergedData = React.useMemo(() => {
    // Collect all unique periods
    const periodSet = new Set<string>();
    const periodDisplayMap = new Map<string, string>();

    profileDataMap.forEach((data) => {
      data.forEach((item) => {
        periodSet.add(item.period);
        periodDisplayMap.set(item.period, item.periodDisplay);
      });
    });

    const sortedPeriods = Array.from(periodSet).sort();

    return sortedPeriods.map((period) => {
      const point: Record<string, string | number> = {
        period,
        periodDisplay: periodDisplayMap.get(period) ?? period,
      };

      profiles.forEach((profile, idx) => {
        const profileData = profileDataMap.get(profile.tinderId) ?? [];
        const dataPoint = profileData.find((d) => d.period === period);
        const suffix = profile.tinderId === tinderId ? "you" : `p${idx}`;

        // Add all metrics for this profile
        point[`matches_${suffix}`] = dataPoint?.matches ?? 0;
        point[`swipeLikes_${suffix}`] = dataPoint?.swipeLikes ?? 0;
        point[`swipePasses_${suffix}`] = dataPoint?.swipePasses ?? 0;
        point[`appOpens_${suffix}`] = dataPoint?.appOpens ?? 0;
      });

      return point;
    });
  }, [profileDataMap, profiles, tinderId]);

  // Calculate totals per profile
  const profileTotals = React.useMemo(() => {
    const totals = new Map<string, Record<MetricKey, number>>();

    profiles.forEach((profile, idx) => {
      const suffix = profile.tinderId === tinderId ? "you" : `p${idx}`;
      const profileTotal: Record<MetricKey, number> = {
        matches: 0,
        swipeLikes: 0,
        swipePasses: 0,
        appOpens: 0,
      };

      mergedData.forEach((point) => {
        profileTotal.matches += (point[`matches_${suffix}`] as number) ?? 0;
        profileTotal.swipeLikes +=
          (point[`swipeLikes_${suffix}`] as number) ?? 0;
        profileTotal.swipePasses +=
          (point[`swipePasses_${suffix}`] as number) ?? 0;
        profileTotal.appOpens += (point[`appOpens_${suffix}`] as number) ?? 0;
      });

      totals.set(profile.tinderId, profileTotal);
    });

    return totals;
  }, [profiles, mergedData, tinderId]);

  // Generate chart config
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    profiles.forEach((profile, idx) => {
      const suffix = profile.tinderId === tinderId ? "you" : `p${idx}`;
      const label = getProfileLabel(profile.tinderId, tinderId ?? "", idx);
      const color = getProfileColor(idx);

      (
        ["matches", "swipeLikes", "swipePasses", "appOpens"] as MetricKey[]
      ).forEach((metric) => {
        config[`${metric}_${suffix}`] = {
          label: `${label} - ${METRIC_LABELS[metric]}`,
          color,
        };
      });
    });

    return config;
  }, [profiles, tinderId]);

  // Event overlays
  const visibleEvents = React.useMemo(() => {
    if (!events.length || !mergedData.length) return [];

    return events
      .map((event) => ({
        ...event,
        startPeriodDisplay: dateToPeriodDisplay(
          new Date(event.startDate),
          granularity,
        ),
        endPeriodDisplay: event.endDate
          ? dateToPeriodDisplay(new Date(event.endDate), granularity)
          : null,
      }))
      .filter((event) => event.startPeriodDisplay !== null);
  }, [events, mergedData, granularity]);

  const toggleMetric = (metric: MetricKey) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        if (next.size > 1) next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  const toggleProfile = (tinderId: string) => {
    if (tinderId === tinderId) return; // Can't hide your own profile
    setHiddenProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(tinderId)) {
        // Currently hidden, show it
        next.delete(tinderId);
      } else {
        // Currently visible, hide it (but keep at least one visible)
        if (visibleProfileIds.size > 1) {
          next.add(tinderId);
        }
      }
      return next;
    });
  };

  const handleRemoveProfile = (e: React.MouseEvent, tinderId: string) => {
    e.stopPropagation();
    if (tinderId === tinderId) return;
    removeComparisonId(tinderId);
  };

  // Debug logging
  console.log("SwipeComparisonChart DEBUG:", {
    profilesCount: profiles.length,
    tinderId,
    visibleProfileIds: Array.from(visibleProfileIds),
    hiddenProfileIds: Array.from(hiddenProfileIds),
    mergedDataLength: mergedData.length,
    firstDataPoint: mergedData[0],
    visibleMetrics: Array.from(visibleMetrics),
  });

  if (!usage?.length) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Swipe Activity Comparison</CardTitle>
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
              Swipe Activity Comparison
            </CardTitle>
            <CardDescription>
              {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
              matches and swipes with multi-profile comparison
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <GranularitySelector
              value={granularity}
              onChange={setGranularity}
            />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="w-[140px]"
                aria-label="Select time range"
              >
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Profile Comparison Pills */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Profile Comparison:</Label>
          <div className="flex flex-wrap gap-2">
            {profiles.map((profile, index) => {
              const isVisible = visibleProfileIds.has(profile.tinderId);
              const color = getProfileColor(index);
              const label = getProfileLabel(
                profile.tinderId,
                tinderId ?? "",
                index,
              );
              const totals = profileTotals.get(profile.tinderId);
              const totalMatches = totals?.matches ?? 0;
              const isMyProfile = profile.tinderId === tinderId;

              return (
                <div
                  key={profile.tinderId}
                  onClick={() => toggleProfile(profile.tinderId)}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                    isVisible
                      ? "text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                    isMyProfile ? "cursor-default" : "cursor-pointer",
                  )}
                  style={isVisible ? { backgroundColor: color } : undefined}
                >
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      isVisible && "border-2 border-white/40",
                    )}
                    style={{ backgroundColor: isVisible ? "white" : color }}
                  />
                  <span>{label}</span>
                  <span className="tabular-nums">
                    {totalMatches.toLocaleString()}
                  </span>
                  {!isMyProfile && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveProfile(e, profile.tinderId)}
                      className={cn(
                        "ml-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                        isVisible
                          ? "hover:bg-white/20"
                          : "hover:bg-muted-foreground/20",
                      )}
                      aria-label={`Remove ${label} from comparison`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Pending profiles */}
            {pendingProfileIds.map((tinderId, idx) => {
              const index = profiles.length + idx;
              const color = getProfileColor(index);
              const label = getProfileLabel(tinderId, tinderId ?? "", index);

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

            <ComparisonDialog />
          </div>
        </div>

        {/* Metric Toggle Pills */}
        <div className="flex flex-wrap gap-2">
          {(
            ["matches", "swipeLikes", "swipePasses", "appOpens"] as MetricKey[]
          ).map((key) => {
            const isVisible = visibleMetrics.has(key);
            const myTotals = profileTotals.get(tinderId ?? "");
            const total = myTotals?.[key] ?? 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleMetric(key)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  isVisible
                    ? "text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                style={
                  isVisible
                    ? { backgroundColor: METRIC_COLORS[key] }
                    : undefined
                }
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    isVisible && "border-2 border-white/40",
                  )}
                  style={{
                    backgroundColor: isVisible ? "white" : METRIC_COLORS[key],
                  }}
                />
                <span>{METRIC_LABELS[key]}</span>
                <span className="tabular-nums">{total.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[400px] w-full"
        >
          <ComposedChart
            accessibilityLayer
            data={mergedData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
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
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-2 font-medium">{label}</p>
                    {payload.map(
                      (
                        entry: {
                          color?: string;
                          name?: string;
                          value?: number | string;
                        },
                        i,
                      ) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">
                            {entry.name}:
                          </span>
                          <span className="font-medium">{entry.value}</span>
                        </div>
                      ),
                    )}
                  </div>
                );
              }}
            />

            {/* Render for each visible profile */}
            {profiles.map((profile, idx) => {
              const isVisible = visibleProfileIds.has(profile.tinderId);
              console.log(`Chart render profile ${idx}:`, {
                tinderId: profile.tinderId.slice(0, 8),
                isVisible,
                suffix: profile.tinderId === tinderId ? "you" : `p${idx}`,
              });

              if (!isVisible) return null;

              const suffix = profile.tinderId === tinderId ? "you" : `p${idx}`;
              const color = getProfileColor(idx);

              return (
                <React.Fragment key={profile.tinderId}>
                  {/* Stacked bars for swipes */}
                  {visibleMetrics.has("swipeLikes") && (
                    <Bar
                      dataKey={`swipeLikes_${suffix}`}
                      stackId={`swipes_${profile.tinderId}`}
                      fill={color}
                      radius={[0, 0, 0, 0]}
                      name={`${getProfileLabel(profile.tinderId, tinderId ?? "", idx)} - Right Swipes`}
                    />
                  )}
                  {visibleMetrics.has("swipePasses") && (
                    <Bar
                      dataKey={`swipePasses_${suffix}`}
                      stackId={`swipes_${profile.tinderId}`}
                      fill={METRIC_COLORS.swipePasses}
                      fillOpacity={0.6}
                      radius={[4, 4, 0, 0]}
                      name={`${getProfileLabel(profile.tinderId, tinderId ?? "", idx)} - Left Swipes`}
                    />
                  )}

                  {/* Lines for matches */}
                  {visibleMetrics.has("matches") && (
                    <Line
                      dataKey={`matches_${suffix}`}
                      type="monotone"
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      name={`${getProfileLabel(profile.tinderId, tinderId ?? "", idx)} - Matches`}
                    />
                  )}

                  {/* Lines for app opens */}
                  {visibleMetrics.has("appOpens") && (
                    <Line
                      dataKey={`appOpens_${suffix}`}
                      type="monotone"
                      stroke={METRIC_COLORS.appOpens}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name={`${getProfileLabel(profile.tinderId, tinderId ?? "", idx)} - App Opens`}
                    />
                  )}
                </React.Fragment>
              );
            })}

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

// Helper: Parse period string to Date
function parsePeriodToDate(period: string): Date {
  if (period.includes("-W")) {
    // Weekly: "2024-W52"
    const [year, weekStr] = period.split("-W");
    const weekNum = parseInt(weekStr ?? "1", 10);
    const yearNum = parseInt(year ?? "2024", 10);
    return new Date(yearNum, 0, 1 + (weekNum - 1) * 7);
  } else if (period.includes("-Q")) {
    // Quarterly: "2024-Q1"
    const [year, quarterStr] = period.split("-Q");
    const quarter = parseInt(quarterStr ?? "1", 10);
    const yearNum = parseInt(year ?? "2024", 10);
    return new Date(yearNum, (quarter - 1) * 3, 1);
  } else if (period.length === 4) {
    // Yearly: "2024"
    return new Date(parseInt(period, 10), 0, 1);
  } else if (period.length === 7) {
    // Monthly: "2024-01"
    return new Date(period + "-01");
  } else {
    // Daily: "2024-01-15"
    return new Date(period);
  }
}

// Helper: Convert date to period display format
function dateToPeriodDisplay(
  date: Date,
  granularity: TimeGranularity,
): string | null {
  switch (granularity) {
    case "daily":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "weekly": {
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
}
