"use client";

import { useMemo } from "react";
import { MessageCircle, Star, TrendingUp, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

type Comparison = RouterOutputs["profileCompare"]["getPublic"];

interface FeedbackSummaryProps {
  comparison: Comparison;
}

export function FeedbackSummary({ comparison }: FeedbackSummaryProps) {
  const trpc = useTRPC();
  // Get all feedback for this comparison
  const { data: allFeedback = [] } = useQuery({
    ...trpc.profileCompare.getFeedback.queryOptions({
      comparisonId: comparison.id,
    }),
    enabled: !!comparison.id,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const ratings = allFeedback
      .map((f) => f.rating)
      .filter((r): r is number => r !== null && r !== undefined);
    const comments = allFeedback.filter((f) => f.body?.trim());

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null;

    // Rating distribution
    const ratingDistribution: Record<number, number> = {};
    ratings.forEach((r) => {
      ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
    });

    // Get unique authors
    const uniqueAuthors = new Set(
      allFeedback.map((f) => f.authorId).filter(Boolean),
    );

    // Get most commented items
    const contentFeedbackCounts: Record<string, number> = {};
    allFeedback.forEach((f) => {
      if (f.contentId) {
        contentFeedbackCounts[f.contentId] =
          (contentFeedbackCounts[f.contentId] || 0) + 1;
      }
    });

    const mostCommentedContentId = Object.entries(contentFeedbackCounts).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0];

    // Find the content item
    const mostCommentedItem = comparison.columns
      .flatMap((col) => col.content)
      .find((c) => c.id === mostCommentedContentId);

    return {
      totalFeedback: allFeedback.length,
      totalRatings: ratings.length,
      totalComments: comments.length,
      averageRating,
      ratingDistribution,
      uniqueAuthors: uniqueAuthors.size,
      mostCommentedItem,
      contentFeedbackCounts,
      recentFeedback: allFeedback
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    };
  }, [allFeedback, comparison.columns]);

  if (stats.totalFeedback === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Feedback Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-12 text-center">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="text-base font-medium">No feedback yet</p>
            <p className="text-sm">
              Share this page to start collecting feedback!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Feedback Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalFeedback}</div>
            <div className="text-muted-foreground text-xs">Total Feedback</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalRatings}</div>
            <div className="text-muted-foreground text-xs">Ratings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalComments}</div>
            <div className="text-muted-foreground text-xs">Comments</div>
          </div>
        </div>

        {/* Average Rating */}
        {stats.averageRating !== null && (
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Average Rating</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-bold">
                  {stats.averageRating.toFixed(1)}
                </span>
              </div>
            </div>
            {/* Rating Distribution */}
            {Object.keys(stats.ratingDistribution).length > 0 && (
              <div className="mt-3 space-y-1.5">
                {Object.entries(stats.ratingDistribution)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([rating, count]) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-muted-foreground w-8 text-xs">
                        {rating === "-1" ? "−" : rating}
                      </span>
                      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${(count / stats.totalRatings) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right text-xs">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Contributors */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">
              {stats.uniqueAuthors} Contributor
              {stats.uniqueAuthors !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Most Commented Item */}
        {stats.mostCommentedItem && (
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="mb-2 text-sm font-medium">Most Discussed Item</div>
            <div className="text-muted-foreground text-xs">
              {stats.mostCommentedItem.type === "photo" ? (
                <span>Photo {stats.mostCommentedItem.caption || ""}</span>
              ) : (
                <span>{stats.mostCommentedItem.prompt || "Prompt"}</span>
              )}
            </div>
            <Badge variant="secondary" className="mt-2">
              {stats.contentFeedbackCounts[stats.mostCommentedItem.id] || 0}{" "}
              feedback
            </Badge>
          </div>
        )}

        {/* Recent Feedback */}
        {stats.recentFeedback.length > 0 && (
          <div>
            <div className="mb-3 text-sm font-medium">Recent Feedback</div>
            <div className="space-y-3">
              {stats.recentFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="border-border/50 rounded-lg border p-3"
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={feedback.author?.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {feedback.author?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {feedback.author?.name || "Anonymous"}
                        </span>
                        {feedback.rating !== null &&
                          feedback.rating !== undefined && (
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{feedback.rating}</span>
                            </div>
                          )}
                        <span className="text-muted-foreground text-[10px]">
                          {formatDistanceToNow(new Date(feedback.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {feedback.body && (
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {feedback.body}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
