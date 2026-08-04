import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { differenceInYears } from "date-fns";
import { eq } from "drizzle-orm";
import { hingeProfileTable } from "@/server/db/schema";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import {
  createHingeProfile,
  getHingeProfileWithUser,
} from "@/server/services/hinge/hinge.service";
import {
  additiveUpdateHingeProfile,
  absorbHingeProfileIntoNew,
} from "@/server/services/hinge/hinge-additive.service";
import { trackServerEvent } from "@/server/services/analytics.service";
import { captureException } from "@/server/clients/posthog.client";
import { fetchVerifiedHingeBlob } from "@/server/services/hinge/hinge-blob.service";
import { summarizeUploadError } from "@/server/services/upload-error.service";
import { isSameHingeAccountSignup } from "@/lib/hinge/account-period";
import {
  cleanupCommittedTransientUpload,
  registerTransientUploadForProcessing,
  type TransientUploadBinding,
} from "@/server/services/transient-upload.service";

async function prepareHingeTransientUpload(params: {
  uploadId: string;
  blobUrl: string;
  hingeId: string;
  userId: string;
  sessionId: string;
}) {
  const binding: TransientUploadBinding = {
    id: params.uploadId,
    userId: params.userId,
    sessionId: params.sessionId,
    dataProvider: "HINGE",
    profileId: params.hingeId,
    blobUrl: params.blobUrl,
  };
  const lease = await registerTransientUploadForProcessing(binding);
  if (lease.status === "COMMITTED" || lease.status === "CLEANED") {
    await cleanupCommittedTransientUpload(lease.id);
    const profile = lease.resultProfileId
      ? await getHingeProfileWithUser(lease.resultProfileId)
      : null;
    if (profile?.userId !== params.userId) {
      throw new Error(
        "Committed temporary upload has no owned result profile.",
      );
    }
    const { user: _user, ...committedProfile } = profile;
    return { binding, committedProfile };
  }
  return { binding, committedProfile: null };
}

/**
 * Helper function to handle existing profile upload scenarios
 * (user owns profile, anonymous transfer, or forbidden)
 */
async function handleExistingHingeProfileUpload(params: {
  existing: NonNullable<Awaited<ReturnType<typeof getHingeProfileWithUser>>>;
  hingeId: string;
  blobUrl: string;
  transientUpload: TransientUploadBinding;
  currentUserId: string;
  timezone?: string;
  country?: string;
  consentPhotos?: boolean;
  consentWork?: boolean;
}) {
  const { existing, currentUserId, ...uploadParams } = params;

  // Case B: User owns this profile - use additive update
  if (existing.userId === currentUserId) {
    console.log(
      `🔄 Additive update for existing profile hingeId: ${params.hingeId}`,
    );
    const verifiedJson = await fetchVerifiedHingeBlob(
      params.blobUrl,
      params.hingeId,
      { consume: false },
    );
    return additiveUpdateHingeProfile({
      ...uploadParams,
      userId: currentUserId,
      verifiedJson,
    });
  }

  // Hinge exports no provider account ID. A signup timestamp is not strong
  // enough proof to transfer an anonymous profile across sessions, so only the
  // session that already owns this row may update it.
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
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.hingeProfileTable.findFirst({
        where: eq(hingeProfileTable.hingeId, input.hingeId),
        columns: { hingeId: true },
      });
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
        columns: {
          hingeId: true,
          gender: true,
          ageAtUpload: true,
          selfieVerified: true,
          country: true,
        },
        with: {
          matches: {
            columns: {
              id: true,
              matchedAt: true,
              likedAt: true,
              weMet: true,
            },
            with: {
              messages: { columns: { sentDate: true } },
            },
            orderBy: (matches, { desc }) => [desc(matches.matchedAt)],
          },
          interactions: {
            columns: {
              type: true,
              timestamp: true,
              matchId: true,
              threadOrigin: true,
              threadState: true,
            },
            orderBy: (interactions, { desc }) => [desc(interactions.timestamp)],
          },
          profileMeta: true,
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
            columns: { hingeId: true },
            with: {
              user: {
                columns: { isAnonymous: true },
              },
            },
          })
        : null;

      // If no session, determine scenario based on target profile
      if (!ctx.session?.user?.id) {
        const scenario: "new_user" | "needs_signin" = targetProfile
          ? "needs_signin"
          : "new_user";

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
        scenario = "owned_by_other"; // Profile exists but not ours
      } else if (userProfile && input.hingeId === userProfile.hingeId) {
        scenario = "same_hingeId"; // Additive update
      } else if (userProfile && targetProfile) {
        scenario = "owned_by_other"; // Target ID already exists under another profile
      } else if (
        userProfile &&
        input.hingeId &&
        input.hingeId !== userProfile.hingeId
      ) {
        scenario = "different_hingeId"; // Cross-account merge
      } else {
        scenario = "new_profile";
      }

      // Hinge only exports age, not exact birth date. Keep the comparison as
      // debug context, but do not block merges on this approximation.
      const identityMismatch = false;
      let identityComparison: {
        oldBirthDate: string;
        newBirthDate: string;
        ageDifferenceYears: number;
        confidence: "low";
        reason: string;
      } | null = null;

      if (scenario === "different_hingeId" && userProfile && input.birthDate) {
        const oldBirthDate = userProfile.birthDate;
        const newBirthDate = new Date(input.birthDate);
        const ageDifferenceYears = Math.abs(
          differenceInYears(oldBirthDate, newBirthDate),
        );

        identityComparison = {
          oldBirthDate: oldBirthDate.toISOString(),
          newBirthDate: newBirthDate.toISOString(),
          ageDifferenceYears,
          confidence: "low",
          reason:
            "Hinge exports age, not exact birth date, so this is only a derived-age diagnostic.",
        };
      }

      return {
        userProfile,
        targetProfile,
        scenario,
        identityMismatch,
        identityComparison,
      };
    }),

  // Streamlined endpoint for creating new profiles (99% use case)
  // Fast path with minimal checks - only validates hingeId doesn't exist
  createProfile: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        uploadId: z.string().uuid(),
        blobUrl: z.string().url(),
        timezone: z.string().optional(),
        country: z.string().optional(),
        consentPhotos: z.boolean().optional(),
        consentWork: z.boolean().optional(),
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
        const preparedUpload = await prepareHingeTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          hingeId: input.hingeId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          return preparedUpload.committedProfile;
        }

        // Resolve create-vs-update on the server. The client can have stale
        // upload context after a successful upload or a retry.
        const existingByHingeId = await getHingeProfileWithUser(input.hingeId);
        const existingForUser = existingByHingeId
          ? null
          : await ctx.db.query.hingeProfileTable.findFirst({
              where: eq(hingeProfileTable.userId, ctx.session.user.id),
              columns: { hingeId: true },
            });
        if (existingForUser) {
          // Do not let a stale/direct create request fall through to the
          // one-profile-per-user constraint. The merge endpoint verifies the
          // signup instant and decides between a historical-ID additive update
          // and a real forward account merge.
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "You already have a Hinge profile. Refresh the upload step so this export can be merged safely.",
          });
        }
        const isExistingProfile = Boolean(existingByHingeId);
        const result = existingByHingeId
          ? await handleExistingHingeProfileUpload({
              existing: existingByHingeId,
              hingeId: input.hingeId,
              blobUrl: input.blobUrl,
              currentUserId: ctx.session.user.id,
              timezone: input.timezone,
              country: input.country,
              consentPhotos: input.consentPhotos ?? true,
              consentWork: input.consentWork ?? true,
              transientUpload: preparedUpload.binding,
            })
          : await createHingeProfile({
              hingeId: input.hingeId,
              blobUrl: input.blobUrl,
              userId: ctx.session.user.id,
              timezone: input.timezone,
              country: input.country,
              consentPhotos: input.consentPhotos ?? true,
              consentWork: input.consentWork ?? true,
              transientUpload: preparedUpload.binding,
            });

        const metrics = {
          hingeId: input.hingeId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          promptCount: result.metrics.promptCount,
          interactionCount: result.metrics.interactionCount,
          hasPhotos: result.metrics.hasPhotos,
          processingTimeMs: result.metrics.processingTimeMs,
          jsonSizeMB: result.metrics.jsonSizeMB,
          consentPhotos: input.consentPhotos ?? true,
          consentWork: input.consentWork ?? true,
        };

        if (isExistingProfile) {
          if (!result.isNoOp) {
            trackServerEvent(
              ctx.session.user.id,
              "hinge_profile_updated",
              metrics,
            );
          }
        } else {
          trackServerEvent(
            ctx.session.user.id,
            "hinge_profile_created",
            metrics,
          );
        }

        return result.profile;
      } catch (error) {
        if (error instanceof Error) {
          await captureException(error, ctx.session.user.id);
        }
        const uploadError = summarizeUploadError(error);
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          ...uploadError,
        });
        throw error;
      }
    }),

  // Additive update endpoint for a profile owned by the current session.
  updateProfile: publicProcedure
    .input(
      z.object({
        hingeId: z.string().min(1),
        uploadId: z.string().uuid(),
        blobUrl: z.string().url(),
        timezone: z.string().optional(),
        country: z.string().optional(),
        consentPhotos: z.boolean().optional(),
        consentWork: z.boolean().optional(),
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
        const preparedUpload = await prepareHingeTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          hingeId: input.hingeId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          return preparedUpload.committedProfile;
        }

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
          consentPhotos: input.consentPhotos ?? true,
          consentWork: input.consentWork ?? true,
          transientUpload: preparedUpload.binding,
        });

        // Skip the event when the same export was re-uploaded (nothing new
        // merged in) — otherwise it reads as a noisy "0 new" update.
        if (!result.isNoOp) {
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
            consentPhotos: input.consentPhotos ?? true,
            consentWork: input.consentWork ?? true,
          });
        }

        return result.profile;
      } catch (error) {
        if (error instanceof Error) {
          await captureException(error, ctx.session.user.id);
        }
        const uploadError = summarizeUploadError(error);
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          ...uploadError,
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
        uploadId: z.string().uuid(),
        blobUrl: z.string().url(),
        timezone: z.string().optional(),
        country: z.string().optional(),
        consentPhotos: z.boolean().optional(),
        consentWork: z.boolean().optional(),
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
        const preparedUpload = await prepareHingeTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          hingeId: input.hingeId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          return preparedUpload.committedProfile;
        }

        // Fetch JSON from blob storage
        const anonymizedHingeJson = await fetchVerifiedHingeBlob(
          input.blobUrl,
          input.hingeId,
          { consume: false },
        );

        // Get user's existing profile
        const existingUserProfile =
          await ctx.db.query.hingeProfileTable.findFirst({
            where: eq(hingeProfileTable.userId, ctx.session.user.id),
          });

        if (!existingUserProfile) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "No existing profile found to merge with. Use createProfile instead.",
          });
        }

        if (existingUserProfile.hingeId === input.hingeId) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Cannot merge profile with itself. Use updateProfile instead.",
          });
        }

        // Safety check: Prevent backward merges (uploading older account after newer one)
        // For Hinge, we use createDate (signup time) instead of daily usage
        const newSignupTime = new Date(
          anonymizedHingeJson.User.account.signup_time,
        );

        if (
          isSameHingeAccountSignup(
            existingUserProfile.createDate,
            newSignupTime,
          )
        ) {
          // REVIEW(provider assumption): Exact signup equality is our best
          // same-account proof because Hinge exports have no durable account
          // ID. Keep the historical public SwipeStats ID stable and perform a
          // deduplicating additive update instead of duplicating every thread
          // through the cross-account merge path.
          console.log(
            `Additive update across Hinge ID versions: ${input.hingeId} → ${existingUserProfile.hingeId}`,
          );
          const result = await additiveUpdateHingeProfile({
            hingeId: existingUserProfile.hingeId,
            blobUrl: input.blobUrl,
            userId: ctx.session.user.id,
            timezone: input.timezone,
            country: input.country,
            consentPhotos: input.consentPhotos ?? true,
            consentWork: input.consentWork ?? true,
            verifiedJson: anonymizedHingeJson,
            transientUpload: preparedUpload.binding,
          });

          if (!result.isNoOp) {
            trackServerEvent(ctx.session.user.id, "hinge_profile_updated", {
              hingeId: existingUserProfile.hingeId,
              incomingHingeId: input.hingeId,
              historicalIdVersion: true,
              matchCount: result.metrics.matchCount,
              messageCount: result.metrics.messageCount,
              photoCount: result.metrics.photoCount,
              promptCount: result.metrics.promptCount,
              interactionCount: result.metrics.interactionCount,
              hasPhotos: result.metrics.hasPhotos,
              processingTimeMs: result.metrics.processingTimeMs,
              jsonSizeMB: result.metrics.jsonSizeMB,
              consentPhotos: input.consentPhotos ?? true,
              consentWork: input.consentWork ?? true,
            });
          }

          return result.profile;
        }

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
          consentPhotos: input.consentPhotos ?? true,
          consentWork: input.consentWork ?? true,
          verifiedJson: anonymizedHingeJson,
          transientUpload: preparedUpload.binding,
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
          consentPhotos: input.consentPhotos ?? true,
          consentWork: input.consentWork ?? true,
        });

        return result.profile;
      } catch (error) {
        if (error instanceof Error) {
          await captureException(error, ctx.session.user.id);
        }
        const uploadError = summarizeUploadError(error);
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          ...uploadError,
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
        uploadId: z.string().uuid(),
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

      const preparedUpload = await prepareHingeTransientUpload({
        uploadId: input.uploadId,
        blobUrl: input.blobUrl,
        hingeId: input.hingeId,
        userId: ctx.session.user.id,
        sessionId: ctx.session.session.id,
      });
      if (preparedUpload.committedProfile) {
        return preparedUpload.committedProfile;
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
          transientUpload: preparedUpload.binding,
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
          consentPhotos: true,
          consentWork: true,
        });

        return result.profile;
      } catch (error) {
        if (error instanceof Error) {
          await captureException(error, ctx.session.user.id);
        }
        const uploadError = summarizeUploadError(error);
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          ...uploadError,
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
        uploadId: z.string().uuid(),
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

      const preparedUpload = await prepareHingeTransientUpload({
        uploadId: input.uploadId,
        blobUrl: input.blobUrl,
        hingeId: input.hingeId,
        userId: ctx.session.user.id,
        sessionId: ctx.session.session.id,
      });
      if (preparedUpload.committedProfile) {
        return preparedUpload.committedProfile;
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
          transientUpload: preparedUpload.binding,
        });

        // Track success with rich metrics — skip when the same export was
        // re-uploaded (nothing new merged in) to avoid a noisy "0 new" update.
        if (!result.isNoOp) {
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
            consentPhotos: true,
            consentWork: true,
          });
        }

        return result.profile;
      } catch (error) {
        if (error instanceof Error) {
          await captureException(error, ctx.session.user.id);
        }
        const uploadError = summarizeUploadError(error);
        trackServerEvent(ctx.session.user.id, "hinge_profile_upload_failed", {
          hingeId: input.hingeId,
          ...uploadError,
        });
        throw error;
      }
    }),
} satisfies TRPCRouterRecord;
