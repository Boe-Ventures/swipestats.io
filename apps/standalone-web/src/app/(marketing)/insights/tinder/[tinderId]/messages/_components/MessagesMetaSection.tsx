"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, MessagesSquare, Send, UserRoundX } from "lucide-react";

import { useTinderProfile } from "../../TinderProfileProvider";
import {
  formatRecordRate,
  getTinderMessageUiMetrics,
} from "../../_components/tinder-message-ui-metrics";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: typeof MessagesSquare;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

export function MessagesMetaSection() {
  const { meta } = useTinderProfile();

  if (!meta) return null;

  const messageMetrics = getTinderMessageUiMetrics(meta);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Messaging overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Conversation records"
          value={meta.conversationCount}
          description="Conversations in your export"
          icon={MessagesSquare}
        />
        <StatCard
          title="Usage messages sent"
          value={meta.messagesSentTotal.toLocaleString()}
          description="Aggregate from Tinder's daily Usage ledger"
          icon={Send}
        />
        <StatCard
          title="Records with messages"
          value={meta.conversationsWithMessages}
          description={
            messageMetrics.messagedRecordRate === null
              ? "Coverage unavailable; no conversation records"
              : `${formatRecordRate(messageMetrics.messagedRecordRate)} of conversation records`
          }
          icon={MessageCircle}
        />
        <StatCard
          title="Records without messages"
          value={messageMetrics.recordsWithoutMessages}
          description="This does not tell us who replied or ghosted"
          icon={UserRoundX}
        />
      </div>
    </section>
  );
}
