import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { hingeProfileTable } from "@/server/db/schema";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import {
  createHingeProfile,
  updateHingeProfile,
  getHingeProfile,
} from "@/server/services/hinge/hinge.service";

export const hingeProfileRouter = {
  // Get profile by hingeId (basic profile only)
  get: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
      }),
    )
    .query(async ({ ctx: _ctx, input }) => {
      const profile = await getHingeProfile(input.hingeId);
      // Return null instead of throwing - better for optional queries
      return profile ?? null;
    }),

  // Get profile with stats for insights page
  getWithStats: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.hingeProfileTable.findFirst({
        where: eq(hingeProfileTable.hingeId, input.hingeId),
        with: {
          matches: {
            with: {
              messages: true,
            },
            orderBy: (matches, { desc }) => [desc(matches.matchedAt)],
          },
          profileMeta: true,
          prompts: true,
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      return profile;
    }),

  // Create a new Hinge profile
  create: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        anonymizedHingeJson: z.any() as z.ZodType<AnonymizedHingeDataJSON>,
        timezone: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Require authenticated session (anonymous or real user)
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Session required. Please sign in to upload your profile.",
        });
      }

      // Check if profile already exists
      const existing = await ctx.db.query.hingeProfileTable.findFirst({
        where: eq(hingeProfileTable.hingeId, input.hingeId),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Profile already exists. Use update instead.",
        });
      }

      return createHingeProfile({
        hingeId: input.hingeId,
        anonymizedHingeJson: input.anonymizedHingeJson,
        userId: ctx.session.user.id,
        timezone: input.timezone,
        country: input.country,
      });
    }),

  // Update an existing Hinge profile
  update: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        anonymizedHingeJson: z.any() as z.ZodType<AnonymizedHingeDataJSON>,
        timezone: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Require authenticated session
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Session required. Please sign in to update your profile.",
        });
      }

      // Check if profile exists
      const existing = await ctx.db.query.hingeProfileTable.findFirst({
        where: eq(hingeProfileTable.hingeId, input.hingeId),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found. Use create instead.",
        });
      }

      // Verify ownership
      if (existing.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this profile.",
        });
      }

      return updateHingeProfile({
        hingeId: input.hingeId,
        anonymizedHingeJson: input.anonymizedHingeJson,
        userId: ctx.session.user.id,
        timezone: input.timezone,
        country: input.country,
      });
    }),
} satisfies TRPCRouterRecord;
