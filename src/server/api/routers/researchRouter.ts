import { eq } from "drizzle-orm";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { datasetExportTable } from "@/server/db/schema";
import {
  createDatasetCheckout,
  validateDatasetLicenseKey,
  DATASET_PRODUCTS,
  type DatasetTier,
} from "@/server/services/lemonSqueezy.service";
import { generateDatasetForExport } from "@/server/services/datasetExport.service";

import { publicProcedure, protectedProcedure } from "../trpc";

export const researchRouter = {
  // Generate checkout URL for dataset purchase
  createCheckout: publicProcedure
    .input(
      z.object({
        tier: z.enum(["STARTER", "STANDARD", "FRESH", "PREMIUM"]),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const checkoutUrl = await createDatasetCheckout(
          input.tier,
          input.email,
        );
        return { checkoutUrl };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create checkout",
        });
      }
    }),

  // Validate license key and get export status
  getExportByLicenseKey: publicProcedure
    .input(z.object({ licenseKey: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // 1. Check local DB first (fast path)
      const existingExport = await ctx.db.query.datasetExportTable.findFirst({
        where: eq(datasetExportTable.licenseKey, input.licenseKey),
      });

      if (existingExport) {
        const product = DATASET_PRODUCTS[existingExport.tier as DatasetTier];
        return {
          found: true,
          export: {
            id: existingExport.id,
            tier: existingExport.tier,
            status: existingExport.status,
            profileCount: existingExport.profileCount,
            blobUrl: existingExport.blobUrl,
            blobSize: existingExport.blobSize,
            downloadCount: existingExport.downloadCount,
            maxDownloads: existingExport.maxDownloads,
            downloadsRemaining: Math.max(
              0,
              existingExport.maxDownloads - existingExport.downloadCount,
            ),
            expiresAt: existingExport.expiresAt,
            generatedAt: existingExport.generatedAt,
            price: product.price,
          },
        };
      }

      // 2. If not found locally, validate against LemonSqueezy API
      const validation = await validateDatasetLicenseKey(input.licenseKey);

      if (!validation.valid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid license key. Please check your key and try again.",
        });
      }

      // License key is valid but not in our DB yet
      // This might happen if webhook hasn't processed yet
      return {
        found: false,
        valid: true,
        message:
          "License key is valid but dataset generation is still being set up. Please try again in a few moments.",
      };
    }),

  // Increment download count and get signed download URL
  recordDownload: publicProcedure
    .input(z.object({ licenseKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Get the export record
      const exportRecord = await ctx.db.query.datasetExportTable.findFirst({
        where: eq(datasetExportTable.licenseKey, input.licenseKey),
      });

      if (!exportRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Export not found for this license key",
        });
      }

      // Check if dataset is ready
      if (exportRecord.status !== "READY") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Dataset is not ready yet. Status: ${exportRecord.status}`,
        });
      }

      // Check download limit
      if (exportRecord.downloadCount >= exportRecord.maxDownloads) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Download limit reached for this license key",
        });
      }

      // Check if expired
      if (exportRecord.expiresAt && exportRecord.expiresAt < new Date()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This license key has expired",
        });
      }

      // Increment download count and update timestamps
      const now = new Date();
      await ctx.db
        .update(datasetExportTable)
        .set({
          downloadCount: exportRecord.downloadCount + 1,
          firstDownloadedAt: exportRecord.firstDownloadedAt ?? now,
          lastDownloadedAt: now,
        })
        .where(eq(datasetExportTable.id, exportRecord.id));

      // Return the blob URL (it's already public)
      return {
        downloadUrl: exportRecord.blobUrl!,
        downloadsRemaining: Math.max(
          0,
          exportRecord.maxDownloads - exportRecord.downloadCount - 1,
        ),
      };
    }),

  // Admin: list all exports
  listExports: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Check if user is admin (you'll need to implement role checking)
      // For now, just return the exports
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const exports = await ctx.db.query.datasetExportTable.findMany({
        limit,
        offset,
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      return { exports };
    }),

  // Admin: retry failed generation
  retryGeneration: protectedProcedure
    .input(z.object({ exportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      // For now, just proceed

      const exportRecord = await ctx.db.query.datasetExportTable.findFirst({
        where: eq(datasetExportTable.id, input.exportId),
      });

      if (!exportRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Export not found",
        });
      }

      if (exportRecord.status !== "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only retry failed exports",
        });
      }

      // Reset to PENDING and trigger generation
      await ctx.db
        .update(datasetExportTable)
        .set({ status: "PENDING" })
        .where(eq(datasetExportTable.id, input.exportId));

      // Trigger generation (in production, use waitUntil or queue)
      // For now, fire and forget
      generateDatasetForExport(input.exportId).catch((error) => {
        console.error("Failed to retry generation:", error);
      });

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
