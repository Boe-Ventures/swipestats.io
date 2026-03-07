# Pages-First Harvesting Strategy

## Why Pages First?

The original approach harvested ALL keywords from competitors, then filtered late:

```
Competitors → Get ALL keywords (3000+) → Enrich ALL → Filter at end (delete 60%)
```

**Problems:**
- Wasted API cost enriching irrelevant keywords
- Off-topic content from multi-product competitors (page builders ranking for SEO, themes, etc.)
- Late filtering means contamination spreads through the pipeline

**The fix:** Filter at the page level BEFORE extracting keywords.

```
Competitors → Get top pages by traffic → Filter relevant pages → Get keywords for those pages only
```

**Benefits:**
- Pages are human-curated content groupings — easier to judge relevance than individual keywords
- Filter happens early, before API spend on enrichment
- Multi-product competitors contribute only their relevant content

---

## DataForSEO Endpoint

**`/dataforseo_labs/google/relevant_pages/live`**

Returns pages for a domain with:
- URL path
- Organic ETV (estimated traffic value)
- Keyword count
- Ranking distribution (positions 1-10, 11-20, etc.)

Can be sorted by `organic_etv` descending to get top traffic pages.

---

## Phase 2 Workflow (Pages-First)

### Step 2a: Fetch Top Pages Per Competitor

For each competitor, get their top 50-100 pages by organic traffic.

```bash
echo '{
    "domain": "competitor.com",
    "location": "United States",
    "language": "English",
    "limit": 100,
    "order_by": "organic_etv,desc",
    "output_dir": "./output"
}' | python3 scripts/fetch_top_pages.py
```

**Output:** `{competitor}_pages.json` with page URLs and traffic estimates.

### Step 2b: Filter Pages by Relevance (LLM)

Launch **parallel haiku sub-agents** to filter each competitor's pages. **CRITICAL: The sub-agent reads the file, not the main thread.** This preserves the main context window.

```
# Launch in parallel for all competitors
Task(model: haiku, description: "Filter {competitor} pages for relevance",
  prompt: """
  You're filtering competitor pages for a topical map.

  TARGET BUSINESS: {business_description}
  RELEVANT TOPICS: {core_topics_from_interview}

  Competitor: {competitor_domain}

  STEP 1: Read the pages file at: {output_dir}/{competitor}_pages.json

  STEP 2: For each page in "kept_pages", classify as KEEP or SKIP:
  - KEEP: Page topic is relevant to target business
  - SKIP: Off-topic (different product, different audience, generic content)

  STEP 3: Return ONLY this compact JSON:
  {
    "competitor": "{competitor_domain}",
    "keep": [{"url": "/blog/discount-strategies", "reason": "Discount content"}],
    "skip": [{"url": "/seo-tools", "reason": "SEO tools not relevant"}],
    "keep_count": <N>,
    "skip_count": <N>
  }
  """)
```

**Why sub-agents read files:** Each competitor's JSON can be 50-200KB. If the main thread reads 10 competitor files, that's 0.5-2MB of context consumed before strategic work begins. Sub-agents reading the files means main thread only sees the compact keep/skip results.

**Why haiku:** Cheap, fast, good enough for page-level relevance judgment.

**Why per-competitor in parallel:** Fast execution + catches the "adjacent competitor" problem — pagefly.io is a page builder with some discount content. We keep `/blog/shopify-bogo-guide` but skip `/landing-page-templates`.

### Step 2c: Get Keywords for Kept Pages Only

Use `ranked_keywords` with URL filter to get keywords only for the relevant pages:

```bash
echo '{
    "domain": "competitor.com",
    "page_urls": ["/blog/discount-strategies", "/bogo-guide", ...],
    "location": "United States",
    "language": "English",
    "keywords_per_page": 50,
    "output_dir": "./output"
}' | python3 scripts/harvest_keywords.py
```

The script now accepts `page_urls` parameter to filter keywords by URL.

### Step 2d: Gap Analysis (on filtered set)

Run `domain_intersection` as before, but the keyword pool is now much cleaner.

---

## Filtering Heuristics

### Automatic SKIP signals (no LLM needed)

These URL patterns are almost always off-topic for any niche:

```python
AUTO_SKIP_PATTERNS = [
    r'/careers?/', r'/jobs?/', r'/hiring/',           # Careers
    r'/about(-us)?/?$', r'/team/?$', r'/contact/?$', # Company pages
    r'/privacy', r'/terms', r'/legal',               # Legal
    r'/login', r'/signup', r'/dashboard',            # App pages
    r'/press/', r'/news/.*-raises-',                 # PR/funding news
]
```

### Domain-specific KEEP/SKIP lists

For common competitor types, pre-define what to keep:

**Shopify app competitors:**
```python
KEEP_PATTERNS = [
    r'/blog/.*discount', r'/blog/.*promo', r'/blog/.*bogo',
    r'/blog/.*bundle', r'/blog/.*pricing', r'/blog/.*aov',
    r'/guide/', r'/how-to/', r'/tutorial/',
]
SKIP_PATTERNS = [
    r'/blog/.*seo', r'/blog/.*email-marketing',
    r'/themes/', r'/templates/', r'/design/',
]
```

### LLM judgment for ambiguous cases

The haiku sub-agent handles pages that don't match patterns — it reads the URL and makes a judgment call.

---

## Size Presets (Updated)

| Parameter | Small | Medium | Large |
|-----------|-------|--------|-------|
| `pages_per_competitor` | 50 | 100 | 200 |
| `keywords_per_page` | 30 | 50 | 100 |
| `max_keywords` | 1500 | 3000 | 5000 |

**Note:** With pages-first filtering, we typically keep 40-60% of pages, so effective keyword count is naturally constrained.

---

## Example: Multi-Product Competitor

**Competitor:** pagefly.io (Shopify page builder with blog content)

**Top 50 pages by traffic:**
```
45,000 | /blog/shopify-themes-comparison
32,000 | /blog/landing-page-examples
28,000 | /blog/shopify-discount-apps      ← KEEP
22,000 | /blog/bogo-offers-guide          ← KEEP
18,000 | /features/page-builder
15,000 | /blog/shopify-seo-guide
12,000 | /blog/tiered-pricing-shopify     ← KEEP
10,000 | /blog/email-popup-examples
 8,000 | /blog/flash-sale-strategies      ← KEEP
```

**After filtering:** Keep 4 pages (discount/BOGO/pricing/flash-sale), skip 5 (themes/landing/SEO/popup/builder).

**Result:** Only harvest keywords from the 4 relevant pages instead of all 50.

---

## Reporting

After Phase 2b filtering, report to user:

```
**Page Filtering Complete:**

| Competitor | Total Pages | Kept | Skipped | Keep Rate |
|------------|-------------|------|---------|-----------|
| bogos.io | 45 | 42 | 3 | 93% |
| pagefly.io | 50 | 12 | 38 | 24% |
| hulkapps.com | 38 | 35 | 3 | 92% |

Pages skipped:
- pagefly.io: 38 pages (SEO guides, theme comparisons, landing page templates)
- bogos.io: 3 pages (careers, about, terms)
- hulkapps.com: 3 pages (non-discount apps)

Proceeding to extract keywords from 89 relevant pages...
```

This transparency helps the user understand why some competitors contribute more than others.

---

## CRITICAL: No Fallback to Keywords-First

**Pages-first is mandatory.** If the API fails or returns bad data, STOP and debug — do not silently fall back to keywords-first harvesting.

Keywords-first without page filtering is how you get contaminated pools from multi-product competitors. The entire point of this skill is to filter at the page level first.

---

## The Core Principle: Cherry-Pick, Don't Copy

You are **choosing and picking the best content ideas from each competitor**, not copying their entire strategy.

A competitor like HoneyBook serves photographers, planners, florists, AND coaches. You don't want their photographer content — you want their 3-4 coaching-specific pages. The LLM filter exists to extract those gems while discarding the rest.

**Every competitor contributes their relevant subset, not their whole site.**

---

## LLM Page Filtering is Mandatory

After fetching pages from ANY competitor, you MUST run them through LLM judgment:

```
For each page URL, ask: "Would a coach looking for business management software
find this page useful? Is this about running a coaching business?"

KEEP: /blog/coaching-contract-template/ — Yes, coaches need contracts
KEEP: /blog/how-to-price-coaching-packages/ — Yes, pricing is core
SKIP: /blog/photographer-client-workflow/ — No, wrong audience
SKIP: /blog/wedding-planner-tools/ — No, wrong audience
SKIP: /features/crm-automation/ — No, Paperbell doesn't offer CRM
```

This is not optional. This is how you prevent contamination from broad competitors.

---

## Adaptive Discovery: When Coverage is Thin

**Think like an SEO.** After each phase, ask yourself:

> "Do I have enough keywords for each core topic? Is any business area underrepresented?"

If the answer is no, **proactively find more sources**:

1. **Brainstorm targeted queries** for the thin area
   - Example: "I have 200 keywords about life coaching but only 5 about scheduling. Let me search for 'coaching scheduling software', 'coach appointment booking', 'coaching calendar tools'..."

2. **Run WebSearch to find specialists**
   - Who ranks for these scheduling-specific queries?
   - Are there niche competitors I missed?

3. **Scrape their pages, filter for relevance, add to the pool**

This is a loop, not a linear pipeline. If you reach Phase 4 and realize a topic is weak, go back and fill the gap.

**Example internal monologue:**
```
"Looking at the keyword distribution:
- Life coaching: 450 keywords ✓
- Business coaching: 380 keywords ✓
- Scheduling features: 12 keywords ⚠️ — this is thin

Paperbell's core value prop is scheduling + payments. 12 keywords isn't enough.
Let me find scheduling-focused competitors...

WebSearch: 'coaching scheduling software'
→ Found: youcanbook.me, calendly (too broad), acuityscheduling (too broad),
         coachvantage.com/features/scheduling (already have them)

Let me scrape youcanbook.me's coaching-specific pages..."
```

---

## Common Sense Over Rigid Rules

**DO NOT** apply rigid rules like "max 20% from any competitor." If you only have 3 relevant competitors and one has amazing content, use it.

**DO** apply judgment:
- If one competitor is contributing 60% of keywords AND those keywords look off-topic → that's a problem
- If one competitor is contributing 60% of keywords AND those keywords are exactly what the target business needs → that's fine

The test is **relevance**, not **percentage**.

Ask yourself: "If I showed this keyword list to the business owner, would they say 'yes, these are topics my customers search for'?"
