"use client";

import React, { useState } from "react";
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
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId?: string;
  columnId?: string;
  comparisonId?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  contentId,
  columnId,
  comparisonId,
}: FeedbackDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);

  const { data: session } = authClient.useSession();

  // Get feedback for this content/column
  // If contentId is provided, only query for that content (not the whole column)
  const { data: feedback = [] } = useQuery(
    trpc.profileCompare.getFeedback.queryOptions(
      {
        ...(contentId ? { contentId } : {}),
        ...(columnId && !contentId ? { columnId } : {}),
        ...(comparisonId && !contentId && !columnId ? { comparisonId } : {}),
      },
      {
        enabled: open && (!!contentId || !!columnId || !!comparisonId),
      },
    ),
  );

  // Create feedback mutation
  const createFeedback = useMutation(
    trpc.profileCompare.createFeedback.mutationOptions({
      onSuccess: () => {
        // Invalidate all related feedback queries
        void queryClient.invalidateQueries(
          trpc.profileCompare.getFeedback.queryOptions({ comparisonId }),
        );
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
        // Invalidate all related feedback queries
        void queryClient.invalidateQueries(
          trpc.profileCompare.getFeedback.queryOptions({ comparisonId }),
        );
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
          <DialogTitle>
            Feedback{feedback.length > 0 ? ` (${feedback.length})` : ""}
          </DialogTitle>
        </DialogHeader>

        {/* Feedback List */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-1 py-4">
          {feedback.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-base font-medium">No feedback yet</p>
              <p className="text-sm">Be the first to add feedback!</p>
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Rating:</span>
              <div className="flex gap-1">
                {[-1, 0, 1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setRating(rating === value ? undefined : value)
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
                      rating === value
                        ? "bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {value === -1 ? "−" : value}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <Textarea
              placeholder="Add a comment... (⌘/Ctrl+Enter to submit)"
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
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
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
