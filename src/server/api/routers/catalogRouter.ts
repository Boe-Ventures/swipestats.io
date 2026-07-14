import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, asc, count, desc, eq, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";

import { CATALOG_CATEGORY_KEYS, type CatalogPlaceOption } from "@/lib/catalog";
import type { db } from "@/server/db";
import {
  catalogEntryClaimTable,
  catalogEntryPlaceTable,
  catalogEntryTable,
  catalogPlaceClosureTable,
  catalogPlaceTable,
  catalogRequestTable,
  catalogSubmissionTable,
} from "@/server/db/schema";
import { publicProcedure } from "../trpc";

type CatalogDb = typeof db;

const categorySchema = z.enum(CATALOG_CATEGORY_KEYS);
const locationSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

async function getCatalogPlaces(database: CatalogDb) {
  const places = await database
    .select()
    .from(catalogPlaceTable)
    .where(eq(catalogPlaceTable.isActive, true))
    .orderBy(asc(catalogPlaceTable.sortOrder), asc(catalogPlaceTable.name));
  const placeById = new Map(places.map((place) => [place.id, place]));

  return places.map((place): CatalogPlaceOption => {
    const breadcrumb: CatalogPlaceOption["breadcrumb"] = [];
    const seen = new Set<string>();
    let current: typeof place | undefined = place;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      breadcrumb.unshift({
        id: current.id,
        slug: current.slug,
        shortName: current.shortName,
      });
      current = current.primaryParentId
        ? placeById.get(current.primaryParentId)
        : undefined;
    }

    return {
      id: place.id,
      slug: place.slug,
      name: place.name,
      shortName: place.shortName,
      kind: place.kind,
      countryCode: place.countryCode,
      adminAreaCode: place.adminAreaCode,
      isCapital: place.isCapital,
      isFeatured: place.isFeatured,
      primaryParentId: place.primaryParentId,
      breadcrumb,
    };
  });
}

async function getPlaceBySlug(database: CatalogDb, slug: string) {
  const place = await database.query.catalogPlaceTable.findFirst({
    where: and(
      eq(catalogPlaceTable.slug, slug),
      eq(catalogPlaceTable.isActive, true),
    ),
  });
  if (!place) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
  }
  return place;
}

async function getRelatedPlaceIds(database: CatalogDb, placeId: string) {
  const [ancestorRows, descendantRows] = await Promise.all([
    database
      .select({ id: catalogPlaceClosureTable.ancestorId })
      .from(catalogPlaceClosureTable)
      .where(eq(catalogPlaceClosureTable.descendantId, placeId)),
    database
      .select({ id: catalogPlaceClosureTable.descendantId })
      .from(catalogPlaceClosureTable)
      .where(eq(catalogPlaceClosureTable.ancestorId, placeId)),
  ]);
  return [
    ...new Set([...ancestorRows, ...descendantRows].map((row) => row.id)),
  ];
}

async function getEntryIdsForPlaces(database: CatalogDb, placeIds: string[]) {
  if (placeIds.length === 0) return [];
  const rows = await database
    .selectDistinct({ entryId: catalogEntryPlaceTable.entryId })
    .from(catalogEntryPlaceTable)
    .where(inArray(catalogEntryPlaceTable.placeId, placeIds));
  return rows.map((row) => row.entryId);
}

async function hydrateCatalogEntries<T extends { id: string }>(
  database: CatalogDb,
  entries: T[],
) {
  if (entries.length === 0) return [] as Array<T & { places: never[] }>;
  const rows = await database
    .select({
      entryId: catalogEntryPlaceTable.entryId,
      role: catalogEntryPlaceTable.role,
      data: catalogEntryPlaceTable.data,
      place: {
        id: catalogPlaceTable.id,
        slug: catalogPlaceTable.slug,
        name: catalogPlaceTable.name,
        shortName: catalogPlaceTable.shortName,
        kind: catalogPlaceTable.kind,
        countryCode: catalogPlaceTable.countryCode,
        adminAreaCode: catalogPlaceTable.adminAreaCode,
        isCapital: catalogPlaceTable.isCapital,
        isFeatured: catalogPlaceTable.isFeatured,
        primaryParentId: catalogPlaceTable.primaryParentId,
      },
    })
    .from(catalogEntryPlaceTable)
    .innerJoin(
      catalogPlaceTable,
      eq(catalogEntryPlaceTable.placeId, catalogPlaceTable.id),
    )
    .where(
      inArray(
        catalogEntryPlaceTable.entryId,
        entries.map((entry) => entry.id),
      ),
    )
    .orderBy(
      asc(catalogEntryPlaceTable.role),
      asc(catalogPlaceTable.sortOrder),
      asc(catalogPlaceTable.name),
    );
  const rowsByEntry = new Map<string, typeof rows>();
  for (const row of rows) {
    rowsByEntry.set(row.entryId, [
      ...(rowsByEntry.get(row.entryId) ?? []),
      row,
    ]);
  }
  return entries.map((entry) => ({
    ...entry,
    places: (rowsByEntry.get(entry.id) ?? []).map(({ role, data, place }) => ({
      role,
      data,
      place,
    })),
  }));
}

export const catalogRouter = {
  locations: publicProcedure.query(({ ctx }) => getCatalogPlaces(ctx.db)),

  overview: publicProcedure.query(async ({ ctx }) => {
    const [counts, rawFeaturedEntries, locations] = await Promise.all([
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
      getCatalogPlaces(ctx.db),
    ]);
    const featuredEntries = await hydrateCatalogEntries(
      ctx.db,
      rawFeaturedEntries,
    );
    return { counts, featuredEntries, locations };
  }),

  list: publicProcedure
    .input(
      z.object({
        category: categorySchema,
        location: locationSlugSchema.optional(),
        includeRemote: z.boolean().default(false),
        tags: z.array(z.string().min(1).max(60)).max(8).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(catalogEntryTable.status, "PUBLISHED"),
        eq(catalogEntryTable.primaryCategory, input.category),
      ];
      let place: Awaited<ReturnType<typeof getPlaceBySlug>> | undefined;
      let contextPlaceIds: string[] = [];

      if (input.location) {
        place = await getPlaceBySlug(ctx.db, input.location);
        contextPlaceIds = await getRelatedPlaceIds(ctx.db, place.id);
        const relevantEntryIds = await getEntryIdsForPlaces(
          ctx.db,
          contextPlaceIds,
        );
        const locationCondition =
          relevantEntryIds.length > 0
            ? inArray(catalogEntryTable.id, relevantEntryIds)
            : eq(catalogEntryTable.id, "__no_catalog_entry__");
        conditions.push(
          input.includeRemote
            ? or(
                locationCondition,
                and(
                  eq(catalogEntryTable.remote, true),
                  ne(catalogEntryTable.primaryCategory, "dating_app"),
                ),
              )!
            : locationCondition,
        );
      } else if (input.includeRemote) {
        conditions.push(eq(catalogEntryTable.remote, true));
      }

      const rawEntries = await ctx.db
        .select()
        .from(catalogEntryTable)
        .where(and(...conditions))
        .orderBy(
          desc(catalogEntryTable.featured),
          desc(catalogEntryTable.editorialPick),
          asc(catalogEntryTable.name),
        );
      const taggedEntries =
        input.tags.length === 0
          ? rawEntries
          : rawEntries.filter((entry) =>
              input.tags.every((tag) => entry.data.tags?.includes(tag)),
            );
      const entries = await hydrateCatalogEntries(ctx.db, taggedEntries);

      return {
        entries,
        totalCount: entries.length,
        place: place
          ? (await getCatalogPlaces(ctx.db)).find(
              (item) => item.id === place.id,
            )
          : undefined,
        contextPlaceIds,
      };
    }),

  byLocation: publicProcedure
    .input(
      z.object({
        location: locationSlugSchema,
        includeRemote: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [place, locations] = await Promise.all([
        getPlaceBySlug(ctx.db, input.location),
        getCatalogPlaces(ctx.db),
      ]);
      const contextPlaceIds = await getRelatedPlaceIds(ctx.db, place.id);
      const relevantEntryIds = await getEntryIdsForPlaces(
        ctx.db,
        contextPlaceIds,
      );
      const locationCondition =
        relevantEntryIds.length > 0
          ? inArray(catalogEntryTable.id, relevantEntryIds)
          : eq(catalogEntryTable.id, "__no_catalog_entry__");
      const availability = input.includeRemote
        ? or(
            locationCondition,
            and(
              eq(catalogEntryTable.remote, true),
              ne(catalogEntryTable.primaryCategory, "dating_app"),
            ),
          )!
        : locationCondition;
      const rawEntries = await ctx.db
        .select()
        .from(catalogEntryTable)
        .where(and(eq(catalogEntryTable.status, "PUBLISHED"), availability))
        .orderBy(
          asc(catalogEntryTable.primaryCategory),
          desc(catalogEntryTable.featured),
          desc(catalogEntryTable.editorialPick),
          asc(catalogEntryTable.name),
        );
      const entries = await hydrateCatalogEntries(ctx.db, rawEntries);
      const placeOption = locations.find((item) => item.id === place.id);
      if (!placeOption) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Location hierarchy is incomplete",
        });
      }
      return {
        entries,
        totalCount: entries.length,
        place: placeOption,
        locations,
        contextPlaceIds,
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
      const [hydrated] = await hydrateCatalogEntries(ctx.db, [entry]);
      return hydrated!;
    }),

  requestHelp: publicProcedure
    .input(
      z.object({
        category: categorySchema,
        targetEntryId: z.string().optional(),
        email: z.email(),
        brief: z.string().trim().min(10).max(3000),
        locationKey: locationSlugSchema.optional(),
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
      if (input.locationKey) await getPlaceBySlug(ctx.db, input.locationKey);

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
        locationKey: locationSlugSchema.optional(),
        remote: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.locationKey) await getPlaceBySlug(ctx.db, input.locationKey);
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
