---
name: blog-thumbnail
description: >-
  Create, replace, or review SwipeStats blog cover artwork and thumbnails. Use
  when a request mentions a blog image, article cover, thumbnail, featured-card
  image, editorial illustration, or the visual input to an Open Graph card.
  Produces a crop-safe, optimized SwipeStats asset and verifies where it is used.
---

# SwipeStats blog thumbnail

Create the editorial source image for a SwipeStats article. Treat this as a full
visual-production workflow: inspect the post, choose a concept, generate, crop-check,
optimize, wire the asset into MDX, and verify every surface that actually consumes it.

## Current image contract

- Blog posts live in `content/posts`.
- Frontmatter `thumbnail` supplies featured-card artwork and the representative
  image in BlogPosting JSON-LD.
- PNG and JPG thumbnails named `public/images/blog/thumbnails/<slug>.*` are
  auto-detected. WebP is not auto-detected, so add an explicit `thumbnail` path
  when using the preferred WebP delivery format.
- Ordinary All Posts cards currently omit imagery; only manually featured posts
  display thumbnails.
- Article pages do not currently render `thumbnail` as a hero.
- Blog Open Graph and Twitter metadata currently use the text-only `/api/og/blog`
  route and ignore `thumbnail`. Do not claim that a new thumbnail changed social
  sharing unless the metadata implementation has also changed and been verified.

Re-check these contracts in the current code before writing frontmatter; they may
evolve.

## SwipeStats visual direction

- Premium editorial imagery at the intersection of dating behavior and data.
- Deep indigo, violet, magenta, rose, and selective cyan highlights.
- One clear human or analytical idea: comparison, signal, conversation pattern,
  choice, distribution, or feedback loop.
- Prefer atmospheric editorial photography, tasteful 3D, or polished illustration
  over fake screenshots of Tinder, Hinge, Bumble, or another product.
- Synthetic people must read as illustrative/editorial, never as real SwipeStats
  users or evidence from the dataset.

Existing references are useful for palette and mood, but are not yet a consistent
system:

- `public/images/blog/thumbnails/tinder-statistics.png`
- `public/images/blog/thumbnails/best-rizz-pickup-lines.png`
- `public/images/blog/thumbnails/together-we-could-hinge-prompt.png`

The portrait orientation and garbled interface text in the Hinge reference are
failure modes to avoid. Inspect the references visually before generating; do not
blindly copy their composition.

## Workflow

1. Read the full article and reduce its visual premise to one sentence.
2. Inspect the current featured grid, article route, social metadata, and existing
   references before deciding what the new asset will and will not affect.
3. Generate a 3:2 landscape source, preferably 1536x1024. Keep the meaningful
   subject inside the central 70% so 1200x630, 16:9, and square crops remain useful.
4. Do not ask the image model to render the title, pickup lines, app prompts,
   interface labels, statistics, dating-app logos, or other important text. Render
   reliable text in HTML or the code-generated OG template. Reject gibberish UI.
5. Inspect the result at full size and crop-check it at 3:2, 1200x630, and 1:1.
   Reject a result if the subject, face, chart idea, or relationship is lost.
6. Save the delivery asset as
   `public/images/blog/thumbnails/<slug>.webp` and add
   `thumbnail: "/images/blog/thumbnails/<slug>.webp"` to the post frontmatter.
   Commit the optimized delivery asset, not an unnecessarily large working PNG.
7. Target 1200-1600 px width and no more than 400 KB. Verify the real dimensions
   and byte size after conversion.
8. Preview the featured-card crop. Check `/admin/og-preview` and `/admin/og-map`
   separately; those tools validate social metadata, not thumbnail coverage.
9. Confirm the file exists, the crop is intentional, JSON-LD resolves the thumbnail,
   and Open Graph/Twitter resolve to a valid 1200x630 image. Record when those are
   intentionally different assets.

## Prompt construction

Describe subject, action, setting, composition, palette, medium, lighting, and crop
constraints. End with explicit exclusions such as:

`3:2 landscape editorial image, center-safe composition, no title text, no dating
app logo, no fake UI copy, no watermark.`

When the subject is statistical, depict the underlying relationship instead of
asking the image model for a precise chart. Precise claims and numbers belong in
the article, code-native visuals, or the OG renderer.

## Quality bar

- Never use AI-rendered text as evidence or product UI.
- Never imply a synthetic person is a real user or dataset participant.
- Do not make every article a phone mockup; vary human, analytical, and cultural
  metaphors while preserving the palette.
- Keep `ProductCard` and other reusable product demonstrations code-native. They
  are not bitmap thumbnail substitutes.
- Do not claim OG coverage from a thumbnail until the emitted metadata and rendered
  1200x630 response have both been checked.
