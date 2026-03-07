---
name: swipestats-content-refurbisher
description: Full-service content refurbishment for SwipeStats blog posts. Takes one MDX post at a time, does keyword research (DataForSEO + GSC), reads competitor articles, fetches YouTube transcripts, evaluates content quality, fixes frontmatter/SEO fields, and rewrites content when needed. Use when asked to "refresh content", "update blog post", "refurbish article", or "improve existing content".
---

# SwipeStats Content Refurbisher

Refurbishes one MDX blog post at a time. Keyword research, SEO field optimization, content evaluation, and body rewriting.

## Reference Files

Read these before running:

1. `.claude/skills/swipestats-content-refurbisher/references/refurbishment-workflow.md` — detailed pipeline steps, prompt templates, scope decisions
2. `.claude/skills/swipestats-content-refurbisher/references/mdx-format.md` — frontmatter schema, MDX components
3. `.claude/skills/swipestats-content-refurbisher/references/writing-guide.md` — voice, tone, anti-slop rules, data usage, internal linking
4. Gold standard example posts in `.claude/skills/swipestats-content-refurbisher/references/example-*.mdx`

## Core Rules

- **One post at a time.** Make one post excellent before moving to the next.
- **Preserve what's good.** Don't rewrite sections that are already excellent.
- **No hardcoded years.** Use relative timeframes or the current year.
- **Thumbnail.** Note if thumbnail needs creation at `public/images/blog/thumbnails/{slug}.png`.
- See `writing-guide.md` for voice, data usage, internal linking, and anti-slop rules.

## Step 0: Identify Target

Ask the user for:

1. **Post** — filename (e.g., `tinder-review.mdx`), slug, or "show me the list"
2. **Mode** — `YOLO` or `SAFE` (default: SAFE)
   - `SAFE` — Present analysis, wait for approval
   - `YOLO` — Fully autonomous: analyze, fix, save, continue

If "show me the list": read all files in `content/posts/`, show titles with `publishedAt` dates, sorted oldest first.

## Pipeline

Follow `references/refurbishment-workflow.md` for all steps.

| Step | What                | Details                                                      |
| ---- | ------------------- | ------------------------------------------------------------ |
| 1    | Load Post           | Read MDX, parse frontmatter + content body                   |
| 2    | Research (parallel) | Sub-agent A: keywords + GSC. Sub-agent B: SERP + competitors |
| 2.5  | Competitor Reading  | Extract top 5 competitor articles via DataForSEO             |
| 2.6  | YouTube Research    | Relevant video transcripts                                   |
| 3    | Evaluate            | Scope: fields-only / targeted-update / substantial-rewrite   |
| 4    | Present Analysis    | SAFE: show findings, get approval. YOLO: skip                |
| 5    | Fix Frontmatter     | Update SEO fields per mdx-format.md rules                    |
| 5b   | Build Link Targets  | Scan published posts for valid internal links                |
| 6    | Content Update      | Voice-first rewrite via Opus sub-agent (if needed)           |
| 6b   | Content Review      | Anti-slop, data, links, keywords, structure — fix or retry   |
| 7    | Save & Report       | Write file, present before/after summary                     |

## Sub-Agent Architecture

| Sub-Agent          | Model  | When              | Purpose                            |
| ------------------ | ------ | ----------------- | ---------------------------------- |
| Keyword Researcher | sonnet | Step 2 (parallel) | DataForSEO volumes + GSC analysis  |
| SERP Researcher    | sonnet | Step 2 (parallel) | SERP analysis, competitor URLs     |
| Competitor Reader  | sonnet | Step 2.5          | Extract competitor article content |
| YouTube Researcher | sonnet | Step 2.6          | Relevant video transcripts         |
| Content Updater    | opus   | Step 6            | Voice-first content rewrite        |

Keyword + SERP run in parallel. Competitor Reader runs after SERP returns URLs. YouTube runs in parallel with Competitor Reader. Content Updater runs after evaluation.

**Sub-agent rules:** Inline all context (sub-agents can't read skill files). Tell sub-agents to call DataForSEO MCP tools directly. All volumes from API responses, never estimated.

## Error Handling

- Sub-agent fails → continue with available data
- GSC returns no data → proceed with keyword research only
- DataForSEO fails → fall back to WebSearch, note volumes as estimated
- Content update fails → retry once, then apply field fixes only
- Never stop the pipeline for a single error
