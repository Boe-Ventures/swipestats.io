"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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
import {
  CalendarIcon,
  Plus,
  BarChart3,
  Calendar as CalendarIconOutline,
} from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import type { DateRange } from "react-day-picker";
import { useTinderProfile } from "../../TinderProfileProvider";
import { SwipeStatsTooltipContent } from "./SwipeStatsTooltipContent";
import { GranularitySelector } from "./GranularitySelector";
import { AddEventDialog } from "@/app/app/events/AddEventDialog";
import {
  aggregateUsageData,
  filterUsageByDateRange,
  calculatePreviousPeriod,
  type TimeGranularity,
  type AggregatedUsageData,
} from "@/lib/utils/aggregateUsage";

// Form schema
const chartFormSchema = z.object({
  timeRange: z.enum(["7d", "30d", "90d", "1y", "all", "custom"]),
  dateRange: z
    .object({
      from: z.date(),
      to: z.date().optional(),
    })
    .optional(),
  granularity: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  showPreviousPeriod: z.boolean(),
});

type ChartFormValues = z.infer<typeof chartFormSchema>;

// Helper to calculate date range from preset
function calculateDateRangeFromPreset(
  preset: string,
): { from: Date; to: Date } | undefined {
  if (preset === "all" || preset === "custom") return undefined;

  const now = new Date();
  const from = new Date(now);

  switch (preset) {
    case "7d":
      from.setDate(now.getDate() - 7);
      break;
    case "30d":
      from.setDate(now.getDate() - 30);
      break;
    case "90d":
      from.setMonth(now.getMonth() - 3);
      break;
    case "1y":
      from.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { from, to: now };
}

// Helper to format date range for display
function formatDateRange(dateRange: DateRange | undefined): string {
  if (!dateRange?.from) {
    return "Select dates";
  }

  if (dateRange.to) {
    return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`;
  }

  return format(dateRange.from, "LLL dd, y");
}

// Semantic color palette for dating app metrics
const chartConfig = {
  matches: {
    label: "Matches",
    color: "hsl(4, 90%, 58%)",
  },
  swipeLikes: {
    label: "Right Swipes",
    color: "hsl(168, 76%, 42%)",
  },
  swipePasses: {
    label: "Left Swipes",
    color: "hsl(45, 93%, 58%)",
  },
  appOpens: {
    label: "App Opens",
    color: "hsl(245, 58%, 51%)",
  },
  messagesSent: {
    label: "Messages Sent",
    color: "hsl(142, 71%, 45%)",
  },
  messagesReceived: {
    label: "Messages Received",
    color: "hsl(217, 91%, 60%)",
  },
} satisfies ChartConfig;

export function MasterActivityChart() {
  const { profile, usage, tinderId, events, readonly } = useTinderProfile();
  const [visibleMetrics, setVisibleMetrics] = React.useState<Set<string>>(
    new Set(["matches", "swipeLikes"]),
  );
  const [eventDialogOpen, setEventDialogOpen] = React.useState(false);

  const form = useForm<ChartFormValues>({
    resolver: zodResolver(chartFormSchema),
    defaultValues: {
      timeRange: "all",
      dateRange: undefined,
      granularity: "monthly",
      showPreviousPeriod: false,
    },
  });

  const timeRange = form.watch("timeRange");
  const dateRange = form.watch("dateRange");
  const granularity = form.watch("granularity");
  const showPreviousPeriod = form.watch("showPreviousPeriod");

  // Handle timeRange changes to update dateRange automatically
  React.useEffect(() => {
    if (timeRange === "custom") {
      return; // Don't override dateRange when custom is selected
    }

    const calculatedRange = calculateDateRangeFromPreset(timeRange);
    form.setValue("dateRange", calculatedRange);
  }, [timeRange, form]);

  // Aggregate current period data
  const currentData = React.useMemo(() => {
    if (!usage?.length) return [];

    const toDate = dateRange?.to ?? dateRange?.from ?? new Date();
    const fromDate = dateRange?.from ?? new Date(0);

    const filtered = dateRange?.from
      ? filterUsageByDateRange(usage, fromDate, toDate)
      : usage;

    return aggregateUsageData(filtered, granularity);
  }, [usage, granularity, dateRange]);

  // Aggregate previous period data
  const previousData = React.useMemo(() => {
    if (!showPreviousPeriod || !dateRange?.from || !usage?.length) {
      return [];
    }

    const toDate = dateRange.to ?? dateRange.from;
    const previousPeriod = calculatePreviousPeriod(dateRange.from, toDate);

    const filtered = filterUsageByDateRange(
      usage,
      previousPeriod.from,
      previousPeriod.to,
    );

    return aggregateUsageData(filtered, granularity);
  }, [usage, granularity, dateRange, showPreviousPeriod]);

  // Helper to convert event date to period display format
  const dateToPeriodDisplay = React.useCallback(
    (date: Date): string | null => {
      switch (granularity) {
        case "daily":
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        case "weekly": {
          const dayOfWeek = date.getDay();
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - dayOfWeek);
          return `Week of ${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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

  // Helper to convert event date to period key (matches chartData period values)
  const dateToPeriodKey = React.useCallback(
    (date: Date): string | null => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      switch (granularity) {
        case "daily":
          return `${year}-${month}-${day}`;
        case "weekly": {
          const startOfYear = new Date(year, 0, 1);
          const dayOfYear = Math.floor(
            (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
          );
          const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
          return `${year}-W${String(weekNum).padStart(2, "0")}`;
        }
        case "monthly":
          return `${year}-${month}`;
        case "quarterly": {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${year}-Q${quarter}`;
        }
        case "yearly":
          return `${year}`;
        default:
          return null;
      }
    },
    [granularity],
  );

  // Merge current and previous data for chart
  const chartData = React.useMemo(() => {
    const periodMap = new Map<
      string,
      AggregatedUsageData & { prev?: AggregatedUsageData }
    >();

    // Add current period data
    currentData.forEach((item) => {
      periodMap.set(item.period, { ...item });
    });

    // Add previous period data
    previousData.forEach((item) => {
      const existing = periodMap.get(item.period);
      if (existing) {
        existing.prev = item;
      } else {
        // Previous period might have periods not in current period
        periodMap.set(item.period, { ...item, prev: item });
      }
    });

    // Add placeholder periods for events that fall outside existing data
    // This allows Recharts to position reference lines/areas correctly
    events.forEach((event) => {
      const startDate = new Date(event.startDate);
      const endDate = event.endDate ? new Date(event.endDate) : null;

      const startPeriodKey = dateToPeriodKey(startDate);
      const endPeriodKey = endDate ? dateToPeriodKey(endDate) : null;
      const startPeriodDisplay = dateToPeriodDisplay(startDate);
      const endPeriodDisplay = endDate ? dateToPeriodDisplay(endDate) : null;

      // Add start period if missing
      if (
        startPeriodKey &&
        startPeriodDisplay &&
        !periodMap.has(startPeriodKey)
      ) {
        periodMap.set(startPeriodKey, {
          period: startPeriodKey,
          periodDisplay: startPeriodDisplay,
          matches: 0,
          swipeLikes: 0,
          swipePasses: 0,
          appOpens: 0,
          messagesSent: 0,
          messagesReceived: 0,
          swipesCombined: 0,
          matchRate: 0,
          likeRatio: 0,
        });
      }

      // Add end period if missing
      if (endPeriodKey && endPeriodDisplay && !periodMap.has(endPeriodKey)) {
        periodMap.set(endPeriodKey, {
          period: endPeriodKey,
          periodDisplay: endPeriodDisplay,
          matches: 0,
          swipeLikes: 0,
          swipePasses: 0,
          appOpens: 0,
          messagesSent: 0,
          messagesReceived: 0,
          swipesCombined: 0,
          matchRate: 0,
          likeRatio: 0,
        });
      }
    });

    return Array.from(periodMap.values())
      .map((item) => ({
        ...item,
        prevMatches: item.prev?.matches ?? 0,
        prevSwipeLikes: item.prev?.swipeLikes ?? 0,
        prevSwipePasses: item.prev?.swipePasses ?? 0,
        prevAppOpens: item.prev?.appOpens ?? 0,
        prevMessagesSent: item.prev?.messagesSent ?? 0,
        prevMessagesReceived: item.prev?.messagesReceived ?? 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [currentData, previousData, events, dateToPeriodDisplay, dateToPeriodKey]);

  const periodLabelMap = React.useMemo(
    () => new Map(chartData.map((item) => [item.period, item.periodDisplay])),
    [chartData],
  );

  // Calculate period totals for metric cards
  const periodTotals = React.useMemo(() => {
    return chartData.reduce(
      (acc, item) => ({
        matches: acc.matches + item.matches,
        swipeLikes: acc.swipeLikes + item.swipeLikes,
        swipePasses: acc.swipePasses + item.swipePasses,
        appOpens: acc.appOpens + item.appOpens,
        messagesSent: acc.messagesSent + item.messagesSent,
        messagesReceived: acc.messagesReceived + item.messagesReceived,
      }),
      {
        matches: 0,
        swipeLikes: 0,
        swipePasses: 0,
        appOpens: 0,
        messagesSent: 0,
        messagesReceived: 0,
      },
    );
  }, [chartData]);

  const toggleMetric = (metric: string) => {
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

  // Helper to parse period display back to date (for date range filtering)
  const parsePeriodDisplay = React.useCallback(
    (periodDisplay: string, granularity: TimeGranularity): Date | null => {
      try {
        switch (granularity) {
          case "daily":
            return new Date(periodDisplay);
          case "weekly": {
            // "Week of Jan 1, 2024" -> extract date
            const match = /Week of (.+)/.exec(periodDisplay);
            return match?.[1] ? new Date(match[1]) : null;
          }
          case "monthly":
            // "Jan 2024" -> convert to first day of month
            return new Date(periodDisplay + " 1");
          case "quarterly": {
            // "2024 Q1" -> convert to first day of quarter
            const [year, quarter] = periodDisplay.split(" Q");
            if (!year || !quarter) return null;
            const month = (parseInt(quarter) - 1) * 3;
            return new Date(parseInt(year), month, 1);
          }
          case "yearly":
            // "2024" -> convert to first day of year
            return new Date(parseInt(periodDisplay), 0, 1);
          default:
            return null;
        }
      } catch {
        return null;
      }
    },
    [],
  );

  // Filter and format events for the current date range
  const visibleEvents = React.useMemo(() => {
    if (!events.length || !chartData.length) return [];

    const firstDataPoint = chartData[0];
    const lastDataPoint = chartData[chartData.length - 1];

    if (!firstDataPoint || !lastDataPoint) return [];

    const firstDataDate = parsePeriodDisplay(
      firstDataPoint.periodDisplay,
      granularity,
    );
    const lastDataDate = parsePeriodDisplay(
      lastDataPoint.periodDisplay,
      granularity,
    );

    if (!firstDataDate || !lastDataDate) return [];

    const mappedEvents = events
      .map((event) => {
        const startDate = new Date(event.startDate);
        const endDate = event.endDate ? new Date(event.endDate) : null;

        const startPeriodKey = dateToPeriodKey(startDate);
        const endPeriodKey = endDate ? dateToPeriodKey(endDate) : null;

        return {
          ...event,
          startPeriodKey,
          endPeriodKey,
        };
      })
      .filter((event) => {
        // Only show events that have a valid start period
        if (!event.startPeriodKey) return false;

        // Check if event overlaps with visible data range
        const eventStartDate = new Date(event.startDate);
        const eventEndDate = event.endDate
          ? new Date(event.endDate)
          : eventStartDate;

        // Event must overlap with data range
        // Event overlaps if: event_start <= data_end AND event_end >= data_start
        return eventStartDate <= lastDataDate && eventEndDate >= firstDataDate;
      });

    return mappedEvents;
  }, [events, chartData, dateToPeriodKey, granularity, parsePeriodDisplay]);

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
    <>
      <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                Swipe Activity
              </CardTitle>
              <CardDescription>
                {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
                matches, swipes, app opens, and messages
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Form {...form}>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Add Event Button (only when not readonly) */}
                  {!readonly && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEventDialogOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Event
                    </Button>
                  )}

                  {/* Granularity */}
                  <FormField
                    control={form.control}
                    name="granularity"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <GranularitySelector
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Time Range */}
                  <FormField
                    control={form.control}
                    name="timeRange"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 3 months</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                            <SelectItem value="custom">Custom range</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Custom Date Range - Only visible when custom is selected */}
                  {timeRange === "custom" && (
                    <FormField
                      control={form.control}
                      name="dateRange"
                      render={({ field }) => (
                        <FormItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-[240px] justify-start pl-3 text-left font-normal",
                                    !field.value?.from &&
                                      "text-muted-foreground",
                                  )}
                                >
                                  {formatDateRange(field.value)}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="range"
                                defaultMonth={field.value?.from}
                                selected={field.value}
                                onSelect={field.onChange}
                                numberOfMonths={2}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </Form>
            </div>
          </div>

          {/* Previous Period Toggle */}
          {dateRange?.from && (
            <Form {...form}>
              <FormField
                control={form.control}
                name="showPreviousPeriod"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="show-previous"
                        />
                      </FormControl>
                      <Label htmlFor="show-previous" className="cursor-pointer">
                        Compare with previous period
                      </Label>
                    </div>
                  </FormItem>
                )}
              />
            </Form>
          )}

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

        <CardContent className="px-6 pt-6 pr-6">
          {chartData.length === 0 ? (
            // Empty State
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
              <div className="bg-muted rounded-full p-4">
                <BarChart3 className="text-muted-foreground h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-lg font-semibold">
                  No activity in this timeframe
                </h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                  There&apos;s no data to display for the selected time range.
                  Try adjusting your filters or selecting a different period.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue("timeRange", "all")}
                  className="gap-2"
                >
                  <CalendarIconOutline className="h-4 w-4" />
                  View All Time
                </Button>
                {timeRange !== "30d" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue("timeRange", "30d")}
                  >
                    Last 30 Days
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[400px] w-full"
            >
              <ComposedChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => periodLabelMap.get(value) ?? value}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={
                    <SwipeStatsTooltipContent visibleMetrics={visibleMetrics} />
                  }
                />

                {/* Current Period - Stacked Bars */}
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

                {/* Current Period - Lines */}
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
                {visibleMetrics.has("messagesSent") && (
                  <Line
                    dataKey="messagesSent"
                    type="monotone"
                    stroke="var(--color-messagesSent)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {visibleMetrics.has("messagesReceived") && (
                  <Line
                    dataKey="messagesReceived"
                    type="monotone"
                    stroke="var(--color-messagesReceived)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}

                {/* Previous Period - Dashed Lines */}
                {showPreviousPeriod && visibleMetrics.has("matches") && (
                  <Line
                    dataKey="prevMatches"
                    type="monotone"
                    stroke="var(--color-matches)"
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {showPreviousPeriod && visibleMetrics.has("swipeLikes") && (
                  <Line
                    dataKey="prevSwipeLikes"
                    type="monotone"
                    stroke="var(--color-swipeLikes)"
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {showPreviousPeriod && visibleMetrics.has("swipePasses") && (
                  <Line
                    dataKey="prevSwipePasses"
                    type="monotone"
                    stroke="var(--color-swipePasses)"
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {showPreviousPeriod && visibleMetrics.has("appOpens") && (
                  <Line
                    dataKey="prevAppOpens"
                    type="monotone"
                    stroke="var(--color-appOpens)"
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {showPreviousPeriod && visibleMetrics.has("messagesSent") && (
                  <Line
                    dataKey="prevMessagesSent"
                    type="monotone"
                    stroke="var(--color-messagesSent)"
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {showPreviousPeriod &&
                  visibleMetrics.has("messagesReceived") && (
                    <Line
                      dataKey="prevMessagesReceived"
                      type="monotone"
                      stroke="var(--color-messagesReceived)"
                      strokeWidth={2}
                      strokeOpacity={0.4}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}

                {/* Event Overlays */}
                {visibleEvents.map((event) => {
                  if (!event.startPeriodKey) return null;

                  if (
                    event.endPeriodKey &&
                    event.endPeriodKey !== event.startPeriodKey
                  ) {
                    return (
                      <ReferenceArea
                        key={event.id}
                        x1={event.startPeriodKey}
                        x2={event.endPeriodKey}
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
                        x={event.startPeriodKey}
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
          )}
        </CardContent>
      </Card>

      {/* Add Event Dialog */}
      {!readonly && (
        <AddEventDialog
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
        />
      )}
    </>
  );
}
