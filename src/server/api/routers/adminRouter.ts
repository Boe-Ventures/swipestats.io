import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { tinderProfileTable, hingeProfileTable } from "@/server/db/schema";
import { adminProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";

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

      // Delete profile - cascades will handle related tables
      await ctx.db
        .delete(tinderProfileTable)
        .where(eq(tinderProfileTable.tinderId, input.tinderId));

      return {
        success: true,
        deletedTinderId: input.tinderId,
      };
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
