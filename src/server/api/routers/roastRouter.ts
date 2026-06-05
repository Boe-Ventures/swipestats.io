import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import {
  roastTable,
  profileMetaTable,
  tinderProfileTable,
  hingeProfileTable,
  userTable,
} from "@/server/db/schema";
import { protectedProcedure, publicProcedure } from "../trpc";
import { generateRoast } from "@/server/services/roast.service";
import { canAccessFeature } from "@/server/services/gating.service";

export const roastRouter = {
  /**
   * Generate a new roast for a profile. Caches in DB so we don't re-call AI on every request.
   * Requires PLUS or ELITE tier.
   */
  generate: protectedProcedure
    .input(
      z.object({
        tinderProfileId: z.string().optional(),
        hingeProfileId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tinderProfileId, hingeProfileId } = input;
      const userId = ctx.session.user.id;

      if (!tinderProfileId && !hingeProfileId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide tinderProfileId or hingeProfileId",
        });
      }

      // Gating check
      const user = await ctx.db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      if (!canAccessFeature(user, "aiRoast")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "AI Roast requires PLUS or ELITE subscription",
        });
      }

      // Verify profile ownership
      if (tinderProfileId) {
        const profile = await ctx.db.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.tinderId, tinderProfileId),
        });
        if (!profile || profile.userId !== userId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      if (hingeProfileId) {
        const profile = await ctx.db.query.hingeProfileTable.findFirst({
          where: eq(hingeProfileTable.hingeId, hingeProfileId),
        });
        if (!profile || profile.userId !== userId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      // Return cached roast if it exists (roasts are stable)
      const existing = await ctx.db.query.roastTable.findFirst({
        where: and(
          eq(roastTable.userId, userId),
          tinderProfileId
            ? eq(roastTable.tinderProfileId, tinderProfileId)
            : eq(roastTable.hingeProfileId, hingeProfileId!),
        ),
      });
      if (existing) return existing;

      // Fetch ProfileMeta
      const profileMeta = await ctx.db.query.profileMetaTable.findFirst({
        where: tinderProfileId
          ? eq(profileMetaTable.tinderProfileId, tinderProfileId)
          : eq(profileMetaTable.hingeProfileId, hingeProfileId!),
      });
      if (!profileMeta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile stats not found. Try re-uploading your data.",
        });
      }

      // Determine gender + data provider for better roast context
      let gender: string | undefined;
      let dataProvider = "Tinder";
      if (tinderProfileId) {
        const tp = await ctx.db.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.tinderId, tinderProfileId),
        });
        gender = tp?.gender;
        dataProvider = "Tinder";
      } else if (hingeProfileId) {
        const hp = await ctx.db.query.hingeProfileTable.findFirst({
          where: eq(hingeProfileTable.hingeId, hingeProfileId!),
        });
        gender = hp?.gender;
        dataProvider = "Hinge";
      }

      // Generate roast via AI
      const roastOutput = await generateRoast({
        profileMeta,
        gender,
        dataProvider,
      });

      // Cache in DB
      const [roast] = await ctx.db
        .insert(roastTable)
        .values({
          userId,
          tinderProfileId: tinderProfileId ?? null,
          hingeProfileId: hingeProfileId ?? null,
          roastLines: roastOutput.roastLines,
          realTalkInsights: roastOutput.realTalkInsights,
          headline: roastOutput.headline,
          overallScore: roastOutput.overallScore,
          isPublic: false,
        })
        .returning();

      return roast!;
    }),

  /**
   * Get cached roast for a profile (if exists).
   */
  getByProfile: protectedProcedure
    .input(
      z.object({
        tinderProfileId: z.string().optional(),
        hingeProfileId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tinderProfileId, hingeProfileId } = input;
      const userId = ctx.session.user.id;

      if (!tinderProfileId && !hingeProfileId) {
        return null;
      }

      const roast = await ctx.db.query.roastTable.findFirst({
        where: and(
          eq(roastTable.userId, userId),
          tinderProfileId
            ? eq(roastTable.tinderProfileId, tinderProfileId)
            : eq(roastTable.hingeProfileId, hingeProfileId!),
        ),
      });

      return roast ?? null;
    }),

  /**
   * Public endpoint for share page. Returns first 3 roast lines only (paywall hook).
   */
  getPublic: publicProcedure
    .input(z.object({ shareKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const roast = await ctx.db.query.roastTable.findFirst({
        where: eq(roastTable.shareKey, input.shareKey),
      });

      if (!roast || !roast.isPublic) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Roast not found or not shared",
        });
      }

      // Return only first 3 lines publicly (the hook)
      return {
        id: roast.id,
        shareKey: roast.shareKey,
        roastLines: roast.roastLines.slice(0, 3),
        headline: roast.headline,
        overallScore: roast.overallScore,
        createdAt: roast.createdAt,
      };
    }),

  /**
   * Make a roast publicly shareable.
   */
  makePublic: protectedProcedure
    .input(z.object({ roastId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const roast = await ctx.db.query.roastTable.findFirst({
        where: and(
          eq(roastTable.id, input.roastId),
          eq(roastTable.userId, userId),
        ),
      });

      if (!roast) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await ctx.db
        .update(roastTable)
        .set({ isPublic: true })
        .where(eq(roastTable.id, input.roastId))
        .returning();

      return { shareKey: updated?.shareKey };
    }),
};
