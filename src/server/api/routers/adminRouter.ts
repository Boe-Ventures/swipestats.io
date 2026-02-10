import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, isNotNull, desc, count } from "drizzle-orm";
import {
  tinderProfileTable,
  hingeProfileTable,
  mediaTable,
  originalAnonymizedFileTable,
} from "@/server/db/schema";
import { adminProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import { resetTinderProfile } from "@/server/services/profile/profile.service";
import { BlobService } from "@/server/services/blob.service";

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

      // Fetch and delete user's Tinder data files + blobs (if user exists)
      if (profile.userId) {
        const tinderFiles =
          await ctx.db.query.originalAnonymizedFileTable.findMany({
            where: and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "TINDER"),
            ),
            columns: { blobUrl: true },
          });

        // Delete blobs from Vercel storage
        const blobUrls = tinderFiles
          .map((f) => f.blobUrl)
          .filter((url): url is string => url !== null);
        if (blobUrls.length > 0) {
          console.log(
            `🗑️ Deleting ${blobUrls.length} Tinder blob(s) for profile ${input.tinderId}`,
          );
          await BlobService.deleteBulk(blobUrls).catch((error) => {
            console.error("⚠️ Failed to delete some blobs:", error);
            // Don't fail profile deletion if blob cleanup fails
          });
        }

        // Delete original file records
        await ctx.db
          .delete(originalAnonymizedFileTable)
          .where(
            and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "TINDER"),
            ),
          );
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

  // Completely reset a Tinder profile (admin/dev/testing)
  // More thorough than deleteProfile - explicitly deletes all related data
  resetProfile: adminProcedure
    .input(z.object({ tinderId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await resetTinderProfile(input.tinderId);
      return { success: true };
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

      // Fetch and delete user's Hinge data files + blobs (if user exists)
      if (profile.userId) {
        const hingeFiles =
          await ctx.db.query.originalAnonymizedFileTable.findMany({
            where: and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "HINGE"),
            ),
            columns: { blobUrl: true },
          });

        // Delete blobs from Vercel storage
        const blobUrls = hingeFiles
          .map((f) => f.blobUrl)
          .filter((url): url is string => url !== null);
        if (blobUrls.length > 0) {
          console.log(
            `🗑️ Deleting ${blobUrls.length} Hinge blob(s) for profile ${input.hingeId}`,
          );
          await BlobService.deleteBulk(blobUrls).catch((error) => {
            console.error("⚠️ Failed to delete some blobs:", error);
            // Don't fail profile deletion if blob cleanup fails
          });
        }

        // Delete original file records
        await ctx.db
          .delete(originalAnonymizedFileTable)
          .where(
            and(
              eq(originalAnonymizedFileTable.userId, profile.userId),
              eq(originalAnonymizedFileTable.dataProvider, "HINGE"),
            ),
          );
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

  // List profiles with their media inline (for admin media review - flat list)
  listProfilesWithMedia: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
        platform: z
          .enum(["all", "tinder", "hinge"])
          .optional()
          .default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      // Get Tinder profiles with media count
      const tinderProfiles =
        input.platform === "hinge"
          ? []
          : await ctx.db
              .select({
                profileId: mediaTable.tinderProfileId,
                mediaCount: count(mediaTable.id),
              })
              .from(mediaTable)
              .where(isNotNull(mediaTable.tinderProfileId))
              .groupBy(mediaTable.tinderProfileId)
              .orderBy(desc(count(mediaTable.id)));

      // Get Hinge profiles with media count
      const hingeProfiles =
        input.platform === "tinder"
          ? []
          : await ctx.db
              .select({
                profileId: mediaTable.hingeProfileId,
                mediaCount: count(mediaTable.id),
              })
              .from(mediaTable)
              .where(isNotNull(mediaTable.hingeProfileId))
              .groupBy(mediaTable.hingeProfileId)
              .orderBy(desc(count(mediaTable.id)));

      // Combine and sort by media count
      const allProfiles = [
        ...tinderProfiles.map((p) => ({
          profileId: p.profileId!,
          platform: "tinder" as const,
          mediaCount: p.mediaCount,
        })),
        ...hingeProfiles.map((p) => ({
          profileId: p.profileId!,
          platform: "hinge" as const,
          mediaCount: p.mediaCount,
        })),
      ].sort((a, b) => b.mediaCount - a.mediaCount);

      const totalCount = allProfiles.length;
      const paginatedProfiles = allProfiles.slice(offset, offset + input.limit);

      // Fetch profile details + media for each
      const profileDetails = await Promise.all(
        paginatedProfiles.map(async (p) => {
          // Fetch all media for this profile
          const media = await ctx.db.query.mediaTable.findMany({
            where:
              p.platform === "tinder"
                ? eq(mediaTable.tinderProfileId, p.profileId)
                : eq(mediaTable.hingeProfileId, p.profileId),
          });

          if (p.platform === "tinder") {
            const profile =
              await ctx.db.query.tinderProfileTable.findFirst({
                where: eq(tinderProfileTable.tinderId, p.profileId),
                columns: {
                  tinderId: true,
                  gender: true,
                  genderStr: true,
                  ageAtUpload: true,
                  city: true,
                  country: true,
                  bio: true,
                  createdAt: true,
                },
              });
            return {
              ...p,
              gender: profile?.gender ?? null,
              genderStr: profile?.genderStr ?? null,
              ageAtUpload: profile?.ageAtUpload ?? null,
              city: profile?.city ?? null,
              country: profile?.country ?? null,
              bio: profile?.bio ?? null,
              createdAt: profile?.createdAt ?? null,
              media,
            };
          } else {
            const profile =
              await ctx.db.query.hingeProfileTable.findFirst({
                where: eq(hingeProfileTable.hingeId, p.profileId),
                columns: {
                  hingeId: true,
                  gender: true,
                  genderStr: true,
                  ageAtUpload: true,
                  createdAt: true,
                },
              });
            return {
              ...p,
              gender: profile?.gender ?? null,
              genderStr: profile?.genderStr ?? null,
              ageAtUpload: profile?.ageAtUpload ?? null,
              city: null,
              country: null,
              bio: null,
              createdAt: profile?.createdAt ?? null,
              media,
            };
          }
        }),
      );

      return {
        profiles: profileDetails,
        totalCount,
        page: input.page,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),
} satisfies TRPCRouterRecord;
