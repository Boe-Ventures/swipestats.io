# Stage 5: Polish & Deliver

## Overview

Generate SEO meta data, run a final consistency pass, and deliver the article for review. Runs in the main thread.

## Step 0: Load References

Read `references/writing-guidelines.md` for the fluff blacklist and quality standards. Read the brand profile used in Stage 4. Read `skill_config.json` for `brand_name`.

## Step 1: Generate Meta Data

Read `draft.md` and `brief.json`. Generate SEO meta data.

### Meta Writer Prompt

Analyze the article content and produce:

- **meta_title:** ~60 characters max, include primary keyword once naturally, append brand name if space allows (e.g., " | {brand_name}" from `skill_config.json`)
- **meta_description:** 140-160 characters, summarize main benefit, include primary keyword once, soft CTA ("Learn...", "Discover...")
- **slug:** Include primary keyword, max 5-6 words, lowercase, hyphens, no special characters, no stop words, no trailing slash

### Output: `meta.json`

```json
{
  "meta_title": "string",
  "meta_description": "string",
  "slug": "string"
}
```

## Step 2: Consistency Pass

Review `draft.md` for final polish:

### Heading Hierarchy Check
- Exactly one `#` (H1) — the title
- All major sections use `## `
- Subsections use `### `
- No skipped heading levels (no H1 → H3)

### CTA & Link Insertion
- If `cta_link` is set in `brief.json`, ensure a CTA is placed naturally (usually near the end, before FAQ)
- If `internal_links` are set, weave them naturally into relevant sections
- Don't force links — they should feel organic in context

### Final Quality Checks
- No em-dashes (—) anywhere in the article
- No orphaned editor notes (`[EDITOR NOTE: ...]` should all be resolved)
- No fluff phrases from the blacklist in `references/writing-guidelines.md`
- Consistent formatting throughout (bold, lists, code blocks)
- FAQ is the last section
- Every section starts with an engaging hook (not a generic opener)

### Consistency Check Report

Save results to the working directory as `consistency-report.md` documenting:
- Em-dash count (must be 0)
- Fluff phrase count (must be 0, list any found)
- Heading hierarchy status (pass/fail + details)
- CTA insertion status (inserted/not needed/missing)
- Orphaned marker count (must be 0)
- Any other issues found

This report provides an audit trail that the consistency pass was actually run.

### Word Count Report

Calculate and report:
- Total word count vs target from `brief.json`
- Per-section word counts vs targets from `outline.json`
- Flag any sections that are >15% off target (writer/editor targeted ±10%; anything still >15% off needs attention)

## Step 3: Final Assembly

1. Save the polished article to `article.md`
2. Present to the user with a summary:
   - Word count (total and per-section)
   - Meta data (title, description, slug)
   - Any flags or concerns
   - Sections that might need attention

## User Approval Gate

Use **AskUserQuestion**:
- "Approve — article is ready"
- "Revise sections" (user specifies which sections to rework — loop back to Stage 4 for targeted writer/editor pass)
- "Revise meta" (user provides meta changes)

## Stage Complete

Final working directory:
```
keyword-slug-date/
├── brief.json
├── competitors/
├── gap-analysis.json
├── research.json
├── outline.json
├── draft-v1.md
├── editor-notes.md
├── draft-v2.md
├── draft.md
├── article.md          ← final article
└── meta.json           ← SEO meta data
```
