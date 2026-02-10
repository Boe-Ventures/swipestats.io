import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { differenceInYears } from "date-fns";
import { geolocation } from "@vercel/functions";
import { headers } from "next/headers";

import { eq } from "drizzle-orm";
import {
  tinderProfileTable,
  mediaTable,
  tinderUsageTable,
  userTable,
} from "@/server/db/schema";
import { getContinentFromCountry } from "@/lib/utils/continent";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import {
  createTinderProfile,
  getTinderProfile,
  getTinderProfileWithUser,
  transferProfileOwnership,
} from "@/server/services/profile/profile.service";
import {
  additiveUpdateProfile,
  absorbProfileIntoNew,
} from "@/server/services/profile/additive.service";
import { trackServerEvent } from "@/server/services/analytics.service";
import { captureException } from "@/server/clients/posthog.client";
import { getFirstAndLastDayOnApp } from "@/lib/profile.utils";

/**
 * Helper function to handle existing profile upload scenarios
 * (user owns profile, anonymous transfer, or forbidden)
 */
async function handleExistingProfileUpload(params: {
  existing: NonNullable<Awaited<ReturnType<typeof getTinderProfileWithUser>>>;
  tinderId: string;
  blobUrl: string;
  currentUserId: string;
  timezone?: string;
  country?: string;
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

  // Case C: Profile owned by anonymous user - transfer then use additive update
  if (existing.user?.isAnonymous && existing.userId) {
    console.log(
      `🔀 Transferring profile ${params.tinderId} from anonymous user ${existing.userId} to ${currentUserId}`,
    );
    await transferProfileOwnership(
      params.tinderId,
      existing.userId,
      currentUserId,
    );
    return additiveUpdateProfile({
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
        scenario = "different_tinderId"; // Cross-account merge
      } else {
        scenario = "new_profile";
      }

      // Identity mismatch detection for cross-account merges
      let identityMismatch = false;
      if (scenario === "different_tinderId" && userProfile && input.birthDate) {
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
  // Fast path with minimal checks - only validates tinderId doesn't exist
  createProfile: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
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

          await ctx.db
            .update(userTable)
            .set({
              city,
              country,
              region,
              continent,
              timeZone: input.timezone || undefined,
            })
            .where(eq(userTable.id, ctx.session.user.id));
        }

        // Create brand new profile
        console.log(`📝 Creating new profile: ${input.tinderId}`);
        const result = await createTinderProfile({
          tinderId: input.tinderId,
          blobUrl: input.blobUrl,
          userId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
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
        trackServerEvent(ctx.session.user.id, "tinder_profile_upload_failed", {
          tinderId: input.tinderId,
          errorType: "unknown",
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        });
        throw error;
      }
    }),

  // Additive update endpoint for re-uploading data or claiming anonymous profiles
  // Handles: same_tinderId (additive update) and can_claim (transfer + update)
  updateProfile: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
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

          await ctx.db
            .update(userTable)
            .set({
              city,
              country,
              region,
              continent,
              timeZone: input.timezone || undefined,
            })
            .where(eq(userTable.id, ctx.session.user.id));
        }

        // Handle ownership scenarios
        const result = await handleExistingProfileUpload({
          existing: existingProfile,
          tinderId: input.tinderId,
          blobUrl: input.blobUrl,
          currentUserId: ctx.session.user.id,
          timezone: input.timezone,
          country: input.country,
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
        trackServerEvent(ctx.session.user.id, "tinder_profile_upload_failed", {
          tinderId: input.tinderId,
          errorType: "unknown",
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
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
        // Get user's existing profile
        const existingUserProfile =
          await ctx.db.query.tinderProfileTable.findFirst({
            where: eq(tinderProfileTable.userId, ctx.session.user.id),
          });

        if (!existingUserProfile) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No existing profile found to merge with. Use createProfile instead.",
          });
        }

        if (existingUserProfile.tinderId === input.tinderId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot merge profile with itself. Use updateProfile instead.",
          });
        }

        // Fetch JSON from blob to validate chronological order
        const { fetchBlobJson } =
          await import("@/server/services/blob.service");
        const anonymizedTinderJson =
          await fetchBlobJson<AnonymizedTinderDataJSON>(input.blobUrl);

        // Safety check: Prevent backward merges (uploading older account after newer one)
        const newProfileDates = getFirstAndLastDayOnApp(
          anonymizedTinderJson.Usage.app_opens,
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
        trackServerEvent(ctx.session.user.id, "tinder_profile_upload_failed", {
          tinderId: input.tinderId,
          errorType: "unknown",
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        });
        throw error;
      }
    }),

  // Legacy create endpoint (deprecated - use createProfile instead)
  create: publicProcedure
    .input(
      z.object({
        tinderId: z.string().min(1),
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
      });
    }),
} satisfies TRPCRouterRecord;
