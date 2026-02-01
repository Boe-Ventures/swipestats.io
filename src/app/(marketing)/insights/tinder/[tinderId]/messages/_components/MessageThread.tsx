"use client";

import type { Message } from "@/server/db/schema";
import { format, formatDistanceStrict } from "date-fns";
import { cn } from "@/components/ui/lib/utils";
import { Image as ImageIcon, Music, Heart, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MessageThreadProps {
  messages: Message[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isSent = message.to === 1;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const timeSincePrev = prevMessage
          ? message.sentDate.getTime() - prevMessage.sentDate.getTime()
          : 0;
        const showTimeGap = timeSincePrev > 1000 * 60 * 60; // Show gap if >1 hour

        return (
          <div key={message.id}>
            {/* Time Gap Indicator */}
            {showTimeGap && prevMessage && (
              <div className="flex items-center justify-center py-2">
                <Badge variant="secondary" className="text-xs">
                  {formatDistanceStrict(prevMessage.sentDate, message.sentDate)}{" "}
                  later
                </Badge>
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={cn("flex", isSent ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] space-y-1 rounded-lg px-4 py-2",
                  isSent ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {/* Message Type Indicator */}
                {message.messageType !== "TEXT" && (
                  <div className="flex items-center gap-1 text-xs opacity-75">
                    {message.messageType === "GIF" && (
                      <>
                        <ImageIcon className="h-3 w-3" />
                        <span>GIF</span>
                      </>
                    )}
                    {message.messageType === "GESTURE" && (
                      <>
                        <Heart className="h-3 w-3" />
                        <span>Gesture</span>
                      </>
                    )}
                    {message.messageType === "VOICE_NOTE" && (
                      <>
                        <Music className="h-3 w-3" />
                        <span>Voice Note</span>
                      </>
                    )}
                    {message.messageType === "ACTIVITY" && (
                      <>
                        <Activity className="h-3 w-3" />
                        <span>Activity</span>
                      </>
                    )}
                  </div>
                )}

                {/* Message Content */}
                {message.messageType === "GIF" && message.gifUrl ? (
                  <div className="overflow-hidden rounded">
                    {/* External GIFs from unknown domains (Giphy, Tenor, etc.) - Next.js Image would break animations */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.gifUrl}
                      alt="GIF"
                      className="max-h-[200px] max-w-[200px] object-cover"
                    />
                  </div>
                ) : (
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {message.content || message.contentRaw}
                  </p>
                )}

                {/* Timestamp */}
                <p
                  className={cn(
                    "text-xs opacity-70",
                    isSent ? "text-right" : "text-left",
                  )}
                >
                  {format(message.sentDate, "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Message Count Summary */}
      <div className="border-t pt-4">
        <p className="text-muted-foreground text-center text-sm">
          {messages.length} total messages in this conversation
        </p>
      </div>
    </div>
  );
}
