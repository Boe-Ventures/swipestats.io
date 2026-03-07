---
name: swipestats-content-creator
description: Full-service content creation for SwipeStats blog. Creates complete MDX blog posts from scratch - keyword research (DataForSEO or WebSearch), SERP analysis, content outline, writing, and MDX file creation in content/posts/. Use when asked to "write a blog post", "create content", "new article", or similar content creation requests.
---

# SwipeStats Content Creator

Creates complete blog posts from scratch. Topic → keyword research → SERP analysis → outline → writing → MDX file.

## Reference Files

Read these before running:

1. `.claude/skills/swipestats-content-creator/references/creation-workflow.md` — detailed pipeline steps, prompt templates
2. `.claude/skills/swipestats-content-creator/references/mdx-format.md` — frontmatter schema, MDX components
3. `.claude/skills/swipestats-content-creator/references/writing-guide.md` — voice, tone, anti-slop rules, data usage, internal linking
4. Gold standard example posts in `.claude/skills/swipestats-content-creator/references/example-*.mdx`

## Content Types

| Category     | Use For                                                                               |
| ------------ | ------------------------------------------------------------------------------------- |
| `Statistics` | Data-heavy posts using SwipeStats dataset (match rates, swipe patterns, demographics) |
| `Guides`     | How-to guides, app reviews, strategy content                                          |
| `Texting`    | Conversation tips, opener strategies, messaging advice                                |
| `Prompts`    | Hinge prompt answers, profile optimization                                            |

## Core Rules

- **One post at a time.** Make one post excellent before moving to the next.
- See `writing-guide.md` for voice, data usage, internal linking, and anti-slop rules.

## Step 0: Identify Topic

Ask the user for:

1. **Topic/keyword** — What to write about
2. **Category** — Statistics, Guides, Texting, or Prompts (or auto-detect)
3. **Mode** — `YOLO` or `SAFE` (default: SAFE)
   - `SAFE` — Present analysis, wait for approval at key checkpoints
   - `YOLO` — Fully autonomous: no approval steps

Then check `content/posts/` for overlap and identify relevant proprietary data.

## Pipeline

Follow `references/creation-workflow.md` for all steps.

| Step | What                        | Details                                                      |
| ---- | --------------------------- | ------------------------------------------------------------ |
| 1    | Keyword Research (parallel) | Sub-agent A: keywords. Sub-agent B: SERP analysis            |
| 2    | Content Strategy            | Category, angle, word count, data points. SAFE: get approval |
| 2.5  | Competitor Reading          | Extract top 5 competitor articles via DataForSEO             |
| 2.6  | YouTube Research            | Relevant video transcripts                                   |
| 3    | Web Research                | Current stats, trends, sources                               |
| 4    | Outline + Fields            | H2/H3 structure, all frontmatter, slug. SAFE: get approval   |
| 5    | Build Link Targets          | Scan published posts for valid internal links                |
| 6    | Write Content               | Voice-first writing via Opus sub-agent                       |
| 6b   | Content Review              | Anti-slop, data, links, keywords, structure — fix or retry   |
| 7    | Create MDX File             | Combine frontmatter + content body                           |
| 8    | Verify & Report             | Read back, present summary, flag thumbnail needed            |
| 9    | Update Content Plan         | Mark item as `[x]` in `CONTENT-PLAN.md` (mandatory)         |

## Sub-Agent Architecture

| Sub-Agent          | Model  | When              | Purpose                            |
| ------------------ | ------ | ----------------- | ---------------------------------- |
| Keyword Researcher | sonnet | Step 1 (parallel) | DataForSEO volumes + suggestions   |
| SERP Analyzer      | sonnet | Step 1 (parallel) | SERP analysis, competitor URLs     |
| Competitor Reader  | sonnet | Step 2.5          | Extract competitor article content |
| YouTube Researcher | sonnet | Step 2.6          | Relevant video transcripts         |
| Web Researcher     | sonnet | Step 3            | Current info, stats, sources       |
| Content Writer     | opus   | Step 6            | Voice-first MDX content body       |

Keyword + SERP run in parallel. Competitor Reader runs after SERP returns URLs. YouTube runs in parallel with Competitor Reader. Web Researcher runs after strategy confirmation. Content Writer runs after outline confirmation.

**Sub-agent rules:** Inline all context (sub-agents can't read skill files). Tell sub-agents to call DataForSEO MCP tools directly. All volumes from API responses, never estimated.

## Error Handling

- Sub-agent fails → continue with available data
- DataForSEO fails → fall back to WebSearch, note volumes as estimated
- Content write fails → retry once, then fall back to simpler outline
- Slug conflict → append number suffix (e.g., `tinder-tips-2`)
- Never stop the pipeline for a single error
