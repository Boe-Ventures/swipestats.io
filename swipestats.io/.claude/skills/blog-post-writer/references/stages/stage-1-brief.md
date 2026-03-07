# Stage 1: Brief & Competitor Analysis

## Overview
Gather article parameters from the user, scrape competitor content, and identify content gaps for the research phase.

## Step 1: Gather Brief

Use AskUserQuestion to collect all parameters. Ask in 1-2 rounds maximum.

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `primary_keyword` | Main SEO target keyword | "best AI tools for entrepreneurs" |
| `format` | Article format (use AskUserQuestion with options) | list, how-to, comparison, review, explainer |
| `competitor_urls` | 2-5 top-ranking URLs to analyze (minimum 2) | URLs from SERP |
| `target_audience` | Who this is for | "Solo entrepreneurs scaling with AI" |
| `word_count` | Total target word count | 3000 |
| `search_intent` | What the searcher actually wants | informational, commercial, transactional |

### Optional Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `secondary_keywords` | [] | Additional keywords to target |
| `cta_link` | null | CTA URL to include |
| `internal_links` | [] | Internal link URLs to weave in |
| `writing_samples` | **AUTO-POPULATED** (see below) | Text samples to emulate style from (raw text pasted directly, or file path. Multiple samples separated by `---`) |
| `brand_profile` | null | Brand profile override: file path to a custom brand profile markdown. If null, reads `references/brand-profile.md` from the skill directory. |
| `editorial_notes` | null | Special instructions from the user |
| `word_count_per_section` | auto-calculated | Word budget per list item/section |
| `number_of_sections` | null (auto-derived from competitors in Stage 3) | Target section count. `null` means "let the planner decide based on competitor analysis." |

### Writing Samples Auto-Population

**`writing_samples` MUST NOT be null.** If the user doesn't provide samples, auto-populate from the best existing content:

1. Check `references/examples/` for example articles (files starting with `example-`)
2. From the best-matching example (closest topic/format to the current article), extract the first 300-500 words
3. Set `writing_samples` to that text with a note: `"[Auto-extracted from examples/{filename}] {text}"`

This ensures the writer sub-agent always has concrete voice calibration material, not just abstract brand profile rules. The examples directory contains real published articles that represent the target voice. The writer MUST study these before writing.

### Output: `brief.json`

Write all parameters to `brief.json` in the working directory:

```json
{
  "primary_keyword": "string",
  "secondary_keywords": ["string"],
  "format": "string",
  "target_audience": "string",
  "search_intent": "string",
  "word_count": 3000,
  "word_count_per_section": 250,
  "number_of_sections": null,
  "competitor_urls": ["string"],
  "cta_link": "string or null",
  "internal_links": ["string"],
  "writing_samples": "string or null",
  "brand_profile": null,
  "editorial_notes": "string or null"
}
```

## Step 2: Scrape Competitors

For each URL in `competitor_urls`:

1. Use **WebFetch** to scrape the page content
2. Extract the prompt: "Extract the full article content as clean markdown. Preserve all headings (H1-H6), lists, bold/italic formatting, and any data tables. Remove navigation, sidebars, ads, and footer. Return only the article body."
3. Save to `competitors/[slug].md` — derive slug from the last meaningful URL path segment, or the domain name if the path is generic (e.g., `missiveapp`, `jotform`, `nextiva`)

**If WebFetch fails** (403, paywall, JS-rendered, empty content): note the failure, skip the URL, and continue. Minimum 2 successful scrapes are required to proceed. If fewer than 2 succeed, ask the user for alternative URLs.

After all scrapes, create `competitors/summary.md` with:
- Per-competitor: URL, title, H2 count, approximate word count, section titles list
- Cross-competitor: average H2 count, average word count, common topics, unique topics

## Step 3: Competitive Gap Analysis

Run the "Competitive Gap Spotter" analysis on the combined competitor content.

### Gap Spotter Prompt

You are a **Competitive Gap Spotter**. Analyze competitor content on a topic and generate research directions for the downstream research agent.

**Analysis process — look for:**

1. **Missing topics** — What questions would a reader still have after reading this?
2. **Thin sections** — What do they mention but barely explain?
3. **Unsupported claims** — What do they assert without data, examples, or sources?
4. **Missing perspectives** — No user stories? No expert opinions? No real-world examples?
5. **Outdated info** — Old pricing, deprecated features, stale references?
6. **Underserved angles** — Specific use cases or audience segments they ignore?

### Output: `gap-analysis.json`

```json
{
  "meta": {
    "topic": "string",
    "search_intent": "string"
  },
  "competitor_gaps": [
    {
      "gap": "specific thing that's missing or weak",
      "spotted_in": "which competitor URL or 'all'"
    }
  ],
  "research_directions": [
    {
      "what_to_find": "specific information to hunt for",
      "why": "which gap this fills"
    }
  ],
  "suggested_queries": {
    "web": ["search query"],
    "video": ["search query"],
    "reddit": ["search query"],
    "x": ["search query"]
  }
}
```

### Rules

- Copy `meta.search_intent` verbatim from `brief.json` — do not reinterpret
- Be specific. "Find user complaints about X's pricing changes" beats "find user feedback"
- Only flag real gaps you actually see — don't invent problems
- Every research direction ties back to a gap
- 3-6 queries per source type, with meaningfully different angles

## Stage Complete

After writing `brief.json`, `competitors/` folder, and `gap-analysis.json`, proceed to Stage 2.

The working directory should now contain:
```
keyword-slug-date/
├── brief.json
├── competitors/
│   ├── competitor-1.md
│   ├── competitor-2.md
│   ├── competitor-3.md
│   └── summary.md
└── gap-analysis.json
```
