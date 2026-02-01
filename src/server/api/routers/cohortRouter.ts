/**
 * Cohort Router
 *
 * tRPC router for cohort stats, rankings, and custom cohort creation
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../trpc";
import {
  getCohortStats,
  getSystemCohorts,
  getUserCohorts,
  getRelevantCohortsForProfile,
  createCustomCohort,
  deleteCustomCohort,
  getAvailablePeriodsForCohort,
} from "@/server/services/cohort/cohort.service";
import { getEffectiveTier } from "@/server/services/gating.service";
import { db } from "@/server/db";
import type { Gender } from "@/server/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import {
  userTable,
  tinderProfileTable,
  profileMetaTable,
  cohortDefinitionTable,
} from "@/server/db/schema";
import { cohortFilterSchema } from "@/lib/validators";

export const cohortRouter = {
  // Get stats for a cohort (used in comparison UI) - PUBLIC
  getStats: publicProcedure
    .input(
      z.object({
        cohortId: z.string(),
        period: z.string().default("all-time"),
      }),
    )
    .query(async ({ input }) => {
      const stats = await getCohortStats(input.cohortId, input.period);
      if (!stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cohort stats not found for this period",
        });
      }
      return stats;
    }),

  // Get available periods for a cohort - PUBLIC
  getAvailablePeriods: publicProcedure
    .input(z.object({ cohortId: z.string() }))
    .query(async ({ input }) => {
      return getAvailablePeriodsForCohort(input.cohortId);
    }),

  // Get all system cohorts - PUBLIC
  listSystem: publicProcedure.query(async () => {
    return getSystemCohorts();
  }),

  // Get relevant cohorts for a profile (gender match, age match, etc.) - PUBLIC
  getRelevantCohorts: publicProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch profile to get characteristics
      const profile = await ctx.db.query.tinderProfileTable.findFirst({
        where: (profiles, { eq }) => eq(profiles.tinderId, input.profileId),
        with: {
          user: true,
        },
      });

      if (!profile) {
        // Try Hinge
        const hingeProfile = await ctx.db.query.hingeProfileTable.findFirst({
          where: (profiles, { eq }) => eq(profiles.hingeId, input.profileId),
          with: {
            user: true,
          },
        });

        if (!hingeProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profile not found",
          });
        }

        // Return Hinge cohorts
        // Map MORE and UNKNOWN to OTHER for cohort matching
        const gender = hingeProfile.gender;
        const normalizedHingeGender =
          gender === "MORE" || gender === "UNKNOWN" ? "OTHER" : gender;

        return getRelevantCohortsForProfile({
          dataProvider: "HINGE",
          gender: normalizedHingeGender,
          age: hingeProfile.ageAtUpload,
          country: hingeProfile.user?.country,
        });
      }

      // Return Tinder cohorts
      // Map MORE and UNKNOWN to OTHER for cohort matching
      const normalizedGender =
        profile.gender === "MORE" || profile.gender === "UNKNOWN"
          ? "OTHER"
          : profile.gender;

      return getRelevantCohortsForProfile({
        dataProvider: "TINDER",
        gender: normalizedGender,
        age: profile.ageAtLastUsage,
        country: profile.user?.country,
      });
    }),

  // Get user's custom cohorts - PROTECTED
  listCustom: protectedProcedure.query(async ({ ctx }) => {
    return getUserCohorts(ctx.session.user.id);
  }),

  // Create custom cohort (ELITE tier) - PROTECTED
  createCustom: protectedProcedure
    .input(cohortFilterSchema)
    .mutation(async ({ ctx, input }) => {
      // Check tier
      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, ctx.session.user.id),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const tier = getEffectiveTier(user);
      if (tier !== "ELITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "SwipeStats Elite required to create custom cohorts",
        });
      }

      return createCustomCohort(ctx.session.user.id, input);
    }),

  // Delete custom cohort - PROTECTED
  deleteCustom: protectedProcedure
    .input(z.object({ cohortId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteCustomCohort(
        input.cohortId,
        ctx.session.user.id,
      );
      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cohort not found or you don't have permission to delete it",
        });
      }
      return { success: true };
    }),

  // List synthetic profiles (cohort averages) - PUBLIC
  listSyntheticProfiles: publicProcedure.query(async ({ ctx }) => {
    const profiles = await ctx.db
      .select({
        // Profile fields
        tinderId: tinderProfileTable.tinderId,
        gender: tinderProfileTable.gender,
        ageAtUpload: tinderProfileTable.ageAtUpload,
        createdAt: tinderProfileTable.createdAt,
        // Meta fields
        matchRate: profileMetaTable.matchRate,
        matchesTotal: profileMetaTable.matchesTotal,
        swipeLikesTotal: profileMetaTable.swipeLikesTotal,
        swipePassesTotal: profileMetaTable.swipePassesTotal,
        daysInPeriod: profileMetaTable.daysInPeriod,
        // Cohort info
        cohortName: cohortDefinitionTable.name,
        cohortDescription: cohortDefinitionTable.description,
        profileCount: cohortDefinitionTable.profileCount,
      })
      .from(tinderProfileTable)
      .innerJoin(
        profileMetaTable,
        eq(profileMetaTable.tinderProfileId, tinderProfileTable.tinderId),
      )
      .innerJoin(
        cohortDefinitionTable,
        sql`${tinderProfileTable.tinderId} = 'cohort_' || ${cohortDefinitionTable.id}`,
      )
      .where(eq(tinderProfileTable.computed, true))
      .orderBy(desc(cohortDefinitionTable.profileCount));

    return profiles;
  }),
};
