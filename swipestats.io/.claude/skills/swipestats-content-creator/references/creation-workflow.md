# Creation Workflow — Detailed Steps

## Step 0: Identify Topic & Session Setup

**Ask the user for:**

- Topic or keyword to write about
- Category preference (or auto-detect)
- Mode: SAFE (default) or YOLO

**Session setup:**

- Read existing posts from `content/posts/` to understand what's already covered
- Check for potential topic overlap with existing content

## Step 1: Keyword Research

### If DataForSEO MCP is available:

**Sub-agent A — Keyword Researcher (model: sonnet):**

Provide:

- The topic/keyword from user
- DataForSEO location_code (2840 for US) and language_code ("en")

The sub-agent MUST:

1. Call DataForSEO keyword suggestions with the topic as seed (limit: 30)
2. Call DataForSEO related keywords for broader discovery (limit: 30)
3. For top candidates, check volumes via keyword overview
4. All volume numbers must come from actual API responses — never estimated.
5. Return:
   - Ranked keyword list (keyword, volume, difficulty)
   - Recommended primary keyword (highest volume matching topic)
   - 2-8 highly relevant secondary keywords (include question keywords)
   - Search intent sentence: "user wants to [verb] [topic]"
   - Question keywords found (for FAQ generation)

**Sub-agent B — SERP Analyzer (model: sonnet):**

Provide:

- The target keyword
- DataForSEO location_code and language_code
- Our domain (swipestats.io) to identify own results

The sub-agent MUST:

1. Call DataForSEO SERP organic results for the keyword
2. Analyze top 10 organic results:
   - Titles and URLs
   - Content type (guide, listicle, statistics, review, Q&A)
   - H2 patterns where visible
3. Return:
   - SERP overview (top 10 with titles, URLs, types)
   - Dominant content format
   - Common H2 patterns
   - Our own ranking position (if any)
   - Content gaps we could fill

### If DataForSEO is NOT available (fallback):

**Sub-agent — WebSearch Researcher (model: sonnet):**

1. WebSearch the target keyword (3-5 searches with variations)
2. Analyze the results for content types, angles, gaps
3. Return: keyword variations (without exact volumes), SERP landscape, recommended angle

### Main agent (parallel with sub-agents):

- Check existing posts in `content/posts/` for overlap
- Identify relevant SwipeStats data points for this topic

## Step 2: Content Strategy

Based on research:

| Signal                                   | Category     |
| ---------------------------------------- | ------------ |
| Data-heavy topic, statistics, benchmarks | `Statistics` |
| How-to, strategy, optimization           | `Guides`     |
| Messaging, conversation, openers         | `Texting`    |
| Hinge prompts, profile writing           | `Prompts`    |

Present: recommended category, differentiating angle, target word count, key data points.

**SAFE mode:** User confirms or adjusts.

## Step 3: Web Research

**Sub-agent — Web Researcher (model: sonnet):**

1. WebSearch for the topic (2-3 searches)
2. Focus on: recent stats, industry trends, academic research, common questions
3. Return: structured findings + 2-4 authoritative source URLs (no competitor dating sites)

## Step 4: Content Outline + All Fields

Based on all research, generate:

**A. Content outline:**

- H2/H3 structure informed by SERP analysis
- Key points per section, with data callouts
- Where to use SwipeStats data vs external research
- TLDR bullet points (3-5 key takeaways)
- FAQ questions from keyword research
- Sources to cite

**B. All frontmatter fields** (see `mdx-format.md` for schema):

| Field             | Rules                                           |
| ----------------- | ----------------------------------------------- |
| `h1`              | Max 120 chars, engaging, front-load keyword     |
| `h1Subtitle`      | Max 200 chars, supporting hook (can be empty)   |
| `metaTitle`       | Max 60 chars, SEO-optimized, compelling         |
| `metaDescription` | Max 140 chars, include keyword, end with period |
| `publishedAt`     | From CONTENT-PLAN.md if listed, else today (ISO)|
| `updatedAt`       | Same as publishedAt on creation (always include)|
| `author`          | Default "paw"                                   |
| `category`        | From Step 2                                     |
| `tags`            | 2-5 lowercase relevant tags                     |

**C. Slug:** from primary keyword, lowercase, hyphens. Check no conflict in `content/posts/`.

**Validate all character limits before presenting.**

**SAFE mode:** Present everything to user. This is the main approval checkpoint.

## Step 5: Build Internal Link Targets

```
For each file in content/posts/:
  - Parse filename for slug
  - Read frontmatter for h1 AND publishedAt
  - Only include if publishedAt <= today's date (skip future-dated posts)
  - Add to list: "h1 title -> /blog/{slug}"
```

Also include app pages: /upload, /insights, /app.

Filter out the current post being created.

## Step 6: Write Content Body

### VOICE IS THE #1 PRIORITY

The writer sub-agent must produce content that sounds like Mark Manson wrote it. If it reads like a content marketing article, it has failed.

### Sub-agent — Content Writer (model: opus)

Compose the prompt in this order — EXAMPLES FIRST, techniques second, content last:

```
SECTION 0: READ EXAMPLES FIRST (DO THIS BEFORE ANYTHING ELSE)

Read ALL 3 example posts in full using the Read tool. Do not skim. Do not summarize. Read every line.

- .claude/skills/swipestats-content-creator/references/example-tinder-likes-reset.mdx
- .claude/skills/swipestats-content-creator/references/example-tinder-more-matches.mdx
- .claude/skills/swipestats-content-creator/references/example-tinder-review.mdx

These posts ARE the voice. Your job is to write something that sounds like it belongs in this exact collection. If you put your output next to these 3 posts and a reader could tell which one the AI wrote, you have failed.

Pay attention to HOW they work, not just what they say:
- The parenthetical asides ("sure, Jan", "if you ever get one")
- The named pop culture references ("Nokia 3310", "Gandhi's flip-flops")
- The narrator personality (Paw Markus, a person with a name and dating experience)
- How hard the insults hit ("touch-starved ass", "socially inept losers")
- The funny section headers ("Actually Talk to People (Novel Concept, Right?)")
- How rhythm varies (long setups, short punches, questions, fragments)
- The fourth-wall breaks ("Congratulations, you've taken the first step towards...")

SECTION 1: VOICE RULES
{inline the full content of references/writing-guide.md here}

SECTION 2: CONTENT
Category: {category}
Today's date: {today}
Content outline: {outline}
SwipeStats data points to include: {dataPoints}
Research findings: {researchSummary}

SECTION 3: SEO (serves the voice — never sacrifice personality to hit a keyword)
Primary keyword: {targetKeyword} — use naturally in first paragraph and 2+ H2s
Secondary keywords: {secondaryKeywords} — weave into subheadings and body
Search intent: {searchIntent}

SECTION 4: INTERNAL LINKS
Available link targets:
{internalLinkTargets}
Rules: Only use URLs from the list. Anchor text 2-5 words. No duplicate anchors. Max 1 link per 200 words.

SECTION 5: OUTPUT FORMAT
- MDX/Markdown content body only (no frontmatter)
- Start with <TLDR> component if appropriate
- End with ## Sources section with markdown links
- Use ## for H2, ### for H3
- **bold** for key statistics

SECTION 6: VOICE CHECKLIST (verify before returning output)
- [ ] At least 5 parenthetical asides throughout the post
- [ ] At least 3 named pop culture / specific cultural references
- [ ] The narrator references personal experience at least twice
- [ ] At least one moment that makes the reader think "damn, that's harsh"
- [ ] Every H2 has personality (not just a keyword)
- [ ] Sentence rhythm varies (mix of short punches, questions, and longer paragraphs)
- [ ] The fourth wall is broken at least twice
- [ ] The middle sections are as funny as the intro (no energy drop-off)
- [ ] Content sounds like it belongs in the same collection as the 3 example posts
```

## Step 6b: Content Review

Before creating the MDX file, the main agent reviews the content writer's output. This is a quality gate — catch problems before they hit the file.

**Checklist:**

1. **Anti-slop scan** — Search for patterns banned in writing-guide.md:
   - Em-dashes (—), semicolons as conjunctions
   - Passive voice ("is known for", "was designed to", "can be seen as")
   - Hedging ("arguably", "it's worth noting", "interestingly")
   - Generic filler ("in today's world", "when it comes to", "at the end of the day")
   - AI tells ("straightforward", "it's important to note", "navigating")
2. **Data accuracy** — All SwipeStats statistics correctly cited. No invented numbers.
3. **Internal links** — Every `/blog/{slug}` URL must exist in the link targets list from Step 5. No invented URLs. 3-8 links total.
4. **Structure** — H2/H3 headings match the approved outline from Step 4.
5. **Keyword coverage** — Primary keyword in first paragraph and 2+ H2s. Each secondary keyword appears naturally in the body. If missing, weave in. Grammar > exact match.
6. **Sources section** — Present at end with markdown links. No competitor dating sites.
7. **MDX validity** — Components properly opened/closed (`<TLDR>...</TLDR>`). No broken markdown.
8. **Factual consistency** — Stats and claims align with research data. No contradictions.

**Action on issues:**

- **Minor** (a few slop phrases, missing keyword, formatting) → fix inline
- **Moderate** (missing data points, invalid links) → fix inline, note in report
- **Major** (widespread slop, broken structure, significant factual errors) → send back to content writer with specific feedback (one retry max, then fix what you can and note the rest)

## Step 7: Create MDX File

Combine frontmatter + content body and write to `content/posts/{slug}.mdx`. See `mdx-format.md` for the frontmatter template.

## Step 8: Verify & Report

Read the created file back and verify: frontmatter parses, all fields present, character limits met.

Present summary:

```markdown
## Created: {h1}

**File:** content/posts/{slug}.mdx
**Category:** {category} | **Author:** {author}

### SEO

- **Primary keyword:** {keyword}
- **Meta title:** {metaTitle} ({char count} chars)
- **Meta description:** {metaDescription} ({char count} chars)
- **H1:** {h1}

### Content

- **Word count:** ~{N} words
- **H2 sections:** [list]
- **Internal links:** {N} links
- **Data points used:** {N} SwipeStats statistics
- **Sources:** {N} citations

### Needs Attention

- Thumbnail: create image at public/images/blog/thumbnails/{slug}.png
- [Any other issues]
```

## Step 9: Update Content Plan

After creating and verifying the post, update `CONTENT-PLAN.md` in the repo root:

1. Read `CONTENT-PLAN.md`
2. Find the line matching the topic/keyword you just wrote
3. Change `[ ]` or `[~]` to `[x]` (drafted)
4. If the topic isn't listed, add it under the appropriate tier as `[x]`

This step is **mandatory** — do not skip it even in YOLO mode.

## Key Reminders

- **Voice above all.** If it doesn't sound like Mark Manson wrote it, rewrite it.
- **Data > opinion.** Back claims with numbers. Deliver data with personality, not as dry facts.
- **Character limits.** Validate all frontmatter fields before writing the file.
- **Slug check.** Ensure no filename conflict before writing.
- **Sources always last.** Markdown links, no competitor sites.
