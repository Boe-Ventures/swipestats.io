"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Pencil, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/form-new";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PromptSelector } from "./prompt-selector";
import type { Prompt } from "@/lib/prompt-bank";

type ContentItem =
  RouterOutputs["profileCompare"]["get"]["columns"][number]["content"][number];

interface EditContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem | null;
  comparisonId: string;
}

export function EditContentDialog({
  open,
  onOpenChange,
  content,
  comparisonId,
}: EditContentDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [promptSelectorOpen, setPromptSelectorOpen] = useState(false);

  // Initialize form when content changes
  useEffect(() => {
    if (content) {
      setCaption(content.caption || "");
      setPrompt(content.prompt || "");
      setAnswer(content.answer || "");
    }
  }, [content]);

  const updateMutation = useMutation(
    trpc.profileCompare.updateContent.mutationOptions({
      onSuccess: () => {
        toast.success("Content updated!");
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update content");
      },
    }),
  );

  const handleSelectPrompt = (selectedPrompt: Prompt) => {
    setPrompt(selectedPrompt.text);
  };

  const handleSave = () => {
    if (!content) return;

    if (content.type === "photo") {
      // For photos, only update caption
      updateMutation.mutate({
        contentId: content.id,
        caption: caption || undefined,
      });
    } else if (content.type === "prompt") {
      // For prompts, update prompt and answer
      if (!prompt.trim() || !answer.trim()) {
        toast.error("Prompt and answer are required");
        return;
      }
      updateMutation.mutate({
        contentId: content.id,
        prompt: prompt.trim(),
        answer: answer.trim(),
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setCaption("");
    setPrompt("");
    setAnswer("");
  };

  if (!content) return null;

  return (
    <>
      <SimpleDialog
        title={content.type === "photo" ? "Edit Photo Caption" : "Edit Prompt"}
        description={
          content.type === "photo"
            ? "Update the caption for this photo"
            : "Update the prompt and answer"
        }
        open={open}
        onOpenChange={handleClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          {content.type === "photo" && (
            <>
              {/* Show preview of the photo */}
              {content.attachment && (
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <Image
                    src={content.attachment.url}
                    alt="Photo preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="caption">Caption</FieldLabel>
                <Input
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g., Too tall to be a hobbit"
                />
                <p className="text-muted-foreground text-xs">
                  Leave empty to remove caption
                </p>
              </Field>
            </>
          )}

          {content.type === "prompt" && (
            <>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="prompt">Prompt</FieldLabel>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPromptSelectorOpen(true)}
                    className="h-auto px-2 py-1 text-xs"
                  >
                    <List className="mr-1 h-3 w-3" />
                    Browse Prompts
                  </Button>
                </div>
                <Input
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., My simple pleasures"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="answer">Answer</FieldLabel>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g., Coffee and long walks"
                  className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                />
              </Field>
            </>
          )}
        </div>
      </SimpleDialog>

      {/* Prompt Selector Dialog */}
      <PromptSelector
        open={promptSelectorOpen}
        onOpenChange={setPromptSelectorOpen}
        onSelect={handleSelectPrompt}
      />
    </>
  );
}
