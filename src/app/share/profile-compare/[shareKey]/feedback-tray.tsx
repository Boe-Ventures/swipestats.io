"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Loader2, MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/lib/utils";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Comparison = RouterOutputs["profileCompare"]["getPublic"];

interface FeedbackTrayProps {
  comparison: Comparison;
}

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000; // feedback within the last day counts as "new"

function initials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

export function FeedbackTray({ comparison }: FeedbackTrayProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);

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

  // A few distinct authors to preview as stacked avatars in the collapsed bar.
  const previewAuthors = useMemo(() => {
    const seen = new Set<string>();
    const authors: {
      id: string;
      name?: string | null;
      image?: string | null;
    }[] = [];
    for (const item of feed) {
      const key = item.authorId ?? item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      authors.push({
        id: key,
        name: item.author?.name,
        image: item.author?.image,
      });
      if (authors.length >= 3) break;
    }
    return authors;
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
    <div className="fixed inset-x-0 bottom-0 z-40">
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-t shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="container mx-auto px-4">
          <Collapsible open={open} onOpenChange={setOpen}>
            {/* Expanding feed sits above the bar so the tray grows upward */}
            <CollapsibleContent>
              <div className="max-h-[45vh] space-y-5 overflow-y-auto py-4">
                {feed.length === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="mb-3 h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">No feedback yet</p>
                    <p className="text-xs">
                      Be the first to leave a comment below.
                    </p>
                  </div>
                ) : (
                  feed.map((item) => {
                    const source =
                      (item.contentId && sourceById[item.contentId]) ||
                      (item.columnId && sourceById[item.columnId]) ||
                      null;
                    return (
                      <div key={item.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={item.author?.image ?? undefined} />
                          <AvatarFallback className="text-[11px]">
                            {initials(item.author?.name)}
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
                  })
                )}
              </div>

              {/* Mobile composer (the inline bar composer is hidden on phones) */}
              <div className="flex items-end gap-2 border-t py-3 sm:hidden">
                <Textarea
                  placeholder="Leave a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  disabled={!firstColumnId}
                  className="max-h-24 min-h-9 flex-1 resize-none py-2"
                />
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    createFeedback.isPending ||
                    !comment.trim() ||
                    !firstColumnId
                  }
                  className="shrink-0"
                >
                  {createFeedback.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CollapsibleContent>

            {/* Always-visible bar */}
            <div className="flex items-center gap-3 py-3">
              <CollapsibleTrigger
                render={
                  <button
                    type="button"
                    className="hover:bg-muted/60 -ml-2 flex min-w-0 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        Feedback
                        <span className="text-muted-foreground font-normal">
                          {feed.length}
                        </span>
                        {newCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-rose-100 px-1.5 py-0 text-[10px] text-rose-600 dark:bg-rose-950 dark:text-rose-300"
                          >
                            {newCount} new
                          </Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground hidden truncate text-xs sm:block">
                        {feed.length === 0
                          ? "Tap to leave a comment"
                          : open
                            ? "Tap to collapse"
                            : "Tap to read all comments"}
                      </span>
                    </span>
                    {previewAuthors.length > 0 && (
                      <span className="hidden items-center -space-x-2 pl-1 sm:flex">
                        {previewAuthors.map((a) => (
                          <Avatar
                            key={a.id}
                            className="ring-background h-6 w-6 ring-2"
                          >
                            <AvatarImage src={a.image ?? undefined} />
                            <AvatarFallback className="text-[9px]">
                              {initials(a.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground ml-1 h-4 w-4 shrink-0 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                }
              />

              {/* Quick composer on desktop; phones use the composer inside the
                  expanded panel so the collapsed bar stays compact */}
              <div className="ml-auto hidden flex-1 items-end justify-end gap-2 sm:flex">
                <Textarea
                  placeholder="Leave a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  disabled={!firstColumnId}
                  className="max-h-24 min-h-9 w-full max-w-md resize-none py-2"
                />
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    createFeedback.isPending ||
                    !comment.trim() ||
                    !firstColumnId
                  }
                  className="shrink-0"
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
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
