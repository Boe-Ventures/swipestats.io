"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  Hash,
  MessageCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { RouterOutputs } from "@/trpc/react";

type PhotoSummary = RouterOutputs["profileCompare"]["getPhotoSummary"][number];

interface PhotoSummaryItemProps {
  photo: PhotoSummary;
}

export function PhotoSummaryItem({ photo }: PhotoSummaryItemProps) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  const {
    rank,
    attachment,
    avgPosition,
    minPosition,
    maxPosition,
    frequency,
    avgRating,
    totalRatings,
    comments,
    appearances,
  } = photo;

  // Format average position (0-indexed to 1-indexed for display)
  const displayPosition = (avgPosition + 1).toFixed(1);

  // Format position range (0-indexed to 1-indexed for display)
  const displayMinPosition = minPosition + 1;
  const displayMaxPosition = maxPosition + 1;
  const positionRange =
    displayMinPosition === displayMaxPosition
      ? `${displayMinPosition}`
      : `${displayMinPosition}-${displayMaxPosition}`;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {/* Rank Badge */}
        <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-sm">
          {rank}
        </div>

        {/* Photo Thumbnail */}
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border shadow-sm">
          <img
            src={attachment.url}
            alt={attachment.originalFilename}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Score Indicators */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Position Indicator */}
            <Badge variant="outline" className="gap-1">
              <Hash className="h-3 w-3" />
              <span className="text-xs">
                Pos: {positionRange}
                {frequency > 1 && ` (avg: ${displayPosition})`}
              </span>
            </Badge>

            {/* Frequency Indicator */}
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">
                {frequency} {frequency === 1 ? "column" : "columns"}
              </span>
            </Badge>

            {/* Rating Indicator */}
            {avgRating !== null && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">
                  {avgRating.toFixed(1)} ({totalRatings})
                </span>
              </Badge>
            )}

            {/* No ratings badge */}
            {avgRating === null && totalRatings === 0 && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                <span className="text-xs">No ratings</span>
              </Badge>
            )}
          </div>

          {/* Comments Section */}
          {comments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">
                    {comments.length}{" "}
                    {comments.length === 1 ? "comment" : "comments"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommentsExpanded(!commentsExpanded)}
                  className="h-7"
                >
                  {commentsExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3 w-3" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3 w-3" />
                      Show
                    </>
                  )}
                </Button>
              </div>

              {commentsExpanded && (
                <div className="bg-muted/30 space-y-3 rounded-lg border p-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={comment.author.image ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {comment.author.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {comment.author.name || "Anonymous"}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {formatDistanceToNow(comment.createdAt, {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comments Preview (when collapsed) */}
              {!commentsExpanded && comments.length > 0 && (
                <div className="bg-muted/30 rounded-lg border p-2">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage
                        src={comments[0]!.author.image ?? undefined}
                      />
                      <AvatarFallback className="text-[9px]">
                        {comments[0]!.author.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs">
                        <span className="font-medium">
                          {comments[0]!.author.name || "Anonymous"}:
                        </span>{" "}
                        {comments[0]!.body}
                      </p>
                      {comments.length > 1 && (
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          +{comments.length - 1} more{" "}
                          {comments.length - 1 === 1 ? "comment" : "comments"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No comments */}
          {comments.length === 0 && (
            <p className="text-muted-foreground text-xs">No comments yet</p>
          )}

          {/* Appearances Info */}
          {appearances.length > 0 && (
            <div className="text-muted-foreground text-xs">
              Appears in:{" "}
              {appearances.map((a) => a.columnTitle || "Untitled").join(", ")}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
