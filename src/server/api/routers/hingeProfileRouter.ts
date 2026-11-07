import {
  uploadLocation,
  captureUploadLocation,
} from "@/server/services/user/location.service";
import { getHingeComparisonProfile } from "@/server/services/hinge/hinge-comparison.service";
import { summarizeHingeCsvActivity } from "@/lib/hinge/csv-activity";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { differenceInYears } from "date-fns";
import { eq } from "drizzle-orm";
import { hingeProfileTable } from "@/server/db/schema";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import {
  createHingeProfile,
  updateHingeProfile,
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
import { parseHingeTimestampToDate } from "@/lib/hinge/timestamp";
import {
  resolveHingeUploadTarget,
  requiresHingeGuestReplacement,
} from "@/server/services/hinge/hinge-upload-target";
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

const hingeProfileProcedures = {
  getComparison: publicProcedure
    .input(
      z.object({
        hingeIds: z
          .array(z.string().regex(/^[a-f0-9]{64}$/))
          .min(1)
          .max(4),
      }),
    )
    .query(async ({ input }) => {
      const ids = [...new Set(input.hingeIds)];
      const results = await Promise.all(ids.map(getHingeComparisonProfile));
      return {
        profiles: results.filter((profile) => profile !== null),
        missingIds: ids.filter((_, index) => results[index] === null),
      };
    }),
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
          csvActivity: true,
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

      const { csvActivity, ...publicProfile } = profile;
      return {
        ...publicProfile,
        csvSummary: csvActivity ? summarizeHingeCsvActivity(csvActivity) : null,
      };
    }),

  // Get upload context - helps frontend show appropriate UI
  getUploadContext: publicProcedure
    .input(
      z.object({
        hingeId: z.string().optional(), // The hingeId from dropped file (if available)
        birthDate: z.string().optional(), // Derived birth_date for identity validation
        signupTime: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // A timestamp-derived export ID is not a global ownership identifier.
      // Do not look up or expose another session's profile here.
      if (!ctx.session?.user?.id) {
        return {
          userProfile: null,
          targetProfile: null,
          scenario: "new_user" as const,
          identityMismatch: false,
          requiresGuestChoice: false,
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

      const sameAccount =
        userProfile &&
        (input.signupTime
          ? isSameHingeAccountSignup(
              userProfile.createDate,
              parseHingeTimestampToDate(input.signupTime),
            )
          : input.hingeId === userProfile.hingeId);
      const scenario =
        !userProfile || !input.hingeId
          ? ("new_profile" as const)
          : sameAccount
            ? ("same_hingeId" as const)
            : ("different_hingeId" as const);

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
        targetProfile:
          sameAccount && userProfile ? { hingeId: userProfile.hingeId } : null,
        scenario,
        identityMismatch,
        identityComparison,
        requiresGuestChoice:
          !!userProfile && ctx.session.user.isAnonymous === true,
      };
    }),

  // Import into the current owner's namespace, or update their same account.
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
        guestReplacementProfileId: z.string().min(1).optional(),
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

      const detectedLocation = uploadLocation(ctx.headers, input);

      try {
        const preparedUpload = await prepareHingeTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          hingeId: input.hingeId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            preparedUpload.committedProfile,
          );
          return { hingeId: preparedUpload.committedProfile.hingeId };
        }

        // Verify the transport ID against the export before choosing a stored
        // profile ID. Only the authenticated user's profile is a candidate.
        const verifiedJson = await fetchVerifiedHingeBlob(
          input.blobUrl,
          input.hingeId,
        );
        const existingForUser = await ctx.db.query.hingeProfileTable.findFirst({
          where: eq(hingeProfileTable.userId, ctx.session.user.id),
        });
        const replaceGuest = requiresHingeGuestReplacement({
          isAnonymous: ctx.session.user.isAnonymous === true,
          existingProfileId: existingForUser?.hingeId,
          confirmedProfileId: input.guestReplacementProfileId,
        });
        const target = await resolveHingeUploadTarget({
          userId: ctx.session.user.id,
          signupTime: verifiedJson.User.account.signup_time,
          existingProfile: existingForUser,
        });
        if (existingForUser && !replaceGuest && !target.isSameAccount) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "You already have a Hinge profile. Refresh the upload step so this export can be merged safely.",
          });
        }
        const isExistingProfile = !!existingForUser;
        const uploadParams = {
          hingeId: replaceGuest ? existingForUser!.hingeId : target.hingeId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: detectedLocation.timeZone ?? undefined,
          country: detectedLocation.country ?? undefined,
          consentPhotos: input.consentPhotos ?? true,
          consentWork: input.consentWork ?? true,
          transientUpload: preparedUpload.binding,
          verifiedJson,
        };
        const result = replaceGuest
          ? await updateHingeProfile({
              ...uploadParams,
              requireAnonymousOwner: true,
            })
          : isExistingProfile
            ? await additiveUpdateHingeProfile(uploadParams)
            : await createHingeProfile(uploadParams);

        const metrics = {
          hingeId: result.profile.hingeId,
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

        await captureUploadLocation(
          ctx.session.user.id,
          detectedLocation,
          result.profile,
        );
        return { hingeId: result.profile.hingeId };
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
        guestReplacementProfileId: z.string().min(1).optional(),
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

      const detectedLocation = uploadLocation(ctx.headers, input);

      try {
        const preparedUpload = await prepareHingeTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          hingeId: input.hingeId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            preparedUpload.committedProfile,
          );
          return { hingeId: preparedUpload.committedProfile.hingeId };
        }

        const verifiedJson = await fetchVerifiedHingeBlob(
          input.blobUrl,
          input.hingeId,
        );
        const existingProfile = await ctx.db.query.hingeProfileTable.findFirst({
          where: eq(hingeProfileTable.userId, ctx.session.user.id),
        });
        if (!existingProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found. Use createProfile instead.",
          });
        }
        const replaceGuest = requiresHingeGuestReplacement({
          isAnonymous: ctx.session.user.isAnonymous === true,
          existingProfileId: existingProfile.hingeId,
          confirmedProfileId: input.guestReplacementProfileId,
        });
        const target = await resolveHingeUploadTarget({
          userId: ctx.session.user.id,
          signupTime: verifiedJson.User.account.signup_time,
          existingProfile,
        });
        if (!replaceGuest && !target.isSameAccount) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This export is from a different Hinge account. Refresh the upload step to merge it safely.",
          });
        }
        const uploadParams = {
          hingeId: existingProfile.hingeId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: detectedLocation.timeZone ?? undefined,
          country: detectedLocation.country ?? undefined,
          consentPhotos: input.consentPhotos ?? true,
          consentWork: input.consentWork ?? true,
          transientUpload: preparedUpload.binding,
          verifiedJson,
        };
        const result = replaceGuest
          ? await updateHingeProfile({
              ...uploadParams,
              requireAnonymousOwner: true,
            })
          : await additiveUpdateHingeProfile(uploadParams);

        // Skip the event when the same export was re-uploaded (nothing new
        // merged in) - otherwise it reads as a noisy "0 new" update.
        if (!result.isNoOp) {
          trackServerEvent(ctx.session.user.id, "hinge_profile_updated", {
            hingeId: result.profile.hingeId,
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

        await captureUploadLocation(
          ctx.session.user.id,
          detectedLocation,
          result.profile,
        );
        return { hingeId: result.profile.hingeId };
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
        guestReplacementProfileId: z.string().min(1).optional(),
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

      const detectedLocation = uploadLocation(ctx.headers, input);

      try {
        const preparedUpload = await prepareHingeTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          hingeId: input.hingeId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            preparedUpload.committedProfile,
          );
          return { hingeId: preparedUpload.committedProfile.hingeId };
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

        const replaceGuest = requiresHingeGuestReplacement({
          isAnonymous: ctx.session.user.isAnonymous === true,
          existingProfileId: existingUserProfile.hingeId,
          confirmedProfileId: input.guestReplacementProfileId,
        });
        const newSignupTime = parseHingeTimestampToDate(
          anonymizedHingeJson.User.account.signup_time,
        );
        const target = await resolveHingeUploadTarget({
          userId: ctx.session.user.id,
          signupTime: anonymizedHingeJson.User.account.signup_time,
          existingProfile: existingUserProfile,
        });

        // Preserve historical and guest-created public IDs after account linking.
        if (replaceGuest || target.isSameAccount) {
          const uploadParams = {
            hingeId: existingUserProfile.hingeId,
            blobUrl: input.blobUrl,
            userId: ctx.session.user.id,
            timezone: detectedLocation.timeZone ?? undefined,
            country: detectedLocation.country ?? undefined,
            consentPhotos: input.consentPhotos ?? true,
            consentWork: input.consentWork ?? true,
            verifiedJson: anonymizedHingeJson,
            transientUpload: preparedUpload.binding,
          };
          const result = replaceGuest
            ? await updateHingeProfile({
                ...uploadParams,
                requireAnonymousOwner: true,
              })
            : await additiveUpdateHingeProfile(uploadParams);

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

          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            result.profile,
          );
          return { hingeId: result.profile.hingeId };
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
          `🔄 Cross-account merge: ${existingUserProfile.hingeId} → ${target.hingeId}`,
        );
        const result = await absorbHingeProfileIntoNew({
          oldHingeId: existingUserProfile.hingeId,
          newHingeId: target.hingeId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: detectedLocation.timeZone ?? undefined,
          country: detectedLocation.country ?? undefined,
          consentPhotos: input.consentPhotos ?? true,
          consentWork: input.consentWork ?? true,
          verifiedJson: anonymizedHingeJson,
          transientUpload: preparedUpload.binding,
        });

        trackServerEvent(ctx.session.user.id, "hinge_profile_merged", {
          hingeId: result.profile.hingeId,
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

        await captureUploadLocation(
          ctx.session.user.id,
          detectedLocation,
          result.profile,
        );
        return { hingeId: result.profile.hingeId };
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

// Keep old clients on the same ownership and identity rules as the current flow.
export const hingeProfileRouter = {
  ...hingeProfileProcedures,
  create: hingeProfileProcedures.createProfile,
  update: hingeProfileProcedures.updateProfile,
} satisfies TRPCRouterRecord;
