"use client";

import * as React from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/components/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTinderProfile } from "../../TinderProfileProvider";
import { useComparison } from "../../ComparisonProvider";
import { getProfileColor, getProfileLabel } from "../utils/profileColors";
import { getGlobalMeta } from "@/lib/types/profile";
import type { ProfileMeta } from "@/server/db/schema";

// Formatting utilities
function formatResponseTime(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  return num.toLocaleString();
}

function formatDecimal(num: number | null | undefined, decimals = 1): string {
  if (num === null || num === undefined) return "-";
  return num.toFixed(decimals);
}

function formatPercentage(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  return `${Math.round(num)}%`;
}

interface MetricDefinition {
  label: string;
  description?: string;
  getValue: (meta: ProfileMeta) => string;
}

const METRICS: MetricDefinition[] = [
  {
    label: "Total conversations",
    description: "From all your matches",
    getValue: (meta) => formatNumber(meta.conversationCount),
  },
  {
    label: "Conversations with messages",
    description: "From matches in your data export",
    getValue: (meta) => formatNumber(meta.conversationsWithMessages),
  },
  {
    label: "Messages sent",
    description: "Total messages you sent",
    getValue: (meta) => {
      const medianMessages = meta.medianMessagesPerConversation;
      const avgMessages = meta.averageMessagesPerConversation;
      const total = formatNumber(meta.messagesSentTotal);

      if (
        medianMessages !== null &&
        medianMessages !== undefined &&
        avgMessages !== null &&
        avgMessages !== undefined
      ) {
        return `${total} (Typical: ${medianMessages}, Avg: ${avgMessages.toFixed(1)})`;
      }
      return total;
    },
  },
  {
    label: "Response time",
    description: "Time between messages",
    getValue: (meta) => {
      const median = formatResponseTime(meta.averageResponseTimeSeconds);
      const mean = formatResponseTime(meta.meanResponseTimeSeconds);

      if (median !== "-" && mean !== "-") {
        return `${median} (Typical: ${median}, Avg: ${mean})`;
      }
      return median;
    },
  },
  {
    label: "Median conversation",
    description: "Typical conversation length",
    getValue: (meta) => {
      const days = meta.medianConversationDurationDays;
      return days !== null && days !== undefined
        ? `${formatNumber(days)} days`
        : "-";
    },
  },
  {
    label: "Longest conversation",
    description: "Your record conversation",
    getValue: (meta) => {
      const days = meta.longestConversationDays;
      return days !== null && days !== undefined
        ? `${formatNumber(days)} days`
        : "-";
    },
  },
];

interface ProfileWithMeta {
  tinderId: string;
  meta: ProfileMeta | null;
}

export function CompareMessagesMetaTable() {
  const { meta, tinderId, usageLoading } = useTinderProfile();
  const {
    comparisonProfiles,
    pendingProfileIds,
    loading: comparisonLoading,
  } = useComparison();

  // Combine main profile with comparison profiles
  const allProfiles = React.useMemo<ProfileWithMeta[]>(() => {
    const profiles: ProfileWithMeta[] = [
      {
        tinderId,
        meta,
      },
    ];

    comparisonProfiles.forEach((profile) => {
      profiles.push({
        tinderId: profile.tinderId,
        meta: getGlobalMeta(profile),
      });
    });

    return profiles;
  }, [tinderId, meta, comparisonProfiles]);

  const [visibleProfiles, setVisibleProfiles] = React.useState<Set<string>>(
    new Set(allProfiles.map((p) => p.tinderId)),
  );

  const toggleProfile = (profileId: string) => {
    setVisibleProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        // Don't allow hiding all profiles
        if (next.size > 1) {
          next.delete(profileId);
        }
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  // Update visible profiles when profiles change
  React.useEffect(() => {
    setVisibleProfiles(new Set(allProfiles.map((p) => p.tinderId)));
  }, [allProfiles]);

  // Filter profiles by visibility
  const visibleProfilesList = allProfiles.filter((p) =>
    visibleProfiles.has(p.tinderId),
  );

  // Show loading state when data is being fetched
  const isLoading = usageLoading || comparisonLoading;

  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Messages meta</CardTitle>
          <CardDescription>
            Messaging patterns and conversation insights
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
                Fetching messaging insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allProfiles.length === 0 || !allProfiles[0]?.meta) {
    return (
      <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Messages meta</CardTitle>
          <CardDescription>
            Messaging patterns and conversation insights
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-muted rounded-full p-4">
              <MessageSquare className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-lg font-semibold">
                No messaging data available
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                This profile doesn't have any messaging metadata yet. Upload
                your Tinder data export to see conversation insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="space-y-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold">Messages meta</CardTitle>
          <CardDescription>
            Messaging patterns and conversation insights
          </CardDescription>
        </div>

        {/* Profile Toggle Pills */}
        <div className="flex flex-wrap gap-2">
          {allProfiles.map((profile, index) => {
            const isVisible = visibleProfiles.has(profile.tinderId);
            const color = getProfileColor(index);
            const label = getProfileLabel(profile.tinderId, tinderId, index);

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
              </button>
            );
          })}

          {/* Pending profiles - show loading state */}
          {pendingProfileIds.map((profileId, idx) => {
            const index = allProfiles.length + idx;
            const color = getProfileColor(index);
            const label = getProfileLabel(profileId, profileId, index);

            return (
              <div
                key={profileId}
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

      <CardContent className="overflow-x-auto">
        {/* Table */}
        <div className="min-w-full">
          {/* Header Row */}
          <div
            className="grid gap-4 border-b pb-3 font-medium"
            style={{
              gridTemplateColumns: `minmax(200px, 1fr) repeat(${visibleProfilesList.length}, minmax(120px, 1fr))`,
            }}
          >
            <div className="text-sm">Metric</div>
            {visibleProfilesList.map((profile, index) => {
              const actualIndex = allProfiles.findIndex(
                (p) => p.tinderId === profile.tinderId,
              );
              const color = getProfileColor(actualIndex);
              const label = getProfileLabel(
                profile.tinderId,
                tinderId,
                actualIndex,
              );

              return (
                <div
                  key={profile.tinderId}
                  className="flex items-center gap-2 text-sm"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Metric Rows */}
          <div className="divide-y">
            {METRICS.map((metric, metricIdx) => (
              <div
                key={metricIdx}
                className="hover:bg-muted/30 grid gap-4 py-4 transition-colors"
                style={{
                  gridTemplateColumns: `minmax(200px, 1fr) repeat(${visibleProfilesList.length}, minmax(120px, 1fr))`,
                }}
              >
                {/* Metric Label */}
                <div className="flex flex-col justify-center">
                  <div className="text-sm font-medium">{metric.label}</div>
                  {metric.description && (
                    <div className="text-muted-foreground text-xs">
                      {metric.description}
                    </div>
                  )}
                </div>

                {/* Profile Values */}
                {visibleProfilesList.map((profile) => {
                  const actualIndex = allProfiles.findIndex(
                    (p) => p.tinderId === profile.tinderId,
                  );
                  const color = getProfileColor(actualIndex);
                  const value = profile.meta
                    ? metric.getValue(profile.meta)
                    : "-";

                  return (
                    <div
                      key={profile.tinderId}
                      className="flex items-center rounded-lg px-3 py-2 transition-all"
                      style={{
                        backgroundColor: `${color}15`,
                      }}
                    >
                      <span className="text-lg font-semibold tabular-nums">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
