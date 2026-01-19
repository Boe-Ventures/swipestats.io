import { copy, del, head, list, put } from "@vercel/blob";

import type { ListBlobResult, PutBlobResult } from "@vercel/blob";

// Types
export interface BlobMetadata {
  width?: number;
  height?: number;
  duration?: number; // for video/audio
  [key: string]: unknown;
}

export interface BlobUploadOptions {
  access: "public";
  addRandomSuffix?: boolean;
  cacheControlMaxAge?: number;
  contentType?: string;
  metadata?: BlobMetadata;
}

export interface BlobUploadResult extends PutBlobResult {
  metadata?: BlobMetadata;
}

export interface BlobListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
  mode?: "expanded" | "folded";
}

export interface BlobDeleteResult {
  success: boolean;
  url: string;
  deletedAt: Date;
}

export interface BlobCopyResult extends PutBlobResult {
  originalUrl: string;
}

// File validation utilities
export const ALLOWED_FILE_TYPES = {
  IMAGE: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  VIDEO: ["video/mp4", "video/webm", "video/quicktime"],
  AUDIO: ["audio/mpeg", "audio/wav", "audio/ogg"],
} as const;

export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  AUDIO: 25 * 1024 * 1024, // 25MB
} as const;

export function validateFileType(
  contentType: string,
  allowedTypes: string[],
): boolean {
  return allowedTypes.includes(contentType);
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

export function getFileCategory(
  contentType: string,
): keyof typeof ALLOWED_FILE_TYPES | "OTHER" {
  if ((ALLOWED_FILE_TYPES.IMAGE as readonly string[]).includes(contentType))
    return "IMAGE";
  if ((ALLOWED_FILE_TYPES.VIDEO as readonly string[]).includes(contentType))
    return "VIDEO";
  if ((ALLOWED_FILE_TYPES.AUDIO as readonly string[]).includes(contentType))
    return "AUDIO";
  return "OTHER";
}

// Blob path utilities
export function generateBlobPath(
  category: string,
  filename: string,
  userId?: string,
  resourceType?: string,
  resourceId?: string,
): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  if (resourceType && resourceId) {
    return `${category}/${resourceType}/${resourceId}/${timestamp}/${filename}`;
  }

  if (userId) {
    return `${category}/users/${userId}/${timestamp}/${filename}`;
  }

  return `${category}/${timestamp}/${filename}`;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Private helper function
function validateToken(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Blob storage not configured - BLOB_READ_WRITE_TOKEN missing",
    );
  }
}

/**
 * Upload a file to Vercel Blob
 */
export async function uploadBlob(
  pathname: string,
  data: Buffer | File | ReadableStream | string,
  options: BlobUploadOptions = { access: "public" },
): Promise<BlobUploadResult> {
  validateToken();

  try {
    console.log(`📤 Uploading blob to: ${pathname}`);

    const result = await put(pathname, data, {
      access: options.access,
      addRandomSuffix: options.addRandomSuffix ?? true,
      cacheControlMaxAge: options.cacheControlMaxAge,
      contentType: options.contentType,
    });

    console.log(`✅ Blob uploaded successfully: ${result.url}`);

    return {
      ...result,
      metadata: options.metadata,
    };
  } catch (error) {
    console.error("❌ Blob upload failed:", error);
    throw new Error(
      `Failed to upload blob: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Upload an image with automatic path generation and validation
 */
export async function uploadImage(
  file: Buffer | File,
  filename: string,
  userId?: string,
  options: Partial<BlobUploadOptions> & {
    resourceType?: string;
    resourceId?: string;
  } = {},
): Promise<BlobUploadResult> {
  const sanitizedFilename = sanitizeFilename(filename);
  const pathname = generateBlobPath(
    "images",
    sanitizedFilename,
    userId,
    options.resourceType,
    options.resourceId,
  );

  const metadata: BlobMetadata = {
    ...options.metadata,
  };

  return uploadBlob(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/jpeg", // Will be auto-detected by Vercel Blob
    ...options,
    metadata,
  });
}

/**
 * List blobs with optional filtering
 */
export async function listBlobs(
  options: BlobListOptions = {},
): Promise<ListBlobResult> {
  validateToken();

  try {
    console.log(`📋 Listing blobs with options:`, options);

    const result = await list({
      prefix: options.prefix,
      limit: options.limit ?? 1000,
      cursor: options.cursor,
      mode: options.mode ?? "expanded",
    });

    console.log(`✅ Found ${result.blobs.length} blobs`);
    return result;
  } catch (error) {
    console.error("❌ Blob list failed:", error);
    throw new Error(
      `Failed to list blobs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get blob metadata
 */
export async function getBlobMetadata(url: string) {
  validateToken();

  try {
    console.log(`📊 Getting metadata for: ${url}`);

    const result = await head(url);

    console.log(`✅ Retrieved metadata for blob`);
    return result;
  } catch (error) {
    console.error("❌ Get metadata failed:", error);
    throw new Error(
      `Failed to get blob metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Delete a blob
 */
export async function deleteBlob(url: string): Promise<BlobDeleteResult> {
  validateToken();

  try {
    console.log(`🗑️ Deleting blob: ${url}`);

    await del(url);

    console.log(`✅ Blob deleted successfully`);
    return {
      success: true,
      url,
      deletedAt: new Date(),
    };
  } catch (error) {
    console.error("❌ Blob deletion failed:", error);
    throw new Error(
      `Failed to delete blob: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Copy a blob to a new location
 */
export async function copyBlob(
  fromUrl: string,
  toPathname: string,
  options: Partial<BlobUploadOptions> = {},
): Promise<BlobCopyResult> {
  validateToken();

  try {
    console.log(`📋 Copying blob from ${fromUrl} to ${toPathname}`);

    const result = await copy(fromUrl, toPathname, {
      access: options.access ?? "public",
      addRandomSuffix: options.addRandomSuffix ?? true,
    });

    console.log(`✅ Blob copied successfully: ${result.url}`);
    return {
      ...result,
      originalUrl: fromUrl,
    };
  } catch (error) {
    console.error("❌ Blob copy failed:", error);
    throw new Error(
      `Failed to copy blob: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Bulk delete blobs
 */
export async function deleteBulkBlobs(
  urls: string[],
): Promise<{ success: string[]; failed: { url: string; error: string }[] }> {
  const results = await Promise.allSettled(urls.map((url) => deleteBlob(url)));

  const success: string[] = [];
  const failed: { url: string; error: string }[] = [];

  results.forEach((result, index) => {
    const url = urls[index]!;
    if (result.status === "fulfilled") {
      success.push(url);
    } else {
      failed.push({
        url,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown error",
      });
    }
  });

  return { success, failed };
}

/**
 * Upload a JSON file to Vercel Blob
 */
export async function uploadJsonBlob(
  pathname: string,
  json: unknown,
): Promise<BlobUploadResult> {
  const jsonString = JSON.stringify(json);
  const jsonSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
  console.log(`📦 JSON size: ${jsonSizeMB} MB`);

  return uploadBlob(pathname, jsonString, {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
  });
}

/**
 * Upload Tinder data JSON to Vercel Blob
 */
export async function uploadTinderDataJson(
  tinderId: string,
  json: unknown,
): Promise<BlobUploadResult> {
  const pathname = `tinder-data/${tinderId}/${Date.now()}.json`;
  return uploadJsonBlob(pathname, json);
}

// Service object export with clean API
export const BlobService = {
  upload: uploadBlob,
  uploadImage: uploadImage,
  uploadJson: uploadJsonBlob,
  uploadTinderData: uploadTinderDataJson,
  list: listBlobs,
  getMetadata: getBlobMetadata,
  delete: deleteBlob,
  copy: copyBlob,
  deleteBulk: deleteBulkBlobs,
  // Utility functions
  validateFileType,
  validateFileSize,
  getFileCategory,
  generateBlobPath,
  sanitizeFilename,
} as const;

// Export types
export type { PutBlobResult, ListBlobResult } from "@vercel/blob";
