# Workflow Details — Phases 1-7

Detailed execution instructions for each phase. Read the relevant section when you reach that phase.

---

## Phase 1: Competitive Intelligence

### Step 1a: Generate Seed Queries

Using the interview data (business description, services, target audience, exclusions) + extracted topics from Phase 0:

Generate **30-50 diverse seed queries** a target customer would search. Mix:
- **Service queries:** "email marketing software", "email automation platform"
- **Problem queries:** "how to increase email open rates", "reduce email bounce rate"
- **Comparison queries:** "best email marketing tools", "mailchimp alternatives"
- **Informational queries:** "what is email marketing automation", "email segmentation strategies"
- **Audience-specific:** "email marketing for small business", "b2b email marketing tools"

Present the seed list to the user for review. Add/remove based on feedback.

### Step 1b: WebSearch Competitor Discovery

Delegate to a **Sonnet sub-agent** that runs 12-15 WebSearch queries from the seed list and tallies which competitor domains appear most frequently.

Use `max_competitors` from size preset (small=5, medium=10, large=15).

**Sub-agent prompt template:**

```
You are discovering competitors for {domain}, a {business_description} in {location}.

Run 12-15 WebSearch queries from this seed list (use the target language: {language}):
{select 12-15 diverse queries from the seed list}

For each search result, extract the domain from the URL. Ignore:
- Aggregators/directories: houzz.fr, pagesjaunes.fr, starofservice.com, archidvisor.com, g2.com, clutch.co, yelp.*, etc.
- Media/magazines: generic editorial sites not competing for the same services
- Government/education sites
- {domain} itself (that's the target)
- Any domain that is clearly NOT a {business type} competitor

For each REAL competitor domain, tally how many of the searches they appeared in, and note their best position seen.

Return a JSON object:
{
  "searches_run": 15,
  "competitors": [
    {"domain": "example.com", "appearances": 8, "best_position": 1, "description": "Brief description"},
    ...
  ],
  "dropped": ["houzz.fr (aggregator)", ...]
}

Sort competitors by appearances (highest first). Include ALL real competitor domains found.
```

**Why WebSearch instead of DataForSEO SERP scraping:**
- Free (no API cost for this phase)
- Better results for local/non-English markets
- Sub-agent handles the filtering inline

### Step 1c: Audience-Aware Competitor Classification

For each discovered competitor, classify on TWO axes:

| Site Type Match | Audience Match | Action |
|-----------------|----------------|--------|
| Yes | Yes | **Primary** — full harvest |
| Yes | Partial | **Secondary** — harvest with caution |
| No | Yes | **Content** — informational keywords only |
| No | No | **Exclude** — will pollute data |

**LLM analysis for each competitor:**
> "Analyzing {domain}:
> 1. Site type: Same as {target_site} (e-commerce/SaaS/service/content)?
> 2. Audience: Targets {target_audience} or someone else?
> If different audience, who do they serve?"

**Keep:** Direct competitors (same services, same audience)
**Drop:** Sites targeting different audiences (teachers vs parents, enterprise vs SMB), tool vendors, aggregators, media sites, unrelated businesses

### Present to User

Show competitor table with audience classification:

```
**Competitors Found (from {N} web searches):**

| # | Competitor | Appearances | Type Match | Audience Match | Classification |
|---|---|---|---|---|---|
| 1 | competitor1.com | 10/15 | Yes | Yes | **Primary** |
| 2 | competitor2.com | 7/15 | Yes | Partial | Secondary |
| 3 | contentsite.com | 5/15 | No | Yes | Content only |
| ... | | | | | |

✗ Excluded (wrong audience): teachersite.com (targets educators, not parents)
✗ Dropped: aggregator.com (directory), mediasite.com (editorial)

Shall I proceed with these competitors?
```

**User confirms before proceeding.**

---

## Phase 2: Pages-First Keyword Harvesting

**Why pages-first?** Multi-product competitors (e.g., page builders with some discount content) contaminate keyword lists when you harvest ALL their keywords. Filtering at the page level BEFORE keyword extraction prevents drift.

For detailed process: Read `references/pages-first-harvesting.md`

### Size Presets

| Parameter | Small | Medium | Large |
|-----------|-------|--------|-------|
| `pages_per_competitor` | 50 | 100 | 200 |
| `keywords_per_page` | 30 | 50 | 100 |
| `max_keywords` | 1500 | 3000 | 5000 |
| `top_n_for_gap` | 2 | 3 | 5 |

### Step 2a: Fetch Top Pages Per Competitor

For each confirmed competitor, get their top pages by organic traffic:

```bash
echo '{
    "domain": "competitor.com",
    "location": "United States",
    "language": "English",
    "limit": 100,
    "output_dir": "./output"
}' | python3 scripts/fetch_top_pages.py
```

**Output:** `{competitor}_pages.json` with URLs, ETV, and auto-skip annotations.

The script auto-skips obvious off-topic pages (careers, legal, login, etc.).

### Step 2b: LLM Filters Relevant Pages

Launch **parallel haiku sub-agents** to filter each competitor's pages. **CRITICAL: The sub-agent reads the file, not the main thread.** This prevents competitor page data from filling the main context window.

```
# Launch in parallel for all competitors at once
Task(model: haiku, description: "Filter {competitor} pages",
  prompt: """
  You're filtering competitor pages for a topical map.

  TARGET BUSINESS: {business_description}
  RELEVANT TOPICS: {core_topics_from_interview}
  NON-OFFERINGS: {non_offerings from interview}

  Competitor: {competitor_domain}

  STEP 1: Read the competitor's pages file:
  {output_dir}/{competitor}_pages.json

  STEP 2: For each page in the "kept_pages" array, classify as KEEP or SKIP:
  - KEEP: Topic is relevant to target business
  - SKIP: Off-topic (different product, different audience, generic content)

  STEP 3: Return ONLY this JSON (do not repeat the full page data):
  {
    "competitor": "{competitor_domain}",
    "total_pages": <count>,
    "keep": [{"url": "/blog/discount-guide", "reason": "Discount strategies"}],
    "skip": [{"url": "/seo-tools", "reason": "SEO tools not relevant"}],
    "keep_count": <count>,
    "skip_count": <count>
  }
  """)
```

**Why sub-agents read the files:**
- Each competitor file can be 50-200KB of JSON
- Main thread only receives the filtered keep/skip lists (1-2KB)
- Context window stays clean for strategic decisions

Launch all competitor filters in parallel (single message with multiple Task calls) for speed.

**Report filtering results to user:**
```
**Page Filtering Complete:**

| Competitor | Total | Kept | Skipped | Keep Rate |
|------------|-------|------|---------|-----------|
| bogos.io | 45 | 42 | 3 | 93% |
| pagefly.io | 50 | 12 | 38 | 24% |

Pages skipped:
- pagefly.io: 38 pages (SEO guides, theme comparisons, landing page templates)

Proceeding to extract keywords from 54 relevant pages...
```

### Step 2c: Extract Keywords from Kept Pages

Use `harvest_keywords.py` with the `page_urls` filter:

```bash
echo '{
    "target_domain": "example.com",
    "competitors": [
        {"domain": "comp1.com", "intersections": 450},
        {"domain": "comp2.com", "intersections": 300}
    ],
    "page_urls": {
        "comp1.com": ["/blog/discount-guide", "/bogo-offers"],
        "comp2.com": ["/pricing-strategies", "/flash-sale-tips"]
    },
    "location": "United States",
    "language": "English",
    "keywords_per_competitor": 600,
    "max_keywords": 3000,
    "top_n_for_gap": 3,
    "output_dir": "./output"
}' | python3 scripts/harvest_keywords.py
```

**Key:** The `page_urls` dict restricts keyword extraction to only those URLs that passed the relevance filter.

This runs:
- `ranked_keywords` on each competitor, filtered to allowed pages
- `domain_intersection` on top N → gap analysis (what they rank for, you don't)
- Deduplicates, applies exclusion filters, flags gap keywords

### Step 2d: Seed Expansion (Optional)

If topics are thin after page-filtered harvesting, expand with seed queries:

```bash
echo '{
    "seed_keywords": ["email marketing software", "email automation", ...],
    "existing_keywords_file": "./output/raw_keywords.json",
    "location": "United States",
    "language": "English",
    "depth": 2,
    "output_dir": "./output"
}' | python3 scripts/seed_expand.py
```

### Report to User

```
**Keyword Discovery Complete:**
- Pages analyzed: 89 (from 5 competitors)
- Keywords harvested: X (filtered to relevant pages)
- Gap keywords: Z (competitors rank, you don't)
- Total unique keywords: N

Top topics emerging: discounts, BOGO, bundles, flash sales, pricing strategies
```

---

## Phase 2e: Coverage Assessment (Strategic Checkpoint)

**Stop and think like an SEO.** Before proceeding, assess whether you have sufficient keyword coverage.

### What to Evaluate

1. **Topic coverage vs business offerings:**
   - For each core topic/service from the interview, how many keywords do you have?
   - Are any major business areas barely represented (<20 keywords)?
   - Example: If it's a plumbing company and you have 200 drain keywords but only 15 water heater keywords, that's a gap.

2. **Volume distribution:**
   - Is one topic area dominating (>60% of total volume) while others are weak?
   - Are there obvious services with near-zero coverage?

3. **Competitor coverage:**
   - Did you harvest from specialists in each major area, or just generalists?
   - Example: For an email marketing SaaS, did you get keywords from a deliverability specialist, not just broad ESPs?

### When Coverage is Insufficient

If you identify gaps, **don't proceed to Phase 3** — launch an Adaptive Discovery Loop:

```
Gap identified: [topic area] has thin coverage

1. Generate 5-8 targeted seed queries for this specific topic
   - e.g., "email deliverability tools", "improve inbox placement", "email warmup service"

2. Launch Sonnet sub-agent for WebSearch competitor discovery:
   - Run those 5-8 searches
   - Find specialists who rank for these specific topics
   - Filter out generalists you already have

3. For 2-3 new specialists:
   - fetch_top_pages.py → get their top pages
   - LLM filter for relevance
   - harvest_keywords.py with page_urls filter

4. Merge with existing keywords

5. Re-assess: Is this area now adequately covered?
```

**Repeat for each thin topic area.** This is the core innovation — you're not following a rigid pipeline, you're actively filling gaps.

### Example Assessment

```
**Coverage Assessment:**

Core topics from interview: email marketing, automation, deliverability, newsletters, analytics

Current keyword distribution:
- Email marketing: 450 keywords (38%) ✓ Good
- Automation: 380 keywords (32%) ✓ Good
- Deliverability: 45 keywords (4%) ⚠️ THIN
- Newsletters: 210 keywords (18%) ✓ OK
- Analytics: 95 keywords (8%) ⚠️ Thin

Gaps identified:
1. Deliverability — need specialists. Launching targeted discovery...
2. Analytics — could use 1-2 more sources

[Launching Adaptive Discovery Loop for deliverability...]
```

### When to Proceed

Proceed to Phase 2.5 when:
- All core business topics have reasonable coverage (50+ keywords each, or proportional to business emphasis)
- No obvious topic holes remain
- You've harvested from specialists in each major area, not just generalists

---

## Phase 3: Keyword Expansion (Conditional — Size-Gated)

**Size gate:**
- **Small:** Skip this phase entirely.
- **Medium:** Run 1 round of `related_keywords` (depth=2) on the most obvious gaps only.
- **Large:** Full expansion — `related_keywords` (depth=3) + `keyword_ideas`.

**Only run if you identify topical holes after Phase 2/2b.** Review the topics — are there obvious gaps in coverage?

```bash
echo '{
    "seed_topics": ["email deliverability", "email personalization"],
    "existing_keywords_file": "./output/raw_keywords.json",
    "location": "United States",
    "language": "English",
    "depth": 2,
    "output_dir": "./output"
}' | python3 scripts/expand_keywords.py
```

This runs:
- `related_keywords` with configurable depth on specified topics
- `keyword_ideas` with top seeds for broad expansion (large only)
- Merges with Phase 2 keywords, deduplicates

---

## Phase 4: Enrichment

```bash
echo '{
    "keywords_file": "./output/harvested_keywords.json",
    "location": "United States",
    "language": "English",
    "min_volume": 0,
    "output_dir": "./output"
}' | python3 scripts/enrich_keywords.py
```

Single `keyword_overview` endpoint in batches of 700. Returns everything: volume, CPC, difficulty, intent, SERP features, `core_keyword`, monthly trends, categories.

**Important:** This script always overwrites `enriched_keywords.json` in `output_dir`. If you have keywords from multiple sources (Phase 2 raw + Phase 2b seed expansion), **merge them into one file first** then run enrichment once. Do NOT run enrichment separately on each file — the second run will overwrite the first.

### Report to User

```
**Enrichment Complete:**
- Enriched: 2,483 keywords
- Total search volume: 892,000
- Avg difficulty: 42.3
- Intent: 52% informational, 28% commercial, 15% transactional, 5% navigational
- Featured snippet opportunities: 67
- Gap keywords enriched: 340
- Trends: 45 rising, 2,100 stable, 338 declining
```

---

## Phase 5: Clustering

```bash
echo '{
    "keywords_file": "./output/enriched_keywords.json",
    "jaccard_threshold": 0.7,
    "output_dir": "./output"
}' | python3 scripts/cluster_keywords.py
```

Zero API calls. Groups by `core_keyword` (union-find), Jaccard fallback for ungrouped.

### Report to User

```
**Clustering Complete:**
- core_keyword groups: 234
- Similarity groups: 45
- Singletons: 89
- Total clusters: 368
- Average cluster size: 6.7 keywords
```

---

## Phase 5.5: LLM Cluster Merge

After Phase 5 clustering, many clusters are semantic synonyms that should share a page (e.g., "stinky shower drain" and "shower drain smells"). This phase collapses them using a lightweight LLM pass on just primary keywords (~18K tokens for 2000+ clusters), then a script applies the merges mechanically.

**Typical result:** ~60-65% cluster reduction (e.g., 2226 → 800).

### Step 5.5a: Generate Compact List (Script)

```bash
echo '{
    "clusters_file": "./output/clusters.json",
    "mode": "prep",
    "output_dir": "./output"
}' | python3 scripts/apply_cluster_merges.py
```

**Output:** `cluster_list_for_merge.txt` — one line per cluster in format `c_1: primary keyword`. This is the compact input for the LLM.

### Step 5.5b: LLM Identifies Merge Groups (Sonnet Sub-Agent)

Spawn a **Sonnet sub-agent** using `subagents/cluster_merger.md`.

**Input:** The `cluster_list_for_merge.txt` file + business context
**Output:** `merge_groups.json` with keep/absorb decisions

The sub-agent reads the compact list and identifies groups of clusters that represent the same search intent (synonyms, singular/plural, question variants, cost/price variants). It preserves genuine topic distinctions (different services, locations, sub-topics).

**Important:** The sub-agent writes the output file directly. Tell it the exact output path.

### Step 5.5c: Apply Merges (Script)

```bash
echo '{
    "clusters_file": "./output/clusters.json",
    "merges_file": "./output/merge_groups.json",
    "mode": "apply",
    "output_dir": "./output"
}' | python3 scripts/apply_cluster_merges.py
```

**Output:** `clusters_merged.json` — absorbed clusters are folded into their keep cluster (volumes summed, keywords combined, flags OR'd).

**All downstream phases (5.7, 6, 7) use `clusters_merged.json`, not `clusters.json`.**

### Report to User

```
**Cluster Merge Complete:**
- Clusters before: 2,226
- Merge groups found: 287
- Clusters absorbed: 1,428
- Clusters after: 798 (64% reduction)

Examples:
- "running toilet" variants: 10 clusters → 1
- "shower drain smells" variants: 6 clusters → 1
- "plumber near me" variants: 8 clusters → 1

Proceeding to enrichment/architecture with 798 clusters...
```

---

## Phase 5.7: Cannibalization Check (Opt-In)

**Skip if:** `check_cannibalization` is false (new sites with no existing pages).

Cross-references clusters against existing page rankings. Zero API cost — pure local computation.

```bash
echo '{
    "clusters_file": "./output/clusters_merged.json",
    "existing_pages_file": "./output/existing_pages.json",
    "output_dir": "./output"
}' | python3 scripts/check_cannibalization.py
```

### Report to User

```
**Cannibalization Check Complete:**
- 234 clusters checked against 45 existing pages
- ✅ 198 new opportunities (no existing page overlap)
- 🔄 28 strengthen existing (assign keywords to existing page)
- ⚠️ 8 cannibalization risks (potential conflict with existing page)

Risks to review:
- "email marketing tips" → conflicts with /blog/email-marketing-guide (pos #8)
- "automation workflows" → conflicts with /features/automation (pos #12)
...

Shall I proceed? The architect will respect these annotations.
```

If cannibalization was checked, Phase 6 uses `clusters_annotated.json` instead of `clusters_merged.json`.

---

## Phase 6: Page Architecture (Multi-Agent)

Phase 6 builds proper 3-tier hierarchies (Pillar → Cluster → Supporting) with semantic cleanup in a streamlined two-step process.

### Step 6a: Topic Mapping (Single Opus Call)

Spawn an **Opus sub-agent** using `subagents/topic_mapper.md`. It discovers topics AND assigns clusters in one pass.

**Input:** All clusters from `clusters_annotated.json` (or `clusters_merged.json`) + business context
**Output:** `topic_mapper_output.json` with:
- `topics[]` — 30-50 semantic topics discovered
- `assignments[]` — every cluster assigned to a topic or marked off-topic

**Why single-pass?** Topic discovery MUST see all keywords at once. Batching defeats the purpose because batch 1 can't see batch 8's keywords, leading to inconsistent/duplicate topics. The topic mapper handles both discovery and assignment in one Opus call — no batching needed.

### Step 6b-prep: Build Hierarchy Input (Script)

**IMPORTANT:** Use the script to build hierarchy_builder_input.json. Do NOT build this file manually — the cluster_id lookups are error-prone.

```bash
echo '{
    "topic_mapper_file": "topic_mapper_output.json",
    "clusters_file": "clusters_merged.json",
    "business_context": {
        "description": "Seattle plumbing company...",
        "target_audience": "Homeowners in Seattle metro",
        "primary_goal": "lead_generation",
        "offerings": ["drain cleaning", "water heater repair", ...],
        "non_offerings": ["HVAC", "electrical", ...]
    },
    "site_type": "local_service",
    "map_size": "medium",
    "output_dir": "./"
}' | python3 scripts/build_hierarchy_input.py
```

**Output:** `hierarchy_builder_input.json` — correctly structured input with cluster data looked up by `cluster_id`, not array index.

### Step 6b: Hierarchy Builder + Semantic Cleanup (Opus Call)

Spawn an **Opus sub-agent** using `subagents/hierarchy_builder.md`.

**Input:** The `hierarchy_builder_input.json` file from Step 6b-prep

**Output:** `page_hierarchy.json` with:
- `pages[]` — pillar, cluster, and supporting pages with parent relationships
- `keyword_mapping[]` — every keyword → page assignment
- `hierarchy_summary` — pillar breakdown with cluster/supporting counts
- `cleanup_applied` — wrong-audience, non-offerings, and misplacements removed

The hierarchy builder:
1. Groups topics into 5-8 pillar themes
2. Topics become cluster-level pages under pillars
3. Original clusters become supporting pages under their topic's cluster
4. **Applies semantic cleanup** — removes wrong-audience content, non-offerings, and fixes misplacements
5. Calculates priority scores using business formula

---

## Phase 7: Output Generation + Visual Verification

```bash
echo '{
    "page_plan": <pages from architect>,
    "keyword_mapping": <keyword_mapping from architect>,
    "output_dir": "./output",
    "domain": "example.com",
    "site_type": "business",
    "business_context": "SaaS email marketing platform",
    "primary_goal": "lead_generation",
    "competitors_used": ["mailchimp.com", "convertkit.com", ...]
}' | python3 scripts/generate_outputs.py
```

Generates:
1. **strategy.md** — Phased growth plan with quick wins, gap opportunities, phase breakdown
2. **page-plan.csv** — One row per page: keyword, type, format, volume, difficulty, priority, trend, gap, snippet
3. **keyword-mapping.csv** — Every keyword → page assignment with intent, CPC, gap flag, SERP features
4. **topical-map-diagram.md** — Mermaid visualization of page hierarchy
5. **topical-map.html** — Interactive D3.js tree visualization (collapsible, searchable, with tooltips showing gap/snippet/trend badges)

### Visual Verification

After `generate_outputs.py` completes:

1. **Open the HTML map:**
   ```bash
   open "02-areas/seo/topical-maps/{domain}/topical-map.html"
   ```

2. **Visually verify:**
   - Tree structure looks clean (no obvious orphans)
   - Pillars aren't overloaded (no pillar with 20+ children)
   - Core topics have visible branches
   - No obviously wrong-audience content visible

3. **If issues found during visual check:**
   - Loop back to Phase 6b for additional cleanup
   - Or flag specific issues in the report

### Present to User

After visual verification passes, present the final results:

```
**Topical Map Complete:**

1. **strategy.md** — 3-phase growth plan
2. **page-plan.csv** — 156 pages, importable to Google Sheets
3. **keyword-mapping.csv** — 2,102 keywords assigned
4. **topical-map.html** — Interactive visual hierarchy (opened in browser)

Summary:
- 156 total pages (8 pillars, 42 clusters, 106 supporting)
- Targeting 2,102 keywords with 892,000 combined volume
- 45 gap pages (competitors rank, you don't)
- 23 featured snippet opportunities
- 34 quick wins (low difficulty, high volume)

Files saved to: 02-areas/seo/topical-maps/{domain}/

Would you like me to walk through the strategy?
```

---

## Phase 8: Folder Cleanup

After presenting results to the user, clean up the output folder so only deliverables remain at the top level.

```bash
echo '{"output_dir": "{output_base_dir}/{domain}"}' | python3 scripts/cleanup_folder.py
```

**Deliverables kept in main folder:**
- `strategy.md`
- `page-plan.csv`
- `keyword-mapping.csv`
- `topical-map-diagram.md`
- `topical-map.html`
- `topical-map.json`

**Everything else** (intermediate JSON files, raw keyword data, config, competitor pages, clusters, hierarchy input, etc.) is moved to `_working/` subfolder.

This is automatic — no user confirmation needed. Just run the script after Phase 7 completes and report how many files were moved.
