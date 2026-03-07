---
name: topical-map-dfseo2
description: Generate comprehensive topical maps using DataForSEO Labs API + WebSearch competitor discovery. Use when asked to create a topical map, content strategy, topic clusters, pillar content plan, or keyword research. Uses seed queries → WebSearch via sub-agent → LLM common-sense filtering for guaranteed relevant competitors. Core_keyword synonym grouping (zero-cost), explicit gap analysis via domain_intersection, SERP feature detection, trend awareness, and pre-architecture relevance filtering.
version: 2.0.0
requires_secrets:
  - key: DATAFORSEO_USERNAME
    service: DataForSEO
    url: https://app.dataforseo.com/api-access
    description: API username (usually your email)
    required: true
    pricing: |
      Pay-as-you-go, no subscription. $50 minimum deposit.
      Labs API: ~$0.11 per request. Typical topical map run: $4-8 total.
    instructions: |
      1. Go to https://dataforseo.com and click "Register"
      2. Create an account with your email
      3. Go to https://app.dataforseo.com/api-access
      4. Your username is your registration email
    hint: "Your registration email address"
  - key: DATAFORSEO_PASSWORD
    service: DataForSEO
    url: https://app.dataforseo.com/api-access
    description: API password from DataForSEO dashboard
    required: true
    instructions: |
      1. Go to https://app.dataforseo.com/api-access
      2. Your API password is shown on that page (not your login password)
      3. Copy the API password
    hint: "Found at app.dataforseo.com/api-access (not your login password)"
---

# Topical Map Generator v2 — DataForSEO Labs (Streamlined)

Generate page-level content plans using **seed-based competitor discovery**. v2 of dfseo1 — same pipeline, fewer sub-agent steps (4 instead of 8), no redundant QA passes.

## Changes from dfseo1

- **Topic Discovery + Assignment merged** into single "Topic Mapper" Opus sub-agent (was 1 Opus + 8 Sonnet calls)
- **Semantic Cleanup folded into Hierarchy Builder** (was separate Sonnet sub-agent)
- **Expert Reviewer removed** (redundant — every check it did was already covered by upstream quality gates)
- **Result:** 4 sequential sub-agent steps instead of 8, same quality

## Output Directory (First Run Only)

On the **very first run**, check if the file `.claude/skills/topical-map-dfseo2/skill_config.json` exists.

- **If it exists:** Read it and use the stored `output_base_dir` value. Do NOT ask again.
- **If it does NOT exist:** Ask the user where they want outputs saved:

```
AskUserQuestion: "Where should I save topical map outputs?"
Options:
  - 02-areas/seo/topical-maps (Recommended)
  - Custom path (I'll specify)
```

Then save the config:
```json
{
  "output_base_dir": "02-areas/seo/topical-maps"
}
```

**All outputs go to:** `{output_base_dir}/{domain}/`

---

## Architecture

You are the **SEO strategist** — not a script executor. Scripts handle data, sub-agents handle specialized tasks, but YOU make strategic decisions.

```
MAIN THREAD (You - Strategist)
├── Python Scripts (DataForSEO API calls, data processing)
├── Sonnet Sub-Agent: Competitor Discovery (WebSearch, on-demand)
├── Sonnet Sub-Agent: Cluster Merger (synonym collapse)
├── Opus Sub-Agent: Topic Mapper (discover topics + assign clusters, single pass)
└── Opus Sub-Agent: Hierarchy Builder + Cleanup (architecture + semantic validation)
```

---

## Workflow Overview

```
Phase 0: Client Interview (research site, build context + audience alignment)
         → Read references/interview-guide.md

Phase 1: Competitive Intelligence
  ├── 1a: Seed Query Generation (30-50 queries from business context)
  ├── 1b: WebSearch Competitor Discovery (free, via Sonnet sub-agent)
  └── 1c: Audience-Aware Competitor Classification
         → Read references/workflow-details.md § Phase 1

Phase 2: Pages-First Keyword Harvesting
  ├── 2a: Fetch top pages per competitor (by organic traffic)
  ├── 2b: LLM filters relevant pages (parallel haiku sub-agents)
  │       ⚠️ SUB-AGENTS READ THE FILES, NOT MAIN THREAD
  ├── 2c: Extract keywords from kept pages only
  └── 2d: Gap analysis + Coverage Assessment
         → Read references/pages-first-harvesting.md for detailed process
         → Read references/workflow-details.md § Phase 2

Phase 2.5: Model Reality Check ← MODEL VALIDATES BEFORE ENRICHMENT
         → Read references/quality-gates.md § Phase 2.5

Phase 3: Seed Expansion (optional, catches niche terms no competitor covers)
Phase 4: Enrichment (~$2)
Phase 5: Clustering (zero API cost)
Phase 5.5: LLM Cluster Merge (collapses synonym clusters → ~60% reduction)
  ├── 5.5a: Run scripts/apply_cluster_merges.py (mode=prep)
  ├── 5.5b: Sonnet sub-agent reads list, identifies merge groups
  │         → Read subagents/cluster_merger.md
  └── 5.5c: Run scripts/apply_cluster_merges.py (mode=apply)
Phase 5.7: Cannibalization Check (zero API cost, opt-in)
         → Read references/workflow-details.md § Phases 3-5.7

Phase 6: Page Architecture (consolidated — 2 sub-agents instead of 5)
  │
  │  NOTE: Phase 6 uses clusters_merged.json (not clusters.json).
  │
  ├── 6a: Topic Mapper (single Opus call — discovers topics + assigns clusters)
  │       → Sees ALL keywords in one pass for coherent grouping
  │       → Assigns every cluster to a topic or marks off-topic
  │       → Output: topic_mapper_output.json (topics + assignments combined)
  │       → Read subagents/topic_mapper.md
  │
  ├── 6b-prep: Build Hierarchy Input (SCRIPT — mandatory)
  │       → DO NOT build this file manually
  │       → Run: scripts/build_hierarchy_input.py (with topic_mapper_file param)
  │       → Output: hierarchy_builder_input.json
  │
  └── 6b: Hierarchy Builder + Cleanup (Opus sub-agent)
          → Topics become cluster-level pages
          → Group related topics into 5-8 pillars
          → Original clusters become supporting pages
          → ALSO validates: drops non-offerings, wrong-audience, excluded topics
          → Reports cleanup decisions in cleanup_summary
          → Output: page_hierarchy.json
          → Read subagents/hierarchy_builder.md

Phase 7: Output Generation + Visual Verification
         → Read references/workflow-details.md § Phase 7
         → Read references/examples.md

Phase 8: Folder Cleanup (move working files to _working/)
         → Read references/workflow-details.md § Phase 8
```

**Key insight:** The workflow is not linear. Phase 2d (Coverage Assessment) is where you think strategically — if coverage is thin in any business area, loop back and find specialists. Phase 2.5 is where the MODEL validates that keywords match the business before spending on enrichment.

---

## Quality Gates

| Gate | Phase | Type | Catches |
|------|-------|------|---------|
| 1 | Interview (0c) | Human | Wrong assumptions about audience/topics |
| 2 | Competitor Classification (1c) | LLM | Wrong-audience competitors |
| 3 | Keyword Filtering (2) | Pattern | Wrong-audience keywords |
| 4 | **Model Reality Check (2.5)** | **LLM** | **Keyword-business mismatch, contamination, wrong buyer** |
| 5 | **Hierarchy Builder (6b)** | **LLM** | **Semantic issues, wrong-audience pages, non-offerings, core topic gaps** |
| 6 | Visual Verification (7) | Agent | Structural issues, obvious errors |

---

## Size Presets

| Parameter | Small | Medium | Large |
|-----------|-------|--------|-------|
| Minimum pages | 30+ | 60+ | 150+ |
| `max_competitors` | 5 | 10 | 15 |
| `pages_per_competitor` | 50 | 100 | 200 |
| `keywords_per_competitor` | 300 | 600 | 1000 |
| `max_keywords` | 1500 | 3000 | 5000 |
| `top_n_for_gap` | 2 | 3 | 5 |

**Note:** Page counts are minimums, not ceilings. If discovery yields more relevant pages, keep them all.

---

## Script Reference

| Script | Phase | Purpose | API Cost |
|--------|-------|---------|----------|
| `extract_existing.py` | 0 | Site analysis (sitemap + rankings with fallback chain) | ~$0.05 |
| `fetch_top_pages.py` | 2a | Get top pages by traffic per competitor | ~$0.11/competitor |
| `harvest_keywords.py` | 2c | Keyword portfolios + gap analysis (supports URL filtering) | ~$3 |
| `seed_expand.py` | 3 | Expand seed queries for niche/emerging terms | ~$2 |
| `expand_keywords.py` | 3 | Fill topical holes (conditional) | ~$2 |
| `enrich_keywords.py` | 4 | Single-call enrichment | ~$2 |
| `cluster_keywords.py` | 5 | core_keyword grouping | $0 |
| `apply_cluster_merges.py` | 5.5 | Prep compact list (mode=prep) + apply LLM merge decisions (mode=apply) | $0 |
| `check_cannibalization.py` | 5.7 | Cross-ref clusters vs existing pages | $0 |
| `build_hierarchy_input.py` | 6b-prep | Build hierarchy input (accepts topic_mapper_file) | $0 |
| `generate_outputs.py` | 7 | Deliverable files | $0 |
| `cleanup_folder.py` | 8 | Move working files to `_working/` | $0 |

---

## Sub-Agent Reference

| Sub-Agent | Model | Phase | Purpose |
|-----------|-------|-------|---------|
| Competitor Discovery | Sonnet | 1b | WebSearch queries → tally domain frequency → filter |
| Page Filtering | Haiku | 2b | Filter competitor pages for relevance (parallel, per-competitor) |
| `cluster_merger.md` | Sonnet | 5.5 | Identify synonym/rephrase clusters to merge (~65% reduction) |
| `topic_mapper.md` | **Opus** | 6a | Single-pass: discover 30-50 topics + assign all clusters |
| `hierarchy_builder.md` | **Opus** | 6b | Topics → 3-tier hierarchy + semantic cleanup in one pass |

---

## Reference Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `references/interview-guide.md` | Phase 0 interview procedure, questions, context object | Start of skill |
| `references/workflow-details.md` | Phases 1-7 execution details, script commands | Each phase |
| `references/quality-gates.md` | Phase 2.5 + 6b detailed procedures | Before enrichment, after architect |
| `references/pages-first-harvesting.md` | Pages-first filtering process | Phase 2 |
| `references/strategy-templates.md` | Site-type templates (SaaS, Content, Local, E-commerce, Agency, Course) | Phase 6 |
| `references/examples.md` | Example output formats for all deliverables | Phase 7 |

---

## Steering Principles

1. **Think like an SEO, not a script runner** — At every checkpoint, ask: "Is this data sufficient to build a comprehensive map? What's missing?"

2. **Coverage gaps trigger discovery loops** — If a core business topic has thin keyword coverage, don't proceed. Go find specialists in that niche and harvest their keywords.

3. **Review data between phases** — Don't blindly chain scripts. Look at results and assess quality.

4. **Phase 2.5 is the critical gate** — Before spending on enrichment, validate that keywords match the business. Make the PROCEED/FILTER/RE-HARVEST decision yourself — only escalate to user for genuinely strategic questions.

5. **Phase 3 is conditional** — Only expand if topics are still thin after Phase 2c's adaptive discovery

6. **User confirms competitors** — Don't proceed past Phase 1 without approval

7. **Apply critical thinking** — Common-sense filter in Step 1c is essential. Every competitor must pass the "is this actually a competitor?" test.

8. **Show progress** — Report stats after each phase so the user stays informed

9. **Seed quality matters** — The entire pipeline depends on good seed queries. Invest time in Step 1a to generate diverse, representative queries.

10. **The goal is a comprehensive map, not completing phases** — If you reach Phase 6 and realize a topic area is weak, it's okay to loop back to Phase 2c and fill the gap before continuing.

11. **Model decides, user confirms strategy** — For quality checks (Phase 2.5, 6b), the model makes decisions autonomously. Only ask the user when there's a genuine strategic choice.
