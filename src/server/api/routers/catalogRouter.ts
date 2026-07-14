import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, arrayOverlaps, asc, count, desc, eq, or } from "drizzle-orm";
import { z } from "zod";

import {
  CATALOG_CATEGORY_KEYS,
  CATALOG_LOCATION_FILTER_KEYS,
  expandCatalogLocation,
} from "@/lib/catalog";
import {
  catalogEntryClaimTable,
  catalogEntryTable,
  catalogRequestTable,
  catalogSubmissionTable,
} from "@/server/db/schema";
import { publicProcedure } from "../trpc";

const categorySchema = z.enum(CATALOG_CATEGORY_KEYS);
const locationFilterSchema = z.enum(CATALOG_LOCATION_FILTER_KEYS);

export const catalogRouter = {
  overview: publicProcedure.query(async ({ ctx }) => {
    const [counts, featuredEntries] = await Promise.all([
      ctx.db
        .select({
          category: catalogEntryTable.primaryCategory,
          count: count(),
        })
        .from(catalogEntryTable)
        .where(eq(catalogEntryTable.status, "PUBLISHED"))
        .groupBy(catalogEntryTable.primaryCategory),
      ctx.db
        .select()
        .from(catalogEntryTable)
        .where(eq(catalogEntryTable.status, "PUBLISHED"))
        .orderBy(
          desc(catalogEntryTable.featured),
          desc(catalogEntryTable.editorialPick),
          asc(catalogEntryTable.name),
        )
        .limit(6),
    ]);

    return { counts, featuredEntries };
  }),

  list: publicProcedure
    .input(
      z.object({
        category: categorySchema,
        location: locationFilterSchema.optional(),
        includeRemote: z.boolean().default(false),
        tags: z.array(z.string().min(1).max(60)).max(8).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(catalogEntryTable.status, "PUBLISHED"),
        eq(catalogEntryTable.primaryCategory, input.category),
      ];

      if (input.location) {
        const cityKeys = expandCatalogLocation(input.location);
        const locationCondition = arrayOverlaps(
          catalogEntryTable.locationKeys,
          cityKeys,
        );
        conditions.push(
          input.includeRemote
            ? or(locationCondition, eq(catalogEntryTable.remote, true))!
            : locationCondition,
        );
      } else if (input.includeRemote) {
        conditions.push(eq(catalogEntryTable.remote, true));
      }

      const entries = await ctx.db
        .select()
        .from(catalogEntryTable)
        .where(and(...conditions))
        .orderBy(
          desc(catalogEntryTable.featured),
          desc(catalogEntryTable.editorialPick),
          asc(catalogEntryTable.name),
        );

      const filteredEntries =
        input.tags.length === 0
          ? entries
          : entries.filter((entry) =>
              input.tags.every((tag) => entry.data.tags?.includes(tag)),
            );

      return {
        entries: filteredEntries,
        totalCount: filteredEntries.length,
      };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(180) }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.query.catalogEntryTable.findFirst({
        where: and(
          eq(catalogEntryTable.slug, input.slug),
          eq(catalogEntryTable.status, "PUBLISHED"),
        ),
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      return entry;
    }),

  requestHelp: publicProcedure
    .input(
      z.object({
        category: categorySchema,
        targetEntryId: z.string().optional(),
        email: z.email(),
        brief: z.string().trim().min(10).max(3000),
        locationKey: locationFilterSchema.optional(),
        remote: z.boolean().default(false),
        timeline: z.string().trim().max(120).optional(),
        budget: z.string().trim().max(120).optional(),
        broadcastConsent: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.targetEntryId) {
        const target = await ctx.db.query.catalogEntryTable.findFirst({
          where: and(
            eq(catalogEntryTable.id, input.targetEntryId),
            eq(catalogEntryTable.status, "PUBLISHED"),
          ),
          columns: { id: true },
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The requested listing is no longer available",
          });
        }
      }

      const [request] = await ctx.db
        .insert(catalogRequestTable)
        .values({
          requesterUserId: ctx.session?.user.id,
          anonymousSessionId: ctx.session?.session.id,
          contactEmail: input.email.toLowerCase(),
          targetEntryId: input.targetEntryId,
          category: input.category,
          visibility: "PRIVATE",
          data: {
            brief: input.brief,
            locationKey: input.locationKey,
            remote: input.remote,
            timeline: input.timeline,
            budget: input.budget,
            broadcastConsent: input.broadcastConsent,
          },
        })
        .returning({ id: catalogRequestTable.id });

      return { id: request!.id };
    }),

  submitListing: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(180),
        category: categorySchema,
        email: z.email(),
        website: z.url().optional(),
        description: z.string().trim().min(20).max(3000),
        locationKey: locationFilterSchema.optional(),
        remote: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [submission] = await ctx.db
        .insert(catalogSubmissionTable)
        .values({
          submitterUserId: ctx.session?.user.id,
          contactEmail: input.email.toLowerCase(),
          name: input.name,
          category: input.category,
          data: {
            website: input.website,
            description: input.description,
            locationKey: input.locationKey,
            remote: input.remote,
          },
        })
        .returning({ id: catalogSubmissionTable.id });

      return { id: submission!.id };
    }),

  claim: publicProcedure
    .input(
      z.object({
        entryId: z.string(),
        email: z.email(),
        relationship: z.string().trim().min(3).max(160),
        note: z.string().trim().max(1200).optional(),
        officialUrl: z.url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.catalogEntryTable.findFirst({
        where: eq(catalogEntryTable.id, input.entryId),
        columns: { id: true, claimedAt: true },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      if (entry.claimedAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This listing is already claimed",
        });
      }

      const [claim] = await ctx.db
        .insert(catalogEntryClaimTable)
        .values({
          entryId: input.entryId,
          claimantUserId: ctx.session?.user.id,
          claimantEmail: input.email.toLowerCase(),
          evidence: {
            relationship: input.relationship,
            note: input.note,
            officialUrl: input.officialUrl,
          },
        })
        .returning({ id: catalogEntryClaimTable.id });

      return { id: claim!.id };
    }),
} satisfies TRPCRouterRecord;
