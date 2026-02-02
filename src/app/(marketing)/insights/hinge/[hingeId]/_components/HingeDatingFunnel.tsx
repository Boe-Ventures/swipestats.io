"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHingeInsights } from "../HingeInsightsProvider";
import { useMemo } from "react";

interface FunnelStage {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export function HingeDatingFunnel() {
  const { profile, meta } = useHingeInsights();

  const funnelData = useMemo<FunnelStage[]>(() => {
    if (!meta || !profile?.matches) return [];

    // Hinge data model: conversation threads can be likes, matches, or blocks
    const totalLikes = profile.matches.filter((m) => m.likedAt).length;
    const totalMatches = profile.matches.filter((m) => m.matchedAt).length;
    const matchesWithMessages = meta.conversationsWithMessages || 0;
    const totalMessages =
      (meta.messagesSentTotal || 0) + (meta.messagesReceivedTotal || 0);

    // Use likes as baseline (should be >= matches)
    const baseValue = totalLikes > 0 ? totalLikes : totalMatches;

    return [
      {
        label: "Likes Sent",
        value: baseValue,
        percentage: 100,
        color: "hsl(270, 70%, 60%)", // Purple
      },
      {
        label: "Matches",
        value: totalMatches,
        percentage: baseValue > 0 ? (totalMatches / baseValue) * 100 : 0,
        color: "hsl(330, 75%, 55%)", // Pink
      },
      {
        label: "Conversations",
        value: matchesWithMessages,
        percentage:
          totalMatches > 0 ? (matchesWithMessages / totalMatches) * 100 : 0,
        color: "hsl(200, 75%, 50%)", // Blue
      },
      {
        label: "Total Messages",
        value: totalMessages,
        // Show messages as a proportion of likes sent (scaled for visibility)
        percentage:
          baseValue > 0 ? Math.min((totalMessages / baseValue) * 100, 100) : 0,
        color: "hsl(150, 65%, 50%)", // Green
      },
    ];
  }, [profile?.matches, meta]);

  if (!meta || funnelData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dating Funnel</CardTitle>
          <CardDescription>
            Conversion rates through your dating journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dating Funnel</CardTitle>
        <CardDescription>
          Conversion rates through your dating journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnelData.map((stage, index) => {
            const isLastStage = index === funnelData.length - 1;
            const nextStage = !isLastStage ? funnelData[index + 1] : null;
            const conversionRate = nextStage
              ? stage.value > 0
                ? ((nextStage.value / stage.value) * 100).toFixed(1)
                : "0.0"
              : null;

            return (
              <div key={stage.label} className="space-y-2">
                {/* Stage bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-sm font-medium">{stage.label}</span>
                      <span className="text-sm font-semibold">
                        {stage.label === "Total Messages"
                          ? stage.value.toLocaleString()
                          : stage.value}
                      </span>
                    </div>
                    <div className="relative h-8 w-full overflow-hidden rounded-md bg-gray-100">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${stage.percentage}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Conversion rate arrow */}
                {conversionRate && (
                  <div className="flex items-center justify-center">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>↓</span>
                      <span className="font-medium">
                        {conversionRate}% conversion
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4">
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Match Rate</p>
            <p className="text-lg font-semibold">
              {funnelData[1]?.value && funnelData[0]?.value
                ? ((funnelData[1].value / funnelData[0].value) * 100).toFixed(1)
                : "0"}
              %
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Conversation Rate</p>
            <p className="text-lg font-semibold">
              {funnelData[2]?.value && funnelData[1]?.value
                ? ((funnelData[2].value / funnelData[1].value) * 100).toFixed(1)
                : "0"}
              %
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
