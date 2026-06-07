"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Trash2,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { readPhotoAnalysis, PHOTO_TAG_LABELS } from "@/lib/photo-analysis";
import { formatFileSize } from "@/lib/format";

type GalleryPhoto = RouterOutputs["blob"]["getUserUploads"][number];

interface PhotoGalleryCardProps {
  photo: GalleryPhoto;
  /** Whether the user can use AI analysis (PLUS/ELITE). */
  isPaid: boolean;
  /**
   * True while the page's "Analyze all" pool is processing THIS photo. Drives
   * the same overlay as the card's own analyze mutation. The page owns the
   * bulk run (bounded concurrency), so the card just reflects its status.
   */
  isBulkAnalyzing: boolean;
  onRequireUpgrade: () => void;
  onDelete: (id: string) => void;
}

export function PhotoGalleryCard({
  photo,
  isPaid,
  isBulkAnalyzing,
  onRequireUpgrade,
  onDelete,
}: PhotoGalleryCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isImage = photo.mimeType.startsWith("image/");
  const isVideo = photo.mimeType.startsWith("video/");

  // Source of truth is the persisted metadata; the analyze mutation invalidates
  // the gallery query on success so this re-derives without extra local state.
  const analysis = readPhotoAnalysis(photo.metadata);

  const [steerOpen, setSteerOpen] = useState(false);
  const [steer, setSteer] = useState("");

  const analyzeMutation = useMutation(
    trpc.photoAnalysis.analyze.mutationOptions({
      onSuccess: () => {
        setSteer("");
        setSteerOpen(false);
        void queryClient.invalidateQueries(
          trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
        );
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't analyze this photo"),
    }),
  );

  const busy = analyzeMutation.isPending || isBulkAnalyzing;

  const runAnalyze = (steerText?: string) => {
    if (!isPaid) {
      onRequireUpgrade();
      return;
    }
    analyzeMutation.mutate({
      attachmentId: photo.id,
      steer: steerText?.trim() || undefined,
    });
  };

  return (
    <Card className="group overflow-hidden pt-0">
      {/* Media preview */}
      <div className="bg-muted relative aspect-square overflow-hidden">
        {isImage ? (
          <Image
            src={photo.url}
            alt={analysis?.name || photo.originalFilename}
            fill
            className="object-cover"
          />
        ) : isVideo ? (
          <video src={photo.url} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="text-muted-foreground h-12 w-12" />
          </div>
        )}

        {/* Analyzing overlay */}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing…
            </div>
          </div>
        )}

        {/* Hover actions */}
        {!busy && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            {isImage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  analysis ? setSteerOpen((v) => !v) : runAnalyze()
                }
              >
                {analysis ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    Re-analyze
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3 w-3" />
                    Analyze
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(photo.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Info */}
      <CardHeader className="gap-2 p-4">
        <CardTitle className="line-clamp-1 text-sm">
          {analysis?.name || photo.originalFilename}
        </CardTitle>

        {analysis ? (
          <>
            {analysis.description && (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {analysis.description}
              </p>
            )}
            {analysis.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysis.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] font-normal"
                  >
                    {PHOTO_TAG_LABELS[tag]}
                  </Badge>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-xs">
            {isImage
              ? isPaid
                ? "Not analyzed yet"
                : "Analyze with SwipeStats+"
              : photo.originalFilename}
          </p>
        )}

        {/* Steer / correct-and-regenerate row */}
        {steerOpen && (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runAnalyze(steer);
                }
                if (e.key === "Escape") setSteerOpen(false);
              }}
              placeholder="Correct it, e.g. 'that's a kayak'"
              className="h-8 text-xs"
              disabled={busy}
            />
            <Button
              size="sm"
              onClick={() => runAnalyze(steer)}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}

        <p className="text-muted-foreground text-[11px]">
          {formatFileSize(photo.size)} ·{" "}
          {formatDistanceToNow(new Date(photo.createdAt), { addSuffix: true })}
        </p>
      </CardHeader>
    </Card>
  );
}
