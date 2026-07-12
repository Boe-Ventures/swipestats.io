"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useGalleryUpload } from "../_hooks/useGalleryUpload";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { readPhotoAnalysis } from "@/lib/photo-analysis";
import { PhotoGalleryCard } from "./photo-gallery-card";
import {
  COMPOSE_PROVIDERS,
  composeProviderLabel,
  type ComposeProvider,
} from "../compose-providers";

export default function PhotoGalleryPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading } = useGalleryUpload();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const isPaid = effectiveTier === "PLUS" || effectiveTier === "ELITE";
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  // Attachment ids currently being analyzed by the "Analyze all" pool — each
  // card reflects its own status from this set.
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos, isLoading } = useQuery(
    trpc.blob.getUserUploads.queryOptions({
      limit: 100,
    }),
  );

  const analyzeMutation = useMutation(
    trpc.photoAnalysis.analyze.mutationOptions(),
  );

  // How many images still need analysis — drives the "Analyze N photos" button.
  const unanalyzedCount = (photos ?? []).filter(
    (p) => p.mimeType.startsWith("image/") && !readPhotoAnalysis(p.metadata),
  ).length;

  // "Analyze all" runs a small worker pool rather than firing every card at
  // once, so we never burst 100 concurrent vision calls (rate limits / cost).
  // Cards show their status via `analyzingIds`; the gallery refreshes per photo
  // so tags reveal as each completes.
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

  // How many images are analyzed — the composer needs tagged photos to work
  // from, so the "Build a profile" CTA only shows once there's something to use.
  const analyzedCount = (photos ?? []).filter(
    (p) => p.mimeType.startsWith("image/") && readPhotoAnalysis(p.metadata),
  ).length;

  const composeMutation = useMutation(
    trpc.profileCompose.compose.mutationOptions({
      onSuccess: (res) => {
        toast.success(
          `Built a ${composeProviderLabel(res.provider)} profile draft`,
        );
        router.push(`/app/profile-compare/${res.comparisonId}`);
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
    composeMutation.mutate({ provider });
  };

  const deleteAttachmentMutation = useMutation(
    trpc.blob.deleteAttachment.mutationOptions({
      onSuccess: () => {
        toast.success("Photo deleted");
        void queryClient.invalidateQueries(
          trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
        );
        setDeleteDialogOpen(false);
        setPhotoToDelete(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete photo");
      },
    }),
  );

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    // Reset input so the same files can be selected again, even on failure.
    e.target.value = "";
    if (files.length === 0) return;

    await uploadFiles(files);
  };

  const handleDelete = () => {
    if (photoToDelete) {
      deleteAttachmentMutation.mutate({ id: photoToDelete });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photo Gallery</h1>
          <p className="text-muted-foreground mt-1">
            Your uploaded photos ({photos?.length || 0})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analyzedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    disabled={composeMutation.isPending}
                  >
                    {composeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    {composeMutation.isPending
                      ? "Building…"
                      : "Build a profile"}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Compose a profile with AI</DropdownMenuLabel>
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? "Uploading..." : "Upload Photos"}
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

      {/* Photo Grid */}
      {!photos || photos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>No photos yet</EmptyTitle>
            <EmptyDescription>
              Upload photos to your gallery. You can then add them to your
              profile comparisons.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Your First Photo
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <PhotoGalleryCard
              key={photo.id}
              photo={photo}
              isPaid={isPaid}
              isBulkAnalyzing={analyzingIds.has(photo.id)}
              onRequireUpgrade={() => openUpgradeModal({ feature: "aiRoast" })}
              onDelete={(id) => {
                setPhotoToDelete(id);
                setDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo?</DialogTitle>
            <DialogDescription>
              This will permanently delete this photo. If it&apos;s used in any
              comparisons, it will be removed from them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAttachmentMutation.isPending}
            >
              {deleteAttachmentMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
