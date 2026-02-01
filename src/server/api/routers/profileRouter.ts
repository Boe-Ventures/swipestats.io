import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq } from "drizzle-orm";
import {
  tinderProfileTable,
  mediaTable,
  tinderUsageTable,
} from "@/server/db/schema";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import {
  createTinderProfile,
  updateTinderProfile,
  getTinderProfile,
  getTinderProfileWithUser,
  transferProfileOwnership,
} from "@/server/services/profile/profile.service";
import { trackServerEvent } from "@/server/services/analytics.service";

/**
 * Helper function to handle existing profile upload scenarios
 * (user owns profile, anonymous transfer, or forbidden)
 */
async function handleExistingProfileUpload(params: {
  existing: NonNullable<Awaited<ReturnType<typeof getTinderProfileWithUser>>>;
  tinderId: string;
  anonymizedTinderJson: AnonymizedTinderDataJSON;
  currentUserId: string;
  timezone?: string;
  country?: string;
}) {
  const { existing, currentUserId, ...uploadParams } = params;

  // Case B: User owns this profile - update it
  if (existing.userId === currentUserId) {
    console.log(`🔄 Updating existing profile for tinderId: ${params.tinderId}`);
    return updateTinderProfile({
      ...uploadParams,
      userId: currentUserId,
    });
  }

  // Case C: Profile owned by anonymous user - transfer then update
  if (existing.user?.isAnonymous && existing.userId) {
    console.log(
      `🔀 Transferring profile ${params.tinderId} from anonymous user ${existing.userId} to ${currentUserId}`,
    );
    await transferProfileOwnership(
      params.tinderId,
      existing.userId,
      currentUserId,
    );
    return updateTinderProfile({
      ...uploadParams,
      userId: currentUserId,
    });
  }

  // Case D: Owned by claimed user - block
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "This profile belongs to another user. Please sign in with a different account or use a different email address.",
  });
}

export const profileRouter = {
  // Get profile by tinderId (basic profile only)
  get: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
      }),
    )
    .query(async ({ ctx: _ctx, input }) => {
      const profile = await getTinderProfile(input.tinderId);
      // Return null instead of throwing - better for optional queries
      return profile ?? null;
    }),

  // Get multiple profiles with usage data for comparison
  getWithUsage: publicProcedure
    .input(
      z.object({
        tinderIds: z.array(z.string().min(1)),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profiles = await ctx.db.query.tinderProfileTable.findMany({
        where: (table, { inArray }) => inArray(table.tinderId, input.tinderIds),
        with: {
          usage: {
            orderBy: (usage, { asc }) => [asc(usage.dateStamp)],
          },
          profileMeta: true,
        },
      });

      // Sort profiles to match input order (main profile first)
      const sortedProfiles = input.tinderIds
        .map((id) => profiles.find((p) => p.tinderId === id))
        .filter((p) => p !== undefined);

      return sortedProfiles;
    }),

  // Get media/photos for a profile
  getMedia: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.mediaTable.findMany({
        where: eq(mediaTable.tinderProfileId, input.tinderId),
        limit: 6,
      });
    }),

  // Get usage data for a profile (public - for client-side fetch, compare, directory)
  getUsage: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.tinderUsageTable.findMany({
        where: eq(tinderUsageTable.tinderProfileId, input.tinderId),
        orderBy: (usage, { asc }) => [asc(usage.dateStamp)],
      });
    }),

  // Unified upload endpoint - handles create, update, and ownership transfer
  upload: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
        anonymizedTinderJson: z.any() as z.ZodType<AnonymizedTinderDataJSON>,
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

      // Check if profile exists and get user info
      const existing = await getTinderProfileWithUser(input.tinderId);

      try {
        // FAST PATH: Case A - New profile (99% of cases)
        if (!existing) {
          console.log(
            `📝 Creating new profile for tinderId: ${input.tinderId}`,
          );
          const result = await createTinderProfile({
            tinderId: input.tinderId,
            anonymizedTinderJson: input.anonymizedTinderJson,
            userId: ctx.session.user.id,
            timezone: input.timezone,
            country: input.country,
          });

          // Track success with rich metrics
          trackServerEvent(ctx.session.user.id, "tinder_profile_created", {
            tinderId: input.tinderId,
            matchCount: result.metrics.matchCount,
            messageCount: result.metrics.messageCount,
            photoCount: result.metrics.photoCount,
            usageDays: result.metrics.usageDays,
            hasPhotos: result.metrics.hasPhotos,
            processingTimeMs: result.metrics.processingTimeMs,
            jsonSizeMB: result.metrics.jsonSizeMB,
          });

          return result.profile;
        }

        // SLOW PATH: Existing profile (1% of cases - update, transfer, or forbidden)
        const result = await handleExistingProfileUpload({
          existing,
          tinderId: input.tinderId,
          anonymizedTinderJson: input.anonymizedTinderJson,
          currentUserId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
        });

        // Track success with rich metrics
        trackServerEvent(ctx.session.user.id, "tinder_profile_updated", {
          tinderId: input.tinderId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          usageDays: result.metrics.usageDays,
          hasPhotos: result.metrics.hasPhotos,
          processingTimeMs: result.metrics.processingTimeMs,
          jsonSizeMB: result.metrics.jsonSizeMB,
        });

        return result.profile;
      } catch (error) {
        // Track failure - PostHog captures stack trace automatically
        trackServerEvent(ctx.session.user.id, "tinder_profile_upload_failed", {
          tinderId: input.tinderId,
          errorType:
            error instanceof TRPCError
              ? error.code === "FORBIDDEN"
                ? "ownership"
                : "unknown"
              : "unknown",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 200)
              : "Unknown error",
          jsonSizeMB:
            JSON.stringify(input.anonymizedTinderJson).length / 1024 / 1024,
        });
        throw error;
      }
    }),

  // Create a new Tinder profile
  create: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
        anonymizedTinderJson: z.any() as z.ZodType<AnonymizedTinderDataJSON>,
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
      const existing = await ctx.db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.tinderId, input.tinderId),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Profile already exists. Use update instead.",
        });
      }

      return createTinderProfile({
        tinderId: input.tinderId,
        anonymizedTinderJson: input.anonymizedTinderJson,
        userId: ctx.session.user.id,
        timezone: input.timezone,
        country: input.country,
      });
    }),

  // Update an existing Tinder profile
  update: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
        anonymizedTinderJson: z.any() as z.ZodType<AnonymizedTinderDataJSON>,
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
      const existing = await ctx.db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.tinderId, input.tinderId),
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

      return updateTinderProfile({
        tinderId: input.tinderId,
        anonymizedTinderJson: input.anonymizedTinderJson,
        userId: ctx.session.user.id,
        timezone: input.timezone,
        country: input.country,
      });
    }),
} satisfies TRPCRouterRecord;
