# blog-post-writer v1.0.0

End-to-end SEO article generator for any brand. From keyword to publish-ready article with deep research, adversarial writer/editor drafting, and SEO meta generation.

Supports list posts, how-tos, comparisons, reviews, and explainers. Includes a brand voice setup phase so every article matches your style.

## Installation

1. Download `blog-post-writer-v1.0.0.zip`
2. In Claude Code, run:
   ```
   /install-skill blog-post-writer-v1.0.0.zip
   ```
3. The installer will validate the skill and copy it to your skills folder.

## No API Keys Required

This skill runs entirely on Claude's built-in tools (WebSearch, WebFetch) plus sub-agents. No external API keys needed.

**Optional enhancement:** If you have Apify MCP configured in Claude Code, the skill will use it for YouTube transcript research and X/Twitter scraping. Without it, the skill falls back to WebSearch automatically.

## Dependencies

**None.** No Python packages, no Node.js, no system tools. Pure Claude skill.

## First Run — Setup Phase

On first use, Claude will run a 4-round setup interview to configure the skill for your brand:

1. **Brand voice** — paste a style guide, answer interview questions, or use a minimal placeholder
2. **Writing guidelines** — use sensible defaults or customize (em-dash ban, fluff blacklist, paragraph rules, SEO rules)
3. **Calibration examples** — optionally provide 2-3 article URLs to scrape as style references
4. **Config** — set output directory and Apify actor preferences

Setup results are saved to the skill folder and reused for all future runs. Say "reconfigure" anytime to update settings.

## Usage

```
/blog-post-writer
```

Or trigger naturally:

- "Write an article about [keyword]"
- "Write a how-to guide for [keyword]"
- "Create a list post on [topic]"
- "Write a comparison article about [keyword]"

## The 5-Stage Pipeline

```
Stage 1: Brief & Competitor Analysis  →  Keyword params + scrape competitors + gap analysis
Stage 2: Deep Research (Sonnet)       →  Web + YouTube + X research → sourced research.json
Stage 3: Outline Planning (Opus)      →  Structured outline with word budgets  ⛔ APPROVAL
Stage 4: Adversarial Draft (Opus×2)  →  Writer draft → Editor revision
Stage 5: Polish & Deliver             →  Final article + SEO meta  ⛔ APPROVAL
```

## Article Formats

| Format       | Use For                        |
| ------------ | ------------------------------ |
| `list`       | "15 best X", "top tools for Y" |
| `how-to`     | Step-by-step tutorials         |
| `comparison` | A vs B evaluations             |
| `review`     | In-depth product reviews       |
| `explainer`  | "What is X", "How does X work" |

## Output

Each article run creates a project folder with:

- `article.md` — publish-ready article
- `meta.json` — SEO title, description, and slug
- `outline.json`, `research.json`, `draft.md` — full audit trail

See `WORKFLOW.md` for detailed usage instructions, examples, and troubleshooting.

---
