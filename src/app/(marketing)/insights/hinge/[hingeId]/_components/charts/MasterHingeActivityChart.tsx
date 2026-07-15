"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDays, format, subYears } from "date-fns";
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
import { Controller, FormProvider, Field } from "@/components/ui/form-new";
import type { DateRange } from "react-day-picker";
import { useHingeInsights } from "../../HingeInsightsProvider";
import { GranularitySelector } from "../../../../tinder/[tinderId]/_components/charts/GranularitySelector";
import { AddEventDialog } from "@/app/app/events/AddEventDialog";
import {
  aggregateHingeData,
  alignHingeInteractionsToComparisonPeriod,
  alignHingeMatchesToComparisonPeriod,
  calculateInclusiveHingeDateRange,
  calculatePreviousPeriod,
  fillHingePeriodRange,
  filterHingeInteractionsByDateRange,
  filterMatchesByDateRange,
  getHingePeriodDisplay,
  getHingePeriodKey,
  getHingeUtcSelectionDate,
  type AggregatedHingeData,
} from "@/lib/utils/aggregateHingeData";

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
  switch (preset) {
    case "7d":
      return calculateInclusiveHingeDateRange(7, now);
    case "30d":
      return calculateInclusiveHingeDateRange(30, now);
    case "90d":
      return calculateInclusiveHingeDateRange(90, now);
    case "1y": {
      const to = getHingeUtcSelectionDate(now);
      return { from: addDays(subYears(to, 1), 1), to };
    }
    default:
      return undefined;
  }
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

// Hinge brand colors - purple/pink theme
const chartConfig = {
  matches: {
    label: "Matches",
    color: "hsl(4, 90%, 58%)",
  },
  likes: {
    label: "Likes",
    color: "hsl(270, 70%, 60%)",
  },
  rejects: {
    label: "Removes",
    color: "hsl(0, 70%, 50%)",
  },
  messagesSent: {
    label: "Messages Sent",
    color: "hsl(168, 76%, 42%)",
  },
} satisfies ChartConfig;

interface HingeTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    payload?: AggregatedHingeData;
  }>;
  visibleMetrics: Set<string>;
}

function HingeTooltipContent({
  active,
  payload,
  visibleMetrics,
}: HingeTooltipContentProps) {
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
        {visibleMetrics.has("rejects") && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: chartConfig.rejects.color }}
              />
              <span className="text-sm">{chartConfig.rejects.label}</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {data.rejects}
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
      </div>
    </div>
  );
}

export function MasterHingeActivityChart() {
  const { profile, interactions, events, readonly } = useHingeInsights();
  const [visibleMetrics, setVisibleMetrics] = React.useState<Set<string>>(
    new Set(["matches", "likes", "messagesSent"]),
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

  // Get matches from profile
  const matches = profile?.matches ?? [];

  // Aggregate current period data
  const currentData = React.useMemo(() => {
    if (!matches.length && !interactions.length) return [];

    const toDate = dateRange?.to ?? dateRange?.from ?? new Date();
    const fromDate = dateRange?.from ?? new Date(0);

    const filteredMatches = dateRange?.from
      ? filterMatchesByDateRange(matches, fromDate, toDate)
      : matches;
    const filteredInteractions = dateRange?.from
      ? filterHingeInteractionsByDateRange(interactions, fromDate, toDate)
      : interactions;

    const aggregated = aggregateHingeData(
      filteredMatches,
      filteredInteractions,
      granularity,
    );

    return dateRange?.from
      ? fillHingePeriodRange(aggregated, granularity, fromDate, toDate)
      : aggregated;
  }, [matches, interactions, granularity, dateRange]);

  // Aggregate previous period data
  const previousData = React.useMemo(() => {
    if (
      !showPreviousPeriod ||
      !dateRange?.from ||
      (!matches.length && !interactions.length)
    ) {
      return [];
    }

    const toDate = dateRange.to ?? dateRange.from;
    const previousPeriod = calculatePreviousPeriod(dateRange.from, toDate);

    const filteredMatches = filterMatchesByDateRange(
      matches,
      previousPeriod.from,
      previousPeriod.to,
    );
    const filteredInteractions = filterHingeInteractionsByDateRange(
      interactions,
      previousPeriod.from,
      previousPeriod.to,
    );

    const aggregated = aggregateHingeData(
      alignHingeMatchesToComparisonPeriod(
        filteredMatches,
        previousPeriod.from,
        dateRange.from,
      ),
      alignHingeInteractionsToComparisonPeriod(
        filteredInteractions,
        previousPeriod.from,
        dateRange.from,
      ),
      granularity,
    );

    return fillHingePeriodRange(
      aggregated,
      granularity,
      dateRange.from,
      toDate,
    );
  }, [matches, interactions, granularity, dateRange, showPreviousPeriod]);

  // Helper to convert event date to period display format
  const dateToPeriodDisplay = React.useCallback(
    (date: Date): string => getHingePeriodDisplay(date, granularity),
    [granularity],
  );

  // Helper to convert event date to period key (matches chartData period values)
  const dateToPeriodKey = React.useCallback(
    (date: Date): string => getHingePeriodKey(date, granularity),
    [granularity],
  );

  // Merge current and previous data for chart
  const chartData = React.useMemo(() => {
    const periodMap = new Map<
      string,
      AggregatedHingeData & { prev?: AggregatedHingeData }
    >();

    const previousByPeriod = new Map(
      previousData.map((item) => [item.period, item]),
    );

    currentData.forEach((item) => {
      periodMap.set(item.period, {
        ...item,
        prev: previousByPeriod.get(item.period),
      });
    });

    previousData.forEach((item) => {
      if (periodMap.has(item.period)) return;
      periodMap.set(item.period, {
        period: item.period,
        periodDisplay: item.periodDisplay,
        matches: 0,
        likes: 0,
        rejects: 0,
        messagesSent: 0,
        totalMessages: 0,
        conversationsStarted: 0,
        prev: item,
      });
    });

    const currentPeriodKeys = Array.from(periodMap.keys()).sort();
    const firstCurrentPeriod = currentPeriodKeys[0];
    const lastCurrentPeriod = currentPeriodKeys.at(-1);
    const fallsInsideCurrentPeriod = (key: string | null): key is string =>
      key !== null &&
      firstCurrentPeriod !== undefined &&
      lastCurrentPeriod !== undefined &&
      key >= firstCurrentPeriod &&
      key <= lastCurrentPeriod;

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
        fallsInsideCurrentPeriod(startPeriodKey) &&
        startPeriodDisplay &&
        !periodMap.has(startPeriodKey)
      ) {
        periodMap.set(startPeriodKey, {
          period: startPeriodKey,
          periodDisplay: startPeriodDisplay,
          matches: 0,
          likes: 0,
          rejects: 0,
          messagesSent: 0,
          totalMessages: 0,
          conversationsStarted: 0,
        });
      }

      // Add end period if missing
      if (
        fallsInsideCurrentPeriod(endPeriodKey) &&
        endPeriodDisplay &&
        !periodMap.has(endPeriodKey)
      ) {
        periodMap.set(endPeriodKey, {
          period: endPeriodKey,
          periodDisplay: endPeriodDisplay,
          matches: 0,
          likes: 0,
          rejects: 0,
          messagesSent: 0,
          totalMessages: 0,
          conversationsStarted: 0,
        });
      }
    });

    return Array.from(periodMap.values())
      .map((item) => ({
        ...item,
        prevMatches: item.prev?.matches ?? 0,
        prevLikes: item.prev?.likes ?? 0,
        prevRejects: item.prev?.rejects ?? 0,
        prevMessagesSent: item.prev?.messagesSent ?? 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [currentData, previousData, events, dateToPeriodDisplay, dateToPeriodKey]);

  const periodLabelMap = React.useMemo(
    () => new Map(chartData.map((item) => [item.period, item.periodDisplay])),
    [chartData],
  );

  // Calculate period totals for metric cards
  const periodTotals = React.useMemo(() => {
    return currentData.reduce(
      (acc, item) => ({
        matches: acc.matches + item.matches,
        likes: acc.likes + item.likes,
        rejects: acc.rejects + item.rejects,
        messagesSent: acc.messagesSent + item.messagesSent,
      }),
      {
        matches: 0,
        likes: 0,
        rejects: 0,
        messagesSent: 0,
      },
    );
  }, [currentData]);

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

  // Filter and format events for the current date range
  const visibleEvents = React.useMemo(() => {
    if (!events.length || !chartData.length) return [];

    const firstDataPoint = chartData[0];
    const lastDataPoint = chartData[chartData.length - 1];

    if (!firstDataPoint || !lastDataPoint) return [];

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

        const eventEndPeriod = event.endPeriodKey ?? event.startPeriodKey;
        return (
          event.startPeriodKey <= lastDataPoint.period &&
          eventEndPeriod >= firstDataPoint.period
        );
      });

    return mappedEvents;
  }, [events, chartData, dateToPeriodKey]);

  if (!matches?.length && !interactions.length) {
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
    <>
      <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                Hinge Activity
              </CardTitle>
              <CardDescription>
                {granularity.charAt(0).toUpperCase() + granularity.slice(1)}{" "}
                matches, likes, removes, and messages
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <FormProvider {...form}>
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
                  <Controller
                    control={form.control}
                    name="granularity"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <GranularitySelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </Field>
                    )}
                  />

                  {/* Time Range */}
                  <Controller
                    control={form.control}
                    name="timeRange"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            className="w-[140px]"
                          >
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 3 months</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                            <SelectItem value="custom">Custom range</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  {/* Custom Date Range - Only visible when custom is selected */}
                  {timeRange === "custom" && (
                    <Controller
                      control={form.control}
                      name="dateRange"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                id={field.name}
                                aria-invalid={fieldState.invalid}
                                className={cn(
                                  "w-[240px] justify-start pl-3 text-left font-normal",
                                  !field.value?.from && "text-muted-foreground",
                                )}
                              >
                                {formatDateRange(field.value)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
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
                        </Field>
                      )}
                    />
                  )}
                </div>
              </FormProvider>
            </div>
          </div>

          {/* Previous Period Toggle */}
          {dateRange?.from && (
            <FormProvider {...form}>
              <Controller
                control={form.control}
                name="showPreviousPeriod"
                render={({ field, fieldState }) => (
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <Switch
                      id={field.name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    <Label htmlFor={field.name} className="cursor-pointer">
                      Compare with previous period
                    </Label>
                  </Field>
                )}
              />
            </FormProvider>
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
                  tickFormatter={(value: string) =>
                    periodLabelMap.get(value) ?? value
                  }
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={
                    <HingeTooltipContent visibleMetrics={visibleMetrics} />
                  }
                />

                {/* Current Period - Bars for Messages Sent */}
                {visibleMetrics.has("messagesSent") && (
                  <Bar
                    dataKey="messagesSent"
                    stackId="messages"
                    fill="var(--color-messagesSent)"
                    radius={[4, 4, 0, 0]}
                  />
                )}

                {/* Current Period - Lines for Matches and Likes */}
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
                {visibleMetrics.has("rejects") && (
                  <Line
                    dataKey="rejects"
                    type="monotone"
                    stroke="var(--color-rejects)"
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
                {showPreviousPeriod && visibleMetrics.has("likes") && (
                  <Line
                    dataKey="prevLikes"
                    type="monotone"
                    stroke="var(--color-likes)"
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {showPreviousPeriod && visibleMetrics.has("rejects") && (
                  <Line
                    dataKey="prevRejects"
                    type="monotone"
                    stroke="var(--color-rejects)"
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
