# How to Use: Topical Map Generator (DataForSEO)

## Quick Start

Trigger the skill by saying any of:
- "Create a topical map for [domain]"
- "Build a content strategy for my site"
- "Generate topic clusters for [niche]"

The skill will guide you through the full process interactively.

## What It Does

Generates a comprehensive topical map (content plan) for any website. It discovers what competitors rank for, harvests their keywords, clusters them into topics, and builds a page-level content hierarchy.

**Output:** A complete content plan with pillars, topic clusters, and individual page recommendations — including search volume, keyword difficulty, and search intent for every page.

## Workflow Phases

### Phase 0: Client Interview
Claude researches your site and asks about your business, audience, and goals. This shapes every decision downstream.

### Phase 1: Competitive Intelligence
- Generates 30-50 seed search queries from your business context
- Uses WebSearch to discover competitors (free)
- You approve the competitor list before proceeding

### Phase 2: Keyword Harvesting
- Fetches top pages from each competitor by organic traffic
- Filters pages for relevance (removes irrelevant content)
- Extracts keywords from relevant pages
- Runs gap analysis to find topics competitors cover that you don't

### Phase 3: Seed Expansion (Optional)
Only runs if topic coverage is thin. Catches niche terms no competitor covers.

### Phase 4: Enrichment
Enriches all keywords with volume, difficulty, CPC, and intent data (~$2).

### Phase 5: Clustering
Groups keywords by core_keyword (zero API cost). Then an LLM merges synonym clusters (~60% reduction).

### Phase 6: Page Architecture
Two Opus sub-agents build the final hierarchy:
1. **Topic Mapper** — discovers 30-50 topics and assigns clusters
2. **Hierarchy Builder** — groups topics into 5-8 pillars, creates 3-tier page structure

### Phase 7: Output Generation
Generates deliverable files: CSV keyword mapping, page plan, topical map diagram.

## Example Workflows

### Standard Run
```
Create a topical map for example.com
```
Claude will ask about your business, discover competitors, and build the full map.

### With Size Preference
```
Build a large topical map for example.com — we want comprehensive coverage
```
Uses the "large" preset: up to 15 competitors, 200 pages each, 5000 keywords.

### For a Specific Niche
```
Generate topic clusters for a SaaS project management tool at example.com
```
Claude adapts competitor discovery and filtering to the SaaS vertical.

## Cost Estimates

| Size | Competitors | Est. API Cost |
|------|-------------|---------------|
| Small | 5 | ~$4 |
| Medium | 10 | ~$6 |
| Large | 15 | ~$8 |

Costs are for DataForSEO API calls only. WebSearch discovery is free.

## Tips

- **Be specific in the interview** — the more Claude knows about your business, offerings, and audience, the better the competitor filtering and keyword relevance
- **Review the competitor list carefully** — this is the most impactful decision in the pipeline
- **Don't rush through Phase 2.5** — the model reality check prevents wasting money enriching irrelevant keywords
- **Outputs save to** `{configured_dir}/{domain}/` — set on first run

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "DATAFORSEO_USERNAME not found" | Create a `.env` file with your credentials |
| "API returned 402" | Add funds to your DataForSEO account ($50 minimum) |
| Too many irrelevant keywords | Tighten the competitor list or add exclusion patterns |
| Missing a topic area | Ask Claude to loop back and find specialist competitors |
