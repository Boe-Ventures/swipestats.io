"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Loader2,
  Sparkles,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { DeleteAlert } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useGalleryUpload } from "../_hooks/useGalleryUpload";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { readPhotoAnalysis } from "@/lib/photo-analysis";
import { PhotoGalleryCard } from "../photos/photo-gallery-card";
import {
  COMPOSE_PROVIDERS,
  composeProviderLabel,
  type ComposeProvider,
} from "../compose-providers";

interface PhotoLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The comparison this dialog is opened from. "Build with AI" composes a new
   * column into *this* comparison (rather than creating a disconnected one), and
   * it's the query we refetch so a new draft column shows up immediately.
   */
  comparisonId: string;
}

/**
 * The manage-everything photo library, in a dialog, opened from the comparison
 * edit page. This is the home for uploading, analyzing (so the AI features have
 * something to reason about), building an AI draft, and seeing the analysis
 * results — distinct from `AddContentDialog`, which is the lean picker for
 * dropping photos onto a single column.
 *
 * It deliberately duplicates the standalone `/photos` page's orchestration
 * rather than sharing it: the page navigates away on compose, this one stays in
 * place and refetches the current comparison.
 */
export function PhotoLibraryDialog({
  open,
  onOpenChange,
  comparisonId,
}: PhotoLibraryDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading } = useGalleryUpload();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const isPaid = effectiveTier === "PLUS" || effectiveTier === "ELITE";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Attachment ids currently being analyzed by the "Analyze all" pool — each
  // card reflects its own status from this set.
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const { data: photos, isLoading } = useQuery(
    trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
  );

  const analyzeMutation = useMutation(
    trpc.photoAnalysis.analyze.mutationOptions(),
  );

  const unanalyzedCount = (photos ?? []).filter(
    (p) => p.mimeType.startsWith("image/") && !readPhotoAnalysis(p.metadata),
  ).length;
  const analyzedCount = (photos ?? []).filter(
    (p) => p.mimeType.startsWith("image/") && readPhotoAnalysis(p.metadata),
  ).length;

  // "Analyze all" runs a small worker pool rather than firing every card at
  // once, so we never burst 100 concurrent vision calls (rate limits / cost).
  const handleAnalyzeAll = async () => {
    if (!isPaid) {
      openUpgradeModal({ feature: "aiRoast" });
      return;
    }
    const targets = (photos ?? []).filter(
      (p) => p.mimeType.startsWith("image/") && !readPhotoAnalysis(p.metadata),
    );
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
        // Reveal each photo's tags as soon as it finishes.
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

  const handleCompose = (provider: ComposeProvider) => {
    if (!isPaid) {
      openUpgradeModal({ feature: "aiRoast" });
      return;
    }
    // Target THIS comparison so the AI draft lands next to the existing columns.
    composeMutation.mutate({ provider, comparisonId });
  };

  const deleteAttachmentMutation = useMutation(
    trpc.blob.deleteAttachment.mutationOptions({
      onSuccess: () => {
        toast.success("Photo deleted");
        void queryClient.invalidateQueries(
          trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
        );
        // A deleted photo may have been used in this comparison's columns.
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete photo");
      },
    }),
  );

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    // Reset input so the same files can be selected again, even on failure.
    e.target.value = "";
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  return (
    <>
      <SimpleDialog
        title="Photo library"
        description="Upload, analyze, and build an AI draft from your photos. This library is shared across all your comparisons."
        open={open}
        onOpenChange={onOpenChange}
        size="xl"
        scrollable
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2">
          <p className="text-muted-foreground text-sm">
            {photos?.length || 0} {photos?.length === 1 ? "photo" : "photos"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {analyzedCount > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={composeMutation.isPending}
                    >
                      {composeMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      {composeMutation.isPending
                        ? "Building…"
                        : "Build with AI"}
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
                Analyze {unanalyzedCount}{" "}
                {unanalyzedCount === 1 ? "photo" : "photos"}
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
              {isUploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
        />

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : !photos || photos.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageIcon />
              </EmptyMedia>
              <EmptyTitle>No photos yet</EmptyTitle>
              <EmptyDescription>
                Upload photos to your library, then add them to your profiles or
                let AI build a draft.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload your first photo
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-3">
            {photos.map((photo) => (
              <PhotoGalleryCard
                key={photo.id}
                photo={photo}
                isPaid={isPaid}
                isBulkAnalyzing={analyzingIds.has(photo.id)}
                onRequireUpgrade={() =>
                  openUpgradeModal({ feature: "aiRoast" })
                }
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </SimpleDialog>

      <DeleteAlert
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() =>
          deleteId && deleteAttachmentMutation.mutate({ id: deleteId })
        }
        title="Delete photo?"
        description="This permanently deletes the photo. If it's used in any comparisons, it will be removed from them."
        isLoading={deleteAttachmentMutation.isPending}
      />
    </>
  );
}
