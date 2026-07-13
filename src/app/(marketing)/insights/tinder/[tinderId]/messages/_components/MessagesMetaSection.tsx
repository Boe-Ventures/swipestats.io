"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, MessagesSquare, Send, UserRoundX } from "lucide-react";

import { useTinderProfile } from "../../TinderProfileProvider";

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

  const conversationCount = Math.max(meta.conversationCount, 1);
  const noSentMessages = Math.max(
    0,
    meta.conversationCount - meta.conversationsWithMessages,
  );

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Messaging overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total matches"
          value={meta.conversationCount}
          description="Conversations in your export"
          icon={MessagesSquare}
        />
        <StatCard
          title="Messages sent"
          value={meta.messagesSentTotal.toLocaleString()}
          description="Outgoing messages available for replay"
          icon={Send}
        />
        <StatCard
          title="Matches you messaged"
          value={meta.conversationsWithMessages}
          description={`${Math.round((meta.conversationsWithMessages / conversationCount) * 100)}% of matches`}
          icon={MessageCircle}
        />
        <StatCard
          title="No messages sent"
          value={noSentMessages}
          description="This does not tell us who replied or ghosted"
          icon={UserRoundX}
        />
      </div>
    </section>
  );
}
