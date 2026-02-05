import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  tinderProfileTable,
  hingeProfileTable,
  originalAnonymizedFileTable,
} from "@/server/db/schema";
import { adminProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import { resetTinderProfile } from "@/server/services/profile/profile.service";
import { BlobService } from "@/server/services/blob.service";

export const adminRouter = {
  // Delete a Tinder profile by tinderId (admin/dev only)
  // Cascades will automatically delete related data:
  // - matches, messages, media, usage, jobs, schools, etc.
  deleteProfile: adminProcedure
    .input(z.object({ tinderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify profile exists
      const profile = await ctx.db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.tinderId, input.tinderId),
        columns: {
          tinderId: true,
          userId: true,
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Fetch and delete user's Tinder data files + blobs (if user exists)
      if (profile.userId) {
        const tinderFiles =
          await ctx.db.query.originalAnonymizedFileTable.findMany({
            where: and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "TINDER"),
            ),
            columns: { blobUrl: true },
          });

        // Delete blobs from Vercel storage
        const blobUrls = tinderFiles
          .map((f) => f.blobUrl)
          .filter((url): url is string => url !== null);
        if (blobUrls.length > 0) {
          console.log(
            `🗑️ Deleting ${blobUrls.length} Tinder blob(s) for profile ${input.tinderId}`,
          );
          await BlobService.deleteBulk(blobUrls).catch((error) => {
            console.error("⚠️ Failed to delete some blobs:", error);
            // Don't fail profile deletion if blob cleanup fails
          });
        }

        // Delete original file records
        await ctx.db
          .delete(originalAnonymizedFileTable)
          .where(
            and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "TINDER"),
            ),
          );
      }

      // Delete profile - cascades will handle related tables
      await ctx.db
        .delete(tinderProfileTable)
        .where(eq(tinderProfileTable.tinderId, input.tinderId));

      return {
        success: true,
        deletedTinderId: input.tinderId,
      };
    }),

  // Completely reset a Tinder profile (admin/dev/testing)
  // More thorough than deleteProfile - explicitly deletes all related data
  resetProfile: adminProcedure
    .input(z.object({ tinderId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await resetTinderProfile(input.tinderId);
      return { success: true };
    }),

  // Get profile info (for checking if profile exists)
  getProfile: adminProcedure
    .input(z.object({ tinderId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.tinderId, input.tinderId),
        columns: {
          tinderId: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Return null instead of undefined for React Query compatibility
      return profile ?? null;
    }),

  // Delete a Hinge profile by hingeId (admin/dev only)
  // Cascades will automatically delete related data:
  // - matches, messages, prompts, blocks, etc.
  deleteHingeProfile: adminProcedure
    .input(z.object({ hingeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify profile exists
      const profile = await ctx.db.query.hingeProfileTable.findFirst({
        where: eq(hingeProfileTable.hingeId, input.hingeId),
        columns: {
          hingeId: true,
          userId: true,
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Fetch and delete user's Hinge data files + blobs (if user exists)
      if (profile.userId) {
        const hingeFiles =
          await ctx.db.query.originalAnonymizedFileTable.findMany({
            where: and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "HINGE"),
            ),
            columns: { blobUrl: true },
          });

        // Delete blobs from Vercel storage
        const blobUrls = hingeFiles
          .map((f) => f.blobUrl)
          .filter((url): url is string => url !== null);
        if (blobUrls.length > 0) {
          console.log(
            `🗑️ Deleting ${blobUrls.length} Hinge blob(s) for profile ${input.hingeId}`,
          );
          await BlobService.deleteBulk(blobUrls).catch((error) => {
            console.error("⚠️ Failed to delete some blobs:", error);
            // Don't fail profile deletion if blob cleanup fails
          });
        }

        // Delete original file records
        await ctx.db
          .delete(originalAnonymizedFileTable)
          .where(
            and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "HINGE"),
            ),
          );
      }

      // Delete profile - cascades will handle related tables
      await ctx.db
        .delete(hingeProfileTable)
        .where(eq(hingeProfileTable.hingeId, input.hingeId));

      return {
        success: true,
        deletedHingeId: input.hingeId,
      };
    }),

  // Get Hinge profile info (for checking if profile exists)
  getHingeProfile: adminProcedure
    .input(z.object({ hingeId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.hingeProfileTable.findFirst({
        where: eq(hingeProfileTable.hingeId, input.hingeId),
        columns: {
          hingeId: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Return null instead of undefined for React Query compatibility
      return profile ?? null;
    }),
} satisfies TRPCRouterRecord;
