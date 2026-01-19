"use client";

import { Card } from "@/components/ui/card";
import { useHingeInsights } from "../HingeInsightsProvider";
import { getGlobalMeta } from "@/lib/types/hinge-profile";

export function ConversationStats() {
  const { profile, meta } = useHingeInsights();

  if (!profile || !meta) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold">Conversation Stats</h3>
        <p className="text-muted-foreground mt-2">No data available</p>
      </Card>
    );
  }

  // Calculate average messages per conversation from available data
  const totalMessages =
    (meta.messagesSentTotal ?? 0) + (meta.messagesReceivedTotal ?? 0);
  const avgMessagesPerConvo =
    meta.conversationsWithMessages > 0
      ? (totalMessages / meta.conversationsWithMessages).toFixed(1)
      : "0";

  const conversationStats = [
    {
      label: "Total Conversations",
      value: meta.conversationCount.toString(),
    },
    {
      label: "Conversations with Messages",
      value: meta.conversationsWithMessages.toString(),
    },
    {
      label: "Ghosted After Match",
      value: meta.ghostedCount.toString(),
      subValue: "No messages exchanged",
    },
    {
      label: "Average Messages per Conversation",
      value: avgMessagesPerConvo,
    },
    {
      label: "Messages Sent",
      value: (meta.messagesSentTotal ?? 0).toString(),
    },
    {
      label: "Messages Received",
      value: (meta.messagesReceivedTotal ?? 0).toString(),
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
