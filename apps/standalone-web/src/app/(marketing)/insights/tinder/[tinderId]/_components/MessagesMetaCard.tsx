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
import {
  MessagesSquare,
  MessageCircle,
  Send,
  Clock,
  CalendarRange,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  formatMessageAverage,
  formatSendingGap,
  getTinderMessageUiMetrics,
} from "./tinder-message-ui-metrics";

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
  const { meta, tinderId, isOwner } = useTinderProfile();

  if (!meta) return null;

  const globalMeta = meta;
  const router = useRouter();

  const handleAnalyze = () => {
    router.push(`/insights/tinder/${tinderId}/messages`);
  };

  const messageMetrics = getTinderMessageUiMetrics(globalMeta);
  const averageMessagesPerRecord = formatMessageAverage(
    messageMetrics.averageMessagesPerMessagedRecord,
  );
  const medianMessagesPerRecord =
    messageMetrics.medianMessagesPerMessagedRecord;

  const medianSendingGap = formatSendingGap(
    globalMeta.averageResponseTimeSeconds, // Currently stores median
  );
  const meanSendingGap = formatSendingGap(globalMeta.meanResponseTimeSeconds);
  const medianConvoDuration = globalMeta.medianConversationDurationDays;
  const longestConvo = globalMeta.longestConversationDays;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Your Chats</CardTitle>
            <CardDescription>
              Patterns from the outgoing messages in your export
            </CardDescription>
          </div>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              className="shrink-0"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Replay
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <MetricRow
            icon={MessagesSquare}
            label="Conversation records"
            value={globalMeta.conversationCount}
            description="Conversation entries included in your export"
          />
          <MetricRow
            icon={MessageCircle}
            label="Records with messages"
            value={globalMeta.conversationsWithMessages}
            description="Entries with an exported message from you"
          />
          <MetricRow
            icon={Send}
            label="Usage messages sent"
            value={globalMeta.messagesSentTotal.toLocaleString()}
            description="Aggregate from Tinder's daily Usage ledger"
          />
          <MetricRow
            icon={MessageCircle}
            label="Messages per messaged record"
            value={averageMessagesPerRecord}
            description={
              medianMessagesPerRecord === null
                ? "Calculated only from retained message rows"
                : `Average in retained message rows; median ${medianMessagesPerRecord}`
            }
          />
          {medianSendingGap && (
            <MetricRow
              icon={Clock}
              label="Sending cadence"
              value={medianSendingGap}
              description={
                meanSendingGap
                  ? `Typical: ${medianSendingGap}, Avg: ${meanSendingGap} between your messages`
                  : "Median time between your outgoing messages"
              }
            />
          )}
          {medianConvoDuration !== null &&
            medianConvoDuration !== undefined && (
              <MetricRow
                icon={CalendarRange}
                label="Median outgoing span"
                value={`${medianConvoDuration} days`}
                description="Typical span of your outgoing messages"
              />
            )}
          {longestConvo !== null && longestConvo !== undefined && (
            <MetricRow
              icon={Trophy}
              label="Longest outgoing span"
              value={`${longestConvo} days`}
              description="Longest span of your outgoing messages"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
