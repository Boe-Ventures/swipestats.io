"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMessages } from "../MessagesProvider";
import { useTinderProfile } from "../../TinderProfileProvider";
import {
  MessagesSquare,
  MessageCircle,
  Ghost,
  Send,
  TrendingUp,
  Clock,
  Flame,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
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
        {description && (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function MessagesMetaSection() {
  const { matches } = useMessages();
  const { meta } = useTinderProfile();

  // meta comes from TinderProfileProvider at the top level
  const globalMeta = meta;

  // Calculate insights from matches
  const insights = useMemo(() => {
    if (!matches.length) {
      return {
        mostActiveMatch: null,
        longestConversation: null,
        avgMessagesPerMatch: 0,
        matchesWithMessages: 0,
      };
    }

    // Most active conversation (highest message count)
    const mostActiveMatch = matches.reduce((max, match) =>
      match.totalMessageCount > max.totalMessageCount ? match : max,
    );

    // Longest conversation (time between first and last message)
    const matchesWithTimes = matches.filter(
      (m) => m.initialMessageAt && m.lastMessageAt,
    );
    const longestConversation =
      matchesWithTimes.length > 0
        ? matchesWithTimes.reduce((longest, match) => {
            if (!match.initialMessageAt || !match.lastMessageAt) return longest;
            if (!longest.initialMessageAt || !longest.lastMessageAt)
              return match;

            const currentDuration =
              match.lastMessageAt.getTime() - match.initialMessageAt.getTime();
            const longestDuration =
              longest.lastMessageAt.getTime() -
              longest.initialMessageAt.getTime();

            return currentDuration > longestDuration ? match : longest;
          }, matchesWithTimes[0]!)
        : null;

    // Average messages per match (only counting matches with messages)
    const matchesWithMessages = matches.filter((m) => m.totalMessageCount > 0);
    const avgMessagesPerMatch =
      matchesWithMessages.length > 0
        ? Math.round(
            matchesWithMessages.reduce(
              (sum, m) => sum + m.totalMessageCount,
              0,
            ) / matchesWithMessages.length,
          )
        : 0;

    return {
      mostActiveMatch,
      longestConversation,
      avgMessagesPerMatch,
      matchesWithMessages: matchesWithMessages.length,
    };
  }, [matches]);

  // Calculate duration for longest conversation
  const longestDuration = useMemo(() => {
    if (
      !insights.longestConversation?.initialMessageAt ||
      !insights.longestConversation?.lastMessageAt
    ) {
      return null;
    }
    return formatDistanceToNow(insights.longestConversation.initialMessageAt, {
      addSuffix: false,
    });
  }, [insights.longestConversation]);

  if (!globalMeta) {
    return null; // Or a loading state if needed
  }

  return (
    <div className="space-y-6">
      {/* Existing Stats from ProfileMeta */}
      {globalMeta && (
        <>
          <h2 className="text-2xl font-bold">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Conversations"
              value={globalMeta.conversationCount}
              description="From all your matches"
              icon={MessagesSquare}
            />
            <StatCard
              title="Messages Sent"
              value={globalMeta.messagesSentTotal.toLocaleString()}
              description={`Received: ${globalMeta.messagesReceivedTotal.toLocaleString()}`}
              icon={Send}
            />
            <StatCard
              title="With Messages"
              value={globalMeta.conversationsWithMessages}
              description={`${Math.round((globalMeta.conversationsWithMessages / globalMeta.conversationCount) * 100)}% initiation rate`}
              icon={MessageCircle}
            />
            <StatCard
              title="Ghosted"
              value={globalMeta.ghostedCount}
              description={`${Math.round((globalMeta.ghostedCount / globalMeta.conversationCount) * 100)}% of matches`}
              icon={Ghost}
            />
          </div>
        </>
      )}

      {/* New Message Insights */}
      <h2 className="text-2xl font-bold">Conversation Insights</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Most Active Chat"
          value={insights.mostActiveMatch?.totalMessageCount || 0}
          description="messages in one conversation"
          icon={Flame}
        />
        <StatCard
          title="Longest Conversation"
          value={longestDuration || "N/A"}
          description={
            insights.longestConversation
              ? `${insights.longestConversation.totalMessageCount} messages`
              : undefined
          }
          icon={Clock}
        />
        <StatCard
          title="Avg Messages/Match"
          value={insights.avgMessagesPerMatch}
          description={`Across ${insights.matchesWithMessages} conversations`}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Matches"
          value={matches.length}
          description={`${insights.matchesWithMessages} with messages`}
          icon={MessagesSquare}
        />
      </div>
    </div>
  );
}
