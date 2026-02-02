import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq, desc } from "drizzle-orm";
import {
  userTable,
  tinderProfileTable,
  hingeProfileTable,
} from "@/server/db/schema";
import { protectedProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";

export const userRouter = {
  // Get current user profile
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.session.user.id),
    });
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

  // Update location (timezone, country)
  updateLocation: protectedProcedure
    .input(
      z.object({
        timeZone: z.string().min(1).max(100).optional(),
        country: z.string().min(1).max(100).optional(),
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

    // Delete user (cascade will handle related records)
    await ctx.db.delete(userTable).where(eq(userTable.id, userId));

    return { success: true, deletedUserId: userId };
  }),

  // Get user's uploaded profiles (Tinder and Hinge)
  getUploadedProfiles: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Fetch both Tinder and Hinge profiles
    const [tinderProfiles, hingeProfiles] = await Promise.all([
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
    };
  }),
} satisfies TRPCRouterRecord;
