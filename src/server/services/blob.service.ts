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

const MAX_DATA_BLOB_BYTES = 200 * 1024 * 1024;
const BLOB_FETCH_TIMEOUT_MS = 30_000;

/** Only URLs issued by Vercel Blob may be fetched by server upload handlers. */
export function isTrustedVercelBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "blob.vercel-storage.com" ||
        url.hostname.endsWith(".blob.vercel-storage.com")) &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function assertTrustedVercelBlobUrl(url: string): void {
  if (!isTrustedVercelBlobUrl(url)) {
    throw new Error("Blob URL must be an HTTPS Vercel Blob URL.");
  }
}

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

/**
 * Upload a file to Vercel Blob
 */
export async function uploadBlob(
  pathname: string,
  data: Buffer | File | ReadableStream | string,
  options: BlobUploadOptions = { access: "public" },
): Promise<BlobUploadResult> {
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

export class IncompleteBlobDeletionError extends Error {
  constructor(
    public readonly failedCount: number,
    public readonly requestedCount: number,
  ) {
    super(
      `Failed to delete ${failedCount} of ${requestedCount} stored file${requestedCount === 1 ? "" : "s"}. Database records were preserved; retry the deletion.`,
    );
    this.name = "IncompleteBlobDeletionError";
  }
}

/**
 * Turn the bulk API's partial-success result into an all-or-error contract for
 * destructive flows. Callers must run this before deleting the database rows
 * that retain the URLs needed for a later retry.
 */
export function assertBulkBlobDeletionSucceeded(result: {
  success: string[];
  failed: { url: string; error: string }[];
}): void {
  if (result.failed.length > 0) {
    throw new IncompleteBlobDeletionError(
      result.failed.length,
      result.success.length + result.failed.length,
    );
  }
}

export async function deleteBulkBlobsOrThrow(urls: string[]): Promise<void> {
  const result = await deleteBulkBlobs(urls);
  assertBulkBlobDeletionSucceeded(result);
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
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const pathname = `tinder-data/${tinderId}/${date}/data.json`;
  return uploadJsonBlob(pathname, json);
}

/**
 * Upload Hinge data JSON to Vercel Blob
 */
export async function uploadHingeDataJson(
  hingeId: string,
  json: unknown,
): Promise<BlobUploadResult> {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const pathname = `hinge-data/${hingeId}/${date}/data.json`;
  return uploadJsonBlob(pathname, json);
}

/**
 * Fetch blob content from a URL
 */
export async function fetchBlob(url: string): Promise<Response> {
  try {
    assertTrustedVercelBlobUrl(url);
    // console.log(`📥 Fetching blob from: ${url}`);

    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(BLOB_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch blob: ${response.status} ${response.statusText}`,
      );
    }

    // console.log(`✅ Blob fetched successfully`);
    return response;
  } catch (error) {
    console.error("❌ Blob fetch failed:", error);
    throw new Error(
      `Failed to fetch blob: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Fetch and parse JSON blob content
 */
export async function fetchBlobJson<T = unknown>(url: string): Promise<T> {
  const response = await fetchBlob(url);
  try {
    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_DATA_BLOB_BYTES) {
      throw new Error("Blob JSON exceeds the 200 MiB processing limit.");
    }
    if (!response.body) {
      throw new Error("Blob JSON response has no body.");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_DATA_BLOB_BYTES) {
        await reader.cancel();
        throw new Error("Blob JSON exceeds the 200 MiB processing limit.");
      }
      chunks.push(value);
    }

    const body = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(body) as T;
  } catch (error) {
    console.error("❌ Failed to parse blob JSON:", error);
    throw new Error(
      `Failed to parse blob JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Service object export with clean API
export const BlobService = {
  upload: uploadBlob,
  uploadImage: uploadImage,
  uploadJson: uploadJsonBlob,
  uploadTinderData: uploadTinderDataJson,
  uploadHingeData: uploadHingeDataJson,
  fetch: fetchBlob,
  fetchJson: fetchBlobJson,
  list: listBlobs,
  getMetadata: getBlobMetadata,
  delete: deleteBlob,
  copy: copyBlob,
  deleteBulk: deleteBulkBlobs,
  deleteBulkOrThrow: deleteBulkBlobsOrThrow,
  // Utility functions
  validateFileType,
  validateFileSize,
  getFileCategory,
  generateBlobPath,
  sanitizeFilename,
} as const;

// Export types
export type { PutBlobResult, ListBlobResult } from "@vercel/blob";
