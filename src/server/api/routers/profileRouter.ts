import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { geolocation } from "@vercel/functions";
import { headers } from "next/headers";

import { eq } from "drizzle-orm";
import {
  tinderProfileTable,
  mediaTable,
  tinderUsageTable,
} from "@/server/db/schema";
import { getContinentFromCountry } from "@/lib/utils/continent";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import {
  createTinderProfile,
  getTinderProfile,
  getTinderProfileWithUser,
} from "@/server/services/profile/profile.service";
import {
  additiveUpdateProfile,
  absorbProfileIntoNew,
} from "@/server/services/profile/additive.service";
import { trackServerEvent } from "@/server/services/analytics.service";
import { captureException } from "@/server/clients/posthog.client";
import { getTinderObservedUsageRange } from "@/lib/profile.utils";
import { summarizeUploadError } from "@/server/services/upload-error.service";
import { updateTinderSwipeRankUserLocation } from "@/server/services/swipe-rank/lifecycle.service";
import {
  loadVerifiedAnonymizedTinderData,
  tinderBirthDatesMatch,
  tinderCreateDatesMatch,
} from "@/server/services/profile/validation.service";
import {
  cleanupCommittedTransientUpload,
  registerTransientUploadForProcessing,
  type TransientUploadBinding,
} from "@/server/services/transient-upload.service";

async function prepareTinderTransientUpload(params: {
  uploadId: string;
  blobUrl: string;
  tinderId: string;
  userId: string;
  sessionId: string;
}): Promise<{
  binding: TransientUploadBinding;
  committedProfile?: NonNullable<Awaited<ReturnType<typeof getTinderProfile>>>;
}> {
  const binding: TransientUploadBinding = {
    id: params.uploadId,
    userId: params.userId,
    sessionId: params.sessionId,
    dataProvider: "TINDER",
    profileId: params.tinderId,
    blobUrl: params.blobUrl,
  };
  const lease = await registerTransientUploadForProcessing(binding);
  if (lease.status === "COMMITTED" || lease.status === "CLEANED") {
    await cleanupCommittedTransientUpload(lease.id);
    const profile = lease.resultProfileId
      ? await getTinderProfile(lease.resultProfileId)
      : null;
    if (profile?.userId !== params.userId) {
      throw new Error(
        "Committed temporary upload has no owned result profile.",
      );
    }
    return { binding, committedProfile: profile };
  }
  return { binding };
}

/**
 * Helper function to handle existing profile upload scenarios
 * (user owns profile or the request is forbidden)
 */
async function handleExistingProfileUpload(params: {
  existing: NonNullable<Awaited<ReturnType<typeof getTinderProfileWithUser>>>;
  tinderId: string;
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
      `🔄 Additive update for existing profile tinderId: ${params.tinderId}`,
    );
    return additiveUpdateProfile({
      ...uploadParams,
      userId: currentUserId,
    });
  }

  // Cross-session anonymous claims are deliberately unsupported. The Tinder ID
  // is derived from birth/create dates that are identity-consistency fields,
  // not a possession secret. Legitimate guest conversion is transferred by
  // Better Auth's onLinkAccount hook while the original anonymous session is
  // still present; any other account must go through support-assisted recovery.
  if (existing.user?.isAnonymous && existing.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This anonymous profile belongs to a different session. Convert the original guest session or contact support to recover it.",
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
      if (!profile) return null;

      // This route is public for legacy upload/directory callers. Return only
      // the coarse presentation fields: exact birth/create dates and ownership
      // identifiers must never be disclosed by this endpoint.
      return {
        tinderId: profile.tinderId,
        computed: profile.computed,
        ageAtUpload: profile.ageAtUpload,
        ageAtLastUsage: profile.ageAtLastUsage,
        gender: profile.gender,
        city: profile.city,
        country: profile.country,
        region: profile.region,
        interestedIn: profile.interestedIn,
        firstDayOnApp: profile.firstDayOnApp,
        lastDayOnApp: profile.lastDayOnApp,
        daysInProfilePeriod: profile.daysInProfilePeriod,
      };
    }),

  // Get multiple profiles with usage data for comparison
  getWithUsage: publicProcedure
    .input(
      z.object({
        tinderIds: z.array(z.string().min(1)).max(4),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profiles = await ctx.db.query.tinderProfileTable.findMany({
        where: (table, { inArray }) => inArray(table.tinderId, input.tinderIds),
        columns: {
          tinderId: true,
        },
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

  // Get upload context - helps frontend show appropriate UI
  getUploadContext: publicProcedure
    .input(
      z.object({
        tinderId: z.string().optional(), // The tinderId from dropped file (if available)
        birthDate: z.string().optional(), // birth_date from User object for identity validation
      }),
    )
    .query(async ({ ctx, input }) => {
      // Always check if target profile exists (even without session)
      const targetProfile = input.tinderId
        ? await ctx.db.query.tinderProfileTable.findFirst({
            where: eq(tinderProfileTable.tinderId, input.tinderId),
            columns: { tinderId: true, userId: true },
          })
        : null;

      // If no session, determine scenario based on target profile
      if (!ctx.session?.user?.id) {
        let scenario: "new_user" | "needs_signin";

        if (!targetProfile) {
          scenario = "new_user"; // Profile doesn't exist
        } else {
          // Both claimed and anonymous profiles require their existing session.
          // A newly-created session cannot prove ownership from export fields.
          scenario = "needs_signin";
        }

        return {
          userProfile: null,
          targetProfile: targetProfile
            ? { tinderId: targetProfile.tinderId }
            : null,
          scenario,
          identityMismatch: false,
        };
      }

      // Get user's existing profile (1:1 so at most one)
      const userProfile = await ctx.db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.userId, ctx.session.user.id),
        columns: {
          tinderId: true,
          createdAt: true,
          firstDayOnApp: true,
          lastDayOnApp: true,
          birthDate: true, // Need this for identity mismatch detection
        },
      });

      // Determine scenario for logged-in users
      let scenario:
        | "new_profile"
        | "same_tinderId"
        | "different_tinderId"
        | "owned_by_other";

      if (!userProfile && !targetProfile) {
        scenario = "new_profile"; // First upload, tinderId doesn't exist
      } else if (!userProfile && targetProfile) {
        scenario = targetProfile.userId ? "owned_by_other" : "new_profile"; // Profile exists but not ours
      } else if (userProfile && input.tinderId === userProfile.tinderId) {
        scenario = "same_tinderId"; // Additive update
      } else if (
        userProfile &&
        input.tinderId &&
        input.tinderId !== userProfile.tinderId
      ) {
        // Cross-account merge creates the incoming profile ID. An already
        // existing target cannot be absorbed safely or claimed implicitly.
        scenario = targetProfile ? "owned_by_other" : "different_tinderId";
      } else {
        scenario = "new_profile";
      }

      // Identity mismatch detection for cross-account merges
      let identityMismatch = false;
      if (scenario === "different_tinderId" && userProfile && input.birthDate) {
        identityMismatch = !tinderBirthDatesMatch(
          userProfile.birthDate,
          input.birthDate,
        );
      }

      return {
        userProfile,
        targetProfile: targetProfile
          ? { tinderId: targetProfile.tinderId }
          : null,
        scenario,
        identityMismatch,
      };
    }),

  // Streamlined endpoint for creating new profiles (99% use case)
  // Fast path with minimal checks - only validates tinderId doesn't exist
  createProfile: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
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
        const preparedUpload = await prepareTinderTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          tinderId: input.tinderId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          return preparedUpload.committedProfile;
        }

        // Quick check: does this tinderId already exist?
        const existingByTinderId = await getTinderProfile(input.tinderId);

        if (existingByTinderId) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This profile already exists. Use updateProfile or mergeAccounts instead.",
          });
        }

        // Extract Vercel geolocation (undefined on localhost)
        const headersList = await headers();
        const request = new Request("http://localhost", {
          headers: headersList,
        });
        const geo = geolocation(request);

        // Update user location with Vercel geo data if available
        if (geo?.city || geo?.country) {
          const city = geo.city || null;
          const country = geo.country || null;
          const region = geo.countryRegion || null;
          const continent = getContinentFromCountry(country);

          await updateTinderSwipeRankUserLocation({
            userId: ctx.session.user.id,
            city,
            country,
            region,
            continent,
            timeZone: input.timezone || undefined,
          });
        }

        // Create brand new profile
        console.log(`📝 Creating new profile: ${input.tinderId}`);
        const result = await createTinderProfile({
          tinderId: input.tinderId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
          consentPhotos: input.consentPhotos,
          consentWork: input.consentWork,
          transientUpload: preparedUpload.binding,
        });

        trackServerEvent(ctx.session.user.id, "tinder_profile_created", {
          tinderId: input.tinderId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          usageDays: result.metrics.usageDays,
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
        trackServerEvent(ctx.session.user.id, "tinder_profile_upload_failed", {
          tinderId: input.tinderId,
          ...uploadError,
        });
        throw error;
      }
    }),

  // Additive update endpoint for a profile already owned by this session.
  updateProfile: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
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
        const preparedUpload = await prepareTinderTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          tinderId: input.tinderId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          return preparedUpload.committedProfile;
        }

        // Check if profile exists
        const existingProfile = await getTinderProfileWithUser(input.tinderId);

        if (!existingProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found. Use createProfile instead.",
          });
        }

        // Extract Vercel geolocation (undefined on localhost)
        const headersList = await headers();
        const request = new Request("http://localhost", {
          headers: headersList,
        });
        const geo = geolocation(request);

        // Update user location with Vercel geo data if available
        if (geo?.city || geo?.country) {
          const city = geo.city || null;
          const country = geo.country || null;
          const region = geo.countryRegion || null;
          const continent = getContinentFromCountry(country);

          await updateTinderSwipeRankUserLocation({
            userId: ctx.session.user.id,
            city,
            country,
            region,
            continent,
            timeZone: input.timezone || undefined,
          });
        }

        // Handle ownership scenarios
        const result = await handleExistingProfileUpload({
          existing: existingProfile,
          tinderId: input.tinderId,
          blobUrl: input.blobUrl,
          currentUserId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
          consentPhotos: input.consentPhotos,
          consentWork: input.consentWork,
          transientUpload: preparedUpload.binding,
        });

        // Skip the event when the same export was re-uploaded (nothing new
        // merged in) — otherwise it reads as a noisy "0 new" update.
        if (!result.isNoOp) {
          trackServerEvent(ctx.session.user.id, "tinder_profile_updated", {
            tinderId: input.tinderId,
            matchCount: result.metrics.matchCount,
            messageCount: result.metrics.messageCount,
            photoCount: result.metrics.photoCount,
            usageDays: result.metrics.usageDays,
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
        trackServerEvent(ctx.session.user.id, "tinder_profile_upload_failed", {
          tinderId: input.tinderId,
          ...uploadError,
        });
        throw error;
      }
    }),

  // Cross-account merge endpoint for merging old Tinder account into new one
  // Validates chronological order and prevents identity mismatches
  mergeAccounts: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
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
        const preparedUpload = await prepareTinderTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          tinderId: input.tinderId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          return preparedUpload.committedProfile;
        }

        // Get user's existing profile
        const existingUserProfile =
          await ctx.db.query.tinderProfileTable.findFirst({
            where: eq(tinderProfileTable.userId, ctx.session.user.id),
          });

        if (!existingUserProfile) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "No existing profile found to merge with. Use createProfile instead.",
          });
        }

        if (existingUserProfile.tinderId === input.tinderId) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Cannot merge profile with itself. Use updateProfile instead.",
          });
        }

        // Reject before fetching/consuming the temporary export. The merge
        // path creates this target ID and never implicitly claims an existing
        // profile, whether or not that row currently has an owner.
        const existingTargetProfile = await getTinderProfile(input.tinderId);
        if (existingTargetProfile) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "The Tinder profile in this export already exists and cannot be used as a merge target.",
          });
        }

        // Validate the blob schema and bind it to the claimed Tinder ID before
        // making merge decisions from provider-supplied chronology.
        const anonymizedTinderJson = await loadVerifiedAnonymizedTinderData(
          input.blobUrl,
          input.tinderId,
          {
            photos: input.consentPhotos ?? true,
            work: input.consentWork ?? true,
          },
          { consume: false },
        );

        if (
          !tinderBirthDatesMatch(
            existingUserProfile.birthDate,
            anonymizedTinderJson.User.birth_date,
          )
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This export has a different birth date from your existing Tinder profile and cannot be merged.",
          });
        }

        if (
          tinderCreateDatesMatch(
            existingUserProfile.createDate,
            anonymizedTinderJson.User.create_date,
          )
        ) {
          // REVIEW(provider assumption): Exact birth calendar date plus exact
          // account-create instant identifies the same owned Tinder account
          // across historical raw timestamp spellings. Preserve the existing
          // public ID and use the deduplicating additive path.
          const result = await additiveUpdateProfile({
            tinderId: existingUserProfile.tinderId,
            verifiedTinderId: input.tinderId,
            blobUrl: input.blobUrl,
            userId: ctx.session.user.id,
            timezone: input.timezone,
            country: input.country,
            consentPhotos: input.consentPhotos,
            consentWork: input.consentWork,
            verifiedTinderJson: anonymizedTinderJson,
            transientUpload: preparedUpload.binding,
          });

          if (!result.isNoOp) {
            trackServerEvent(ctx.session.user.id, "tinder_profile_updated", {
              tinderId: existingUserProfile.tinderId,
              matchCount: result.metrics.matchCount,
              messageCount: result.metrics.messageCount,
              photoCount: result.metrics.photoCount,
              usageDays: result.metrics.usageDays,
              hasPhotos: result.metrics.hasPhotos,
              processingTimeMs: result.metrics.processingTimeMs,
              jsonSizeMB: result.metrics.jsonSizeMB,
              consentPhotos: input.consentPhotos ?? true,
              consentWork: input.consentWork ?? true,
            });
          }
          return result.profile;
        }

        if (anonymizedTinderJson.User.create_date_inferred === true) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This Tinder export omits the provider account creation date, so SwipeStats cannot safely decide whether it is a repeat export or a different account. Please upload a complete export or contact support.",
          });
        }

        // Safety check: Prevent backward merges (uploading older account after newer one)
        const newProfileDates = getTinderObservedUsageRange(
          anonymizedTinderJson.Usage,
        );

        if (
          existingUserProfile.lastDayOnApp &&
          newProfileDates.lastDayOnApp < existingUserProfile.lastDayOnApp
        ) {
          console.log(
            `⚠️ Backward merge blocked: new profile ends ${newProfileDates.lastDayOnApp.toISOString()}, existing ends ${existingUserProfile.lastDayOnApp.toISOString()}`,
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This appears to be an older Tinder account than your current profile. " +
              "Cross-account merges must go from older → newer accounts. " +
              "If you need to merge data from an older account, please delete your current profile first and re-upload in chronological order (oldest first).",
          });
        }

        console.log(
          `🔄 Cross-account merge: ${existingUserProfile.tinderId} → ${input.tinderId}`,
        );
        const result = await absorbProfileIntoNew({
          oldTinderId: existingUserProfile.tinderId,
          newTinderId: input.tinderId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
          consentPhotos: input.consentPhotos,
          consentWork: input.consentWork,
          verifiedTinderJson: anonymizedTinderJson,
          transientUpload: preparedUpload.binding,
        });

        trackServerEvent(ctx.session.user.id, "tinder_profile_updated", {
          tinderId: input.tinderId,
          matchCount: result.metrics.matchCount,
          messageCount: result.metrics.messageCount,
          photoCount: result.metrics.photoCount,
          usageDays: result.metrics.usageDays,
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
        trackServerEvent(ctx.session.user.id, "tinder_profile_upload_failed", {
          tinderId: input.tinderId,
          ...uploadError,
        });
        throw error;
      }
    }),

  // Legacy create endpoint (deprecated - use createProfile instead)
  create: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
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

      // Check if profile already exists
      const preparedUpload = await prepareTinderTransientUpload({
        uploadId: input.uploadId,
        blobUrl: input.blobUrl,
        tinderId: input.tinderId,
        userId: ctx.session.user.id,
        sessionId: ctx.session.session.id,
      });
      if (preparedUpload.committedProfile) {
        return preparedUpload.committedProfile;
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
        blobUrl: input.blobUrl,
        userId: ctx.session.user.id,
        timezone: input.timezone,
        country: input.country,
        transientUpload: preparedUpload.binding,
      });
    }),
} satisfies TRPCRouterRecord;
