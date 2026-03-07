# Quality Gates — Phase 2.5 & Phase 6c

These are the two critical LLM-powered quality gates that catch issues before they become expensive.

---

## Phase 2.5: Model Reality Check (Before Enrichment)

**This is the critical quality gate.** Before spending money on enrichment, YOU (the model) validate that the harvested keywords actually match the business. This catches contamination from overly-broad competitors.

### The Core Heuristic

**Ask yourself: "If I showed this keyword list to the business owner, would they say 'yes, these are topics my customers search for'?"**

If the answer is no for a significant portion of the list, something went wrong. Figure out why and fix it.

### What You're Checking

Using the business context from Phase 0 (`offerings`, `non_offerings`, `buyer_persona`, `audience_exclusions`), review the keyword pool with judgment—not rigid thresholds:

### Check 1: Offering Alignment

Sample 50 keywords across the volume range. For each, ask: "Is this keyword for a product/service in `offerings`?"

```
Offering alignment check:
- Keywords for our offerings: 45%
- Keywords for adjacent/supportive topics: 30%
- Keywords for products we DON'T sell (non_offerings): 25% ⚠️

Examples of non_offering contamination:
- "yoga clothing for men" → we sell mats, not clothing
- "yoga classes near me" → we sell products, not classes
```

**Judgment call:** Are the non-offering keywords genuinely problematic, or just adjacent? "Yoga clothing" for a yoga mat company is contamination. "Yoga routines" might be good content that drives traffic. Use common sense.

### Check 2: Buyer Alignment

Sample 50 keywords. For each, ask: "Would `buyer_persona` realistically search this?"

```
Buyer alignment check:
- Keywords our buyer would search: 35%
- Keywords a different buyer would search: 65% ⚠️

Examples of wrong-buyer keywords:
- "yoga for stress relief" → adults search this, not parents shopping for kids
- "couples yoga poses" → our buyer is parents of young children
```

**Judgment call:** Wrong-audience keywords are a red flag, but the severity depends on context. A coaching SaaS picking up some generic "how to start a business" content from broad competitors may be fine if there's also coaching-specific content. Pure contamination with no relevant signal is the real problem.

### Check 3: Core Topic Coverage

For each item in `core_topics`, count matching keywords:

```
Core topic coverage:
- dinosaur yoga mat: 1 keyword (0.03%) ⚠️ CRITICAL
- unicorn yoga mat: 2 keywords (0.07%) ⚠️ CRITICAL
- kids yoga poses: 8 keywords (0.3%) ⚠️ LOW
- yoga mat: 90 keywords (3.1%) ✓ OK
```

**Judgment call:** If core topics are thin, don't just flag it—go find more sources. See the Adaptive Discovery section in pages-first-harvesting.md. Brainstorm search queries, run WebSearch, find specialists for that topic.

### Check 4: Competitor Source Quality

Review which competitors contributed what:

```
Source analysis:
- masuliving.com (Primary): 156 kw (6%) ✓
- gaiam.com (Secondary - broader): 599 kw (23%)
- boldfit.com (Secondary - generic fitness): 590 kw (23%) ⚠️
- saralhome.com (Secondary - home goods): 594 kw (23%) ⚠️
```

**IMPORTANT: No rigid percentage limits.**

If you only have 3-4 relevant competitors, one contributing 50% is fine. If you have 10 competitors and one broad player is contributing 60% of off-topic keywords, that's a problem.

**The test is relevance, not percentage.** A competitor contributing 70% of keywords is fine if those keywords are exactly what the target business needs. A competitor contributing 20% is a problem if those keywords are contaminating the pool.

Ask: "Are this competitor's keywords things the business owner would want to rank for?" If yes, the percentage doesn't matter. If no, filter their contribution.

### Model Decision

Based on the checks above, make ONE decision using your judgment:

| Decision | When to Use | Action |
|----------|-------------|--------|
| **PROCEED** | Keywords look relevant to the business. Minor issues can be cleaned up later. | Continue to Phase 3/4 |
| **FILTER** | Specific contamination patterns identified (e.g., wrong product category, wrong audience segment) | Apply filters, then proceed |
| **EXPAND** | Core topics are thin. You need more sources. | Go find more competitors for the thin areas (see Adaptive Discovery in pages-first-harvesting.md) |
| **RE-HARVEST** | The pool is fundamentally contaminated—most keywords don't match the business | Go back to Phase 1, find better competitors |
| **DISCUSS** | Genuinely ambiguous strategic question (e.g., "Should we include adult yoga content to build traffic?") | Ask user for strategic direction |

**Think like an SEO.** If you were building this content strategy by hand, would you be happy with these keywords? If not, fix it before proceeding.

### Filter Actions

If FILTER decision, apply these before proceeding:

```python
# Remove keywords matching non_offerings patterns
non_offering_patterns = ["yoga clothing", "yoga wear", "yoga class", ...]
keywords = [kw for kw in keywords if not matches_any(kw, non_offering_patterns)]

# Remove keywords for wrong audience
wrong_audience_patterns = ["couples", "prenatal", "men's", "women's", ...]
keywords = [kw for kw in keywords if not matches_any(kw, wrong_audience_patterns)]
```

### Example: What This Would Have Caught for Woohoosquad

```
Model Reality Check for woohoosquad.com:

BUSINESS CONTEXT:
- offerings: ["kids yoga mats", "digital activity packs", "coloring books"]
- non_offerings: ["adult yoga mats", "yoga clothing", "yoga classes", "yoga accessories"]
- buyer_persona: "Parents shopping for kids ages 3-8"

THE HEURISTIC TEST:
"If I showed this keyword list to the Woohoosquad founder, would they say 'yes, these are topics my customers search for'?"

Looking at the top 50 keywords by volume:
- "yoga mat" - Generic, but okay if we angle it for kids
- "yoga for stress relief" - ❌ This is adults searching for themselves
- "yoga for knee pain" - ❌ Adults with health issues, not parents shopping
- "couples yoga" - ❌ Wrong audience entirely
- "yoga clothing" - ❌ We don't sell clothing
- "dinosaur yoga mat" - ✓ Perfect, this is our product
- "kids yoga poses" - ✓ Great content topic

MY JUDGMENT:
Looking at this list, most keywords are for adult yoga practitioners searching for themselves.
The founder would NOT recognize these as customer searches. Only 3-4 of the top 50 are relevant.

Core topic check:
- "dinosaur yoga mat": 1 keyword — this is our flagship product line, should have dozens
- "unicorn yoga mat": 2 keywords — same issue
- "kids yoga poses": 7 keywords — thin but workable

The problem is clear: competitors like Gaiam and Boldfit are general yoga/fitness sites.
They contributed most of the keywords. Their content is for adults, not parents shopping
for kids.

DECISION: RE-HARVEST + EXPAND

ACTION:
1. Filter current pool: Keep only keywords containing "kids", "children", "toddler", or
   our product themes (dinosaur, unicorn, etc.)
2. Find better competitors: Search for "kids yoga mat", "children's yoga products",
   "dinosaur yoga mat" — who ranks? Those are my real competitors.
3. Scrape kids-focused sites specifically for product and content topics
```

### Report to User (Only if DISCUSS)

Most decisions the model makes autonomously. Only escalate to user for genuinely strategic questions:

```
**Reality Check — Need Your Input**

The keyword harvest is heavy on generic yoga content (yoga poses, yoga exercises)
with very little kids-specific language.

This isn't necessarily wrong — many successful e-commerce sites build traffic with
educational content, then convert via email/retargeting.

**Strategic question:** Should we:
A) Keep generic yoga content — we'll angle it for parents, build audience, convert later
B) Filter to kids-only terms — smaller but more targeted, faster path to purchase intent
C) Re-harvest — find competitors who specifically target parents/kids

Your call on the strategy.
```

---

## Phase 6b: Semantic Cleanup (Integrated into Hierarchy Builder)

In dfseo2, semantic cleanup is performed by the Hierarchy Builder sub-agent during the same pass as architecture design. The hierarchy builder receives full business context (offerings, non_offerings, buyer_persona, audience_exclusions, core_topics) and applies cleanup rules while building the hierarchy:

- Drops pages for non-offerings
- Drops wrong-audience pages
- Drops excluded topics
- Verifies core topic coverage
- Reports all drops in `cleanup_summary`

See `subagents/hierarchy_builder.md` for the full cleanup rules.
