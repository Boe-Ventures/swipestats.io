import { unstable_cache } from "next/cache";
import { z } from "zod";
import { TRPCError, type TRPCRouterRecord } from "@trpc/server";

import { genderEnum, swipeRankPeriodKindEnum } from "@/server/db/schema";
import { assertAlignedPeriod } from "@/server/services/swipe-rank/periods";
import { getTinderSwipeRankBenchmark } from "@/server/services/swipe-rank/benchmark.service";
import {
  getPublicSwipeRankLeaderboard,
  listPublicSwipeRankPeriods,
} from "@/server/services/swipe-rank/public.service";
import {
  getAdminSwipeRankLeaderboard,
  getTinderSwipeRankPlacement,
  getTinderSwipeRankSummary,
  listTinderSwipeRankProfilePeriods,
  listAdminSwipeRankPeriods,
} from "@/server/services/swipe-rank/product.service";
import { getSwipeRankEligibility } from "@/server/services/swipe-rank/eligibility";
import { SWIPE_RANK_PUBLIC_CACHE_TAG } from "@/server/services/swipe-rank/public-cache";
import {
  listTinderSwipeRankExclusions,
  setTinderSwipeRankExclusion,
} from "@/server/services/swipe-rank/exclusion.service";

import {
  adminProcedure,
  publicProcedure,
  tinderProfileOwnerProcedure,
} from "../trpc";

const filtersSchema = z
  .object({
    gender: z.enum(genderEnum.enumValues).optional(),
    interestedIn: z.enum(genderEnum.enumValues).optional(),
    ageMin: z.number().int().min(18).max(100).optional(),
    ageMax: z.number().int().min(18).max(100).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    region: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
  })
  .refine(
    ({ ageMin, ageMax }) =>
      ageMin === undefined || ageMax === undefined || ageMin <= ageMax,
    { message: "ageMin must be less than or equal to ageMax" },
  );

/**
 * Owner-facing comparisons intentionally expose only two stable fields:
 * everyone, or the exact gender + interested-in peer field shown in-product.
 * Arbitrary geographic and age intersections remain admin/script-only because
 * repeated owner queries could otherwise be differenced to recover small
 * cohorts even when every individual response satisfies the k-floor.
 */
const ownerBenchmarkFiltersSchema = z
  .object({
    gender: z.enum(genderEnum.enumValues),
    interestedIn: z.enum(genderEnum.enumValues),
  })
  .strict();

const periodSchema = z
  .object({
    kind: z.enum(swipeRankPeriodKindEnum.enumValues),
    start: z.string().date(),
    end: z.string().date(),
  })
  .superRefine((period, ctx) => {
    try {
      assertAlignedPeriod(period);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message:
          error instanceof Error ? error.message : "Invalid SwipeRank period",
      });
    }
  });

const cachedPublicSwipeRankLeaderboard = unstable_cache(
  getPublicSwipeRankLeaderboard,
  ["swipe-rank-public-leaderboard-v4"],
  { revalidate: 60, tags: [SWIPE_RANK_PUBLIC_CACHE_TAG] },
);
const cachedPublicSwipeRankPeriods = unstable_cache(
  listPublicSwipeRankPeriods,
  ["swipe-rank-public-periods-v2"],
  { revalidate: 300, tags: [SWIPE_RANK_PUBLIC_CACHE_TAG] },
);

export const swipeRankRouter = {
  /** Private: the owner may read their latest Tinder placements. */
  summary: tinderProfileOwnerProcedure.query(async ({ input }) => {
    return getTinderSwipeRankSummary(input.tinderId);
  }),

  /** Private: all historical seasons with facts for this owner. */
  availablePeriods: tinderProfileOwnerProcedure.query(async ({ input }) => {
    return listTinderSwipeRankProfilePeriods(input.tinderId);
  }),

  /** Private: exact live placement for one selected historical season. */
  placement: tinderProfileOwnerProcedure
    .input(z.object({ period: periodSchema }))
    .query(async ({ input }) => {
      return getTinderSwipeRankPlacement(input.tinderId, input.period);
    }),

  /** Private: period-correct distributions for the owner and a chosen field. */
  benchmark: tinderProfileOwnerProcedure
    .input(
      z.object({
        period: periodSchema,
        filters: ownerBenchmarkFiltersSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      return getTinderSwipeRankBenchmark({
        providerProfileId: input.tinderId,
        period: input.period,
        filters: input.filters,
      });
    }),

  /** Public: every eligible row, linked across seasons by a stable pseudonym. */
  publicLeaderboard: publicProcedure
    .input(
      z.object({
        period: periodSchema,
        page: z.number().int().min(1).max(10_000).default(1),
      }),
    )
    .query(async ({ input }) => {
      const eligibility = getSwipeRankEligibility(input.period.kind);
      return cachedPublicSwipeRankLeaderboard({
        ...input,
        ...eligibility,
      });
    }),

  /** Public: aggregate-only observed periods whose comparison field is safe. */
  publicAvailablePeriods: publicProcedure.query(async () => {
    return cachedPublicSwipeRankPeriods();
  }),

  /** Private admin period inventory; no publication state is implied. */
  adminAvailablePeriods: adminProcedure
    .input(
      z.object({
        filters: filtersSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      return listAdminSwipeRankPeriods(input.filters);
    }),

  /** Private filter-aware leaderboard over versioned facts. */
  adminLeaderboard: adminProcedure
    .input(
      z.object({
        period: periodSchema,
        filters: filtersSchema.optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      return getAdminSwipeRankLeaderboard(input);
    }),

  /** Private admin: current manual removals from every live SwipeRank field. */
  adminExclusions: adminProcedure.query(async () => {
    return listTinderSwipeRankExclusions();
  }),

  /** Private admin: the browser form and CLI share the same service contract. */
  setAdminExclusion: adminProcedure
    .input(
      z
        .object({
          providerProfileId: z.string().trim().min(1),
          excluded: z.boolean(),
          reason: z.string().trim().min(3).max(500).optional(),
        })
        .refine((value) => !value.excluded || value.reason !== undefined, {
          path: ["reason"],
          message: "A review reason is required to exclude a profile.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = ctx.session?.user.id;
      if (!actorId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return setTinderSwipeRankExclusion({
        ...input,
        actor: `admin:${actorId}`,
      });
    }),
} satisfies TRPCRouterRecord;
