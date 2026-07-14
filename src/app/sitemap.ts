import { posts } from "@velite";
import { eq } from "drizzle-orm";
import { type MetadataRoute } from "next";
import {
  CATALOG_CATEGORIES,
  CATALOG_CATEGORY_KEYS,
  CATALOG_LOCATION_FILTER_KEYS,
  catalogEntryBelongsToCategory,
  catalogEntryMatchesLocation,
} from "@/lib/catalog";
import { db } from "@/server/db";
import { catalogEntryTable } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Filter for published posts only
  const publishedPosts = posts.filter((post) => post.isPublished);
  const publishedCatalogEntries = await db
    .select({
      slug: catalogEntryTable.slug,
      primaryCategory: catalogEntryTable.primaryCategory,
      data: catalogEntryTable.data,
      updatedAt: catalogEntryTable.updatedAt,
    })
    .from(catalogEntryTable)
    .where(eq(catalogEntryTable.status, "PUBLISHED"));
  const populatedCategoryKeys = CATALOG_CATEGORY_KEYS.filter((category) =>
    publishedCatalogEntries.some((entry) =>
      catalogEntryBelongsToCategory(
        entry.primaryCategory,
        entry.data,
        category,
      ),
    ),
  );
  const populatedLocationKeys = CATALOG_LOCATION_FILTER_KEYS.filter(
    (location) =>
      publishedCatalogEntries.some((entry) =>
        catalogEntryMatchesLocation(
          entry.data,
          location,
          entry.primaryCategory,
        ),
      ),
  );

  const baseUrl = "https://www.swipestats.io";

  return [
    // Main pages
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}/upload?provider=tinder`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/upload?provider=hinge`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    // {
    //   url: `${baseUrl}/upload/tinder`,
    //   lastModified: new Date(),
    //   changeFrequency: "yearly",
    //   priority: 0.7,
    // },
    // {
    //   url: `${baseUrl}/upload/hinge`,
    //   lastModified: new Date(),
    //   changeFrequency: "yearly",
    //   priority: 0.7,
    // },

    // Blog
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...publishedPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.lastModified),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),

    // Information pages
    {
      url: `${baseUrl}/how-to-request-your-data`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/research`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/directory`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/dating-services`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...populatedCategoryKeys.map((key) => ({
      url: `${baseUrl}/dating-services/${CATALOG_CATEGORIES[key].slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...populatedLocationKeys.map((key) => ({
      url: `${baseUrl}/dating-services/location/${key}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.55,
    })),
    ...publishedCatalogEntries.map((entry) => ({
      url: `${baseUrl}/dating-services/listing/${entry.slug}`,
      lastModified: entry.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    // Legal pages
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/tos`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
