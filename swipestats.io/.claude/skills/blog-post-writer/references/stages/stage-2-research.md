# Stage 2: Deep Research

## Overview

Multi-source deep-dive research. Runs as a **Sonnet sub-agent** (tool-heavy, doesn't need Opus reasoning). Collects raw source material for the planner across web, YouTube, and X.

## Sub-Agent Setup

Launch a **Task** sub-agent with `subagent_type: "general-purpose"` and `model: "sonnet"`.

Pass to the sub-agent:
- Contents of `brief.json` (explicitly include `primary_keyword`, `secondary_keywords`, `target_audience`, `search_intent`)
- Contents of `competitors/summary.md`
- Contents of `gap-analysis.json`
- Contents of `skill_config.json` (full contents, including research tool configs)
- The working directory path for saving output

**Important — DataForSEO MCP access:** Sub-agents have access to MCP tools. Tell the sub-agent to use `ToolSearch` with query `"+dataforseo youtube"` to discover available DataForSEO YouTube tools before attempting to call them. The DataForSEO MCP provides tools for YouTube search and subtitle/transcript extraction.

**Fallback chain:** If DataForSEO MCP tools are not discoverable → fall back to WebSearch with platform-specific queries (see Fallbacks section below).

## Research Agent Prompt

The sub-agent should follow this role and process:

### Identity

You are a **Deep-Dive Research Harvester**. You are a data collector, NOT a summarizer. Your job is to use every tool available to find specific, sourced facts, opinions, examples, and data. Volume of specific sourced data equals quality.

### Operating Phases

Research happens in 3 strict phases. Phase gating is enforced.

#### Phase 1: Wide Net (Web + Video only)

- Use **WebSearch** for web research (minimum 2 searches, target 3-6)
- Use **DataForSEO YouTube tools** for video research (minimum 3 searches)
- **First query rule:** First query to each tool type must be the exact primary keyword verbatim
- Cannot proceed to Phase 2 until at least 2 web + 3 video searches are completed

**YouTube search strategy (DataForSEO — 2-step process):**

**Step 1: Search for videos** using `mcp__swipestats-dataforseo__serp_youtube_organic_live_advanced`:
```json
{
  "keyword": "your search query here",
  "location_name": "United States",
  "language_code": "en"
}
```
This returns a list of YouTube videos with titles, video IDs, view counts, etc.

**Step 2: Get transcripts** using `mcp__swipestats-dataforseo__serp_youtube_video_subtitles_live_advanced`:
```json
{
  "video_id": "VIDEO_ID_FROM_STEP_1",
  "location_name": "United States",
  "language_code": "en",
  "subtitles_language": "en"
}
```
Pick the 2-3 most relevant videos from Step 1 (by title/view count) and fetch their subtitles. Not every video needs subtitles — prioritize the ones most likely to have substantive content.

**YouTube query strategy:**
- Query 1: exact primary keyword verbatim (establishes baseline)
- Query 2+: use action-oriented phrasing — e.g., "[topic] tutorial", "[topic] walkthrough", "[topic] step by step", "[topic] how to", "[topic] review". These queries target videos more likely to have English transcripts.

**Transcript quota rule:** A YouTube research pass only counts toward the minimum if at least one video's subtitles were successfully retrieved and contain useful content. If subtitles fail (video has none, or language mismatch), try another video from the same search or run a new search query.

Extract key points from the subtitle/transcript text. The transcript is where the real research value lives, not the video title or description.

#### Phase 2: Texture (X/Twitter)

- **X/Twitter:** Use **WebSearch** with `site:x.com` or `site:twitter.com` prefix:
  - Query format: `site:x.com "primary keyword"` or `site:x.com [topic] thread`
  - Target: opinions, rants, tips, and real user experiences
- Minimum 1 search for X

#### Phase 3: Consolidation

- **Stop all tool use.** No more searches.
- Fill the 9-category JSON schema from collected data
- Every fact must have a `source` field — no invented data
- If a category has zero results, leave it as an empty array (don't fabricate)

### Source Quotas

| Source | Tool | Min Searches | Min Sources in Output |
|--------|------|-------------|----------------------|
| Web | WebSearch | 2 | 2 distinct URLs |
| Video/YouTube | DataForSEO YouTube | 3 (with at least 2 transcript fetches) | 2 videos with transcript data |
| X/Twitter | WebSearch (site:x.com) | 1 | 1 x.com/twitter.com URL |

**Both the search count AND the source count must be met.** If a search returns zero useful results, run additional searches with different queries until the source minimum is met, or explicitly note the gap if exhausted.

### Status Tracking

Before each tool call, print a one-line status tracker (useful for debugging in agent transcripts):
```
Status: web(2), youtube(1/3), x(0)
```
Note: YouTube counter shows `searches with transcripts / minimum required`.

### Relevance Filters

Only include sources that relate to:
- What the topic IS (specs, features, definitions)
- Real pros and cons (not marketing fluff)
- User struggles and pain points
- Expert opinions and debates
- Practical implementation details

### Research Directions

**First query rule:** The first query to each tool/source type must be the exact primary keyword verbatim. After that, use the `suggested_queries` from `gap-analysis.json` and expand based on what you discover. The gap analysis tells you WHAT to find — use your judgment on HOW to find it.

**Fallbacks (in priority order):**
1. **DataForSEO YouTube tools** — preferred for YouTube search + subtitles
2. **WebSearch with site: prefix** — if DataForSEO is unavailable or returns errors: use `site:youtube.com`, `site:x.com`
3. **WebSearch without site: prefix** — if site-restricted searches also fail: search for "[topic] video tutorial", "[topic] twitter thread" to find content referenced on blogs and aggregator sites

Log which fallback tier was used so the main thread can assess research quality.

**Deduplication:** Before adding an entry, check if the same insight already exists in another category. Skip duplicates — record the insight once in the most relevant category.

## Output: `research.json`

Write a single JSON file with 9 category arrays. Every entry in every array must have a `source` field.

```json
{
  "detailed_specs_and_facts": [
    {
      "fact": "string",
      "context": "string",
      "source": "URL or description"
    }
  ],
  "user_struggles_and_rants": [
    {
      "struggle": "string",
      "quote_or_paraphrase": "string",
      "source": "URL"
    }
  ],
  "visual_workflow_transcripts": [
    {
      "title": "string",
      "key_points": ["string"],
      "transcript_excerpt": "string (50-200 words of the most relevant transcript section)",
      "source": "YouTube URL"
    }
  ],
  "niche_expert_insights": [
    {
      "expert": "string",
      "insight": "string",
      "source": "URL"
    }
  ],
  "product_or_tool_matrix": [
    {
      "name": "string",
      "category": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "source": "URL"
    }
  ],
  "use_cases_and_examples": [
    {
      "use_case": "string",
      "details": "string",
      "source": "URL"
    }
  ],
  "how_to_steps_and_playbooks": [
    {
      "title": "string",
      "steps": ["string"],
      "source": "URL"
    }
  ],
  "benefits_outcomes_and_pros_cons": [
    {
      "point": "string",
      "type": "pro|con|outcome",
      "evidence": "string",
      "source": "URL"
    }
  ],
  "questions_objections_and_faqs": [
    {
      "question": "string",
      "answer_summary": "string",
      "source": "URL"
    }
  ]
}
```

Note: `visual_workflow_transcripts` now includes a `transcript_excerpt` field. This is the most valuable part of video research — actual words spoken by the creator, not just a metadata summary.

### Zero-Result Safety

If a search returns nothing useful, note it and move on. Never fabricate entries to fill quotas. Empty arrays are fine.

## Stage Complete

After the sub-agent writes `research.json` to the working directory, proceed to Stage 3.

The working directory should now contain:
```
keyword-slug-date/
├── brief.json
├── competitors/
│   ├── competitor-1.md
│   ├── ...
│   └── summary.md
├── gap-analysis.json
└── research.json
```
