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
import {
  createTinderProfile,
  getTinderProfile,
  replaceTinderProfileRevision,
} from "@/server/services/profile/profile.service";
import { resolveTinderUploadTarget } from "@/server/services/profile/tinder-upload-target";
import { absorbProfileIntoNew } from "@/server/services/profile/additive.service";
import { trackServerEvent } from "@/server/services/analytics.service";
import { captureException } from "@/server/clients/posthog.client";
import { getTinderObservedUsageRange } from "@/lib/profile.utils";
import { summarizeUploadError } from "@/server/services/upload-error.service";
import {
  uploadLocation,
  captureUploadLocation,
} from "@/server/services/user/location.service";
import {
  loadVerifiedAnonymizedTinderData,
  tinderBirthDatesMatch,
  tinderCreateDatesMatch,
} from "@/server/services/profile/validation.service";
import {
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

  // Context is advisory. Mutations verify the export before resolving ownership.
  getUploadContext: publicProcedure
    .input(
      z.object({
        tinderId: z.string().optional(),
        birthDate: z.string().optional(),
        createDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Export fingerprints are not possession secrets. Never look up another
      // session's profile or block an independent import using those fields.
      if (!ctx.session?.user?.id) {
        return {
          userProfile: null,
          targetProfile: null,
          scenario: "new_user" as const,
          identityMismatch: false,
        };
      }
      const userProfile = await ctx.db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.userId, ctx.session.user.id),
        columns: {
          tinderId: true,
          createdAt: true,
          firstDayOnApp: true,
          lastDayOnApp: true,
          birthDate: true,
          createDate: true,
        },
      });
      const sameAccount =
        !!userProfile &&
        (input.birthDate && input.createDate
          ? tinderBirthDatesMatch(userProfile.birthDate, input.birthDate) &&
            tinderCreateDatesMatch(userProfile.createDate, input.createDate)
          : input.tinderId === userProfile.tinderId);
      const scenario =
        !userProfile || !input.tinderId
          ? ("new_profile" as const)
          : sameAccount
            ? ("same_tinderId" as const)
            : ("different_tinderId" as const);
      return {
        userProfile,
        targetProfile:
          sameAccount && userProfile
            ? { tinderId: userProfile.tinderId }
            : null,
        scenario,
        identityMismatch:
          !!userProfile &&
          !!input.birthDate &&
          !tinderBirthDatesMatch(userProfile.birthDate, input.birthDate),
      };
    }),

  // Create an independent profile for the authenticated owner.
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

      const detectedLocation = uploadLocation(ctx.headers, input);

      try {
        const preparedUpload = await prepareTinderTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          tinderId: input.tinderId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            preparedUpload.committedProfile,
          );
          return preparedUpload.committedProfile;
        }

        const existing = await ctx.db.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.userId, ctx.session.user.id),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Your Tinder profile changed. Refresh the upload step before continuing.",
          });
        }
        const verifiedTinderJson = await loadVerifiedAnonymizedTinderData(
          input.blobUrl,
          input.tinderId,
          {
            photos: input.consentPhotos ?? true,
            work: input.consentWork ?? true,
          },
        );
        const target = await resolveTinderUploadTarget({
          userId: ctx.session.user.id,
          birthDate: verifiedTinderJson.User.birth_date,
          createDate: verifiedTinderJson.User.create_date,
        });
        const result = await createTinderProfile({
          tinderId: target.tinderId,
          verifiedTinderId: input.tinderId,
          verifiedTinderJson,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: detectedLocation.timeZone ?? undefined,
          country: detectedLocation.country ?? undefined,
          consentPhotos: input.consentPhotos,
          consentWork: input.consentWork,
          transientUpload: preparedUpload.binding,
        });

        trackServerEvent(ctx.session.user.id, "tinder_profile_created", {
          tinderId: result.profile.tinderId,
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

        await captureUploadLocation(
          ctx.session.user.id,
          detectedLocation,
          result.profile,
        );
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

  // Replace the current projection from a verified repeat export.
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

      const detectedLocation = uploadLocation(ctx.headers, input);

      try {
        const preparedUpload = await prepareTinderTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          tinderId: input.tinderId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            preparedUpload.committedProfile,
          );
          return preparedUpload.committedProfile;
        }

        // Check if profile exists
        const existingProfile = await ctx.db.query.tinderProfileTable.findFirst(
          {
            where: eq(tinderProfileTable.userId, ctx.session.user.id),
          },
        );

        if (!existingProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found. Use createProfile instead.",
          });
        }

        const verifiedTinderJson = await loadVerifiedAnonymizedTinderData(
          input.blobUrl,
          input.tinderId,
          {
            photos: input.consentPhotos ?? true,
            work: input.consentWork ?? true,
          },
        );
        const target = await resolveTinderUploadTarget({
          userId: ctx.session.user.id,
          birthDate: verifiedTinderJson.User.birth_date,
          createDate: verifiedTinderJson.User.create_date,
          existingProfile,
        });
        if (!target.isSameAccount) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This export is from a different Tinder account. Refresh the upload step to review the merge.",
          });
        }
        const result = await replaceTinderProfileRevision({
          tinderId: target.tinderId,
          verifiedTinderId: input.tinderId,
          verifiedTinderJson,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: detectedLocation.timeZone ?? undefined,
          country: detectedLocation.country ?? undefined,
          consentPhotos: input.consentPhotos,
          consentWork: input.consentWork,
          transientUpload: preparedUpload.binding,
        });

        trackServerEvent(ctx.session.user.id, "tinder_profile_updated", {
          tinderId: result.profile.tinderId,
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

        await captureUploadLocation(
          ctx.session.user.id,
          detectedLocation,
          result.profile,
        );
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

      const detectedLocation = uploadLocation(ctx.headers, input);

      try {
        const preparedUpload = await prepareTinderTransientUpload({
          uploadId: input.uploadId,
          blobUrl: input.blobUrl,
          tinderId: input.tinderId,
          userId: ctx.session.user.id,
          sessionId: ctx.session.session.id,
        });
        if (preparedUpload.committedProfile) {
          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            preparedUpload.committedProfile,
          );
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

        const target = await resolveTinderUploadTarget({
          userId: ctx.session.user.id,
          birthDate: anonymizedTinderJson.User.birth_date,
          createDate: anonymizedTinderJson.User.create_date,
          existingProfile: existingUserProfile,
        });

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

        if (target.isSameAccount) {
          // REVIEW(provider assumption): Exact birth calendar date plus exact
          // account-create instant identifies the same owned Tinder account
          // across historical raw timestamp spellings. Preserve the existing
          // public ID and replace its complete derived projection.
          const result = await replaceTinderProfileRevision({
            tinderId: existingUserProfile.tinderId,
            verifiedTinderId: input.tinderId,
            blobUrl: input.blobUrl,
            userId: ctx.session.user.id,
            timezone: detectedLocation.timeZone ?? undefined,
            country: detectedLocation.country ?? undefined,
            consentPhotos: input.consentPhotos,
            consentWork: input.consentWork,
            verifiedTinderJson: anonymizedTinderJson,
            transientUpload: preparedUpload.binding,
          });

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
          await captureUploadLocation(
            ctx.session.user.id,
            detectedLocation,
            result.profile,
          );
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
              "Contact support to review the older export without deleting your current profile or saved history.",
          });
        }

        console.log(
          `🔄 Cross-account merge: ${existingUserProfile.tinderId} → ${input.tinderId}`,
        );
        const result = await absorbProfileIntoNew({
          oldTinderId: existingUserProfile.tinderId,
          newTinderId: target.tinderId,
          verifiedTinderId: input.tinderId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: detectedLocation.timeZone ?? undefined,
          country: detectedLocation.country ?? undefined,
          consentPhotos: input.consentPhotos,
          consentWork: input.consentWork,
          verifiedTinderJson: anonymizedTinderJson,
          transientUpload: preparedUpload.binding,
        });

        trackServerEvent(ctx.session.user.id, "tinder_profile_updated", {
          tinderId: result.profile.tinderId,
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

        await captureUploadLocation(
          ctx.session.user.id,
          detectedLocation,
          result.profile,
        );
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
      const detectedLocation = uploadLocation(ctx.headers, input);

      const preparedUpload = await prepareTinderTransientUpload({
        uploadId: input.uploadId,
        blobUrl: input.blobUrl,
        tinderId: input.tinderId,
        userId: ctx.session.user.id,
        sessionId: ctx.session.session.id,
      });
      if (preparedUpload.committedProfile) {
        await captureUploadLocation(
          ctx.session.user.id,
          detectedLocation,
          preparedUpload.committedProfile,
        );
        return preparedUpload.committedProfile;
      }

      // Check if profile already exists
      const existing = await ctx.db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.userId, ctx.session.user.id),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Profile already exists. Use update instead.",
        });
      }

      const verifiedTinderJson = await loadVerifiedAnonymizedTinderData(
        input.blobUrl,
        input.tinderId,
      );
      const target = await resolveTinderUploadTarget({
        userId: ctx.session.user.id,
        birthDate: verifiedTinderJson.User.birth_date,
        createDate: verifiedTinderJson.User.create_date,
      });
      const result = await createTinderProfile({
        tinderId: target.tinderId,
        verifiedTinderId: input.tinderId,
        verifiedTinderJson,
        blobUrl: input.blobUrl,
        userId: ctx.session.user.id,
        timezone: detectedLocation.timeZone ?? undefined,
        country: detectedLocation.country ?? undefined,
        transientUpload: preparedUpload.binding,
      });
      await captureUploadLocation(
        ctx.session.user.id,
        detectedLocation,
        result.profile,
      );
      return result;
    }),
} satisfies TRPCRouterRecord;
