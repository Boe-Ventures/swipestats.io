"use client";

import {
  MessageCircle,
  MessageCircleOff,
  MessagesSquare,
  Send,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../TinderProfileProvider";
import { MessagesMetaCard } from "../compare/_components/MessagesMetaCard";
import {
  formatMessageAverage,
  formatRecordRate,
  getTinderMessageUiMetrics,
} from "./tinder-message-ui-metrics";

export function MessagesMetaSection() {
  const { meta } = useTinderProfile();

  if (!meta) {
    return null;
  }

  const globalMeta = meta;

  const messageMetrics = getTinderMessageUiMetrics(globalMeta);
  const averageMessagesPerRecord = formatMessageAverage(
    messageMetrics.averageMessagesPerMessagedRecord,
  );
  const medianMessagesPerRecord =
    messageMetrics.medianMessagesPerMessagedRecord;

  return (
    <div id="messages-meta">
      {/* Messages Meta Grid */}
      <Card className="w-full shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Your Chats</CardTitle>
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Navigate to message analysis page when ready
                console.log("Message analysis page coming soon!");
              }}
              className="w-full gap-2 sm:w-auto"
            >
              Analyze Messages
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <MessagesMetaCard
            title="Conversation records"
            icon={MessagesSquare}
            stat={globalMeta.conversationCount.toString()}
            from="Conversation entries included in your export"
          />

          <MessagesMetaCard
            title="Records with messages"
            icon={MessageCircle}
            stat={globalMeta.conversationsWithMessages.toString()}
            from={
              messageMetrics.messagedRecordRate === null
                ? "Coverage unavailable; no conversation records"
                : `${formatRecordRate(messageMetrics.messagedRecordRate)} include an exported message from you`
            }
          />

          <MessagesMetaCard
            title="Usage messages sent"
            icon={Send}
            stat={globalMeta.messagesSentTotal.toLocaleString()}
            from="Aggregate from Tinder's daily Usage ledger"
          />

          <MessagesMetaCard
            title="Messages per messaged record"
            icon={MessageCircle}
            stat={averageMessagesPerRecord}
            from={
              medianMessagesPerRecord === null
                ? "Calculated only from retained message rows"
                : `Average; median ${medianMessagesPerRecord} in retained message rows`
            }
          />

          <MessagesMetaCard
            title="Not messaged"
            icon={MessageCircleOff}
            stat={messageMetrics.recordsWithoutMessages.toString()}
            from="Conversation records with no exported message from you"
          />

          <MessagesMetaCard
            title="Not messaged rate"
            icon={MessageCircleOff}
            stat={formatRecordRate(messageMetrics.recordsWithoutMessagesRate)}
            from="This does not identify replies or ghosting"
          />
        </CardContent>
      </Card>
    </div>
  );
}
