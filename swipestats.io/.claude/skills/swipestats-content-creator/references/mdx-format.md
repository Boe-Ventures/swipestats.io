# MDX Format Reference

## File Location

All blog posts live in `content/posts/{slug}.mdx`.

## Frontmatter Schema

```yaml
---
h1: "Main heading displayed on page" # Required, max 120 chars
h1Subtitle: "Supporting subtitle text" # Optional, max 200 chars
metaTitle: "SEO title for search results" # Required, max 60 chars
metaDescription: "SEO description for snippet" # Required, max 140 chars
publishedAt: "2026-02-14" # Required, ISO date. Use date from CONTENT-PLAN.md if listed.
updatedAt: "2026-02-14" # Required, ISO date. Set to publishedAt on creation.
author: "paw" # "paw" | "kristian" | "joe"
category: "Guides" # "Statistics" | "Guides" | "Texting" | "Prompts"
tags: ["tinder", "match-rates"] # Array of lowercase strings
language: "en-US" # "en-US" | "es-ES" | "pt-BR"
showStickyCTA: true # Show sticky call-to-action
enableAutoCtAs: true # Enable automatic CTAs
readingTime: 8 # Optional, estimated minutes
---
```

## Authors

| ID         | Name        | Role                           |
| ---------- | ----------- | ------------------------------ |
| `paw`      | Paw         | Dating Expert at SwipeStats.io |
| `kristian` | Kristian    | Founder of SwipeStats.io       |
| `joe`      | Joe Buchoff | Founder of GetDates.io         |

Default to `paw` for content/marketing posts.

## Available MDX Components

### TLDR

Quick summary section at the top of posts.

```mdx
<TLDR>- Key point one - Key point two - Key point three</TLDR>
```

### Video

Embed YouTube videos.

```mdx
<Video url="https://www.youtube.com/watch?v=VIDEO_ID" />
```

## Content Body

Standard markdown with MDX extensions:

- `## Heading 2` and `### Heading 3` for structure
- `**bold**` for emphasis
- `[link text](url)` for links
- `-` or `*` for unordered lists
- `1.` for ordered lists
- `>` for blockquotes
- Standard markdown tables
- Inline code with backticks

## Slug Derivation

The slug is automatically derived from the filename:

- `content/posts/tinder-review.mdx` -> slug: `tinder-review`
- URL becomes: `/blog/tinder-review`

**Naming rules:**

- Lowercase
- Hyphens for word separation
- No special characters
- Descriptive, keyword-friendly

## Thumbnail

Thumbnails are auto-detected from:

- `public/images/blog/thumbnails/{slug}.png`
- `public/images/blog/thumbnails/{slug}.jpg`

If no thumbnail exists, note this as needing manual creation.

## Publishing

A post is considered published if `publishedAt` date is today or earlier.
Set `publishedAt` to today's date to publish immediately.
Set it to a future date for scheduled publishing.
