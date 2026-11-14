"use client";

import { Card } from "@/components/ui/card";
import { useHingeInsights } from "../HingeInsightsProvider";
import { getHingeLifecycleStats } from "@/lib/utils/hingeLifecycleStats";

export function ConversationStats() {
  const { profile, meta, interactions } = useHingeInsights();

  if (!profile || !meta) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold">Conversation Stats</h3>
        <p className="text-muted-foreground mt-2">No data available</p>
      </Card>
    );
  }

  const lifecycle = getHingeLifecycleStats(interactions, profile.matches);
  const avgMessagesPerConvo =
    lifecycle.conversationsWithUserMessages > 0
      ? (
          lifecycle.messagesSent / lifecycle.conversationsWithUserMessages
        ).toFixed(1)
      : "0";

  const conversationStats = [
    {
      label: "Mutual Matches",
      value: lifecycle.totalMatches.toString(),
    },
    {
      label: "Matches You Messaged",
      value: lifecycle.conversationsWithUserMessages.toString(),
    },
    {
      label: "Matches with No Sent Messages",
      value: lifecycle.matchesWithoutUserMessages.toString(),
      subValue: "Hinge exports your outgoing messages only",
    },
    {
      label: "Average Sent Messages per Messaged Match",
      value: avgMessagesPerConvo,
    },
    {
      label: "Messages Sent",
      value: lifecycle.messagesSent.toString(),
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="mb-6 text-xl font-semibold">Conversation Stats</h3>
      <div className="space-y-4">
        {conversationStats.map((stat) => (
          <div
            key={stat.label}
            className="border-border flex items-center justify-between border-b pb-3 last:border-0"
          >
            <div>
              <p className="text-sm font-medium">{stat.label}</p>
              {stat.subValue && (
                <p className="text-muted-foreground text-xs">{stat.subValue}</p>
              )}
            </div>
            <p className="text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
