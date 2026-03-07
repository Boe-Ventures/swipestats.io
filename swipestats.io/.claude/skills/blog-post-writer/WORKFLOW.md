# How to Use: blog-post-writer

End-to-end SEO article generator. From keyword to publish-ready article with deep research, adversarial writer/editor drafting, and SEO meta.

## Quick Start

1. **Trigger the skill** by saying:
   - "Write an article about [keyword]"
   - "Write a blog post about [topic]"
   - "Create a how-to guide for [keyword]"
   - "Write a list post on [keyword]"

2. **First run — setup phase:** On first use, Claude will run a 4-round setup interview:
   - Round 1: Brand voice (paste a style guide, get interviewed, or skip)
   - Round 2: Writing guidelines (use defaults or customize)
   - Round 3: Calibration examples (provide article URLs to scrape for style reference)
   - Round 4: Working directory + Apify actor config

3. **Provide article parameters:** Keyword, format, competitor URLs, word count, etc.

4. **Approve the outline:** Stage 3 produces an outline for your review before drafting starts.

5. **Review and approve:** Stage 5 presents the final article + SEO meta for sign-off.

---

## Article Formats

| Format | When to use |
|--------|-------------|
| `list` | "15 best X", "top tools for Y" |
| `how-to` | Step-by-step tutorials and guides |
| `comparison` | A vs B, side-by-side evaluations |
| `review` | In-depth product or service reviews |
| `explainer` | What is X, how does X work |

---

## Example Workflows

### Basic list post
```
Write an article about "best AI writing tools for bloggers"
```
Claude will ask for competitor URLs, word count, and other parameters.

### How-to with all parameters upfront
```
Write a how-to article.
Keyword: how to start a podcast
Competitors: [URL1], [URL2], [URL3]
Word count: 3500
Target audience: first-time podcasters
CTA link: https://example.com/podcast-course
```

### Reconfigure brand voice
```
Reconfigure the blog-post-writer brand profile
```
Reruns only the rounds you choose (brand profile, guidelines, examples, or all).

### Custom brand profile override
```
Write an article about "content marketing strategy"
Use brand profile from: /path/to/my-custom-brand-profile.md
```

---

## The 5-Stage Pipeline

```
Stage 1: Brief & Competitor Analysis  →  brief.json + gap-analysis.json
Stage 2: Deep Research (Sonnet)       →  research.json [multi-source: web, YouTube, X]
Stage 3: Outline Planning (Opus)      →  outline.json  ⛔ USER APPROVAL
Stage 4: Adversarial Draft (Opus×2)  →  draft.md      [writer → editor loop]
Stage 5: Polish & Deliver             →  article.md + meta.json  ⛔ USER APPROVAL
```

All outputs saved to a project folder: `[base]/[keyword-slug]-[date]/`

---

## Requirements

### MCP Integrations (recommended)

- **Apify MCP** — powers YouTube transcript research and X/Twitter scraping. Without it, the skill falls back to WebSearch (reduced research depth).
- Both are configured during setup via `skill_config.json`.

### No API keys needed

This skill uses Claude's built-in tools (WebSearch, WebFetch) and any MCP integrations already configured in your Claude Code environment. No additional API keys are required.

---

## Output Files

Each run produces a project folder:

```
keyword-slug-date/
├── brief.json              Article parameters
├── gap-analysis.json       Competitive gaps + research directions
├── competitors/            Scraped competitor content
│   ├── competitor-1.md
│   └── summary.md
├── research.json           9-category sourced research
├── outline.json            Approved article blueprint
├── draft-v1.md             Writer output
├── editor-notes.md         Editor's review
├── draft-v2.md             Editor-revised draft
├── draft.md                Final draft
├── article.md              ← Published article
├── meta.json               SEO title, description, slug
└── consistency-report.md   Quality audit trail
```

---

## Tips

- **Provide 3-5 competitor URLs** for best structural analysis. Use top Google results for your target keyword.
- **Add calibration examples during setup** — 2-3 URLs of articles you've published or admire. The writer will match their style and structure.
- **Be specific about word count** — the outline distributes the budget per section, so it matters.
- **Approve the outline carefully** — it's your best checkpoint. Changing structure after Stage 4 means re-running the draft.
- **The brand profile persists** — once set up, every article run uses it automatically. Reconfigure anytime.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Setup runs every time | Check that `skill_config.json` exists in the skill folder and has `"setup_complete": true` |
| Competitor scrape fails | Provide alternative URLs; some sites block scrapers. Min 2 required. |
| YouTube research empty | Ensure Apify MCP is configured and `downloadSubtitles: true` is in the actor input |
| Article too long/short | Adjust `word_count` in the brief, or request section-specific revisions in Stage 5 |
| Wrong brand voice | Say "reconfigure" to update the brand profile, or pass `brand_profile` path in your brief |

---

Packaged with Claude Code /export-skill
