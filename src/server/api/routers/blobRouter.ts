import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { attachmentTable, RESOURCE_TYPES } from "@/server/db/schema";
import { AttachmentService } from "@/server/services/attachment.service";
import { BlobService } from "@/server/services/blob.service";

const resourceTypeSchema = z.enum(RESOURCE_TYPES);

export const blobRouter = createTRPCRouter({
  // Server upload for small files (< 4.5MB)
  uploadFromBase64: protectedProcedure
    .input(
      z.object({
        base64Data: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        resourceType: resourceTypeSchema,
        resourceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Convert base64 to buffer
      const buffer = Buffer.from(input.base64Data, "base64");

      // Validate file size (4.5MB limit for server uploads)
      const maxSize = 4.5 * 1024 * 1024; // 4.5MB
      if (buffer.length > maxSize) {
        throw new Error(
          "File too large for server upload. Use client upload for files > 4.5MB",
        );
      }

      // Create attachment record
      return AttachmentService.upload({
        file: buffer,
        filename: input.filename,
        originalFilename: input.filename,
        mimeType: input.mimeType,
        size: buffer.length,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        uploadedBy: ctx.session.user.id,
      });
    }),

  // Create attachment record from client-side blob upload
  // This is called after Vercel Blob client upload completes
  createAttachmentFromBlob: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        pathname: z.string(),
        contentType: z.string(),
        size: z.number(),
        filename: z.string(),
        resourceType: resourceTypeSchema,
        resourceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log(
        `📎 Creating attachment record for ${input.resourceType}:${input.resourceId} from blob: ${input.url}`,
      );

      // Create the attachment record directly since blob is already uploaded
      const [attachment] = await ctx.db
        .insert(attachmentTable)
        .values({
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          uploadedBy: ctx.session.user.id,
          filename: input.filename,
          originalFilename: input.filename,
          mimeType: input.contentType,
          size: input.size,
          url: input.url,
          metadata: {
            blobPathname: input.pathname,
            uploadType: "client",
          },
        })
        .returning();

      if (!attachment) {
        throw new Error("Failed to create attachment record");
      }

      console.log(`✅ Attachment record created: ${attachment.id}`);

      return {
        ...attachment,
        metadata: attachment.metadata as Record<string, unknown>,
      };
    }),

  // Get attachments for a resource
  getAttachments: protectedProcedure
    .input(
      z.object({
        resourceType: resourceTypeSchema,
        resourceId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return AttachmentService.getAll(input.resourceType, input.resourceId);
    }),

  // Delete attachment
  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return AttachmentService.delete(input.id, ctx.session.user.id);
    }),

  // Get user's recent uploads
  getUserUploads: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        resourceType: resourceTypeSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(attachmentTable.uploadedBy, ctx.session.user.id),
        isNull(attachmentTable.deletedAt),
      ];

      if (input.resourceType) {
        whereConditions.push(
          eq(attachmentTable.resourceType, input.resourceType),
        );
      }

      return ctx.db.query.attachmentTable.findMany({
        where: and(...whereConditions),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        limit: input.limit,
      });
    }),

  // Get storage usage statistics
  getStorageStats: protectedProcedure.query(async ({ ctx }) => {
    // Get user's upload statistics
    const userUploads = await ctx.db.query.attachmentTable.findMany({
      where: and(
        eq(attachmentTable.uploadedBy, ctx.session.user.id),
        isNull(attachmentTable.deletedAt),
      ),
    });

    const totalFiles = userUploads.length;
    const totalSize = userUploads.reduce((sum, upload) => sum + upload.size, 0);

    // Group by resource type
    const byResourceType = userUploads.reduce(
      (acc, upload) => {
        const type = upload.resourceType;
        if (!acc[type]) {
          acc[type] = { count: 0, totalSize: 0 };
        }
        acc[type].count++;
        acc[type].totalSize += upload.size;
        return acc;
      },
      {} as Record<string, { count: number; totalSize: number }>,
    );

    // Group by file type
    const byMimeType = userUploads.reduce(
      (acc, upload) => {
        const category = upload.mimeType.startsWith("image/")
          ? "images"
          : upload.mimeType.startsWith("video/")
            ? "videos"
            : upload.mimeType.startsWith("audio/")
              ? "audio"
              : "other";

        if (!acc[category]) {
          acc[category] = { count: 0, totalSize: 0 };
        }
        acc[category].count++;
        acc[category].totalSize += upload.size;
        return acc;
      },
      {} as Record<string, { count: number; totalSize: number }>,
    );

    return {
      totalFiles,
      totalSize,
      byResourceType,
      byMimeType,
      recentUploads: userUploads
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };
  }),
});
