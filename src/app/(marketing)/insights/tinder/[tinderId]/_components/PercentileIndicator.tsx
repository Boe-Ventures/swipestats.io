"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PercentileDistribution {
  p10?: number;
  p25?: number;
  p50: number; // median - required
  p75?: number;
  p90?: number;
}

interface PercentileIndicatorProps {
  label: string;
  yourValue: number;
  distribution: PercentileDistribution;
  format?: "percentage" | "number" | "decimal";
  showFullDistribution?: boolean;
}

/**
 * PercentileIndicator - Visual percentile position bar
 *
 * Shows where a user's value falls within a distribution
 */
export function PercentileIndicator({
  label,
  yourValue,
  distribution,
  format = "percentage",
  showFullDistribution = true,
}: PercentileIndicatorProps) {
  const formatValue = (value: number) => {
    switch (format) {
      case "percentage":
        return `${(value * 100).toFixed(1)}%`;
      case "decimal":
        return value.toFixed(2);
      case "number":
      default:
        return Math.round(value).toLocaleString();
    }
  };

  // Calculate which percentile the user is in
  const getPercentileText = () => {
    if (distribution.p90 && yourValue >= distribution.p90) {
      return {
        text: "Top 10%",
        percentile: 90,
        color: "text-green-600 dark:text-green-400",
      };
    }
    if (distribution.p75 && yourValue >= distribution.p75) {
      return { text: "Top 25%", percentile: 75, color: "text-green-500" };
    }
    if (yourValue >= distribution.p50) {
      return { text: "Above median", percentile: 50, color: "text-blue-500" };
    }
    if (distribution.p25 && yourValue >= distribution.p25) {
      return { text: "Bottom 50%", percentile: 25, color: "text-orange-500" };
    }
    return {
      text: "Bottom 25%",
      percentile: 10,
      color: "text-red-500 dark:text-red-400",
    };
  };

  const percentileInfo = getPercentileText();

  // Calculate position for the visual bar (0-100)
  const calculatePosition = () => {
    const min = distribution.p10 || distribution.p25 || distribution.p50 * 0.5;
    const max = distribution.p90 || distribution.p75 || distribution.p50 * 1.5;

    if (yourValue <= min) return 0;
    if (yourValue >= max) return 100;

    return ((yourValue - min) / (max - min)) * 100;
  };

  const position = calculatePosition();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-muted-foreground text-sm font-medium">
                {label}
              </h4>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums">
                  {formatValue(yourValue)}
                </span>
                <Badge variant="outline" className={percentileInfo.color}>
                  {percentileInfo.text}
                </Badge>
              </div>
            </div>
          </div>

          {/* Visual percentile bar */}
          <div className="relative pt-8 pb-2">
            {/* Distribution markers */}
            {showFullDistribution && (
              <div className="text-muted-foreground absolute top-0 right-0 left-0 flex justify-between text-[10px]">
                {distribution.p10 !== undefined && (
                  <span>p10: {formatValue(distribution.p10)}</span>
                )}
                {distribution.p25 !== undefined && (
                  <span>p25: {formatValue(distribution.p25)}</span>
                )}
                <span>p50: {formatValue(distribution.p50)}</span>
                {distribution.p75 !== undefined && (
                  <span>p75: {formatValue(distribution.p75)}</span>
                )}
                {distribution.p90 !== undefined && (
                  <span>p90: {formatValue(distribution.p90)}</span>
                )}
              </div>
            )}

            {/* Progress bar */}
            <div className="relative h-3 rounded-full bg-linear-to-r from-red-200 via-blue-200 via-yellow-200 to-green-200 dark:from-red-900/30 dark:via-blue-900/30 dark:via-yellow-900/30 dark:to-green-900/30">
              {/* Your position marker */}
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{ left: `${position}%` }}
              >
                <div className="bg-primary border-background h-4 w-4 rounded-full border-2 shadow-lg" />
              </div>
            </div>

            {/* Percentile labels */}
            <div className="text-muted-foreground mt-2 flex justify-between text-xs">
              <span>Bottom</span>
              <span>Median</span>
              <span>Top</span>
            </div>
          </div>

          {/* Additional context */}
          {showFullDistribution && (
            <div className="text-muted-foreground text-center text-xs">
              You&apos;re performing better than approximately{" "}
              <span className="font-semibold">{Math.round(position)}%</span> of
              this cohort
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
