import { eq } from "drizzle-orm";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { waitUntil } from "@vercel/functions";

import { datasetExportTable } from "@/server/db/schema";
import {
  createDatasetCheckout,
  validateDatasetLicenseKey,
  getOrderFromLicenseKey,
  isDatasetVariant,
  getDatasetTierFromVariant,
  DATASET_PRODUCTS,
  type DatasetTier,
} from "@/server/services/lemonSqueezy.service";
import { datasetCheckoutSurfaceSchema } from "@/lib/validators";
import {
  ensureDatasetExportForLicense,
  generateDatasetForExport,
} from "@/server/services/datasetExport.service";
import { trackServerEvent } from "@/server/services/analytics.service";

import { publicProcedure, protectedProcedure } from "../trpc";

// NOTE: If you change the export format (filename, content-type, compression),
// also update the download route at src/app/api/download/route.ts
export const researchRouter = {
  // Generate checkout URL for dataset purchase
  createCheckout: publicProcedure
    .input(
      z.object({
        tier: z.enum(["STARTER", "STANDARD", "FRESH", "PREMIUM"]),
        email: z.string().email().optional(),
        surface: datasetCheckoutSurfaceSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const checkout = await createDatasetCheckout(
          input.tier,
          input.email,
          input.surface,
        );
        const product = DATASET_PRODUCTS[input.tier];

        trackServerEvent(
          ctx.session?.user.id ??
            `dataset_checkout:${checkout.checkoutAttemptId}`,
          "dataset_checkout_created",
          {
            productLine: "dataset",
            billingProvider: checkout.billingProvider,
            checkoutAttemptId: checkout.checkoutAttemptId,
            surface: input.surface ?? "research_pricing",
            tier: input.tier,
            amount: product.price,
            currency: checkout.currency,
            providerVariantId: checkout.providerVariantId,
            hasPrefilledEmail: Boolean(input.email),
            testMode: checkout.testMode,
          },
          { consent: ctx.analyticsConsent },
        );

        return { checkoutUrl: checkout.checkoutUrl };
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

  // Validate license key and get export status (creates on-demand if needed)
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

      // 2. Validate with LemonSqueezy API
      const validation = await validateDatasetLicenseKey(input.licenseKey);

      if (!validation.valid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid license key. Please check your key and try again.",
        });
      }

      // 3. Fetch the order to determine tier
      const orderDetails = await getOrderFromLicenseKey(input.licenseKey);

      if (!orderDetails || !isDatasetVariant(orderDetails.variantId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "License key is not for a dataset product.",
        });
      }

      // 4. Create export record and trigger generation
      const datasetTier = getDatasetTierFromVariant(orderDetails.variantId);

      if (!datasetTier) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to determine dataset tier from order.",
        });
      }

      // 5. Try to create export record (handle webhook/request races)
      const { exportRecord, created } = await ensureDatasetExportForLicense({
        licenseKey: input.licenseKey,
        licenseKeyId: validation.licenseKeyId?.toString(),
        orderId: orderDetails.orderId,
        tier: datasetTier,
        customerEmail: orderDetails.customerEmail,
      });

      if (exportRecord && created) {
        const exportId = exportRecord.id;
        const product = DATASET_PRODUCTS[exportRecord.tier as DatasetTier];

        trackServerEvent(
          ctx.session?.user.id ?? `dataset_export:${exportId}`,
          "dataset_export_queued",
          {
            exportId,
            orderId: exportRecord.orderId ?? null,
            licenseKeyId: exportRecord.licenseKeyId ?? undefined,
            tier: exportRecord.tier as DatasetTier,
            profileCount: product.profileCount,
            recency: product.recency,
            source: "download_page",
            alreadyExisted: false,
          },
          { consent: ctx.analyticsConsent },
        );

        waitUntil(
          generateDatasetForExport(exportId).catch((error) => {
            console.error(`Failed to generate dataset ${exportId}:`, error);
          }),
        );
      }

      if (!exportRecord) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create or retrieve export record.",
        });
      }

      const product = DATASET_PRODUCTS[exportRecord.tier as DatasetTier];

      return {
        found: true,
        export: {
          id: exportRecord.id,
          tier: exportRecord.tier,
          status: exportRecord.status,
          profileCount: exportRecord.profileCount,
          blobUrl: exportRecord.blobUrl,
          blobSize: exportRecord.blobSize,
          downloadCount: exportRecord.downloadCount,
          maxDownloads: exportRecord.maxDownloads,
          downloadsRemaining: Math.max(
            0,
            exportRecord.maxDownloads - exportRecord.downloadCount,
          ),
          expiresAt: exportRecord.expiresAt,
          generatedAt: exportRecord.generatedAt,
          price: product.price,
        },
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

      trackServerEvent(
        ctx.session?.user.id ?? `dataset_export:${exportRecord.id}`,
        "dataset_downloaded",
        {
          exportId: exportRecord.id,
          orderId: exportRecord.orderId ?? null,
          tier: exportRecord.tier as DatasetTier,
          profileCount: exportRecord.profileCount,
          downloadCount: exportRecord.downloadCount + 1,
          downloadsRemaining: Math.max(
            0,
            exportRecord.maxDownloads - exportRecord.downloadCount - 1,
          ),
          maxDownloads: exportRecord.maxDownloads,
        },
        { consent: ctx.analyticsConsent },
      );

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

  // Retry failed generation (public - license key is the auth)
  retryGeneration: publicProcedure
    .input(z.object({ licenseKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const exportRecord = await ctx.db.query.datasetExportTable.findFirst({
        where: eq(datasetExportTable.licenseKey, input.licenseKey),
      });

      if (!exportRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Export not found for this license key",
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
        .set({ status: "PENDING", errorMessage: null })
        .where(eq(datasetExportTable.id, exportRecord.id));

      const product = DATASET_PRODUCTS[exportRecord.tier as DatasetTier];
      trackServerEvent(
        ctx.session?.user.id ?? `dataset_export:${exportRecord.id}`,
        "dataset_export_queued",
        {
          exportId: exportRecord.id,
          orderId: exportRecord.orderId ?? null,
          licenseKeyId: exportRecord.licenseKeyId ?? undefined,
          tier: exportRecord.tier as DatasetTier,
          profileCount: product.profileCount,
          recency: product.recency,
          source: "retry",
          alreadyExisted: true,
        },
        { consent: ctx.analyticsConsent },
      );

      // Trigger generation — waitUntil keeps the function alive after response
      waitUntil(
        generateDatasetForExport(exportRecord.id).catch((error) => {
          console.error("Failed to retry generation:", error);
        }),
      );

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
