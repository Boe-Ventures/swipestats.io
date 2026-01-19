"use client";

import {
  CircleSlash,
  Ghost,
  MessageCircle,
  MessagesSquare,
  Send,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../TinderProfileProvider";
import { MessagesMetaCard } from "../compare/_components/MessagesMetaCard";

export function MessagesMetaSection() {
  const { meta } = useTinderProfile();

  if (!meta) {
    return null;
  }

  const globalMeta = meta;

  // Calculate derived metrics
  const avgMessagesPerConvo =
    globalMeta.conversationsWithMessages > 0
      ? (
          globalMeta.messagesSentTotal / globalMeta.conversationsWithMessages
        ).toFixed(1)
      : "0";

  const initiationRate =
    globalMeta.conversationCount > 0
      ? Math.round(
          (globalMeta.conversationsWithMessages /
            globalMeta.conversationCount) *
            100,
        )
      : 0;

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
            title="Total conversations"
            icon={MessagesSquare}
            stat={globalMeta.conversationCount.toString()}
            from="From all your matches"
          />

          <MessagesMetaCard
            title="With messages"
            icon={MessageCircle}
            stat={globalMeta.conversationsWithMessages.toString()}
            from={`${initiationRate}% initiation rate`}
          />

          <MessagesMetaCard
            title="Messages sent"
            icon={Send}
            stat={globalMeta.messagesSentTotal.toLocaleString()}
            from={`Avg ${avgMessagesPerConvo} per conversation`}
          />

          <MessagesMetaCard
            title="You ghosted"
            icon={Ghost}
            stat={globalMeta.ghostedCount.toString()}
            from="Matches with no messages"
          />

          <MessagesMetaCard
            title="Ghost rate"
            icon={CircleSlash}
            stat={`${globalMeta.conversationCount > 0 ? Math.round((globalMeta.ghostedCount / globalMeta.conversationCount) * 100) : 0}%`}
            from="% of matches not messaged"
          />
        </CardContent>
      </Card>
    </div>
  );
}
