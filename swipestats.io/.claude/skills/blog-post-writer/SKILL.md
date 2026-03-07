---
name: blog-post-writer
description: End-to-end SEO article generator for any brand. Supports list posts, how-tos, comparisons, reviews, and explainers. Deep research (web, YouTube, X), competitor gap analysis, structured outline, adversarial writer/editor draft, and meta generation. Includes a setup phase to configure brand voice and calibration examples. Use when asked to write an article, blog post, listicle, how-to guide, or SEO content.
version: 1.0.0
---

# Article Writer

You are an SEO content team. The user gives you a keyword and competitor URLs. You deliver a publish-ready article with research-backed structure, adversarial writer/editor quality, and SEO meta.

**Working directory:** `{base}/[keyword-slug]-[date]/` — read `base` from `skill_config.json`; if missing, run setup. Create at start.

## Setup Detection

Check for `.claude/skills/blog-post-writer/skill_config.json`:
- **Missing or `setup_complete: false`** → Run setup (read `references/setup/setup-flow.md`)
- **`setup_complete: true`** → Skip to Stage 1
- **User says "reconfigure"** → Re-run setup (read `references/setup/setup-flow.md`)

## Article Formats

| Format | Structure |
|--------|-----------|
| `list` | `intro → item × N → faq` |
| `how-to` | `intro → step × N → faq` |
| `comparison` | `intro → section (overview) → item × N (criteria) → verdict → faq` |
| `review` | `intro → item × N (features) → verdict → faq` |
| `explainer` | `intro → section × N → faq` |

### Section Types

| Type | Heading Format | Core Pattern |
|------|----------------|--------------|
| `intro` | `# Title` (only H1) | Hook → pivot → bridge |
| `item` | `## 1. Title` | Hook → explanation → evidence → closing |
| `step` | `## Step 1: Title` | Goal → instructions → milestone |
| `section` | `## Title` | Flexible, topic-driven |
| `verdict` | `## The Bottom Line` | Summary → recommendation → next action |
| `faq` | `## FAQ` with `###` per Q | Direct answer first (40-80 words) |

## Workflow

```
Setup (first run only)               → skill_config.json + brand-profile.md + examples/
    ↓
Stage 1: Brief & Competitor Analysis → brief.json + competitors/ + gap-analysis.json
    ↓
Stage 2: Deep Research               → research.json                    [sonnet sub-agent]
    ↓
Stage 3: Outline Planning            → outline.json                     [opus sub-agent] ⛔ USER APPROVAL
    ↓
Stage 4: Adversarial Draft           → draft.md                         [opus writer → opus editor]
    ↓
Stage 5: Polish & Deliver            → article.md + meta.json           ⛔ USER APPROVAL
```

## How to Execute Each Stage

**Read the stage file when you reach that stage — not before.**

| Stage | Read This File |
|-------|---------------|
| Setup | `.claude/skills/blog-post-writer/references/setup/setup-flow.md` |
| 1 | `.claude/skills/blog-post-writer/references/stages/stage-1-brief.md` |
| 2 | `.claude/skills/blog-post-writer/references/stages/stage-2-research.md` |
| 3 | `.claude/skills/blog-post-writer/references/stages/stage-3-outline.md` |
| 4 | `.claude/skills/blog-post-writer/references/stages/stage-4-draft.md` |
| 5 | `.claude/skills/blog-post-writer/references/stages/stage-5-polish.md` |

## Additional References (read on demand)

| File | When to Read |
|------|-------------|
| `references/writing-guidelines.md` | Stage 4 — shared quality rules for writer + editor |
| `references/brand-profile.md` | Stage 4 — brand voice profile (created during setup). Overridden if `brand_profile` in `brief.json` points to a custom file. |
| `references/examples/*.md` | Stages 3 & 4 — example articles for structural and voice calibration (if any exist) |

All paths relative to `.claude/skills/blog-post-writer/`.

## Key Concepts

- **Setup phase.** On first run, interviews the user to create a brand profile, configure writing guidelines, and optionally scrape calibration articles. Stored in the skill directory for all future runs.
- **Format system.** Five article formats map to six section types. The format determines which section types the planner uses. This produces correct structure for list posts, how-tos, comparisons, reviews, and explainers.
- **Adversarial writer/editor.** Writer (Opus) writes the full article in one pass for voice consistency. Editor (Opus) reviews adversarially against quality criteria. They optimize for different things — writer for depth and engagement, editor for concision and precision.
- **Full-article draft, not section-by-section.** Voice consistency is natural, faster (2 sub-agent calls vs N×2), and the adversarial dynamic works better on complete context.
- **Research is tool-heavy, writing is reasoning-heavy.** Stage 2 uses Sonnet (sufficient for tool orchestration). Stages 3-4 use Opus (planning and writing quality matters).
- **Competitor-first planning.** The outline mirrors competitor structure (item count ±20%, depth, anatomy) then improves with better gaps coverage, titles, and examples.
- **9-category research schema.** Structured JSON ensures research covers: specs/facts, user struggles, video workflows, expert insights, tool matrices, use cases, how-to playbooks, pros/cons, FAQs.
- **Brand profile is configurable.** Created during setup from user interview, pasted guidelines, or a placeholder. User can provide a custom brand profile or writing samples to override voice/tone.
