"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { formatDistanceToNow } from "date-fns";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function PhotoGalleryPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos, isLoading } = useQuery(
    trpc.blob.getUserUploads.queryOptions({
      limit: 100,
    }),
  );

  const createAttachmentMutation = useMutation(
    trpc.blob.createAttachmentFromBlob.mutationOptions({
      onSuccess: () => {
        toast.success("Photo uploaded!");
        void queryClient.invalidateQueries(
          trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create attachment record");
      },
    }),
  );

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

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        `${file.name}: Please upload an image file (JPG, PNG, WebP, or GIF)`,
      );
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${file.name}: File size must be less than 10MB`);
      return;
    }

    try {
      // Upload to blob storage
      const clientPayload = {
        resourceType: "user_photo",
        resourceId: "gallery", // Generic ID for user photo library
      };

      const result = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/client-upload",
        clientPayload: JSON.stringify(clientPayload),
      });

      console.log("📎 File uploaded:", result.url);

      // Create attachment record
      await createAttachmentMutation.mutateAsync({
        url: result.url,
        pathname: result.pathname,
        contentType: result.contentType || file.type,
        size: file.size,
        filename: file.name,
        resourceType: "user_photo",
        resourceId: "gallery",
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(
        `${file.name}: ${error instanceof Error ? error.message : "Failed to upload"}`,
      );
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    // Upload all files in parallel
    const uploadPromises = files.map((file) => handleFileUpload(file));

    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      // Individual errors already handled in handleFileUpload
      console.error("Some uploads failed:", error);
    } finally {
      setIsUploading(false);
    }

    // Reset input so same files can be selected again
    e.target.value = "";
  };

  const handleDelete = () => {
    if (photoToDelete) {
      deleteAttachmentMutation.mutate({ id: photoToDelete });
    }
  };

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <ImageIcon className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No photos yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md text-sm">
              Upload photos to your gallery. You can then add them to your
              profile comparisons.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Your First Photo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => {
            const isImage = photo.mimeType.startsWith("image/");
            const isVideo = photo.mimeType.startsWith("video/");
            const isAudio = photo.mimeType.startsWith("audio/");

            return (
              <Card key={photo.id} className="group overflow-hidden pt-0">
                {/* Media Preview */}
                <div className="bg-muted relative aspect-square overflow-hidden">
                  {isImage ? (
                    <img
                      src={photo.url}
                      alt={photo.originalFilename}
                      className="h-full w-full object-cover"
                    />
                  ) : isVideo ? (
                    <video
                      src={photo.url}
                      className="h-full w-full object-cover"
                    />
                  ) : isAudio ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-muted-foreground">
                        <svg
                          className="h-12 w-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                          />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="text-muted-foreground h-12 w-12" />
                    </div>
                  )}

                  {/* Delete button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setPhotoToDelete(photo.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <CardHeader className="p-4">
                  <CardTitle className="line-clamp-1 text-sm">
                    {photo.originalFilename}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {isImage
                        ? "Image"
                        : isVideo
                          ? "Video"
                          : isAudio
                            ? "Audio"
                            : "File"}
                    </Badge>
                    <span>{getFileSize(photo.size)}</span>
                  </CardDescription>
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(photo.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo?</DialogTitle>
            <DialogDescription>
              This will permanently delete this photo. If it's used in any
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
