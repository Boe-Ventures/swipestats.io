# Stage 3: Outline Planning

## Overview

Create a structured article outline with word budgets. Runs as an **Opus sub-agent** (highest-leverage planning step, worth the cost). The main thread presents the outline for user approval before continuing.

## Format → Structure Mapping

The article format (from `brief.json`) determines which section types are used:

| Format | Structure |
|--------|-----------|
| `list` | `intro → item × N → faq` |
| `how-to` | `intro → step × N → faq` |
| `comparison` | `intro → section (overview) → item × N (criteria) → verdict → faq` |
| `review` | `intro → item × N (features) → verdict → faq` |
| `explainer` | `intro → section × N → faq` |

### Section Types

| Type | Numbered? | Sequential? | Heading Format | Core Pattern |
|------|-----------|-------------|----------------|--------------|
| `intro` | No | N/A | `# Title` (only H1) | Hook → pivot → bridge |
| `item` | Yes (1, 2, 3) | No (reorderable) | `## 1. Title` | Hook → explanation → evidence → closing |
| `step` | Yes (Step 1, 2) | **Yes** (order matters) | `## Step 1: Title` | Goal → instructions → milestone |
| `section` | No | Loosely | `## Title` | Flexible, topic-driven |
| `verdict` | No | Before FAQ | `## The Bottom Line` | Summary → recommendation → next action |
| `faq` | No | Always last | `## FAQ` with `###` per Q | Direct answer first (40-80 words) |

## Sub-Agent Setup

Launch a **Task** sub-agent with `subagent_type: "general-purpose"` and `model: "opus"`.

Pass to the sub-agent:
- Contents of `brief.json`
- Contents of `competitors/summary.md` (use the summary only — full competitor files are too large for sub-agent context)
- Contents of `gap-analysis.json`
- Contents of `research.json`
- Contents of all files in `references/examples/` (example articles for structural calibration — if any exist)
- The working directory path for saving output

## Editor-in-Chief Prompt

The sub-agent should follow this role and process:

### Identity

You are the **Editor-in-Chief (Content Architect)**. Turn raw inputs into a lean, high-performance article outline. Your outline is the blueprint that downstream writers will follow — every decision you make here cascades.

### Non-Negotiable Structure

The article structure must follow the format mapping above. Based on `format` in `brief.json`:

**List:**
```
intro → item × N → faq
```

**How-to:**
```
intro → step × N → faq
```

**Comparison:**
```
intro → section (overview of what's being compared) → item × N (one per option/criteria) → verdict → faq
```

**Review:**
```
intro → item × N (one per feature/aspect) → verdict → faq
```

**Explainer:**
```
intro → section × N → faq
```

Each section gets a `section_route_key` that is exactly one of: `intro`, `item`, `step`, `section`, `verdict`, `faq`.

### Planning Phases

#### Phase 0: Competitor Structural Analysis

Before planning anything, analyze competitors:
- Count H2 items in each competitor
- Measure item depth (word count per section)
- Extract item anatomy (what sub-elements each item contains)
- Note hook styles used (question, stat, story, contrast)

**Format-specific note:** Competitors may use a different article format than the one in the brief. For comparison/review articles, competitors might structure as pure lists. Adapt the structural mirroring principle to the target format — mirror depth and density, not necessarily the competitor's section types.

#### Phase 1: Plan Structure

- Determine article type from `format` in brief
- Select the matching structure template from the format mapping above
- Decide section count based on priority order:
  1. User-specified `number_of_sections` (if provided)
  2. Competitor-derived average (±20%)
  3. Budget-based fallback (total word count ÷ target per section)

#### Phase 2: Map & Prioritize

- Map gap analysis findings to potential sections
- Map research findings to sections
- Prioritize: front-load value (power items in positions 1-3)
- Apply problem→outcome framing for every item

#### Phase 2.5: Study Example Articles

Before architecting the outline, read the example articles in `references/examples/` (if any exist). These are real published articles that represent the target quality and structure. Study them for:
- **Section depth and anatomy** — what sub-elements each section contains (pricing line, use cases, pros/cons, etc.)
- **Intro length and style** — how much setup before the first item. Note: good intros are typically SHORT (2-4 sentences), not 300+ words of preamble
- **Transition patterns** — how sections flow into each other
- **Closing variety** — how items end (not always the same formula)
- **Heading style** — phrasing patterns, whether they include numbers, benefit framing

Use these observations to calibrate your outline. The outline should produce an article that reads like these examples, not like a generic AI article.

If no example articles exist, rely on competitor analysis and the brand profile for calibration.

#### Phase 3: Architect the Outline

For each section, define:
- `section_number` (starts at 1)
- `section_route_key` (intro/item/step/section/verdict/faq)
- `title` — search-friendly, specific, benefit-focused. **No em-dashes (—) in titles.** Use a colon (:), dash (-), or restructure instead.
- `strategic_angle` — the main argument this section makes
- `problem_solved` — what reader pain this addresses
- `word_target` — word budget for this section
- `plan_markdown` — detailed outline. **Minimum requirements:** 2-3 key points to cover, specific research entries to reference (by category and topic), the hook approach, and any data/examples to include. This is the writer's blueprint — vague plans produce vague writing.
- `item_number` — for `item` sections: the display number (e.g., 1 for the first list item). For `step` sections: the step number. Not needed for intro/section/verdict/faq.
- `engagement_hook_type` — one of:
  - `curiosity_gap`: Question or contradiction that demands resolution ("What if the most popular advice about X is wrong?")
  - `pain_point`: Name a specific frustration, pivot to solution ("You've spent hours on X only to get Y.")
  - `surprising_fact`: Counter-intuitive stat or insight ("Only 12% of teams actually use X the way it was designed.")
  - `quick_win`: Promise immediate, tangible value ("This one setting change cuts your X time in half.")

#### Phase 4: Validate & Output

Validation checklist before output:
- [ ] `section_number` starts at 1, sequential
- [ ] `faq` is always the LAST section
- [ ] `verdict` (if present) is immediately before `faq`
- [ ] All `section_route_key` values are valid (intro/item/step/section/verdict/faq)
- [ ] Section types match the format template (e.g., how-to uses `step`, not `item`)
- [ ] `step` sections are in logical sequential order (each step builds on the previous)
- [ ] Item count within ±30% of competitor average (aim for ±20% per the mirroring principle; 30% is the hard validation limit)
- [ ] Word targets sum to total word count ±15%
- [ ] No two sections cover the same ground

### Structural Mirroring Principle

Mirror competitor structure, then improve:
- Match competitor item count (±20%)
- Match depth (if competitors do 300 words per item, don't do 100)
- Match anatomy (if competitors have subheadings + examples + data, you should too)
- Match hook style (if they all start with questions, don't be the odd one out)
- **Improve with:** better titles, gap coverage, original examples, better research integration

### Merging Rules

- Only merge genuinely redundant items
- If competitors keep topics separate, you should too
- Record all merges in `structure_decision.merges`

### Closing Format Variety

Don't use the same ending structure for every item. Vary across these formats:
- **Best for / Skip if** — the default for most items
- **The verdict** — a 1-2 sentence direct recommendation
- **Quick comparison** — compare against a specific alternative mentioned in the section
- **Direct recommendation** — "If you [situation], start with [action]"

Aim for 2-3 different closing formats across all items. Monotony signals AI.

### Editorial Principles

- Front-load value: power items in positions 1-3
- Problem→outcome framing for every item
- Search-friendly specific titles (not generic, no em-dashes)
- Engagement hooks calibrated to what competitors actually do

## Output: `outline.json`

```json
{
  "structure_decision": {
    "format": "list|how-to|comparison|review|explainer",
    "total_sections": 12,
    "total_word_target": 3000,
    "competitor_avg_sections": 10,
    "competitor_avg_words": 2800,
    "rationale": "Why this structure was chosen",
    "merges": [
      {
        "merged_topics": ["Topic A", "Topic B"],
        "into": "Combined Topic Title",
        "reason": "Why these were merged"
      }
    ]
  },
  "writing_tasks": [
    {
      "section_number": 1,
      "section_route_key": "intro",
      "title": "H1 Title Here",
      "strategic_angle": "The main argument",
      "problem_solved": "What reader pain this addresses",
      "word_target": 200,
      "item_number": null,
      "engagement_hook_type": "curiosity_gap",
      "plan_markdown": "Detailed outline with subsections, key points, research refs, hook approach"
    }
  ]
}
```

## User Approval Gate

After the sub-agent returns the outline, the **main thread** must:

1. Format the outline as a readable table for the user:

```
| # | Type | Title | Words | Hook | Angle |
|---|------|-------|-------|------|-------|
| 1 | intro | [title] | 200 | curiosity_gap | [angle] |
| 2 | item | [title] | 300 | pain_point | [angle] |
| ... | ... | ... | ... | ... | ... |
```

Total: X sections, Y words target (competitor avg: Z sections, W words)

2. Use **AskUserQuestion** to get approval:
   - "Approve and continue to draft"
   - "Edit outline" (user provides changes → re-launch Stage 3 sub-agent with the original inputs + user feedback appended as editorial notes)
   - "Start over" (re-run from Stage 1)

3. Only proceed to Stage 4 after explicit approval.

## Stage Complete

After user approval, the working directory should contain:
```
keyword-slug-date/
├── brief.json
├── competitors/
├── gap-analysis.json
├── research.json
└── outline.json
```
