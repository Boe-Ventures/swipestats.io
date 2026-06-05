"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Comparison = RouterOutputs["profileCompare"]["getPublic"];

interface FeedbackSummaryProps {
  comparison: Comparison;
}

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000; // feedback within the last day counts as "new"

export function FeedbackSummary({ comparison }: FeedbackSummaryProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const profileName = comparison.profileName || "Marcus";
  const firstColumnId = comparison.columns[0]?.id;

  const feedbackQueryOptions = trpc.profileCompare.getFeedback.queryOptions({
    comparisonId: comparison.id,
  });

  const { data: allFeedback = [] } = useQuery({
    ...feedbackQueryOptions,
    enabled: !!comparison.id,
  });

  // Map each content/column id to the provider + item number so we can tag feedback.
  const sourceById = useMemo(() => {
    const map: Record<string, { provider: string; index: number | null }> = {};
    comparison.columns.forEach((col) => {
      const config = getProviderConfig(col.dataProvider);
      map[col.id] = { provider: col.title || config.name, index: null };
      col.content.forEach((item, i) => {
        map[item.id] = { provider: col.title || config.name, index: i + 1 };
      });
    });
    return map;
  }, [comparison.columns]);

  const feed = useMemo(
    () =>
      [...allFeedback].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [allFeedback],
  );

  const newCount = useMemo(() => {
    const cutoff = Date.now() - NEW_WINDOW_MS;
    return feed.filter((f) => new Date(f.createdAt).getTime() >= cutoff).length;
  }, [feed]);

  const createFeedback = useMutation(
    trpc.profileCompare.createFeedback.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: feedbackQueryOptions.queryKey,
        });
        setComment("");
        toast.success("Feedback sent");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send feedback");
      },
    }),
  );

  const handleSubmit = () => {
    const body = comment.trim();
    if (!body) return;
    if (!firstColumnId) {
      toast.error("Nothing to leave feedback on yet");
      return;
    }
    createFeedback.mutate({ columnId: firstColumnId, body });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Feedback
        </CardTitle>
        {newCount > 0 && (
          <Badge
            variant="secondary"
            className="bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
          >
            {newCount} new
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Feed */}
        {feed.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center py-10 text-center">
            <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">No feedback yet</p>
            <p className="text-xs">
              Share this page to start collecting feedback.
            </p>
          </div>
        ) : (
          <div className="-mr-1 max-h-[520px] flex-1 space-y-5 overflow-y-auto pr-1">
            {feed.map((item) => {
              const source =
                (item.contentId && sourceById[item.contentId]) ||
                (item.columnId && sourceById[item.columnId]) ||
                null;
              return (
                <div key={item.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={item.author?.image ?? undefined} />
                    <AvatarFallback className="text-[11px]">
                      {item.author?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold">
                        {item.author?.name || "Anonymous"}
                      </span>
                      {source && (
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px] font-medium"
                        >
                          {source.provider}
                          {source.index !== null && ` · ${source.index}`}
                        </Badge>
                      )}
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatDistanceToNow(new Date(item.createdAt))}
                      </span>
                    </div>
                    {item.body && (
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {item.body}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Composer */}
        <div className="space-y-2 border-t pt-4">
          <Textarea
            placeholder={`Leave ${profileName} some feedback...`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={2}
            maxLength={2000}
            disabled={!firstColumnId}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                createFeedback.isPending || !comment.trim() || !firstColumnId
              }
            >
              {createFeedback.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
