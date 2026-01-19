/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { ChartConfig } from "../chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { cn } from "../lib/utils";

export interface AreaChartDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface TimeRangeOption {
  label: string;
  value: string;
  days: number;
}

export interface AreaChartSeries {
  dataKey: string;
  label: string;
  color: string;
  fillOpacity?: number;
  strokeWidth?: number;
  type?: "monotone" | "linear" | "natural" | "step";
  stackId?: string;
}

export interface MyAreaChartProps {
  // Required props
  data: AreaChartDataPoint[];
  series: AreaChartSeries[];

  // Optional configuration
  title?: string;
  description?: string;
  className?: string;
  chartClassName?: string;

  // Chart dimensions
  height?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };

  // Time range filtering
  enableTimeFilter?: boolean;
  timeRangeOptions?: TimeRangeOption[];
  defaultTimeRange?: string;
  dateKey?: string;
  referenceDateForFiltering?: string;

  // Chart styling
  showGrid?: boolean;
  gridProps?: {
    vertical?: boolean;
    horizontal?: boolean;
    strokeDasharray?: string;
  };

  // Axis configuration
  xAxis?: {
    tickFormatter?: (value: any) => string;
    tickMargin?: number;
    minTickGap?: number;
    interval?:
      | number
      | "preserveStart"
      | "preserveEnd"
      | "preserveStartEnd"
      | "equidistantPreserveStart";
    hide?: boolean;
  };

  yAxis?: {
    tickFormatter?: (value: any) => string;
    tickMargin?: number;
    hide?: boolean;
  };

  // Tooltip and Legend
  showTooltip?: boolean;
  showLegend?: boolean;
  tooltipProps?: {
    labelFormatter?: (value: any, payload?: any[]) => React.ReactNode;
    formatter?: (
      value: any,
      name: any,
      item: any,
      index: number,
      payload: any,
    ) => React.ReactNode;
  };

  // Gradients
  enableGradients?: boolean;
  gradientOpacity?: {
    start: number;
    end: number;
  };

  // Card styling
  showCard?: boolean;
  cardProps?: {
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
  };

  // Event handlers
  onTimeRangeChange?: (timeRange: string) => void;
  onDataPointClick?: (
    data: any,
    event: React.SyntheticEvent<Element, Event>,
  ) => void;
}

const DEFAULT_TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
];

const DEFAULT_GRADIENT_OPACITY = { start: 0.8, end: 0.1 };

export function MyAreaChart({
  data,
  series,
  title,
  description,
  className,
  chartClassName,
  height = {
    mobile: "h-[250px]",
    tablet: "h-[350px]",
    desktop: "h-[400px]",
  },
  enableTimeFilter = false,
  timeRangeOptions = DEFAULT_TIME_RANGE_OPTIONS,
  defaultTimeRange = "90d",
  dateKey = "date",
  referenceDateForFiltering,
  showGrid = true,
  gridProps = { vertical: false },
  xAxis = {},
  yAxis = {},
  showTooltip = true,
  showLegend = true,
  tooltipProps = {},
  enableGradients = true,
  gradientOpacity = DEFAULT_GRADIENT_OPACITY,
  showCard = true,
  cardProps = {},
  onTimeRangeChange,
  onDataPointClick,
}: MyAreaChartProps) {
  const [timeRange, setTimeRange] = React.useState(defaultTimeRange);

  // Generate chart config from series
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    series.forEach((s) => {
      config[s.dataKey] = {
        label: s.label,
        color: s.color,
      };
    });
    return config;
  }, [series]);

  // Filter data based on time range
  const filteredData = React.useMemo(() => {
    if (!enableTimeFilter) return data;

    const selectedRange = timeRangeOptions.find(
      (option) => option.value === timeRange,
    );
    if (!selectedRange) return data;

    const referenceDate = referenceDateForFiltering
      ? new Date(referenceDateForFiltering)
      : new Date();

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - selectedRange.days);

    return data.filter((item) => {
      const date = new Date(item[dateKey] as string);
      return date >= startDate;
    });
  }, [
    data,
    timeRange,
    enableTimeFilter,
    timeRangeOptions,
    referenceDateForFiltering,
    dateKey,
  ]);

  // Handle time range change
  const handleTimeRangeChange = React.useCallback(
    (newTimeRange: string) => {
      setTimeRange(newTimeRange);
      onTimeRangeChange?.(newTimeRange);
    },
    [onTimeRangeChange],
  );

  // Default tick formatter for dates
  const defaultXAxisFormatter = React.useCallback((value: any) => {
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, []);

  // Build height classes
  const heightClasses = cn(
    height.mobile,
    height.tablet && `sm:${height.tablet}`,
    height.desktop && `lg:${height.desktop}`,
    "w-full",
  );

  const chartContent = (
    <ChartContainer
      config={chartConfig}
      className={cn(heightClasses, chartClassName)}
    >
      <AreaChart data={filteredData} onClick={onDataPointClick}>
        {enableGradients && (
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.dataKey}
                id={`fill${s.dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={s.color}
                  stopOpacity={gradientOpacity.start}
                />
                <stop
                  offset="95%"
                  stopColor={s.color}
                  stopOpacity={gradientOpacity.end}
                />
              </linearGradient>
            ))}
          </defs>
        )}

        {showGrid && (
          <CartesianGrid
            vertical={gridProps.vertical}
            horizontal={gridProps.horizontal}
            strokeDasharray={gridProps.strokeDasharray}
          />
        )}

        {!xAxis.hide && (
          <XAxis
            dataKey={dateKey}
            tickLine={false}
            axisLine={false}
            tickMargin={xAxis.tickMargin ?? 8}
            minTickGap={xAxis.minTickGap ?? 32}
            interval={xAxis.interval ?? "preserveStartEnd"}
            tickFormatter={xAxis.tickFormatter ?? defaultXAxisFormatter}
          />
        )}

        {!yAxis.hide && (
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={yAxis.tickMargin ?? 8}
            tickFormatter={yAxis.tickFormatter}
          />
        )}

        {showTooltip && (
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={
                  tooltipProps.labelFormatter ??
                  ((value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  })
                }
                formatter={tooltipProps.formatter}
                indicator="dot"
              />
            }
          />
        )}

        {series.map((s) => (
          <Area
            key={s.dataKey}
            dataKey={s.dataKey}
            type={s.type ?? "natural"}
            fill={enableGradients ? `url(#fill${s.dataKey})` : s.color}
            fillOpacity={s.fillOpacity ?? 1}
            stroke={s.color}
            strokeWidth={s.strokeWidth ?? 2}
            stackId={s.stackId ?? "a"}
          />
        ))}

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
      </AreaChart>
    </ChartContainer>
  );

  if (!showCard) {
    return <div className={className}>{chartContent}</div>;
  }

  return (
    <Card className={cn("pt-0", cardProps.className, className)}>
      {(title || description || enableTimeFilter) && (
        <CardHeader
          className={cn(
            "flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row",
            cardProps.headerClassName,
          )}
        >
          {(title || description) && (
            <div className="grid flex-1 gap-1">
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          )}

          {enableTimeFilter && (
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger
                className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
                aria-label="Select time range"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {timeRangeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="rounded-lg"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
      )}

      <CardContent
        className={cn("px-2 pt-4 sm:px-6 sm:pt-6", cardProps.contentClassName)}
      >
        {chartContent}
      </CardContent>
    </Card>
  );
}
