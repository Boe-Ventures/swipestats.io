"use client";

import React, { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send, Loader2, Trash2, Star } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";

/** What the feedback is about — renders the photo-aware dialog header. */
export interface FeedbackContext {
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId?: string;
  columnId?: string;
  comparisonId?: string;
  /** Whose profile this is — personalizes the empty state. */
  profileName?: string;
  /** The photo/prompt being discussed; omit for plain column-level feedback. */
  context?: FeedbackContext;
}

/** 1-5 star picker; clicking the current value clears it back to "no rating". */
function StarRating({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value?: number) => void;
}) {
  const [hovered, setHovered] = useState<number>();
  const active = hovered ?? value ?? 0;
  return (
    <div className="flex" onMouseLeave={() => setHovered(undefined)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} of 5`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(value === star ? undefined : star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              active >= star
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function FeedbackDialog({
  open,
  onOpenChange,
  contentId,
  columnId,
  comparisonId,
  profileName,
  context,
}: FeedbackDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);

  const { data: session } = authClient.useSession();

  const feedbackQueryInput = {
    ...(contentId ? { contentId } : {}),
    ...(columnId && !contentId ? { columnId } : {}),
    ...(comparisonId && !contentId && !columnId ? { comparisonId } : {}),
  };

  const feedbackQueryOptions =
    trpc.profileCompare.getFeedback.queryOptions(feedbackQueryInput);

  const invalidateFeedbackQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: feedbackQueryOptions.queryKey,
    });

    if (comparisonId) {
      void queryClient.invalidateQueries({
        queryKey: trpc.profileCompare.getFeedback.queryOptions({
          comparisonId,
        }).queryKey,
      });
    }
  };

  // Get feedback for this content/column
  // If contentId is provided, only query for that content (not the whole column)
  const { data: feedback = [] } = useQuery({
    ...feedbackQueryOptions,
    enabled: open && (!!contentId || !!columnId || !!comparisonId),
  });

  // Create feedback mutation
  const createFeedback = useMutation(
    trpc.profileCompare.createFeedback.mutationOptions({
      onSuccess: () => {
        invalidateFeedbackQueries();
        setComment("");
        setRating(undefined);
        toast.success("Feedback added successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add feedback");
      },
    }),
  );

  // Delete feedback mutation
  const deleteFeedback = useMutation(
    trpc.profileCompare.deleteFeedback.mutationOptions({
      onSuccess: () => {
        invalidateFeedbackQueries();
        toast.success("Feedback deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete feedback");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && rating === undefined) {
      toast.error("Please provide a comment or rating");
      return;
    }

    // Only pass contentId OR columnId, not both
    createFeedback.mutate({
      ...(contentId ? { contentId } : {}),
      ...(columnId && !contentId ? { columnId } : {}),
      body: comment.trim() || undefined,
      rating,
    });
  };

  const handleDelete = (feedbackId: string) => {
    deleteFeedback.mutate({ feedbackId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" size="lg">
        <DialogHeader>
          {context ? (
            <div className="flex items-center gap-3 text-left">
              {context.imageUrl && (
                <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={context.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-primary text-[11px] font-bold tracking-widest uppercase">
                  Feedback
                </p>
                <DialogTitle className="truncate">{context.title}</DialogTitle>
                {context.subtitle && (
                  <p className="text-muted-foreground truncate text-sm">
                    {context.subtitle}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <DialogTitle>
              Feedback{feedback.length > 0 ? ` (${feedback.length})` : ""}
            </DialogTitle>
          )}
        </DialogHeader>

        {/* Feedback List */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-1 py-4">
          {feedback.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-foreground text-base font-medium">
                Be the first to weigh in
              </p>
              <p className="text-sm">
                Your honest take helps {profileName || "them"} pick the right
                photos.
              </p>
            </div>
          ) : (
            feedback.map((item) => (
              <div
                key={item.id}
                className="border-border/50 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={item.author?.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {item.author?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {item.author?.name || "Anonymous"}
                      </span>
                      {item.rating !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{item.rating}</span>
                        </div>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    {item.body && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{item.body}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Delete button - only show for own feedback */}
                  {session?.user?.id === item.authorId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="bg-muted h-7 w-7"
                        >
                          <span className="sr-only">More options</span>
                          <span className="text-xs">⋯</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteFeedback.isPending}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Feedback Form */}
        <DialogFooter className="border-t pt-4">
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            {/* Rating */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Rate this {contentId ? "photo" : "profile"}{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  optional
                </span>
              </span>
              <StarRating value={rating} onChange={setRating} />
            </div>

            {/* Comment */}
            <Textarea
              placeholder="What's working? What would you change? Be honest..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit(e);
                }
              }}
              rows={3}
              maxLength={2000}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Markdown supported
              </p>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex">
                  <kbd className="bg-muted rounded border px-1.5 py-0.5">⌘</kbd>
                  <kbd className="bg-muted rounded border px-1.5 py-0.5">↵</kbd>
                </span>
                <Button
                  type="submit"
                  disabled={
                    createFeedback.isPending ||
                    (!comment.trim() && rating === undefined)
                  }
                  size="sm"
                >
                  {createFeedback.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {createFeedback.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
