import { z } from "zod";
import {
  desc,
  and,
  eq,
  gte,
  lte,
  sql,
  isNull,
  isNotNull,
  or,
  ilike,
  asc,
} from "drizzle-orm";
import {
  tinderProfileTable,
  hingeProfileTable,
  profileMetaTable,
  userTable,
  genderEnum,
} from "@/server/db/schema";
import { publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";

export const directoryRouter = {
  // List profiles with pagination and filters
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        platform: z.enum(["tinder", "hinge"]).nullish(),
        gender: z.enum(["MALE", "FEMALE", "OTHER", "MORE"]).nullish(),
        ageMin: z.number().int().min(18).max(100).nullish(),
        ageMax: z.number().int().min(18).max(100).nullish(),
        matchRateMin: z.number().min(0).max(1).nullish(),
        matchRateMax: z.number().min(0).max(1).nullish(),
        country: z.string().nullish(),
        sortBy: z
          .enum(["newest", "most_matches", "highest_match_rate"])
          .default("newest"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      // Build WHERE conditions for Tinder profiles
      const buildTinderWhere = () => {
        const conditions = [];

        // Exclude synthetic/computed profiles
        conditions.push(eq(tinderProfileTable.computed, false));

        if (input.gender != null) {
          conditions.push(eq(tinderProfileTable.genderStr, input.gender));
        }
        if (input.ageMin != null) {
          conditions.push(gte(tinderProfileTable.ageAtUpload, input.ageMin));
        }
        if (input.ageMax != null) {
          conditions.push(lte(tinderProfileTable.ageAtUpload, input.ageMax));
        }
        // Country filtering now uses user.country
        if (input.country != null) {
          conditions.push(eq(userTable.country, input.country));
        }
        return conditions.length > 0 ? and(...conditions) : undefined;
      };

      // Build WHERE conditions for Hinge profiles
      const buildHingeWhere = () => {
        const conditions = [];
        if (input.gender != null) {
          conditions.push(eq(hingeProfileTable.gender, input.gender));
        }
        if (input.ageMin != null) {
          conditions.push(gte(hingeProfileTable.ageAtUpload, input.ageMin));
        }
        if (input.ageMax != null) {
          conditions.push(lte(hingeProfileTable.ageAtUpload, input.ageMax));
        }
        // Country filtering now uses user.country
        if (input.country != null) {
          conditions.push(eq(userTable.country, input.country));
        }
        return conditions.length > 0 ? and(...conditions) : undefined;
      };

      // Build WHERE conditions for profileMeta (match rate filtering)
      const buildMetaWhere = () => {
        const conditions = [];
        if (input.matchRateMin != null) {
          conditions.push(gte(profileMetaTable.matchRate, input.matchRateMin));
        }
        if (input.matchRateMax != null) {
          conditions.push(lte(profileMetaTable.matchRate, input.matchRateMax));
        }
        return conditions.length > 0 ? and(...conditions) : undefined;
      };

      // Determine sort order
      const getSortOrder = () => {
        switch (input.sortBy) {
          case "most_matches":
            return desc(profileMetaTable.matchesTotal);
          case "highest_match_rate":
            return desc(profileMetaTable.matchRate);
          case "newest":
          default:
            return desc(tinderProfileTable.createdAt);
        }
      };

      const getHingeSortOrder = () => {
        switch (input.sortBy) {
          case "most_matches":
            return desc(profileMetaTable.matchesTotal);
          case "highest_match_rate":
            return desc(profileMetaTable.matchRate);
          case "newest":
          default:
            return desc(hingeProfileTable.createdAt);
        }
      };

      // Build base query for Tinder
      const tinderBaseQuery = ctx.db
        .select({
          id: tinderProfileTable.tinderId,
          platform: sql<"tinder">`'tinder'`,
          ageAtUpload: tinderProfileTable.ageAtUpload,
          gender: tinderProfileTable.genderStr,
          city: tinderProfileTable.city,
          country: tinderProfileTable.country,
          createdAt: tinderProfileTable.createdAt,
          matchesTotal: profileMetaTable.matchesTotal,
          swipeLikesTotal: profileMetaTable.swipeLikesTotal,
          swipePassesTotal: profileMetaTable.swipePassesTotal,
          matchRate: profileMetaTable.matchRate,
          daysInPeriod: profileMetaTable.daysInPeriod,
          userCity: userTable.city,
          userCountry: userTable.country,
        })
        .from(tinderProfileTable)
        .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
        .leftJoin(
          profileMetaTable,
          sql`${profileMetaTable.tinderProfileId} = ${tinderProfileTable.tinderId} AND ${profileMetaTable.hingeProfileId} IS NULL`,
        );

      // Build base query for Hinge
      const hingeBaseQuery = ctx.db
        .select({
          id: hingeProfileTable.hingeId,
          platform: sql<"hinge">`'hinge'`,
          ageAtUpload: hingeProfileTable.ageAtUpload,
          gender: hingeProfileTable.gender,
          city: sql<string | null>`NULL`,
          country: hingeProfileTable.country,
          createdAt: hingeProfileTable.createdAt,
          matchesTotal: profileMetaTable.matchesTotal,
          swipeLikesTotal: profileMetaTable.swipeLikesTotal,
          swipePassesTotal: profileMetaTable.swipePassesTotal,
          matchRate: profileMetaTable.matchRate,
          daysInPeriod: profileMetaTable.daysInPeriod,
          userCity: userTable.city,
          userCountry: userTable.country,
        })
        .from(hingeProfileTable)
        .innerJoin(userTable, eq(hingeProfileTable.userId, userTable.id))
        .leftJoin(
          profileMetaTable,
          sql`${profileMetaTable.hingeProfileId} = ${hingeProfileTable.hingeId} AND ${profileMetaTable.tinderProfileId} IS NULL`,
        );

      // Apply filters
      const tinderWhere = buildTinderWhere();
      const hingeWhere = buildHingeWhere();
      const metaWhere = buildMetaWhere();

      // Combine WHERE conditions (include user table join conditions)
      const tinderConditions = [tinderWhere, metaWhere].filter(Boolean);
      const hingeConditions = [hingeWhere, metaWhere].filter(Boolean);

      // Fetch profiles
      const [tinderProfiles, hingeProfiles] = await Promise.all([
        input.platform === "hinge"
          ? Promise.resolve([])
          : tinderBaseQuery
              .where(
                tinderConditions.length > 0
                  ? and(...tinderConditions)
                  : undefined,
              )
              .orderBy(getSortOrder())
              .limit(input.limit)
              .offset(offset),
        input.platform === "tinder"
          ? Promise.resolve([])
          : hingeBaseQuery
              .where(
                hingeConditions.length > 0
                  ? and(...hingeConditions)
                  : undefined,
              )
              .orderBy(getHingeSortOrder())
              .limit(input.limit)
              .offset(offset),
      ]);

      // Combine and sort if needed (for cross-platform sorting)
      let allProfiles = [...tinderProfiles, ...hingeProfiles];
      if (
        input.sortBy === "most_matches" ||
        input.sortBy === "highest_match_rate"
      ) {
        allProfiles = allProfiles.sort((a, b) => {
          if (input.sortBy === "most_matches") {
            const aMatches = a.matchesTotal ?? 0;
            const bMatches = b.matchesTotal ?? 0;
            return bMatches - aMatches;
          } else {
            const aRate = a.matchRate ?? 0;
            const bRate = b.matchRate ?? 0;
            return bRate - aRate;
          }
        });
      } else {
        allProfiles = allProfiles.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      }
      allProfiles = allProfiles.slice(0, input.limit);

      // Get total counts with filters (use only profile-level filters, not meta filters)
      const [tinderCountResult, hingeCountResult] = await Promise.all([
        input.platform === "hinge"
          ? Promise.resolve([{ count: 0 }])
          : ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(tinderProfileTable)
              .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
              .where(tinderWhere),
        input.platform === "tinder"
          ? Promise.resolve([{ count: 0 }])
          : ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(hingeProfileTable)
              .innerJoin(userTable, eq(hingeProfileTable.userId, userTable.id))
              .where(hingeWhere),
      ]);

      const totalCount =
        (tinderCountResult[0]?.count ?? 0) + (hingeCountResult[0]?.count ?? 0);
      const totalPages = Math.ceil(totalCount / input.limit);

      return {
        profiles: allProfiles,
        pagination: {
          currentPage: input.page,
          totalPages,
          totalCount,
          hasNextPage: input.page < totalPages,
          hasPreviousPage: input.page > 1,
        },
      };
    }),

  // Get filter options for dropdowns
  getFilterOptions: publicProcedure.query(async ({ ctx }) => {
    // Get unique countries from user table with profile counts
    const tinderUserCountries = await ctx.db
      .select({
        country: userTable.country,
        count: sql<number>`count(${tinderProfileTable.tinderId})`,
      })
      .from(tinderProfileTable)
      .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
      .where(
        and(
          isNotNull(userTable.country),
          eq(tinderProfileTable.computed, false), // Exclude synthetic profiles
        ),
      )
      .groupBy(userTable.country);

    const hingeUserCountries = await ctx.db
      .select({
        country: userTable.country,
        count: sql<number>`count(${hingeProfileTable.hingeId})`,
      })
      .from(hingeProfileTable)
      .innerJoin(userTable, eq(hingeProfileTable.userId, userTable.id))
      .where(isNotNull(userTable.country))
      .groupBy(userTable.country);

    // Combine and aggregate country counts
    const countryMap = new Map<string, number>();
    [...tinderUserCountries, ...hingeUserCountries].forEach(
      ({ country, count }) => {
        if (country) {
          countryMap.set(country, (countryMap.get(country) ?? 0) + count);
        }
      },
    );

    const countries = Array.from(countryMap.entries())
      .map(([value, count]) => ({
        value,
        label: value,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Get gender distribution
    const [tinderGenders, hingeGenders] = await Promise.all([
      ctx.db
        .select({
          gender: tinderProfileTable.genderStr,
          count: sql<number>`count(*)`,
        })
        .from(tinderProfileTable)
        .where(eq(tinderProfileTable.computed, false)) // Exclude synthetic profiles
        .groupBy(tinderProfileTable.genderStr),
      ctx.db
        .select({
          gender: hingeProfileTable.gender,
          count: sql<number>`count(*)`,
        })
        .from(hingeProfileTable)
        .groupBy(hingeProfileTable.gender),
    ]);

    const genderMap = new Map<string, number>();
    [...tinderGenders, ...hingeGenders].forEach(({ gender, count }) => {
      if (gender) {
        genderMap.set(gender, (genderMap.get(gender) ?? 0) + count);
      }
    });

    const genders = Array.from(genderMap.entries())
      .map(([value, count]) => ({
        value,
        label: value,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Get age range
    const [tinderAges, hingeAges] = await Promise.all([
      ctx.db
        .select({
          min: sql<number>`min(${tinderProfileTable.ageAtUpload})`,
          max: sql<number>`max(${tinderProfileTable.ageAtUpload})`,
        })
        .from(tinderProfileTable)
        .where(eq(tinderProfileTable.computed, false)), // Exclude synthetic profiles
      ctx.db
        .select({
          min: sql<number>`min(${hingeProfileTable.ageAtUpload})`,
          max: sql<number>`max(${hingeProfileTable.ageAtUpload})`,
        })
        .from(hingeProfileTable),
    ]);

    const ageRange = {
      min: Math.min(tinderAges[0]?.min ?? 18, hingeAges[0]?.min ?? 18),
      max: Math.max(tinderAges[0]?.max ?? 100, hingeAges[0]?.max ?? 100),
    };

    // Get match rate range
    const matchRateStats = await ctx.db
      .select({
        min: sql<number>`min(${profileMetaTable.matchRate})`,
        max: sql<number>`max(${profileMetaTable.matchRate})`,
      })
      .from(profileMetaTable)
      .where(isNotNull(profileMetaTable.matchRate));

    const matchRateRange = {
      min: matchRateStats[0]?.min ?? 0,
      max: matchRateStats[0]?.max ?? 1,
    };

    return {
      countries,
      genders,
      ageRange,
      matchRateRange,
    };
  }),
} satisfies TRPCRouterRecord;
