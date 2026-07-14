import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { geolocation } from "@vercel/functions";
import { headers } from "next/headers";

import { eq, desc } from "drizzle-orm";
import {
  userTable,
  tinderProfileTable,
  hingeProfileTable,
  rayaProfileTable,
  originalAnonymizedFileTable,
} from "@/server/db/schema";
import { protectedProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import { BlobService } from "@/server/services/blob.service";
import { getContinentFromCountry } from "@/lib/utils/continent";
import { withTransaction } from "@/server/db";
import {
  lockTinderSwipeRankMutationsInTx,
  purgeTinderSwipeRankUserInTx,
  updateTinderSwipeRankUserLocation,
} from "@/server/services/swipe-rank/lifecycle.service";
import { invalidatePublicSwipeRankCache } from "@/server/services/swipe-rank/public-cache";

export const userRouter = {
  // Get current user profile
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.session.user.id),
    });
  }),

  // Detect location from Vercel IP headers and save to user profile
  detectLocation: protectedProcedure.mutation(async ({ ctx }) => {
    const headersList = await headers();
    const request = new Request("http://localhost", { headers: headersList });
    const geo = geolocation(request);

    const city = geo?.city ?? null;
    const country = geo?.country ?? null;
    const region = geo?.countryRegion ?? null;
    const timeZone = headersList.get("x-vercel-ip-timezone") ?? null;
    const continent = country ? getContinentFromCountry(country) : null;

    const updatedUser = await updateTinderSwipeRankUserLocation({
      userId: ctx.session.user.id,
      city,
      country,
      region,
      timeZone,
      continent,
    });

    return updatedUser;
  }),

  // Update profile (name, displayUsername)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        displayUsername: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set(input)
        .where(eq(userTable.id, ctx.session.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Update dating apps activity
  updateDatingApps: protectedProcedure
    .input(
      z.object({
        activeOnTinder: z.boolean().optional(),
        activeOnHinge: z.boolean().optional(),
        activeOnBumble: z.boolean().optional(),
        activeOnHappn: z.boolean().optional(),
        activeOnOther: z.boolean().optional(),
        otherDatingApps: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set(input)
        .where(eq(userTable.id, ctx.session.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Update self-assessment (hotness/happiness)
  updateSelfAssessment: protectedProcedure
    .input(
      z.object({
        currentHotness: z.number().min(1).max(10).optional(),
        currentHappiness: z.number().min(1).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set(input)
        .where(eq(userTable.id, ctx.session.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Update location (timezone, city, country, region)
  updateLocation: protectedProcedure
    .input(
      z.object({
        timeZone: z.string().min(1).max(100).optional(),
        city: z.string().min(1).max(100).optional(),
        country: z.string().length(2).optional(), // ISO-2 only
        region: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-derive continent from country
      const continent = input.country
        ? getContinentFromCountry(input.country)
        : undefined;

      const updatedUser = await updateTinderSwipeRankUserLocation({
        userId: ctx.session.user.id,
        ...input,
        continent,
      });

      return updatedUser;
    }),

  // Delete user account
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get user info before deletion
    const userToDelete = await ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
    });

    if (!userToDelete) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Fetch all original files for blob cleanup.
    const allFiles = await ctx.db.query.originalAnonymizedFileTable.findMany({
      where: eq(originalAnonymizedFileTable.userId, userId),
      columns: { blobUrl: true },
    });

    // Delete all user's blobs from Vercel storage
    const blobUrls = allFiles
      .map((f) => f.blobUrl)
      .filter((url): url is string => url !== null);
    if (blobUrls.length > 0) {
      console.log(`🗑️ Deleting ${blobUrls.length} blob(s) for user ${userId}`);
      // Preserve the URL records and account whenever storage reports even one
      // failure, so the user can retry instead of leaving an orphaned public
      // export that the application can no longer locate.
      await BlobService.deleteBulkOrThrow(blobUrls);
    }

    // Purge the Tinder analytical registry before the user cascade removes the
    // provider source. This removes live facts, publication consent, and the
    // person's frozen entry rows, and rolls back with account deletion if
    // either step fails.
    await withTransaction(async (tx) => {
      await lockTinderSwipeRankMutationsInTx(tx);
      await purgeTinderSwipeRankUserInTx(tx, userId);
      await tx.delete(userTable).where(eq(userTable.id, userId));
    });
    invalidatePublicSwipeRankCache();

    return { success: true, deletedUserId: userId };
  }),

  // Get user's uploaded profiles (Tinder and Hinge)
  getUploadedProfiles: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Fetch all supported uploaded profile types
    const [tinderProfiles, hingeProfiles, rayaProfiles] = await Promise.all([
      ctx.db.query.tinderProfileTable.findMany({
        where: eq(tinderProfileTable.userId, userId),
        columns: {
          tinderId: true,
          createdAt: true,
          updatedAt: true,
          ageAtUpload: true,
          gender: true,
          city: true,
          country: true,
          firstDayOnApp: true,
          lastDayOnApp: true,
          daysInProfilePeriod: true,
        },
        with: {
          profileMeta: {
            columns: {
              matchesTotal: true,
              swipeLikesTotal: true,
              swipePassesTotal: true,
              messagesSentTotal: true,
              messagesReceivedTotal: true,
              matchRate: true,
            },
            limit: 1,
            orderBy: (profileMeta) => [desc(profileMeta.to)],
          },
        },
        orderBy: [desc(tinderProfileTable.updatedAt)],
      }),
      ctx.db.query.hingeProfileTable.findMany({
        where: eq(hingeProfileTable.userId, userId),
        columns: {
          hingeId: true,
          createdAt: true,
          updatedAt: true,
          ageAtUpload: true,
          gender: true,
          country: true,
          createDate: true,
        },
        with: {
          profileMeta: {
            columns: {
              matchesTotal: true,
              swipeLikesTotal: true,
              swipePassesTotal: true,
              messagesSentTotal: true,
              messagesReceivedTotal: true,
            },
            limit: 1,
            orderBy: (profileMeta) => [desc(profileMeta.to)],
          },
        },
        orderBy: [desc(hingeProfileTable.updatedAt)],
      }),
      ctx.db.query.rayaProfileTable.findMany({
        where: eq(rayaProfileTable.userId, userId),
        columns: {
          rayaId: true,
          createdAt: true,
          updatedAt: true,
          ageAtUpload: true,
          gender: true,
          residenceLocation: true,
          firstDayOnApp: true,
          lastDayOnApp: true,
          daysInProfilePeriod: true,
        },
        with: {
          usage: {
            columns: {
              swipeLikes: true,
              swipePasses: true,
              matches: true,
              messagesSent: true,
            },
          },
        },
        orderBy: [desc(rayaProfileTable.updatedAt)],
      }),
    ]);

    return {
      tinder: tinderProfiles.map((profile) => ({
        ...profile,
        type: "tinder" as const,
        stats: profile.profileMeta?.[0] ?? null,
      })),
      hinge: hingeProfiles.map((profile) => ({
        ...profile,
        type: "hinge" as const,
        stats: profile.profileMeta?.[0] ?? null,
      })),
      raya: rayaProfiles.map((profile) => {
        const stats = profile.usage.reduce(
          (total, day) => ({
            matchesTotal: total.matchesTotal + day.matches,
            swipeLikesTotal: total.swipeLikesTotal + day.swipeLikes,
            swipePassesTotal: total.swipePassesTotal + day.swipePasses,
            messagesSentTotal: total.messagesSentTotal + day.messagesSent,
          }),
          {
            matchesTotal: 0,
            swipeLikesTotal: 0,
            swipePassesTotal: 0,
            messagesSentTotal: 0,
          },
        );

        return {
          ...profile,
          type: "raya" as const,
          stats: {
            ...stats,
            matchRate:
              stats.swipeLikesTotal > 0
                ? stats.matchesTotal / stats.swipeLikesTotal
                : 0,
          },
        };
      }),
    };
  }),
} satisfies TRPCRouterRecord;
