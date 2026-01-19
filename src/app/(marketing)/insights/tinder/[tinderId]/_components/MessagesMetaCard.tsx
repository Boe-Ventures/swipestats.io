"use client";

import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../TinderProfileProvider";
import { MessagesSquare, MessageCircle, Send, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

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

export function MessagesMetaCard() {
  const { meta, tinderId } = useTinderProfile();

  if (!meta) return null;

  const globalMeta = meta;
  const router = useRouter();

  const handleAnalyze = () => {
    // TODO: Navigate to message analysis page when ready
    console.log("Message analysis page coming soon!");
    router.push(`/insights/tinder/${tinderId}/messages`);
  };

  // Calculate derived metrics
  const medianMessagesPerConvo = globalMeta.medianMessagesPerConversation ?? 0;
  const avgMessagesPerConvo = globalMeta.averageMessagesPerConversation
    ? globalMeta.averageMessagesPerConversation.toFixed(1)
    : globalMeta.conversationsWithMessages > 0
      ? (
          globalMeta.messagesSentTotal / globalMeta.conversationsWithMessages
        ).toFixed(1)
      : "0";

  // Format response time
  const formatResponseTime = (seconds: number | null) => {
    if (!seconds) return null;
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  const medianResponseTime = formatResponseTime(
    globalMeta.averageResponseTimeSeconds, // Currently stores median
  );
  const meanResponseTime = formatResponseTime(
    globalMeta.meanResponseTimeSeconds,
  );
  const medianConvoDuration = globalMeta.medianConversationDurationDays;
  const longestConvo = globalMeta.longestConversationDays;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Your Chats</CardTitle>
            <CardDescription>
              Messaging patterns and conversation insights
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            className="shrink-0"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <MetricRow
            icon={MessagesSquare}
            label="Total conversations"
            value={globalMeta.conversationCount}
            description="From all your matches"
          />
          <MetricRow
            icon={MessageCircle}
            label="Conversations with messages"
            value={globalMeta.conversationsWithMessages}
            description="From matches in your data export"
          />
          <MetricRow
            icon={Send}
            label="Messages sent"
            value={globalMeta.messagesSentTotal.toLocaleString()}
            description={`Typical: ${medianMessagesPerConvo}, Avg: ${avgMessagesPerConvo} per conversation`}
          />
          {medianResponseTime && (
            <MetricRow
              icon={TrendingUp}
              label="Response time"
              value={medianResponseTime}
              description={
                meanResponseTime
                  ? `Typical: ${medianResponseTime}, Avg: ${meanResponseTime} between messages`
                  : "Median time between messages"
              }
            />
          )}
          {medianConvoDuration !== null &&
            medianConvoDuration !== undefined && (
              <MetricRow
                icon={TrendingUp}
                label="Median conversation"
                value={`${medianConvoDuration} days`}
                description="Typical conversation length"
              />
            )}
          {longestConvo !== null && longestConvo !== undefined && (
            <MetricRow
              icon={TrendingUp}
              label="Longest conversation"
              value={`${longestConvo} days`}
              description="Your record conversation"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
