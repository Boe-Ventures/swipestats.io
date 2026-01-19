"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CohortData {
  name: string;
  value: number;
  description?: string;
}

interface CohortBenchmarkCardProps {
  metric: string;
  yourValue: number;
  cohorts: CohortData[];
  format?: "percentage" | "number" | "decimal";
  description?: string;
}

/**
 * CohortBenchmarkCard - Side-by-side metric comparison
 *
 * Shows "You vs Men vs Women" style comparisons
 * Flattened design without nested cards for MVP
 */
export function CohortBenchmarkCard({
  metric,
  yourValue,
  cohorts,
  format = "percentage",
  description,
}: CohortBenchmarkCardProps) {
  const formatValue = (value: number) => {
    switch (format) {
      case "percentage":
        return `${(value * 100).toFixed(1)}%`;
      case "decimal":
        return value.toFixed(2);
      case "number":
      default:
        const rounded = Math.round(value);
        // Remove commas for values < 1000
        return rounded < 1000 ? rounded.toString() : rounded.toLocaleString();
    }
  };

  const getComparison = (cohortValue: number) => {
    const diff = yourValue - cohortValue;
    const percentDiff = cohortValue !== 0 ? (diff / cohortValue) * 100 : 0;

    // Determine if this metric should use colored indicators
    const useNeutralColors =
      metric === "Like Rate" || metric === "Swipes Per Day";

    if (Math.abs(percentDiff) < 5) {
      return {
        status: "similar",
        icon: Minus,
        text: "Similar",
        className: "text-muted-foreground",
      };
    }

    if (diff > 0) {
      return {
        status: "higher",
        icon: TrendingUp,
        text: `+${Math.abs(percentDiff).toFixed(0)}%`,
        className: useNeutralColors
          ? "text-muted-foreground"
          : "text-green-600 dark:text-green-400",
      };
    }

    return {
      status: "lower",
      icon: TrendingDown,
      text: `-${Math.abs(percentDiff).toFixed(0)}%`,
      className: useNeutralColors
        ? "text-muted-foreground"
        : "text-red-600 dark:text-red-400",
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold">{metric}</h3>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>

      {/* Your value - highlighted row */}
      <div className="bg-muted/50 flex items-center justify-between rounded-lg px-4 py-3">
        <span className="text-sm font-medium">You</span>
        <span className="text-2xl font-bold tabular-nums">
          {formatValue(yourValue)}
        </span>
      </div>

      {/* Cohort comparisons */}
      <div className="space-y-3">
        {cohorts.map((cohort, index) => {
          const comparison = getComparison(cohort.value);
          const ComparisonIcon = comparison.icon;

          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{cohort.name}</span>
                {cohort.description && (
                  <span className="text-muted-foreground text-xs">
                    {cohort.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`gap-1 ${comparison.className}`}
                >
                  <ComparisonIcon className="h-3 w-3" />
                  {comparison.text}
                </Badge>
                <span className="w-20 text-right text-lg font-semibold tabular-nums">
                  {formatValue(cohort.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
