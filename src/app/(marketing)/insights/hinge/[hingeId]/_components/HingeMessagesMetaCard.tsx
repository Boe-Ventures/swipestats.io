"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHingeInsights } from "../HingeInsightsProvider";
import {
  MessagesSquare,
  MessageCircle,
  Send,
  Inbox,
  Ghost,
  TrendingUp,
} from "lucide-react";

interface MetricRowProps {
  icon: typeof MessagesSquare;
  label: string;
  value: string | number;
  description?: string;
}

function MetricRow({ icon: Icon, label, value, description }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-0">
      <div className="flex items-center gap-3">
        <div className="bg-muted rounded-lg p-2">
          <Icon className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          {description && (
            <span className="text-muted-foreground text-xs">{description}</span>
          )}
        </div>
      </div>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function HingeMessagesMetaCard() {
  const { meta } = useHingeInsights();

  if (!meta) return null;

  // Calculate derived metrics
  const avgMessagesPerConvo =
    meta.conversationsWithMessages > 0
      ? (
          (meta.messagesSentTotal + meta.messagesReceivedTotal) /
          meta.conversationsWithMessages
        ).toFixed(1)
      : "0";

  const ghostedCount = meta.conversationCount - meta.conversationsWithMessages;
  const ghostRate =
    meta.conversationCount > 0
      ? ((ghostedCount / meta.conversationCount) * 100).toFixed(0)
      : "0";

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="space-y-1.5">
          <CardTitle>Your Chats</CardTitle>
          <CardDescription>
            Messaging patterns and conversation insights
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <MetricRow
            icon={MessagesSquare}
            label="Total conversations"
            value={meta.conversationCount}
            description="From all your matches"
          />
          <MetricRow
            icon={MessageCircle}
            label="Conversations with messages"
            value={meta.conversationsWithMessages}
            description={`${avgMessagesPerConvo} messages per conversation on average`}
          />
          <MetricRow
            icon={Ghost}
            label="Ghosted after match"
            value={ghostedCount}
            description={`${ghostRate}% of matches never messaged`}
          />
          <MetricRow
            icon={Send}
            label="Messages sent"
            value={meta.messagesSentTotal.toLocaleString()}
            description="Total messages you sent"
          />
          <MetricRow
            icon={Inbox}
            label="Messages received"
            value={meta.messagesReceivedTotal.toLocaleString()}
            description="Total messages you received"
          />
          {meta.medianMessagesPerConversation !== null &&
            meta.medianMessagesPerConversation !== undefined && (
              <MetricRow
                icon={TrendingUp}
                label="Typical conversation"
                value={`${meta.medianMessagesPerConversation} msgs`}
                description="Median messages per conversation"
              />
            )}
        </div>
      </CardContent>
    </Card>
  );
}
