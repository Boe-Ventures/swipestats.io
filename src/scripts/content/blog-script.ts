/**
 * Blog script MVP - Scrapes a URL, extracts blog post metadata, and generates MDX
 *
 * Usage:
 *   bun src/scripts/blog-script.ts
 *
 * Update the URL constant below to scrape a different blog post.
 */

// ---- CONFIGURATION ----

/**
 * URL of the blog post to scrape
 */
const BLOG_URL =
  "https://www.swipestats.io/blog/together-we-could-hinge-prompt";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { generateText, Output, streamText } from "ai";
import Firecrawl from "@mendable/firecrawl-js";
import { AUTHOR_KEYS } from "@/lib/blog-authors";

// ---- CONFIGURATION ----

/**
 * Model to use for AI extraction and generation
 */
const ADVANCED_EXTRACTION_MODEL = "anthropic/claude-sonnet-4.5" as const;

// ---- FIRECRAWL CLIENT ----

let firecrawlClient: Firecrawl | null = null;

function getFirecrawlClient(): Firecrawl {
  if (!firecrawlClient) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is required");
    }
    firecrawlClient = new Firecrawl({ apiKey });
    console.log("🔥 Firecrawl client initialized successfully");
  }
  return firecrawlClient;
}

/**
 * Basic content scraping without structured extraction (v2 API)
 */
async function firecrawlBasicScrape(url: string): Promise<{
  success: boolean;
  title?: string;
  description?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const client = getFirecrawlClient();

    // Use new v2 API with scrape() method
    const scrapeResult = await client.scrape(url, {
      formats: ["markdown"],
    });

    // v2 API returns data directly, check if we got markdown
    if (!scrapeResult.markdown) {
      return {
        success: false,
        error: "No markdown content returned from Firecrawl",
      };
    }

    return {
      success: true,
      title: scrapeResult.metadata?.title,
      description: scrapeResult.metadata?.description,
      content: scrapeResult.markdown,
      metadata: scrapeResult.metadata,
    };
  } catch (error) {
    console.error("💥 Firecrawl basic scrape failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---- SCHEMAS ----

/**
 * Schema for extracting blog post metadata from scraped content
 * Matches Velite config schema exactly
 */
const blogPostMetadataSchema = z.object({
  // Primary content (shown in blog)
  h1: z.string().max(120).describe("Main H1 heading for the blog post"),
  h1Subtitle: z
    .string()
    .max(200)
    .optional()
    .describe("Optional subtitle that appears under the H1"),

  // SEO metadata (for <head>)
  metaTitle: z
    .string()
    .max(60)
    .describe("SEO-optimized title for search engines (max 60 chars)"),
  metaDescription: z
    .string()
    .max(160)
    .describe("SEO meta description for search engines (max 160 chars)"),

  // Publishing & updates
  publishedAt: z
    .string()
    .describe("Publication date in ISO format (YYYY-MM-DD)"),
  updatedAt: z
    .string()
    .optional()
    .describe("Last update date in ISO format (YYYY-MM-DD)"),

  // Organization
  author: z
    .enum(AUTHOR_KEYS)
    .default("paw")
    .describe("Author key from blog-authors.ts"),
  tags: z
    .array(z.string())
    .default([])
    .describe("Relevant tags for categorization (3-5 recommended)"),
  language: z
    .enum(["en-US", "es-ES", "pt-BR"])
    .default("en-US")
    .describe("Content language"),

  // Optional features
  showStickyCTA: z
    .boolean()
    .default(true)
    .describe("Whether to show sticky CTA on the page"),
  readingTime: z
    .number()
    .optional()
    .describe("Estimated reading time in minutes"),
});

// ---- MAIN FUNCTION ----

async function generateBlogPost(url: string) {
  console.log(`🔍 Scraping URL: ${url}`);

  // Step 1: Scrape with Firecrawl
  const scrapeResult = await firecrawlBasicScrape(url);

  if (!scrapeResult.success || !scrapeResult.content) {
    throw new Error(
      `Failed to scrape URL: ${scrapeResult.error ?? "Unknown error"}`,
    );
  }

  console.log(`✅ Scraped content (${scrapeResult.content.length} chars)`);
  console.log(`📄 Title: ${scrapeResult.title ?? "N/A"}`);

  // Step 2: Extract blog post metadata using structured generation
  console.log(`🤖 Extracting blog post metadata...`);

  const metadataPrompt = `Extract blog post metadata from this scraped content:

Title: ${scrapeResult.title ?? "N/A"}
Description: ${scrapeResult.description ?? "N/A"}

Content:
${scrapeResult.content.substring(0, 5000)}${scrapeResult.content.length > 5000 ? "\n\n[... truncated ...]" : ""}

Extract metadata matching this schema:

**Primary Content:**
- h1: Main H1 heading for the blog post (max 120 chars)
- h1Subtitle: Optional subtitle under the H1 (max 200 chars)

**SEO Metadata:**
- metaTitle: SEO-optimized title for search engines (max 60 chars)
- metaDescription: SEO meta description (max 160 chars, compelling summary)

**Publishing:**
- publishedAt: Publication date in ISO format (YYYY-MM-DD). If not found, use today's date: ${new Date().toISOString().split("T")[0]}
- updatedAt: Last update date if mentioned (YYYY-MM-DD), otherwise omit

**Organization:**
- author: Author key - must be one of: "kristian", "paw", or "joe". Map names to keys (e.g., "Kristian" -> "kristian"). Default to "paw" if unclear.
- tags: Relevant tags for categorization (3-5 recommended)
- language: Content language - must be one of: "en-US", "es-ES", or "pt-BR". Default to "en-US".

**Optional Features:**
- showStickyCTA: Whether to show sticky CTA (default: true)
- readingTime: Estimated reading time in minutes (calculate based on ~200 words/min)

Original URL: ${url}`;

  const metadataResult = await generateText({
    model: ADVANCED_EXTRACTION_MODEL,
    output: Output.object({
      schema: blogPostMetadataSchema,
    }),
    prompt: metadataPrompt,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "blog-metadata-extraction",
    },
  });

  const metadata = metadataResult.output;
  console.log(`✅ Extracted metadata:`, metadata);

  // Step 3: Generate MDX content with streaming
  console.log(`✍️ Generating MDX content with components...`);

  const mdxPrompt = `Convert this blog post content into clean, well-formatted MDX with interactive components:

Title: ${metadata.h1}
${metadata.h1Subtitle ? `Subtitle: ${metadata.h1Subtitle}` : ""}

Original Content:
${scrapeResult.content}

Instructions:
- Convert the content to clean MDX format
- Use proper markdown headings (##, ###, ####) - DO NOT use # (that's reserved for page title)
- Format lists, code blocks, and quotes appropriately
- Remove navigation menus, headers, footers, and other non-content elements
- Preserve important formatting like bold, italic, links

**IMPORTANT: Use these custom MDX components to enhance the content:**

1. **<TLDR>** - Add at the top with a concise summary (2-4 bullet points)
   Example:
   <TLDR>
   Quick summary here with **bold** and key points.
   - Bullet point 1
   - Bullet point 2
   </TLDR>

2. **<CalloutBox type="info|success|warning|error">** - Highlight important information
   Example: <CalloutBox type="info">Important note here with **formatting**</CalloutBox>

3. **<CTA label="..." href="..." variant="primary|secondary|ghost" />** - Add calls-to-action
   Example: <CTA label="Try SwipeStats" href="/upload" variant="primary" />

4. **<CtaCard>** - Feature-rich CTA cards
   Example: <CtaCard title="Get Started" description="Upload your data for insights" buttonText="Sign Up" buttonHref="/upload" icon="heart" />

5. **<Quote author="..." role="...">** - Add testimonials or quotes from the content
   Example: <Quote author="Jane Doe" role="Dating Expert">Quote text here</Quote>

6. **<Stats>** - Display key metrics and numbers
   Example: <Stats title="Results" stats={[{label: "Success Rate", value: "95%", change: "improvement"}]} />

7. **<Video url="..." title="..." />** - Embed YouTube/Vimeo videos (if URLs found)
   Example: <Video url="https://youtube.com/watch?v=..." title="Tutorial Video" />

8. **<FeatureGrid>** - Showcase features or benefits in a grid
   Example: <FeatureGrid features={[{title: "Feature", description: "Details here", icon: "heart"}]} />

**Component Usage Guidelines:**
- START with <TLDR> at the very beginning for quick summaries
- Use <CalloutBox> for tips, warnings, and important notes throughout
- Place <CTA> or <CtaCard> strategically (after introduction, middle sections, before conclusion)
- Add <Quote> if there are testimonials or notable statements in the content
- Use <Stats> to make numerical data more visual and impactful
- Include <Video> for any video URLs found in the content
- Use <FeatureGrid> when listing multiple features, benefits, or steps
- End with a <CtaCard> or <CTA> for conversion

**Important Notes:**
- Use components generously to make content engaging and interactive
- Ensure all component props are properly formatted
- Keep markdown clean and properly formatted
- DO NOT include frontmatter - that will be added separately

Generate ONLY the MDX body content starting with the TLDR component.`;

  const mdxResult = streamText({
    model: ADVANCED_EXTRACTION_MODEL,
    prompt: mdxPrompt,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "blog-mdx-generation",
    },
  });

  // Collect and display streamed content chunks
  let mdxContent = "";
  let buffer = "";

  for await (const chunk of mdxResult.textStream) {
    mdxContent += chunk;
    buffer += chunk;

    // Print buffer when it reaches ~100 chars or on newlines for better readability
    if (buffer.length >= 100 || buffer.includes("\n\n")) {
      process.stdout.write(buffer);
      buffer = "";
    }
  }

  // Print any remaining buffer
  if (buffer.length > 0) {
    process.stdout.write(buffer);
  }

  console.log("\n"); // New lines after content
  console.log(`✅ Generated MDX content (${mdxContent.length} chars)`);

  // Step 4: Generate slug from h1
  const slug = metadata.h1
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Step 5: Create frontmatter matching Velite schema exactly
  // Note: Velite will auto-generate slug from file path using s.path().transform()
  const frontmatter = `---
h1: "${metadata.h1.replace(/"/g, '\\"')}"
${metadata.h1Subtitle ? `h1Subtitle: "${metadata.h1Subtitle.replace(/"/g, '\\"')}"` : ""}
metaTitle: "${metadata.metaTitle.replace(/"/g, '\\"')}"
metaDescription: "${metadata.metaDescription.replace(/"/g, '\\"')}"
publishedAt: "${metadata.publishedAt}"
${metadata.updatedAt ? `updatedAt: "${metadata.updatedAt}"` : ""}
author: "${metadata.author}"
tags: ${JSON.stringify(metadata.tags)}
language: "${metadata.language}"
showStickyCTA: ${metadata.showStickyCTA}
${metadata.readingTime ? `readingTime: ${metadata.readingTime}` : ""}
---

`;

  // Step 6: Combine frontmatter and content
  const fullMdx = frontmatter + mdxContent;

  // Step 7: Write to content/posts/ directory (Velite's expected location)
  const outputDir = join(process.cwd(), "content", "posts");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `${slug}.mdx`);
  await writeFile(outputPath, fullMdx, "utf-8");

  console.log(`✅ Blog post generated successfully!`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📝 Slug: posts/${slug}`);
  console.log(
    `📊 ${mdxContent.length} chars | ${metadata.readingTime || "?"} min read`,
  );

  return {
    slug,
    metadata,
    outputPath,
  };
}

// ---- SCRIPT EXECUTION ----

async function main() {
  const url = BLOG_URL;

  // Check for required environment variables
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error(
      "❌ Error: FIRECRAWL_API_KEY environment variable is required",
    );
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "❌ Error: ANTHROPIC_API_KEY environment variable is required",
    );
    process.exit(1);
  }

  try {
    await generateBlogPost(url);
  } catch (error) {
    console.error("❌ Error generating blog post:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
void main();
