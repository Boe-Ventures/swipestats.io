# Interview Guide — Phase 0: Client Onboarding

Act like an SEO consultant onboarding a new client. **Research first, then ask intelligent questions.**

## Step 0a: Get the Site URL

If user provides URL: proceed immediately to research.
If user just says "create a topical map": ask for the URL.

## Step 0b: Research the Site (Before Asking Questions)

**Do this silently before presenting anything to the user.**

1. **Extract existing pages:**
   ```bash
   echo '{"site_url": "https://example.com", "output_dir": "./output"}' | python3 scripts/extract_existing.py
   ```

2. **Also fetch the homepage with WebFetch** to understand:
   - What the business actually does
   - Value proposition and messaging
   - Target audience signals
   - Products/services offered

3. **Build initial observations:**
   - How many pages exist?
   - What topics do they cover?
   - What's their current organic presence?
   - Content site or business site?
   - What business model (SaaS, agency, local service, e-commerce, content)?

## Step 0c: Present Findings & Ask Context Questions

Present what you learned and ask targeted questions using AskUserQuestion.

**Example opening:**

```
I've analyzed example.com. Here's what I found:

**Current State:**
- 100 organic pages ranking (by traffic value)
- ~7,000 estimated monthly traffic value
- Top pages: homepage, /pricing, /features/automation, blog posts
- Main topics: email marketing, automation, newsletters

**Site Type:** B2B SaaS (email marketing platform)

I have a few questions to make sure I build the right strategy:
```

## Key Questions to Ask (use AskUserQuestion)

### Business Understanding
1. **Confirm business understanding** — "Is this accurate: You sell [X] to [Y]?"
2. **Primary goal** — Lead generation / Brand awareness / Traffic growth / Support customers
3. **Target market** — US / UK / Global English / Specific country
4. **Competitors** — "Do you know your main competitors?" (Yes/Some/Find them)
5. **Exclusions** — "Any topics I should avoid?"
6. **Map size** — "How comprehensive should keyword discovery be?"
   - **Small** (30+ pages min) — Focused discovery for a specific niche or small site. ~$5 API cost.
   - **Medium** (60+ pages min) — Balanced coverage for most sites. ~$7 API cost. *(default)*
   - **Large** (150+ pages min) — Comprehensive discovery for established authority sites. ~$10 API cost.
   *(Note: These are minimums. If discovery yields more relevant pages, keep them all.)*
7. **Cannibalization check** — "Should we check for cannibalization against your existing pages?" (default: yes if existing pages > 10)

### Audience Alignment (Ask for ALL site types)
8. **Target audience** — "Who is your ideal customer/reader?"
   - Store as `target_audience: "US parents with kids 3-10"`

9. **Audience exclusion signals** — "Who is NOT your target audience?"
   - Common examples by site type:
     - E-commerce: "Teachers looking for classroom resources"
     - SaaS: "Enterprise buyers with 10K+ employees"
     - Local service: "DIYers who don't hire professionals"
   - Store as `audience_exclusions: ["teachers", "classroom"]`

10. **Core topics** — "What 3-5 topics MUST have dedicated content?"
    - Product themes, service lines, key use cases
    - Store as `core_topics: ["dinosaur yoga mat", "unicorn yoga mat", "yoga for toddlers"]`

11. **Topics to avoid** — "Any topics you DON'T want to cover?"
    - Services not offered, out-of-scope content
    - Store as `excluded_topics: ["adult yoga", "teacher training", "yoga certification"]`

### Offering Alignment (Critical for Model Reality Check)

These questions give the model explicit context to validate keywords in Phase 2.5:

12. **Products/services you sell** — "What specific products or services do you offer?"
    - Be explicit and comprehensive
    - E-commerce example: "Kids yoga mats (dinosaur, unicorn, space, transport themes), digital activity packs, coloring books"
    - SaaS example: "Email automation, newsletter builder, subscriber management, A/B testing"
    - Store as `offerings: ["kids yoga mats", "digital activity packs", "coloring books"]`

13. **Products/services you DON'T sell** — "What related products/services do competitors offer that you don't?"
    - This is critical — helps model filter contamination from broader competitors
    - E-commerce example: "Adult yoga mats, yoga clothing, yoga accessories, yoga classes, meditation cushions"
    - SaaS example: "CRM, landing pages, SMS marketing, social media management"
    - Store as `non_offerings: ["adult yoga mats", "yoga clothing", "yoga classes"]`

14. **Buyer persona** — "Describe who actually makes the purchase decision."
    - Not just who uses it, but who searches and buys
    - E-commerce example: "Parents shopping for their kids ages 3-8, grandparents buying gifts"
    - SaaS example: "Marketing managers at SMBs, business owners doing their own marketing"
    - Store as `buyer_persona: "Parents shopping for kids ages 3-8, gift buyers"`

## Step 0d: Dig Deeper Based on Answers

Follow up conversationally if answers need clarification. If user wants you to find competitors, note that for Phase 1.

## Step 0e: Confirm and Proceed

Summarize and get final confirmation:

```
**Summary - Ready to Build Topical Map:**

- **Site:** example.com (B2B SaaS - Email Marketing)
- **Goal:** Lead generation
- **Market:** United States, English
- **Map size:** Medium (60+ pages minimum)
- **Competitors:** mailchimp.com, convertkit.com (+ auto-discovery via seed queries)
- **Cannibalization check:** Yes
- **Exclusions:** None

Estimated API cost: ~$7

Ready to start?
```

## Working Context Object

After the interview, you'll have built:
```json
{
    "site_url": "https://example.com",
    "domain": "example.com",
    "site_type": "business",
    "business_model": "saas",
    "business_description": "Email marketing platform for SMBs",
    "primary_goal": "lead_generation",
    "target_audience": "Small-medium business owners",
    "buyer_persona": "Marketing managers at SMBs, business owners doing their own marketing",
    "audience_exclusions": ["enterprise", "developers"],
    "offerings": ["email automation", "newsletter builder", "subscriber management", "A/B testing"],
    "non_offerings": ["CRM", "landing pages", "SMS marketing", "social media management"],
    "core_topics": ["email automation", "newsletter design", "email analytics"],
    "excluded_topics": ["enterprise integrations", "API documentation"],
    "seed_competitors": ["mailchimp.com", "convertkit.com"],
    "location": "United States",
    "language": "English",
    "existing_pages_count": 45,
    "map_size": "medium",
    "check_cannibalization": true,
    "output_dir": "02-areas/seo/topical-maps/example-com/"
}
```

**Critical fields for Model Reality Check (Phase 2.5):**
- `offerings` — What the business actually sells (model checks if keywords match these)
- `non_offerings` — Related products competitors sell that this business doesn't (model filters these out)
- `buyer_persona` — Who searches and buys (model checks if keywords match this person's searches)

## Interview Principles

1. **Research before asking** — Don't ask questions you could answer by looking
2. **Show your homework** — Present findings to build credibility
3. **Ask targeted questions** — Based on what you learned, not generic forms
4. **Adapt to answers** — Follow up when things need clarification
5. **Confirm before proceeding** — Summarize and get buy-in
6. **Be efficient** — 4-6 questions is usually enough
