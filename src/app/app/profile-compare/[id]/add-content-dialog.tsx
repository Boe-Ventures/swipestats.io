"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  Plus,
  Check,
  CheckCheck,
  List,
  Sparkles,
  Wand2,
  Upload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/components/ui/lib/utils";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PromptSelector } from "./prompt-selector";
import { PromptSuggestions } from "./prompt-suggestions";
import { useGalleryUpload } from "../_hooks/useGalleryUpload";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { readPhotoAnalysis } from "@/lib/photo-analysis";
import { formatFileSize } from "@/lib/format";
import {
  COMPOSE_PROVIDERS,
  composeProviderLabel,
  type ComposeProvider,
} from "../compose-providers";
import { isPromptSource, type Prompt } from "@/lib/prompt-bank";

/** A prompt already on this profile — shown for context in the Prompt tab. */
export interface ExistingPromptItem {
  id: string;
  prompt: string;
  answer: string;
}

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string;
  comparisonId: string;
  appName: string;
  /** Prompts already on this profile (for the "your prompts" context list). */
  existingPrompts?: ExistingPromptItem[];
}

type ContentType = "image" | "prompt";

/** "HINGE" → "Hinge" for the heading; the raw enum stays the picker/prompt key. */
function titleCaseProvider(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function AddContentDialog({
  open,
  onOpenChange,
  columnId,
  comparisonId,
  appName,
  existingPrompts = [],
}: AddContentDialogProps) {
  const [contentType, setContentType] = useState<ContentType>("image");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  // Image selection state
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    new Set(),
  );
  const [photoCaption, setPhotoCaption] = useState("");

  // Library management state (folded in from the standalone photo library)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  // Prompt state
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [promptSelectorOpen, setPromptSelectorOpen] = useState(false);
  const [selectedPromptImageId, setSelectedPromptImageId] = useState<
    string | undefined
  >();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading } = useGalleryUpload();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const isPaid = effectiveTier === "PLUS" || effectiveTier === "ELITE";

  const displayApp = titleCaseProvider(appName);

  // Fetch user's gallery photos (the shared library)
  const { data: galleryPhotos, isLoading: isLoadingGallery } = useQuery(
    trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
  );

  const imagePhotos = (galleryPhotos ?? []).filter((p) =>
    p.mimeType.startsWith("image/"),
  );
  const unanalyzedCount = imagePhotos.filter(
    (p) => !readPhotoAnalysis(p.metadata),
  ).length;
  const analyzedCount = imagePhotos.length - unanalyzedCount;

  const addPhotosMutation = useMutation(
    trpc.profileCompare.addPhotosToColumn.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add photo");
      },
    }),
  );

  const addContentMutation = useMutation(
    trpc.profileCompare.addContentToColumn.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        toast.success("Content added!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add content");
      },
    }),
  );

  const analyzeMutation = useMutation(
    trpc.photoAnalysis.analyze.mutationOptions(),
  );

  const composeMutation = useMutation(
    trpc.profileCompose.compose.mutationOptions({
      onSuccess: (res) => {
        toast.success(
          `Added a ${composeProviderLabel(res.provider)} draft to this comparison`,
        );
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        onOpenChange(false);
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't compose a profile"),
    }),
  );

  const handleTogglePhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleAddSelectedPhotos = async () => {
    if (selectedPhotoIds.size === 0) {
      toast.error("Please select at least one photo");
      return;
    }

    try {
      const ids = Array.from(selectedPhotoIds);
      // Caption only applies when a single photo is selected.
      const caption =
        ids.length === 1 && photoCaption ? photoCaption : undefined;

      await addPhotosMutation.mutateAsync({
        columnId,
        photos: ids.map((attachmentId) => ({ attachmentId, caption })),
      });

      toast.success(
        `${ids.length} ${ids.length === 1 ? "photo" : "photos"} added to ${displayApp}`,
      );

      setSelectedPhotoIds(new Set());
      setPhotoCaption("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add photos:", error);
    }
  };

  // Upload new photos into the shared library. They appear in the grid and are
  // pre-selected so the user can add them with one more tap (the library nature
  // is preserved — they're available to every comparison too).
  const handleUploadNewPhotos = async (files: File[]) => {
    if (files.length === 0) return;

    const attachments = await uploadFiles(files, { successToast: false });
    if (attachments.length === 0) return;

    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      attachments.forEach((a) => next.add(a.id));
      return next;
    });
    toast.success(
      `${attachments.length} ${attachments.length === 1 ? "photo" : "photos"} uploaded — tap Add to put ${attachments.length === 1 ? "it" : "them"} on ${displayApp}`,
    );
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset input so the same files can be selected again.
    e.target.value = "";
    void handleUploadNewPhotos(files);
  };

  // "Analyze N" runs a bounded worker pool so we never burst a hundred vision
  // calls at once; each card flips to "Analyzed" as it finishes.
  const handleAnalyzeAll = async () => {
    if (!isPaid) {
      openUpgradeModal({ feature: "aiRoast" });
      return;
    }
    const targets = imagePhotos.filter((p) => !readPhotoAnalysis(p.metadata));
    if (targets.length === 0) return;

    toast.info(
      `Analyzing ${targets.length} ${targets.length === 1 ? "photo" : "photos"}…`,
    );
    setAnalyzingIds(new Set(targets.map((t) => t.id)));

    const queue = [...targets];
    const CONCURRENCY = 5;
    let failed = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const target = queue.shift();
        if (!target) break;
        try {
          await analyzeMutation.mutateAsync({ attachmentId: target.id });
        } catch {
          failed++;
        } finally {
          setAnalyzingIds((prev) => {
            const next = new Set(prev);
            next.delete(target.id);
            return next;
          });
        }
        void queryClient.invalidateQueries(
          trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
        );
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
    );

    if (failed > 0) {
      toast.error(
        `${failed} ${failed === 1 ? "photo" : "photos"} couldn't be analyzed`,
      );
    }
  };

  const handleCompose = (provider: ComposeProvider) => {
    if (!isPaid) {
      openUpgradeModal({ feature: "aiRoast" });
      return;
    }
    composeMutation.mutate({ provider, comparisonId });
  };

  const handleSelectPrompt = (selectedPrompt: Prompt) => {
    setPrompt(selectedPrompt.text);
    setSelectedPromptImageId(selectedPrompt.imageAttachmentId);
  };

  // Drop an AI-suggested prompt into the custom-prompt form and focus the
  // answer so the user can finish it in their own words (prompts-only flow).
  const handleUseSuggestedPrompt = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
    setAnswer("");
    setSelectedPromptImageId(undefined);
    requestAnimationFrame(() => answerInputRef.current?.focus());
  };

  // Add an AI suggestion (prompt + answer) straight to the profile. Falls back
  // to the form when there's no answer yet so nothing empty gets saved.
  const handleAddSuggestion = async (
    suggestedPrompt: string,
    suggestedAnswer: string,
  ): Promise<boolean> => {
    if (!suggestedAnswer.trim()) {
      handleUseSuggestedPrompt(suggestedPrompt);
      toast.info("Add an answer, then save it below");
      return false;
    }

    try {
      await addContentMutation.mutateAsync({
        columnId,
        type: "prompt",
        prompt: suggestedPrompt.trim(),
        answer: suggestedAnswer.trim(),
      });
      return true;
    } catch (error) {
      console.error("Failed to add suggested prompt:", error);
      return false;
    }
  };

  // Submit the prompt and clear the fields. Returns true on success so callers
  // can decide whether to close the dialog or keep it open for another entry.
  const submitPrompt = async () => {
    if (!prompt.trim() || !answer.trim()) {
      toast.error("Please enter both prompt and answer");
      return false;
    }

    try {
      await addContentMutation.mutateAsync({
        columnId,
        type: "prompt",
        prompt: prompt.trim(),
        answer: answer.trim(),
        attachmentId: selectedPromptImageId, // Include image if prompt has one
      });

      setPrompt("");
      setAnswer("");
      setSelectedPromptImageId(undefined);
      return true;
    } catch (error) {
      console.error("Failed to add prompt:", error);
      return false;
    }
  };

  const handleAddPrompt = async () => {
    if (await submitPrompt()) onOpenChange(false);
  };

  const handleAddAnotherPrompt = async () => {
    if (await submitPrompt()) promptInputRef.current?.focus();
  };

  const clearSelection = () => {
    setSelectedPhotoIds(new Set());
    setPhotoCaption("");
  };

  const handleClose = () => {
    setPrompt("");
    setAnswer("");
    setPhotoCaption("");
    setSelectedPhotoIds(new Set());
    setSelectedPromptImageId(undefined);
    onOpenChange(false);
  };

  const selectedCount = selectedPhotoIds.size;
  const promptValid = !!prompt.trim() && !!answer.trim();

  // ---- Sticky footer (changes with tab + selection) ----
  const imageFooter = (
    <div className="w-full">
      {/* Caption only for a single selected photo (matches the add payload). */}
      {selectedCount === 1 && (
        <div className="mb-3">
          <Label htmlFor="add-caption" className="text-xs">
            Caption{" "}
            <span className="text-muted-foreground font-normal">
              (optional · shows on the card)
            </span>
          </Label>
          <Input
            id="add-caption"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="e.g., Too tall to be a hobbit"
            className="mt-1.5"
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        {selectedCount === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <CheckCheck className="h-4 w-4" />
            Tap photos to add them to {displayApp}
          </div>
        ) : (
          <>
            <span className="text-muted-foreground text-sm">
              <b className="text-foreground font-bold">{selectedCount}</b>{" "}
              selected
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground text-xs font-semibold underline underline-offset-2"
            >
              Clear
            </button>
            <Button
              onClick={handleAddSelectedPhotos}
              disabled={addPhotosMutation.isPending}
              className="whitespace-nowrap"
            >
              {addPhotosMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add {selectedCount} {selectedCount === 1 ? "photo" : "photos"}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const promptFooter = (
    <div className="flex w-full items-center justify-end gap-2">
      <Button
        variant="outline"
        onClick={handleAddAnotherPrompt}
        disabled={!promptValid || addContentMutation.isPending}
      >
        {addContentMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Add &amp; add another
      </Button>
      <Button
        onClick={handleAddPrompt}
        disabled={!promptValid || addContentMutation.isPending}
      >
        Add prompt
      </Button>
    </div>
  );

  // Fixed region between the dialog header and the scrollable grid: tabs +
  // (image) library toolbar. Lives in SimpleDialog's subHeader slot so it
  // stays put while the grid scrolls — no sticky/z-index tricks needed.
  const subHeader = (
    <>
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setContentType("image")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
            contentType === "image"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ImageIcon className="h-4 w-4" />
          Photos
        </button>
        <button
          type="button"
          onClick={() => setContentType("prompt")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
            contentType === "prompt"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Prompt
        </button>
      </div>

      {/* Library toolbar (count + manage actions) */}
      {contentType === "image" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground mr-auto text-sm font-semibold whitespace-nowrap">
            <b className="text-foreground font-bold">{imagePhotos.length}</b>{" "}
            {imagePhotos.length === 1 ? "photo" : "photos"} in your library
          </span>
          {analyzedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={composeMutation.isPending}
                  >
                    {composeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Build with AI
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  Add an AI draft column for
                </DropdownMenuLabel>
                {COMPOSE_PROVIDERS.map((app) => (
                  <DropdownMenuItem
                    key={app.key}
                    onClick={() => handleCompose(app.key)}
                  >
                    {app.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {unanalyzedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleAnalyzeAll()}
              disabled={analyzingIds.size > 0}
            >
              {analyzingIds.size > 0 ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analyze {unanalyzedCount}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload
          </Button>
        </div>
      )}
    </>
  );

  return (
    <>
      <SimpleDialog
        title={
          <>
            Add content to <span className="text-primary">{displayApp}</span>
          </>
        }
        description="Pick from your photo library, upload new, or add a prompt."
        open={open}
        onOpenChange={handleClose}
        size="lg"
        scrollable
        subHeader={subHeader}
        footer={contentType === "image" ? imageFooter : promptFooter}
      >
        {/* Hidden file input — driven by the Upload button + upload tile. */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
        />

        {/* ===== IMAGE TAB ===== */}
        {contentType === "image" &&
          (isLoadingGallery ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {/* Upload tile — first cell */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="border-border hover:border-primary hover:bg-primary/5 hover:text-primary text-muted-foreground group flex min-h-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed p-4 text-center transition"
              >
                <span className="bg-card grid h-9 w-9 place-items-center rounded-[11px] shadow-sm">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </span>
                <b className="text-foreground group-hover:text-primary text-[12.5px] font-bold whitespace-nowrap">
                  Upload new
                </b>
                <span className="text-[10.5px] leading-tight">
                  JPG, PNG, WebP · 10MB
                </span>
              </button>

              {/* Photo cards */}
              {imagePhotos.map((photo) => {
                const isSelected = selectedPhotoIds.has(photo.id);
                const analyzed = !!readPhotoAnalysis(photo.metadata);
                const isAnalyzing = analyzingIds.has(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleTogglePhoto(photo.id)}
                    className={cn(
                      "group bg-card relative flex flex-col overflow-hidden rounded-xl border-[1.5px] text-left transition hover:-translate-y-0.5 hover:shadow-md",
                      isSelected
                        ? "border-primary ring-primary/15 ring-[3px]"
                        : "border-border",
                    )}
                  >
                    <div className="bg-muted relative aspect-[4/5] overflow-hidden">
                      <Image
                        src={photo.url}
                        alt={photo.originalFilename}
                        fill
                        className="object-cover transition group-hover:scale-[1.03]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40" />

                      {/* select check */}
                      <span
                        className={cn(
                          "absolute top-2 right-2 z-[3] grid h-6 w-6 place-items-center rounded-full border-[1.5px] backdrop-blur transition",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-white/90 bg-white/85",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-3.5 w-3.5",
                            isSelected ? "text-white" : "text-transparent",
                          )}
                        />
                      </span>

                      {/* analyzed status chip */}
                      <span className="absolute bottom-2 left-2 z-[3] inline-flex items-center gap-1.5 rounded-full bg-black/40 py-[3px] pr-2 pl-1.5 text-[10.5px] font-semibold text-white backdrop-blur">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            analyzed ? "bg-emerald-400" : "bg-amber-400",
                          )}
                        />
                        {analyzed ? "Analyzed" : "Not analyzed"}
                      </span>

                      {/* analyzing overlay */}
                      {isAnalyzing && (
                        <div className="absolute inset-0 z-[4] grid place-items-center bg-black/50">
                          <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Analyzing…
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="px-2.5 pt-2 pb-2.5">
                      <div className="truncate text-[12.5px] font-semibold">
                        {photo.originalFilename}
                      </div>
                      <div className="text-muted-foreground truncate text-[11px]">
                        {formatFileSize(photo.size)} ·{" "}
                        {formatDistanceToNow(new Date(photo.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

        {/* ===== PROMPT TAB ===== */}
        {contentType === "prompt" && (
          <div className="space-y-4">
            {/* Your current prompts on this profile — context before adding */}
            {existingPrompts.length > 0 && (
              <div className="space-y-2">
                <Label>On this profile ({existingPrompts.length})</Label>
                <div className="space-y-1.5">
                  {existingPrompts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-muted/30 rounded-md border px-3 py-2"
                    >
                      <p className="text-xs font-medium">{p.prompt}</p>
                      {p.answer && (
                        <p className="text-muted-foreground line-clamp-1 text-xs italic">
                          {p.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI prompt suggestions */}
            <PromptSuggestions
              columnId={columnId}
              onAdd={handleAddSuggestion}
              onUsePrompt={handleUseSuggestedPrompt}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or write your own
                </span>
              </div>
            </div>

            {/* Browse Prompts Button */}
            <div>
              <Label>Choose a Prompt</Label>
              <Button
                variant="outline"
                onClick={() => setPromptSelectorOpen(true)}
                className="mt-1 w-full"
              >
                <List className="mr-2 h-4 w-4" />
                Browse {displayApp} prompts
              </Button>
            </div>

            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Input
                ref={promptInputRef}
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., My simple pleasures"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="answer">Answer</Label>
              <textarea
                ref={answerInputRef}
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="e.g., Coffee and long walks"
                className="border-input bg-background mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </SimpleDialog>

      {/* Prompt Selector Dialog */}
      <PromptSelector
        open={promptSelectorOpen}
        onOpenChange={setPromptSelectorOpen}
        onSelect={handleSelectPrompt}
        currentApp={isPromptSource(appName) ? appName : undefined}
      />
    </>
  );
}
