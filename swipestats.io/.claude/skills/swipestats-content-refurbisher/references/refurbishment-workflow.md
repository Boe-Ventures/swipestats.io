# Refurbishment Workflow — Detailed Steps

## Step 1: Load Post

Read the full MDX file. Extract:

```
Frontmatter:
  - h1, h1Subtitle, metaTitle, metaDescription
  - publishedAt, updatedAt, author, category, tags
  - language, showStickyCTA, enableAutoCtAs

Content analysis:
  - Word count
  - H2/H3 structure (list all headings)
  - Internal links (count + targets)
  - External links (count + targets)
  - SwipeStats data points used (statistics, percentages, sample sizes)
  - Has TLDR component?
  - Has Video component?
  - Sources section present?
```

## Step 2: Research (Parallel)

### Sub-agent A — Keyword Research

**Prompt template:**

```
You are a keyword researcher for swipestats.io, a dating app analytics platform.

Current post details:
- URL: https://www.swipestats.io/blog/{slug}
- Current H1: {h1}
- Current meta title: {metaTitle}
- Category: {category}
- Tags: {tags}

TASK 1: Keyword research
Use DataForSEO MCP tools: dataforseo_labs_google_keyword_suggestions, dataforseo_labs_google_related_keywords, dataforseo_labs_google_keyword_overview for the primary keyword/topic.

TASK 2: GSC data (if GSC MCP available)
Query GSC for this page:
- URL: https://swipestats.io/blog/{slug}
- Period: last 90 days
- Get: top queries, clicks, impressions, CTR, avg position

RETURN:
1. Current primary keyword assessment (is it the right keyword?)
2. Recommended primary keyword (with volume if available)
3. 2-8 secondary keywords (with volumes if available)
4. Question keywords for FAQ sections
5. Search intent: "user wants to [verb] [topic]"
6. GSC performance summary (if available)
```

### Sub-agent B — SERP & Competitor Research

**Prompt template:**

```
You are a content researcher for swipestats.io, a dating app analytics platform.

Research the following topic: {primary keyword / topic}

TASK 1: SERP analysis
Use serp_organic_live_advanced to get top 10 results for "{primary keyword}".
Analyze: titles, URLs, content types, common H2 structure, angles competitors take.

TASK 2: Current data research
WebSearch for recent information about this topic:
- Latest statistics and studies
- Industry trends and news
- Academic research
- Common user questions

RETURN:
1. SERP landscape: dominant content type, our position (if visible)
2. Top 5 competitor URLs (for Step 2.5 competitor reading)
3. Competitor H2 analysis: topics they cover that we might be missing
4. Content gaps: what we could add to be more comprehensive
5. Current data findings: recent stats, trends, studies
6. Source list: 2-4 authoritative URLs for citations
```

## Step 3: Evaluate

After receiving research results, evaluate holistically:

**Scope decision criteria:**

| Condition | Scope |
|-----------|-------|
| Content is well-written, comprehensive, current. Just SEO fields need tuning. | `fields-only` |
| Content is mostly good but has outdated stats, missing topics, or weak sections. | `targeted-update` |
| Content is thin, outdated, poorly structured, or missing our data advantage. | `substantial-rewrite` |

**Additional factors:**
- Post age (older = more likely needs refresh)
- Competitor quality (are we being outranked by better content?)
- Missing SwipeStats data (could we add proprietary data?)
- Missing internal links
- Missing FAQ section
- Word count vs competitor average
- **Voice quality** — Does it sound like Mark Manson wrote it? If not, that alone justifies a substantial rewrite.

## Step 4: Present Analysis

**YOLO mode:** Skip this step.

**SAFE mode — Present to user:**

1. **GSC performance summary** (if available) — Top queries, clicks, impressions, avg position
2. **Keyword recommendation** — Proposed primary keyword, secondary keywords (with volumes)
3. **Competitor landscape** — Our position, dominant format, content gaps
4. **Scope decision** — Fields-only / targeted-update / substantial-rewrite, with reasoning
5. **Proposed field changes** — Show old -> new for each frontmatter field
6. **Content issues found** — Outdated info, missing data, structural problems
7. **Research findings** — Competitor insights, YouTube takeaways, current data to incorporate
8. **Items needing human attention** — Things the skill can't resolve

Wait for user approval. User may approve all, approve with modifications, or skip.

## Step 5: Fix Frontmatter

Update fields using the Edit tool. Only change what needs changing. See `mdx-format.md` for the full schema.

**Validation rules:**
- h1: max 120 chars
- h1Subtitle: max 200 chars
- metaTitle: max 60 chars
- metaDescription: max 160 chars
- Always set updatedAt to today's date
- Validate character counts before applying

## Step 5b: Build Internal Link Targets

Build the valid link target list before running the content updater:

```
For each file in content/posts/:
  - Parse filename for slug
  - Read frontmatter for h1 AND publishedAt
  - Only include if publishedAt <= today's date (skip future-dated posts)
  - Add to list: "h1 title -> /blog/{slug}"
```

Also include app pages:
- Upload your data -> /upload
- Insights dashboard -> /insights
- Compare profiles -> /app

Filter out the current post being refurbished.

## Step 6: Content Update

### VOICE IS THE #1 PRIORITY

The writer sub-agent must produce content that sounds like Mark Manson wrote it. If the output reads like a content marketing article, it has failed.

### Compose the Writer Prompt

Structure the prompt in this order — voice first, SEO last:

1. **VOICE** — Read and inline `references/writing-guide.md`. Emphasize: "Voice is the #1 priority."
2. **EXAMPLE POSTS** — Instruct sub-agent to read all 3 example posts (from `references/example-*.mdx`) using the Read tool BEFORE writing.
3. **CONTENT** — Research findings, data points, what to keep/change/add.
4. **SEO LAST** — Keywords, internal links. State: "SEO serves the voice."

### Targeted Update

Tell the sub-agent exactly what to change:

```
SECTIONS TO KEEP (do not modify):
{list of sections that are already excellent}

SECTIONS TO UPDATE:
{list of sections with specific changes needed}

SECTIONS TO ADD:
{new H2/H3 sections with guidance on what to include}

DATA POINTS TO ADD:
{specific SwipeStats statistics to weave in}

INTERNAL LINKS TO ADD:
{links from the link target list that are relevant}
```

### Substantial Rewrite

Provide:
- Full current content (for reference)
- New outline (revised H2/H3 structure)
- Research findings (competitor insights, YouTube takeaways)
- What to preserve from original
- **Explicit voice instruction:** "Read the example posts. Match that energy. If a paragraph could appear in a generic SEO blog, rewrite it."

## Step 6b: Content Review

Before saving, the main agent reviews the content updater's output. This is a quality gate — catch problems before they hit the file.

**Checklist:**

1. **Anti-slop scan** — Search for patterns banned in writing-guide.md:
   - Em-dashes (—), semicolons as conjunctions
   - Passive voice ("is known for", "was designed to", "can be seen as")
   - Hedging ("arguably", "it's worth noting", "interestingly")
   - Generic filler ("in today's world", "when it comes to", "at the end of the day")
   - AI tells ("straightforward", "it's important to note", "navigating")
2. **Data preservation** — Compare against Step 1 content analysis. All original SwipeStats statistics (match rates, percentages, sample sizes) must survive the rewrite. No invented numbers.
3. **Internal links** — Every `/blog/{slug}` URL must exist in the link targets list from Step 5b. No invented URLs. 3-8 links total.
4. **Structure** — H2/H3 headings match the plan from Step 3/4.
5. **Keyword coverage** — Primary keyword in first paragraph and 2+ H2s. Each secondary keyword appears naturally in the body. If missing, weave in. Grammar > exact match.
6. **Sources section** — Present at end with markdown links. No competitor dating sites.
7. **MDX validity** — Components properly opened/closed (`<TLDR>...</TLDR>`). No broken markdown.
8. **Factual consistency** — Stats and claims align with research data. No contradictions.

**Action on issues:**

- **Minor** (a few slop phrases, missing keyword, formatting) → fix inline
- **Moderate** (missing data points, invalid links) → fix inline, note in report
- **Major** (widespread slop, significant data loss, broken structure) → send back to content updater with specific feedback (one retry max, then fix what you can and note the rest)

## Step 7: Save & Report

Write the complete updated file using the Write tool. Verify by reading it back.

Present summary:

```markdown
## Refurbished: {h1}

**File:** content/posts/{slug}.mdx
**Scope:** {fields-only / targeted-update / substantial-rewrite}

### Field Changes

| Field     | Before | After |
| --------- | ------ | ----- |
| metaTitle | "old"  | "new" |
| ...       | ...    | ...   |

### Content Changes

- Sections updated: [list]
- Sections added: [list]
- Data points added: {N}
- Internal links: {before} -> {after}
- Word count: {before} -> {after}

### Needs Attention

- [Any issues or manual tasks]
```

## Key Reminders

- **Voice above all.** If it doesn't sound like Mark Manson wrote it, rewrite it.
- **Preserve excellence.** If a section is great AND has the right voice, don't touch it.
- **Add data.** The #1 way to improve most posts is adding SwipeStats data. Deliver data with personality, not as dry facts.
- **Fix internal links.** Many older posts may be missing links to newer content.
- **Update sources.** Remove dead links, add current sources.
- **updatedAt.** Always set to today's date when making changes.
