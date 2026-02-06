import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { differenceInYears } from "date-fns";
import { eq } from "drizzle-orm";
import { hingeProfileTable } from "@/server/db/schema";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import {
  createHingeProfile,
  getHingeProfile,
  getHingeProfileWithUser,
  transferHingeProfileOwnership,
} from "@/server/services/hinge/hinge.service";
import {
  additiveUpdateHingeProfile,
  absorbHingeProfileIntoNew,
} from "@/server/services/hinge/hinge-additive.service";
import { trackServerEvent } from "@/server/services/analytics.service";
import { fetchBlobJson } from "@/server/services/blob.service";

/**
 * Helper function to handle existing profile upload scenarios
 * (user owns profile, anonymous transfer, or forbidden)
 */
async function handleExistingHingeProfileUpload(params: {
  existing: NonNullable<Awaited<ReturnType<typeof getHingeProfileWithUser>>>;
  hingeId: string;
  blobUrl: string;
  currentUserId: string;
  timezone?: string;
  country?: string;
}) {
  const { existing, currentUserId, ...uploadParams } = params;

  // Case B: User owns this profile - use additive update
  if (existing.userId === currentUserId) {
    console.log(
      `🔄 Additive update for existing profile hingeId: ${params.hingeId}`,
    );
    return additiveUpdateHingeProfile({
      ...uploadParams,
      userId: currentUserId,
    });
  }

  // Case C: Profile owned by anonymous user - transfer then use additive update
  if (existing.user?.isAnonymous && existing.userId) {
    console.log(
      `🔀 Transferring profile ${params.hingeId} from anonymous user ${existing.userId} to ${currentUserId}`,
    );
    await transferHingeProfileOwnership(
      params.hingeId,
      existing.userId,
      currentUserId,
    );
    return additiveUpdateHingeProfile({
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

  // Get upload context - helps frontend show appropriate UI
  getUploadContext: publicProcedure
    .input(
      z.object({
        hingeId: z.string().optional(), // The hingeId from dropped file (if available)
        birthDate: z.string().optional(), // Derived birth_date for identity validation
      }),
    )
    .query(async ({ ctx, input }) => {
      // Always check if target profile exists (even without session)
      const targetProfile = input.hingeId
        ? await ctx.db.query.hingeProfileTable.findFirst({
            where: eq(hingeProfileTable.hingeId, input.hingeId),
            columns: { hingeId: true, userId: true },
            with: {
              user: {
                columns: { isAnonymous: true },
              },
            },
          })
        : null;

      // If no session, determine scenario based on target profile
      if (!ctx.session?.user?.id) {
        let scenario: "new_user" | "needs_signin" | "can_claim";

        if (!targetProfile) {
          scenario = "new_user"; // Profile doesn't exist
        } else if (targetProfile.user?.isAnonymous) {
          scenario = "can_claim"; // Owned by anonymous user - can claim
        } else {
          scenario = "needs_signin"; // Owned by real user - must sign in
        }

        return {
          userProfile: null,
          targetProfile,
          scenario,
          identityMismatch: false,
        };
      }

      // Get user's existing profile (1:1 so at most one)
      const userProfile = await ctx.db.query.hingeProfileTable.findFirst({
        where: eq(hingeProfileTable.userId, ctx.session.user.id),
        columns: {
          hingeId: true,
          createdAt: true,
          createDate: true, // Hinge uses createDate (signup time) instead of firstDayOnApp
          birthDate: true, // For identity mismatch detection
        },
      });

      // Determine scenario for logged-in users
      let scenario:
        | "new_profile"
        | "same_hingeId"
        | "different_hingeId"
        | "owned_by_other";

      if (!userProfile && !targetProfile) {
        scenario = "new_profile"; // First upload, hingeId doesn't exist
      } else if (!userProfile && targetProfile) {
        scenario = targetProfile.userId ? "owned_by_other" : "new_profile"; // Profile exists but not ours
      } else if (userProfile && input.hingeId === userProfile.hingeId) {
        scenario = "same_hingeId"; // Additive update
      } else if (
        userProfile &&
        input.hingeId &&
        input.hingeId !== userProfile.hingeId
      ) {
        scenario = "different_hingeId"; // Cross-account merge
      } else {
        scenario = "new_profile";
      }

      // Identity mismatch detection for cross-account merges
      // Hinge birthDate is derived from age at signup (approximation to Jan 1st)
      // Using 1-year threshold same as Tinder
      let identityMismatch = false;
      if (scenario === "different_hingeId" && userProfile && input.birthDate) {
        const oldBirthDate = userProfile.birthDate;
        const newBirthDate = new Date(input.birthDate);
        const ageDifferenceYears = Math.abs(
          differenceInYears(oldBirthDate, newBirthDate),
        );

        // If ages differ by more than 1 year, it's likely different people
        identityMismatch = ageDifferenceYears > 1;
      }

      return {
        userProfile,
        targetProfile,
        scenario,
        identityMismatch,
      };
    }),

  // Streamlined endpoint for creating new profiles (99% use case)
  // Fast path with minimal checks - only validates hingeId doesn't exist
  createProfile: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        blobUrl: z.string().url(),
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

      try {
        // Quick check: does this hingeId already exist?
        const existingByHingeId = await getHingeProfile(input.hingeId);

        if (existingByHingeId) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This profile already exists. Use updateProfile or mergeAccounts instead.",
          });
        }

        // Create brand new profile
        console.log(`📝 Creating new Hinge profile: ${input.hingeId}`);
        const result = await createHingeProfile({
          hingeId: input.hingeId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
        });

        trackServerEvent(ctx.session.user.id, "hinge_profile_created", {
          hingeId: input.hingeId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          promptCount: result.metrics.promptCount,
          interactionCount: result.metrics.interactionCount,
          hasPhotos: result.metrics.hasPhotos,
          processingTimeMs: result.metrics.processingTimeMs,
          jsonSizeMB: result.metrics.jsonSizeMB,
        });

        return result.profile;
      } catch (error) {
        // Track failure
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          errorType: "unknown",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 200)
              : "Unknown error",
        });
        throw error;
      }
    }),

  // Additive update endpoint for re-uploading data or claiming anonymous profiles
  // Handles: same_hingeId (additive update) and can_claim (transfer + update)
  updateProfile: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        blobUrl: z.string().url(),
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

      try {
        // Check if profile exists
        const existingProfile = await getHingeProfileWithUser(input.hingeId);

        if (!existingProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found. Use createProfile instead.",
          });
        }

        // Handle ownership scenarios
        const result = await handleExistingHingeProfileUpload({
          existing: existingProfile,
          hingeId: input.hingeId,
          blobUrl: input.blobUrl,
          currentUserId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
        });

        trackServerEvent(ctx.session.user.id, "hinge_profile_updated", {
          hingeId: input.hingeId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          promptCount: result.metrics.promptCount,
          interactionCount: result.metrics.interactionCount,
          hasPhotos: result.metrics.hasPhotos,
          processingTimeMs: result.metrics.processingTimeMs,
          jsonSizeMB: result.metrics.jsonSizeMB,
        });

        return result.profile;
      } catch (error) {
        // Track failure
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
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
        });
        throw error;
      }
    }),

  // Cross-account merge endpoint for merging old Hinge account into new one
  // Validates chronological order and prevents identity mismatches
  mergeAccounts: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        blobUrl: z.string().url(),
        timezone: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Require authenticated session
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Session required. Please sign in to merge accounts.",
        });
      }

      try {
        // Fetch JSON from blob storage
        const anonymizedHingeJson = await fetchBlobJson<AnonymizedHingeDataJSON>(
          input.blobUrl,
        );

        // Get user's existing profile
        const existingUserProfile =
          await ctx.db.query.hingeProfileTable.findFirst({
            where: eq(hingeProfileTable.userId, ctx.session.user.id),
          });

        if (!existingUserProfile) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No existing profile found to merge with. Use createProfile instead.",
          });
        }

        if (existingUserProfile.hingeId === input.hingeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot merge profile with itself. Use updateProfile instead.",
          });
        }

        // Safety check: Prevent backward merges (uploading older account after newer one)
        // For Hinge, we use createDate (signup time) instead of daily usage
        const newSignupTime = new Date(
          anonymizedHingeJson.User.account.signup_time,
        );

        if (newSignupTime < existingUserProfile.createDate) {
          console.log(
            `⚠️ Backward merge blocked: new profile signup ${newSignupTime.toISOString()}, existing signup ${existingUserProfile.createDate.toISOString()}`,
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This appears to be an older Hinge account than your current profile. " +
              "Cross-account merges must go from older → newer accounts. " +
              "If you need to merge data from an older account, please delete your current profile first and re-upload in chronological order (oldest first).",
          });
        }

        console.log(
          `🔄 Cross-account merge: ${existingUserProfile.hingeId} → ${input.hingeId}`,
        );
        const result = await absorbHingeProfileIntoNew({
          oldHingeId: existingUserProfile.hingeId,
          newHingeId: input.hingeId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
        });

        trackServerEvent(ctx.session.user.id, "hinge_profile_merged", {
          hingeId: input.hingeId,
          oldHingeId: existingUserProfile.hingeId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          promptCount: result.metrics.promptCount,
          interactionCount: result.metrics.interactionCount,
          hasPhotos: result.metrics.hasPhotos,
          processingTimeMs: result.metrics.processingTimeMs,
          jsonSizeMB: result.metrics.jsonSizeMB,
        });

        return result.profile;
      } catch (error) {
        // Track failure
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          errorType: "unknown",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 200)
              : "Unknown error",
        });
        throw error;
      }
    }),

  // Legacy create endpoint - redirects to createProfile
  // Kept for backwards compatibility
  create: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        blobUrl: z.string().url(),
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

      try {
        const result = await createHingeProfile({
          hingeId: input.hingeId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
        });

        // Track success with rich metrics
        trackServerEvent(ctx.session.user.id, "hinge_profile_created", {
          hingeId: input.hingeId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          promptCount: result.metrics.promptCount,
          interactionCount: result.metrics.interactionCount,
          hasPhotos: result.metrics.hasPhotos,
          processingTimeMs: result.metrics.processingTimeMs,
          jsonSizeMB: result.metrics.jsonSizeMB,
        });

        return result.profile;
      } catch (error) {
        // Track failure - PostHog captures stack trace automatically
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          errorType: "unknown",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 200)
              : "Unknown error",
        });
        throw error;
      }
    }),

  // Legacy update endpoint - uses full replacement (deprecated)
  // Kept for backwards compatibility, but prefer updateProfile
  update: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        blobUrl: z.string().url(),
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

      try {
        // Use additive update instead of full replacement
        const result = await additiveUpdateHingeProfile({
          hingeId: input.hingeId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
        });

        // Track success with rich metrics
        trackServerEvent(ctx.session.user.id, "hinge_profile_updated", {
          hingeId: input.hingeId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          promptCount: result.metrics.promptCount,
          interactionCount: result.metrics.interactionCount,
          hasPhotos: result.metrics.hasPhotos,
          processingTimeMs: result.metrics.processingTimeMs,
          jsonSizeMB: result.metrics.jsonSizeMB,
        });

        return result.profile;
      } catch (error) {
        // Track failure - PostHog captures stack trace automatically
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          errorType: "unknown",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 200)
              : "Unknown error",
        });
        throw error;
      }
    }),
} satisfies TRPCRouterRecord;
