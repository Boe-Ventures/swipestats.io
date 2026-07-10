# SwipeStats blog architecture

SwipeStats blog posts are MDX files compiled by Velite and rendered as static
Next.js pages. This document covers the content pipeline and the CTA strategy
used to connect articles to relevant product surfaces.

## Content pipeline

1. Posts live in `content/posts/*.mdx`.
2. `velite.config.ts` validates frontmatter and compiles MDX into `.velite`.
3. `src/app/(marketing)/blog/[slug]/page.tsx` reads posts from `@velite` and
   statically renders the article page.
4. `src/components/mdx/MDXContent.tsx` exposes the approved React components to
   MDX authors.

The `.velite` directory is generated and ignored by Git. Run `bun run velite:build`
after changing the schema or MDX component usage.

## Frontmatter

The canonical schema lives in `velite.config.ts`.

| Field             | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `h1`              | Visible article title                                          |
| `h1Subtitle`      | Optional visible subtitle                                      |
| `metaTitle`       | SEO title, maximum 60 characters                               |
| `metaDescription` | SEO description, maximum 160 characters                        |
| `publishedAt`     | Publication date and publish-state boundary                    |
| `updatedAt`       | Optional last-modified date                                    |
| `author`          | Key from `src/lib/blog-authors.ts`                             |
| `category`        | Primary grouping used for discovery and related posts          |
| `tags`            | Lowercase secondary grouping used for related posts            |
| `language`        | Article language                                               |
| `showStickyCTA`   | Enables the wide-screen sidebar CTA; defaults to `true`        |
| `enableAutoCtAs`  | Enables automatic in-article fallback CTAs; defaults to `true` |
| `readingTime`     | Optional displayed reading time; defaults to 5 minutes         |
| `thumbnail`       | Optional image override; otherwise detected from the slug      |

The filename becomes the slug and permalink. A post is published when its
`publishedAt` value is not in the future.

## MDX components

Components registered in `src/components/mdx/MDXContent.tsx` can be used without
imports inside an article.

Frequently used components include:

- `TLDR` for the opening summary
- `FAQ` for structured question-and-answer sections
- `CalloutBox` for editorial notes and warnings
- `Video`, `ImageGrid`, `Quote`, and `Stats` for supporting media
- `NewsletterCard` for an explicit newsletter signup
- `ProductCard` for contextual links into SwipeStats products
- `CtaCard` for the generic upload-oriented fallback

Do not add an `h1` inside article content. The page renders the frontmatter `h1`.

## CTA strategy

SwipeStats uses two complementary systems.

### Long-tail posts: automatic fallback

`CtaInjector` scans article `h2` elements after hydration and inserts alternating
generic product and newsletter cards. It is the low-maintenance default for the
long tail of the blog.

Keep `enableAutoCtAs: true` when an article has not been deliberately mapped to a
specific product journey.

### High-performing posts: manual product cards

High-traffic and high-intent posts should disable automatic CTAs and place one or
two relevant product cards at natural editorial transitions.

```yaml
showStickyCTA: true
enableAutoCtAs: false
```

```mdx
<ProductCard product="prompt-assistant" />
```

Manual placement keeps the article readable, makes the promise match the search
intent, and ensures the product link is part of the rendered MDX rather than a
generic client-side insertion.

Available product keys:

| Product key        | Intended article intent                                 | Default destination |
| ------------------ | ------------------------------------------------------- | ------------------- |
| `insights`         | Statistics, performance, match-rate, and worth-it posts | `/upload`           |
| `profile-compare`  | Profile, photo, bio, review, and optimization posts     | `/try`              |
| `profile-roast`    | Profile review and improvement posts                    | `/try`              |
| `prompt-assistant` | Hinge/Bumble prompt-answer posts                        | `/try`              |
| `directory`        | Community, benchmark, demographic, and discovery posts  | `/directory`        |

The card accepts optional copy and destination overrides when an article needs a
more specific transition:

```mdx
<ProductCard
  product="insights"
  title="See where your Tinder match rate lands"
  description="Upload your Tinder export and compare your real numbers."
  buttonText="Analyze my Tinder data"
  buttonHref="/upload?provider=tinder"
/>
```

Product configuration and visual previews live in
`src/components/mdx/ProductCard.tsx`. Prefer adding a reusable product key or a
small copy override over creating one-off card components in individual posts.

## Previewing cards

Run the app locally, then open:

```text
http://localhost:3000/dev/blog-product-cards
```

The preview route renders all product variants, an in-article example, and the
existing fallback cards. It returns 404 outside `next dev` and is marked
`noindex`.

## Article page structure

A published article renders in this order:

1. Structured data and article hero
2. MDX article content
3. Related posts selected from matching categories and tags
4. Automatic CTAs when `enableAutoCtAs` is enabled
5. Wide-screen sticky CTA when `showStickyCTA` is enabled
6. Author card
7. Newsletter CTA

The blog page also provides canonical metadata, Open Graph metadata, article
JSON-LD, breadcrumb JSON-LD, and generated social images.

## Relevant files

- `velite.config.ts` — schema and compilation configuration
- `content/posts/*.mdx` — article source
- `src/app/(marketing)/blog/[slug]/page.tsx` — article route
- `src/components/mdx/MDXContent.tsx` — MDX component registry
- `src/components/mdx/CtaInjector.tsx` — automatic fallback injection
- `src/components/mdx/ProductCard.tsx` — contextual product cards
- `src/app/dev/blog-product-cards/page.tsx` — development preview gallery
- `src/app/(marketing)/blog/page.tsx` — blog index
- `src/app/(marketing)/blog/BlogGrid.tsx` — article cards and thumbnails

## Validation

Before publishing blog infrastructure or content changes, run:

```bash
bun run velite:build
bun run lint
bun run typecheck
```

Velite currently reports informational metadata-length issues for some existing
posts. Distinguish those baseline content notices from failures introduced by
the changed article or component.
