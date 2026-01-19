import { and, eq, isNull } from "drizzle-orm";

import type { ResourceType } from "../db/schema";
import { db } from "../db";
import { attachmentTable } from "../db/schema";
import type { BlobMetadata, BlobUploadResult } from "./blob.service";
import { BlobService } from "./blob.service";

// Types
export interface AttachmentCreateInput {
  file: Buffer | File;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  resourceType: ResourceType;
  resourceId: string;
  uploadedBy: string;
  metadata?: BlobMetadata;
}

export interface AttachmentWithBlob {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  uploadedBy: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  deletedAt: Date | null;
  blobMetadata?: BlobMetadata;
}

export interface AttachmentUploadResult extends AttachmentWithBlob {
  blobResult: BlobUploadResult;
}

/**
 * Upload a file and create an attachment record
 */
export async function uploadAttachment(
  input: AttachmentCreateInput,
): Promise<AttachmentUploadResult> {
  try {
    console.log(
      `📎 Creating attachment for ${input.resourceType}:${input.resourceId}`,
    );

    // Upload to blob storage
    const blobResult = await BlobService.uploadImage(
      input.file,
      input.filename,
      input.uploadedBy,
      {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: input.metadata,
      },
    );

    // Create database record
    const [attachment] = await db
      .insert(attachmentTable)
      .values({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        uploadedBy: input.uploadedBy,
        filename: input.filename,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        size: input.size,
        url: blobResult.url,
        metadata: input.metadata || {},
      })
      .returning();

    if (!attachment) {
      // Cleanup blob if database insert fails
      await BlobService.delete(blobResult.url).catch(console.error);
      throw new Error("Failed to create attachment record");
    }

    console.log(`✅ Attachment created: ${attachment.id}`);

    return {
      ...attachment,
      metadata: attachment.metadata as Record<string, unknown>,
      blobResult,
      blobMetadata: blobResult.metadata,
    };
  } catch (error) {
    console.error("❌ Attachment upload failed:", error);
    throw new Error(
      `Failed to upload attachment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Upload multiple attachments
 */
export async function uploadMultipleAttachments(
  inputs: AttachmentCreateInput[],
): Promise<{
  success: AttachmentUploadResult[];
  failed: { input: AttachmentCreateInput; error: string }[];
}> {
  const results = await Promise.allSettled(
    inputs.map((input) => uploadAttachment(input)),
  );

  const success: AttachmentUploadResult[] = [];
  const failed: { input: AttachmentCreateInput; error: string }[] = [];

  results.forEach((result, index) => {
    const input = inputs[index]!;
    if (result.status === "fulfilled") {
      success.push(result.value);
    } else {
      failed.push({
        input,
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
 * Get attachments for a resource
 */
export async function getAttachments(
  resourceType: ResourceType,
  resourceId: string,
): Promise<AttachmentWithBlob[]> {
  try {
    const attachments = await db.query.attachmentTable.findMany({
      where: and(
        eq(attachmentTable.resourceType, resourceType),
        eq(attachmentTable.resourceId, resourceId),
        isNull(attachmentTable.deletedAt),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return attachments.map((attachment) => ({
      ...attachment,
      metadata: attachment.metadata as Record<string, unknown>,
    }));
  } catch (error) {
    console.error("❌ Get attachments failed:", error);
    throw new Error(
      `Failed to get attachments: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get a single attachment by ID
 */
export async function getAttachment(
  id: string,
): Promise<AttachmentWithBlob | null> {
  try {
    const attachment = await db.query.attachmentTable.findFirst({
      where: and(eq(attachmentTable.id, id), isNull(attachmentTable.deletedAt)),
    });

    if (!attachment) return null;

    return {
      ...attachment,
      metadata: attachment.metadata as Record<string, unknown>,
    };
  } catch (error) {
    console.error("❌ Get attachment failed:", error);
    throw new Error(
      `Failed to get attachment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Delete an attachment (soft delete + blob cleanup)
 */
export async function deleteAttachment(
  id: string,
  userId: string,
): Promise<{ success: boolean; deletedAt: Date }> {
  try {
    console.log(`🗑️ Deleting attachment: ${id}`);

    // Get attachment to verify ownership and get blob URL
    const attachment = await getAttachment(id);
    if (!attachment) {
      throw new Error("Attachment not found");
    }

    // Verify ownership (only uploader can delete)
    if (attachment.uploadedBy !== userId) {
      throw new Error("You can only delete your own attachments");
    }

    // Soft delete in database
    const deletedAt = new Date();
    await db
      .update(attachmentTable)
      .set({ deletedAt })
      .where(eq(attachmentTable.id, id));

    // Delete from blob storage (fire and forget - don't fail if blob deletion fails)
    BlobService.delete(attachment.url).catch((error: unknown) => {
      console.error(`⚠️ Failed to delete blob ${attachment.url}:`, error);
    });

    console.log(`✅ Attachment deleted: ${id}`);
    return { success: true, deletedAt };
  } catch (error) {
    console.error("❌ Delete attachment failed:", error);
    throw new Error(
      `Failed to delete attachment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Delete all attachments for a resource
 */
export async function deleteResourceAttachments(
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
): Promise<{
  deleted: number;
  failed: string[];
}> {
  try {
    console.log(
      `🗑️ Deleting all attachments for ${resourceType}:${resourceId}`,
    );

    const attachments = await getAttachments(resourceType, resourceId);

    // Filter to only include attachments owned by the user
    const userAttachments = attachments.filter(
      (att) => att.uploadedBy === userId,
    );

    if (userAttachments.length === 0) {
      return { deleted: 0, failed: [] };
    }

    // Soft delete all user attachments
    const deletedAt = new Date();
    await db
      .update(attachmentTable)
      .set({ deletedAt })
      .where(
        and(
          eq(attachmentTable.resourceType, resourceType),
          eq(attachmentTable.resourceId, resourceId),
          eq(attachmentTable.uploadedBy, userId),
          isNull(attachmentTable.deletedAt),
        ),
      );

    // Delete blobs (fire and forget)
    const blobUrls = userAttachments.map((att) => att.url);
    BlobService.deleteBulk(blobUrls).catch((error) => {
      console.error(`⚠️ Failed to delete some blobs:`, error);
    });

    console.log(
      `✅ Deleted ${userAttachments.length} attachments for ${resourceType}:${resourceId}`,
    );
    return { deleted: userAttachments.length, failed: [] };
  } catch (error) {
    console.error("❌ Delete resource attachments failed:", error);
    throw new Error(
      `Failed to delete resource attachments: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Update attachment metadata
 */
export async function updateAttachmentMetadata(
  id: string,
  userId: string,
  metadata: Record<string, unknown>,
): Promise<AttachmentWithBlob> {
  try {
    console.log(`📝 Updating attachment metadata: ${id}`);

    // Verify ownership
    const attachment = await getAttachment(id);
    if (!attachment) {
      throw new Error("Attachment not found");
    }

    if (attachment.uploadedBy !== userId) {
      throw new Error("You can only update your own attachments");
    }

    // Update metadata
    const [updatedAttachment] = await db
      .update(attachmentTable)
      .set({
        metadata: { ...attachment.metadata, ...metadata },
      })
      .where(eq(attachmentTable.id, id))
      .returning();

    if (!updatedAttachment) {
      throw new Error("Failed to update attachment metadata");
    }

    console.log(`✅ Attachment metadata updated: ${id}`);
    return {
      ...updatedAttachment,
      metadata: updatedAttachment.metadata as Record<string, unknown>,
    };
  } catch (error) {
    console.error("❌ Update attachment metadata failed:", error);
    throw new Error(
      `Failed to update attachment metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Copy attachment to another resource
 */
export async function copyAttachment(
  sourceAttachmentId: string,
  targetResourceType: ResourceType,
  targetResourceId: string,
  userId: string,
): Promise<AttachmentUploadResult> {
  try {
    console.log(
      `📋 Copying attachment ${sourceAttachmentId} to ${targetResourceType}:${targetResourceId}`,
    );

    const sourceAttachment = await getAttachment(sourceAttachmentId);
    if (!sourceAttachment) {
      throw new Error("Source attachment not found");
    }

    // Copy blob to new location
    const newFilename = `copy-of-${sourceAttachment.filename}`;
    const blobResult = await BlobService.copy(
      sourceAttachment.url,
      `${targetResourceType}/${targetResourceId}/${newFilename}`,
      { addRandomSuffix: true },
    );

    // Create new attachment record
    const [newAttachment] = await db
      .insert(attachmentTable)
      .values({
        resourceType: targetResourceType,
        resourceId: targetResourceId,
        uploadedBy: userId,
        filename: newFilename,
        originalFilename: `copy-of-${sourceAttachment.originalFilename}`,
        mimeType: sourceAttachment.mimeType,
        size: sourceAttachment.size,
        url: blobResult.url,
        metadata: sourceAttachment.metadata,
      })
      .returning();

    if (!newAttachment) {
      // Cleanup blob if database insert fails
      await BlobService.delete(blobResult.url).catch(console.error);
      throw new Error("Failed to create copied attachment record");
    }

    console.log(`✅ Attachment copied: ${newAttachment.id}`);
    return {
      ...newAttachment,
      blobResult,
      metadata: newAttachment.metadata as Record<string, unknown>,
    };
  } catch (error) {
    console.error("❌ Copy attachment failed:", error);
    throw new Error(
      `Failed to copy attachment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Service object export with clean API
export const AttachmentService = {
  upload: uploadAttachment,
  uploadMultiple: uploadMultipleAttachments,
  get: getAttachment,
  getAll: getAttachments,
  delete: deleteAttachment,
  deleteAll: deleteResourceAttachments,
  updateMetadata: updateAttachmentMetadata,
  copy: copyAttachment,
} as const;
