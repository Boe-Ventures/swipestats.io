import { defineCollection, defineConfig, s } from "velite";
import { existsSync } from "fs";
import { join } from "path";
import { AUTHOR_KEYS } from "./src/lib/blog-authors";

// Helper function to check if thumbnail exists
function checkThumbnailExists(slug: string): string | null {
  const thumbnailPath = join(
    process.cwd(),
    "public",
    "images",
    "blog",
    "thumbnails",
    `${slug}.png`,
  );
  if (existsSync(thumbnailPath)) {
    return `/images/blog/thumbnails/${slug}.png`;
  }
  // Also check for jpg
  const jpgPath = thumbnailPath.replace(".png", ".jpg");
  if (existsSync(jpgPath)) {
    return `/images/blog/thumbnails/${slug}.jpg`;
  }
  return null;
}

// Note: tags are always lowercase!
const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/*.mdx",
  schema: s
    .object({
      // Primary content (shown in blog)
      h1: s.string().max(120),
      h1Subtitle: s.string().max(200).optional(),

      // SEO metadata (for <head>)
      metaTitle: s.string().max(60),
      metaDescription: s.string().max(160),

      // Publishing & updates
      publishedAt: s.isodate(),
      updatedAt: s.isodate().optional(),

      // Organization
      author: s.enum(AUTHOR_KEYS).default("paw"),
      category: s
        .enum([
          "Texting", // e.g. rizz lines, opening lines, how to text etc.
          "Prompts", // e.g. together we could hinge prompt answers
          "Guides", // e.g. tinder review, is tinder worth it
          "Statistics", // e.g. tinder statistics, bumble statistics
        ])
        .optional()
        .describe(
          "Optional primary category for the post. Texting (e.g. rizz lines, opening lines, how to text etc.), Prompts (e.g. together we could hinge prompt answers), Guides (e.g. tinder review, is tinder worth it), Statistics (e.g. tinder statistics, bumble statistics)",
        ),
      tags: s
        .array(s.string())
        .optional()
        .default([])
        .describe(
          "Optional tags for additional categorization. Tags are always lowercase. Common suggestions: tinder, hinge, bumble, quick read, dating tips, etc.",
        ),
      language: s.enum(["en-US", "es-ES", "pt-BR"]).default("en-US"),

      // Optional features
      showStickyCTA: s.boolean().default(true),
      enableAutoCtAs: s.boolean().default(true),
      readingTime: s.number().optional(),

      // Thumbnail image (optional - auto-detected if not provided)
      thumbnail: s.string().optional(),

      // Content
      content: s.mdx(),

      // Auto-generated from filename
      slug: s.path().transform((path) => path.replace(/^posts\//, "")),
    })
    .transform((data) => ({
      ...data,
      permalink: `/blog/${data.slug}`,
      // Published if publishedAt is in the past/present
      isPublished: new Date(data.publishedAt) <= new Date(),
      // Use updatedAt for last modified, fallback to publishedAt
      lastModified: data.updatedAt || data.publishedAt,
      // Use explicit thumbnail from frontmatter, or auto-detect from file system
      thumbnail: data.thumbnail || checkThumbnailExists(data.slug),
    })),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { posts },
  mdx: {
    // We can add remark/rehype plugins here if needed in the future
  },
});
