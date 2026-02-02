"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { Match } from "@/server/db/schema";
import {
  Card,
  CardContent,
  
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Calendar,
  Clock,
  MessageSquare,
  Image as ImageIcon,
  Smile,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { MessageThread } from "./MessageThread";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const trpc = useTRPC();

  // Only fetch messages when expanded
  const messagesQuery = useQuery(
    trpc.match.getMessages.queryOptions(
      { matchId: match.id },
      {
        enabled: isExpanded,
        refetchOnWindowFocus: false,
      },
    ),
  );

  const hasMessages = match.totalMessageCount > 0;
  const messages = messagesQuery.data ?? [];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Match #{match.order}</CardTitle>
              {!hasMessages && (
                <Badge variant="secondary" className="text-xs">
                  No messages
                </Badge>
              )}
            </div>

            {/* Match Metadata */}
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              {match.matchedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Matched {format(match.matchedAt, "MMM d, yyyy")}</span>
                </div>
              )}
              {match.lastMessageAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last message {format(match.lastMessageAt, "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>

            {/* Message Type Breakdown */}
            {hasMessages && (
              <div className="flex flex-wrap gap-2">
                {match.textCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {match.textCount} text
                  </Badge>
                )}
                {match.gifCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {match.gifCount} GIF
                  </Badge>
                )}
                {match.gestureCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Smile className="h-3 w-3" />
                    {match.gestureCount} gesture
                  </Badge>
                )}
                {match.otherMessageTypeCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    {match.otherMessageTypeCount} other
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          {hasMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {match.totalMessageCount} messages
              {isExpanded ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Expandable Content - Messages */}
      {isExpanded && hasMessages && (
        <CardContent className="border-t pt-6">
          {messagesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : messages.length > 0 ? (
            <MessageThread messages={messages} />
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              No messages found for this match.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
