import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  desc,
  count,
  sql,
} from "drizzle-orm";
import {
  tinderProfileTable,
  hingeProfileTable,
  profileMetaTable,
  mediaTable,
  originalAnonymizedFileTable,
  userTable,
  profileComparisonTable,
  profileComparisonFeedbackTable,
  aiOutputTable,
} from "@/server/db/schema";
import { adminProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import { resetTinderProfile } from "@/server/services/profile/profile.service";
import { BlobService } from "@/server/services/blob.service";
import { trackServerEvent } from "@/server/services/analytics.service";
import {
  listComparisonsForAdmin,
  getComparisonForAdmin,
} from "@/server/services/profile-comparison.service";
import { withTransaction } from "@/server/db";
import {
  lockTinderSwipeRankMutationsInTx,
  purgeTinderSwipeRankProfilesInTx,
} from "@/server/services/swipe-rank/lifecycle.service";
import { invalidatePublicSwipeRankCache } from "@/server/services/swipe-rank/public-cache";

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
          await BlobService.deleteBulkOrThrow(blobUrls);
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

      // Keep the provider source and analytical subject deletion atomic.
      // Live facts cascade from the SwipeRank registry; frozen snapshot rows
      // detach, and source children cascade from tinder_profile.
      await withTransaction(async (tx) => {
        await lockTinderSwipeRankMutationsInTx(tx);
        await purgeTinderSwipeRankProfilesInTx(tx, [input.tinderId]);
        await tx
          .delete(tinderProfileTable)
          .where(eq(tinderProfileTable.tinderId, input.tinderId));
      });
      invalidatePublicSwipeRankCache();

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

  // List recently uploaded profiles, including the original file link for
  // authenticated admin tooling. Blob URLs must never be exposed by the public
  // directory router.
  listRecentProfiles: adminProcedure
    .input(
      z.object({
        platform: z.enum(["tinder", "hinge"]).nullish(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const latestTinderFile = ctx.db
        .select({
          userId: originalAnonymizedFileTable.userId,
          blobUrl: originalAnonymizedFileTable.blobUrl,
          rowNum:
            sql<number>`row_number() over (partition by ${originalAnonymizedFileTable.userId} order by ${originalAnonymizedFileTable.createdAt} desc)`.as(
              "row_num",
            ),
        })
        .from(originalAnonymizedFileTable)
        .where(eq(originalAnonymizedFileTable.dataProvider, "TINDER"))
        .as("admin_latest_tinder_file");

      const latestHingeFile = ctx.db
        .select({
          userId: originalAnonymizedFileTable.userId,
          blobUrl: originalAnonymizedFileTable.blobUrl,
          rowNum:
            sql<number>`row_number() over (partition by ${originalAnonymizedFileTable.userId} order by ${originalAnonymizedFileTable.createdAt} desc)`.as(
              "row_num",
            ),
        })
        .from(originalAnonymizedFileTable)
        .where(eq(originalAnonymizedFileTable.dataProvider, "HINGE"))
        .as("admin_latest_hinge_file");

      const tinderQuery = ctx.db
        .select({
          id: tinderProfileTable.tinderId,
          platform: sql<"tinder">`'tinder'`,
          ageAtUpload: tinderProfileTable.ageAtUpload,
          gender: tinderProfileTable.gender,
          city: tinderProfileTable.city,
          country: tinderProfileTable.country,
          createdAt: tinderProfileTable.createdAt,
          matchesTotal: profileMetaTable.matchesTotal,
          swipeLikesTotal: profileMetaTable.swipeLikesTotal,
          matchRate: profileMetaTable.matchRate,
          blobUrl: latestTinderFile.blobUrl,
        })
        .from(tinderProfileTable)
        .leftJoin(
          profileMetaTable,
          and(
            eq(profileMetaTable.tinderProfileId, tinderProfileTable.tinderId),
            isNull(profileMetaTable.hingeProfileId),
          ),
        )
        .leftJoin(
          latestTinderFile,
          and(
            eq(latestTinderFile.userId, tinderProfileTable.userId),
            eq(latestTinderFile.rowNum, 1),
          ),
        )
        .where(eq(tinderProfileTable.computed, false))
        .orderBy(desc(tinderProfileTable.createdAt))
        .limit(input.limit);

      const hingeQuery = ctx.db
        .select({
          id: hingeProfileTable.hingeId,
          platform: sql<"hinge">`'hinge'`,
          ageAtUpload: hingeProfileTable.ageAtUpload,
          gender: hingeProfileTable.gender,
          city: sql<string | null>`null`,
          country: hingeProfileTable.country,
          createdAt: hingeProfileTable.createdAt,
          matchesTotal: profileMetaTable.matchesTotal,
          swipeLikesTotal: profileMetaTable.swipeLikesTotal,
          matchRate: profileMetaTable.matchRate,
          blobUrl: latestHingeFile.blobUrl,
        })
        .from(hingeProfileTable)
        .leftJoin(
          profileMetaTable,
          and(
            eq(profileMetaTable.hingeProfileId, hingeProfileTable.hingeId),
            isNull(profileMetaTable.tinderProfileId),
          ),
        )
        .leftJoin(
          latestHingeFile,
          and(
            eq(latestHingeFile.userId, hingeProfileTable.userId),
            eq(latestHingeFile.rowNum, 1),
          ),
        )
        .orderBy(desc(hingeProfileTable.createdAt))
        .limit(input.limit);

      const [tinderProfiles, hingeProfiles] = await Promise.all([
        input.platform === "hinge" ? Promise.resolve([]) : tinderQuery,
        input.platform === "tinder" ? Promise.resolve([]) : hingeQuery,
      ]);

      return {
        profiles: [...tinderProfiles, ...hingeProfiles]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, input.limit),
      };
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
          await BlobService.deleteBulkOrThrow(blobUrls);
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

  // List profiles aggregated by location (for geography review)
  listProfilesByLocation: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        platform: z.enum(["all", "tinder", "hinge"]).default("all"),
        groupBy: z.enum(["country", "region", "continent"]).default("country"),
        sortBy: z.enum(["count", "name"]).default("count"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { platform, groupBy } = input;

      // Get the location field based on groupBy
      const locationField = userTable[groupBy];

      // Query Tinder profiles with gender breakdown
      const tinderQuery =
        platform === "hinge"
          ? []
          : await ctx.db
              .select({
                location: locationField,
                gender: tinderProfileTable.gender,
                count: count(),
              })
              .from(tinderProfileTable)
              .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
              .where(isNotNull(locationField))
              .groupBy(locationField, tinderProfileTable.gender);

      // Query Hinge profiles with gender breakdown
      const hingeQuery =
        platform === "tinder"
          ? []
          : await ctx.db
              .select({
                location: locationField,
                gender: hingeProfileTable.gender,
                count: count(),
              })
              .from(hingeProfileTable)
              .innerJoin(userTable, eq(hingeProfileTable.userId, userTable.id))
              .where(isNotNull(locationField))
              .groupBy(locationField, hingeProfileTable.gender);

      // Merge results by location
      const locationMap = new Map<
        string,
        {
          location: string;
          tinderCount: number;
          hingeCount: number;
          totalCount: number;
          maleCount: number;
          femaleCount: number;
          otherCount: number;
        }
      >();

      // Process Tinder profiles
      for (const row of tinderQuery) {
        const location = row.location!;
        if (!location) continue;

        const existing = locationMap.get(location) ?? {
          location,
          tinderCount: 0,
          hingeCount: 0,
          totalCount: 0,
          maleCount: 0,
          femaleCount: 0,
          otherCount: 0,
        };

        existing.tinderCount += row.count;
        existing.totalCount += row.count;

        if (row.gender === "MALE") existing.maleCount += row.count;
        else if (row.gender === "FEMALE") existing.femaleCount += row.count;
        else existing.otherCount += row.count;

        locationMap.set(location, existing);
      }

      // Process Hinge profiles
      for (const row of hingeQuery) {
        const location = row.location!;
        if (!location) continue;

        const existing = locationMap.get(location) ?? {
          location,
          tinderCount: 0,
          hingeCount: 0,
          totalCount: 0,
          maleCount: 0,
          femaleCount: 0,
          otherCount: 0,
        };

        existing.hingeCount += row.count;
        existing.totalCount += row.count;

        if (row.gender === "MALE") existing.maleCount += row.count;
        else if (row.gender === "FEMALE") existing.femaleCount += row.count;
        else existing.otherCount += row.count;

        locationMap.set(location, existing);
      }

      // Convert to array and sort
      let locations = Array.from(locationMap.values());

      if (input.sortBy === "count") {
        locations.sort((a, b) => b.totalCount - a.totalCount);
      } else {
        locations.sort((a, b) => a.location.localeCompare(b.location));
      }

      // Paginate
      const totalCount = locations.length;
      const offset = (input.page - 1) * input.limit;
      locations = locations.slice(offset, offset + input.limit);

      return {
        locations,
        totalCount,
        page: input.page,
        totalPages: Math.ceil(totalCount / input.limit),
        groupBy: input.groupBy,
      };
    }),

  // List profiles by region/state within a specific country (for country drill-down)
  listProfilesByRegion: adminProcedure
    .input(
      z.object({
        country: z.string().min(1),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        platform: z.enum(["all", "tinder", "hinge"]).default("all"),
        groupBy: z.enum(["region", "city"]).default("region"),
        sortBy: z.enum(["count", "name"]).default("count"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { platform, groupBy, country } = input;

      // Get the location field based on groupBy (region or city)
      const locationField = userTable[groupBy];

      // Query Tinder profiles with gender breakdown filtered by country
      const tinderQuery =
        platform === "hinge"
          ? []
          : await ctx.db
              .select({
                location: locationField,
                gender: tinderProfileTable.gender,
                count: count(),
              })
              .from(tinderProfileTable)
              .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
              .where(
                and(eq(userTable.country, country), isNotNull(locationField)),
              )
              .groupBy(locationField, tinderProfileTable.gender);

      // Query Hinge profiles with gender breakdown filtered by country
      const hingeQuery =
        platform === "tinder"
          ? []
          : await ctx.db
              .select({
                location: locationField,
                gender: hingeProfileTable.gender,
                count: count(),
              })
              .from(hingeProfileTable)
              .innerJoin(userTable, eq(hingeProfileTable.userId, userTable.id))
              .where(
                and(eq(userTable.country, country), isNotNull(locationField)),
              )
              .groupBy(locationField, hingeProfileTable.gender);

      // Merge results by location
      const locationMap = new Map<
        string,
        {
          location: string;
          tinderCount: number;
          hingeCount: number;
          totalCount: number;
          maleCount: number;
          femaleCount: number;
          otherCount: number;
        }
      >();

      // Process Tinder profiles
      for (const row of tinderQuery) {
        const location = row.location!;
        if (!location) continue;

        const existing = locationMap.get(location) ?? {
          location,
          tinderCount: 0,
          hingeCount: 0,
          totalCount: 0,
          maleCount: 0,
          femaleCount: 0,
          otherCount: 0,
        };

        existing.tinderCount += row.count;
        existing.totalCount += row.count;

        if (row.gender === "MALE") existing.maleCount += row.count;
        else if (row.gender === "FEMALE") existing.femaleCount += row.count;
        else existing.otherCount += row.count;

        locationMap.set(location, existing);
      }

      // Process Hinge profiles
      for (const row of hingeQuery) {
        const location = row.location!;
        if (!location) continue;

        const existing = locationMap.get(location) ?? {
          location,
          tinderCount: 0,
          hingeCount: 0,
          totalCount: 0,
          maleCount: 0,
          femaleCount: 0,
          otherCount: 0,
        };

        existing.hingeCount += row.count;
        existing.totalCount += row.count;

        if (row.gender === "MALE") existing.maleCount += row.count;
        else if (row.gender === "FEMALE") existing.femaleCount += row.count;
        else existing.otherCount += row.count;

        locationMap.set(location, existing);
      }

      // Convert to array and sort
      let locations = Array.from(locationMap.values());

      if (input.sortBy === "count") {
        locations.sort((a, b) => b.totalCount - a.totalCount);
      } else {
        locations.sort((a, b) => a.location.localeCompare(b.location));
      }

      // Paginate
      const totalCount = locations.length;
      const offset = (input.page - 1) * input.limit;
      locations = locations.slice(offset, offset + input.limit);

      return {
        country,
        locations,
        totalCount,
        page: input.page,
        totalPages: Math.ceil(totalCount / input.limit),
        groupBy: input.groupBy,
      };
    }),

  // List profiles with their media inline (for admin media review)
  listProfilesWithMedia: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
        platform: z.enum(["tinder", "hinge"]).default("tinder"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      const isTinder = input.platform === "tinder";
      const profileIdCol = isTinder
        ? mediaTable.tinderProfileId
        : mediaTable.hingeProfileId;

      // Rank all profiles by media count (for ordering only)
      const ranked = await ctx.db
        .select({ profileId: profileIdCol })
        .from(mediaTable)
        .where(isNotNull(profileIdCol))
        .groupBy(profileIdCol)
        .orderBy(desc(count(mediaTable.id)));

      const totalCount = ranked.length;
      const page = ranked.slice(offset, offset + input.limit);
      const profileIds = page.map((r) => r.profileId!);

      if (profileIds.length === 0) {
        return { profiles: [], totalCount, page: input.page, totalPages: 0 };
      }

      // Fetch profile details with their media in one relational query
      const profilesWithMedia = isTinder
        ? await ctx.db.query.tinderProfileTable.findMany({
            where: inArray(tinderProfileTable.tinderId, profileIds),
            with: { media: true },
          })
        : await ctx.db.query.hingeProfileTable.findMany({
            where: inArray(hingeProfileTable.hingeId, profileIds),
            with: { media: true },
          });

      const profileMap = new Map(
        profilesWithMedia.map((p) => [
          "tinderId" in p ? p.tinderId : p.hingeId,
          p,
        ]),
      );

      // Restore ranking order with normalized shape
      const profiles = page
        .map((r) => {
          const p = profileMap.get(r.profileId!);
          if (!p) return null;
          return {
            profileId: r.profileId!,
            platform: input.platform,
            genderStr: p.genderStr,
            ageAtUpload: p.ageAtUpload,
            country: p.country ?? null,
            city: "city" in p ? (p.city ?? null) : null,
            bio: "bio" in p ? (p.bio ?? null) : null,
            media: p.media,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      return {
        profiles,
        totalCount,
        page: input.page,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  // Fire a server-side analytics test event (admin debug harness).
  // Routes through the normal server fan-out (PostHog + Vercel).
  fireTestEvent: adminProcedure
    .input(z.object({ nonce: z.string().min(1), source: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? "admin-debug";
      trackServerEvent(userId, "admin_test_event_fired", {
        surface: "server",
        nonce: input.nonce,
        source: input.source,
      });
      return { ok: true, userId, firedAt: new Date().toISOString() };
    }),

  // ---- PROFILE COMPARE (read-only inspector) ----------------------
  // Cross-user overview of everything people have built/shared in the
  // profile-compare feature. View-only — no mutations.

  // Header totals for the inspector landing page.
  comparisonStats: adminProcedure.query(async ({ ctx }) => {
    const [total, publicTotal, feedbackTotal, roastTotal] = await Promise.all([
      ctx.db.select({ count: count() }).from(profileComparisonTable),
      ctx.db
        .select({ count: count() })
        .from(profileComparisonTable)
        .where(eq(profileComparisonTable.isPublic, true)),
      ctx.db
        .select({ count: count() })
        .from(profileComparisonFeedbackTable)
        .where(isNull(profileComparisonFeedbackTable.deletedAt)),
      ctx.db
        .select({ count: count() })
        .from(aiOutputTable)
        .where(eq(aiOutputTable.kind, "profile_roast")),
    ]);

    return {
      totalComparisons: total[0]?.count ?? 0,
      publicComparisons: publicTotal[0]?.count ?? 0,
      totalFeedback: feedbackTotal[0]?.count ?? 0,
      totalRoasts: roastTotal[0]?.count ?? 0,
    };
  }),

  // Paginated, filterable list of all comparisons across users.
  listComparisons: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        visibility: z.enum(["all", "public", "private"]).default("all"),
        sort: z.enum(["recent", "feedback", "columns"]).default("recent"),
      }),
    )
    .query(({ input }) => listComparisonsForAdmin(input)),

  // Full inspector payload for a single comparison (owner, columns, content,
  // roasts, feedback).
  getComparison: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ input }) => getComparisonForAdmin(input.id)),
} satisfies TRPCRouterRecord;
