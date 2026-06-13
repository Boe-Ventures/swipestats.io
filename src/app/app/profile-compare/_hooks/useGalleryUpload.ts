"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

import { toast } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";
import { userPhotoPath } from "@/lib/blob-paths";

export type GalleryAttachment =
  RouterOutputs["blob"]["createAttachmentFromBlob"];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadOptions {
  /** Show a "N photos uploaded" success toast. Defaults to true. */
  successToast?: boolean;
}

function validate(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `${file.name}: must be a JPG, PNG, WebP, or GIF`;
  }
  if (file.size > MAX_SIZE) {
    return `${file.name}: must be smaller than 10MB`;
  }
  return null;
}

/**
 * Single source of truth for uploading photos into the user's gallery.
 *
 * Uploads each file directly to Blob storage, then creates the `attachment`
 * record client-side via the idempotent `createAttachmentFromBlob` mutation.
 * This works identically in local dev and production (it does not depend on the
 * upload webhook, which never reaches localhost). Used by both the standalone
 * gallery page and the per-profile "Add Content" dialog.
 *
 * Returns the created attachment rows so callers can immediately attach them to
 * a profile column if they want.
 */
export function useGalleryUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  const createAttachment = useMutation(
    trpc.blob.createAttachmentFromBlob.mutationOptions(),
  );

  const uploadOne = async (file: File): Promise<GalleryAttachment> => {
    const userId = session?.user?.id;
    if (!userId) {
      throw new Error("You must be signed in to upload photos");
    }
    const result = await upload(userPhotoPath(userId, file.name), file, {
      access: "public",
      handleUploadUrl: "/api/blob/client-upload",
      clientPayload: JSON.stringify({
        resourceType: "user_photo",
        resourceId: "gallery",
      }),
    });

    return createAttachment.mutateAsync({
      url: result.url,
      pathname: result.pathname,
      contentType: result.contentType || file.type,
      size: file.size,
      filename: file.name,
      resourceType: "user_photo",
      resourceId: "gallery",
    });
  };

  /**
   * Upload one or more files. Invalid files are skipped with a toast; valid
   * files upload in parallel. Resolves with the attachments that succeeded.
   */
  const uploadFiles = async (
    files: File[],
    options: UploadOptions = {},
  ): Promise<GalleryAttachment[]> => {
    const { successToast = true } = options;
    if (files.length === 0) return [];

    // Filter out invalid files up front so one bad file doesn't block the rest.
    const valid: File[] = [];
    for (const file of files) {
      const error = validate(file);
      if (error) {
        toast.error(error);
      } else {
        valid.push(file);
      }
    }
    if (valid.length === 0) return [];

    setIsUploading(true);
    try {
      const results = await Promise.allSettled(valid.map(uploadOne));

      const attachments: GalleryAttachment[] = [];
      let failed = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          attachments.push(result.value);
        } else {
          failed++;
          console.error("Photo upload failed:", result.reason);
        }
      }

      if (failed > 0) {
        toast.error(
          `${failed} ${failed === 1 ? "photo" : "photos"} failed to upload`,
        );
      }
      if (successToast && attachments.length > 0) {
        toast.success(
          `${attachments.length} ${attachments.length === 1 ? "photo" : "photos"} uploaded`,
        );
      }

      // Refresh the gallery wherever it's shown.
      void queryClient.invalidateQueries(
        trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
      );

      return attachments;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}
