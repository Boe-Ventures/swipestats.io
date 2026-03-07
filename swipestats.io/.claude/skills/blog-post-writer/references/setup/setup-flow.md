# Setup Flow

The setup phase runs when `skill_config.json` is missing or `setup_complete` is `false`, or when the user says "reconfigure."

## Overview

4-round interview that produces:
- `references/brand-profile.md` — brand voice and style guide
- `references/examples/*.md` — calibration articles (optional)
- `skill_config.json` — runtime config

## Round 1: Brand Profile

Use **AskUserQuestion** with these options:

**Question:** "I need to understand your brand voice before we start writing. How would you like to set that up?"

| Option | Label | Description |
|--------|-------|-------------|
| 1 | Paste or provide a file | "I have a brand profile, style guide, or writing guidelines I can share" |
| 2 | Interview me | "Ask me questions and build a profile from my answers" |
| 3 | Skip for now | "Use a minimal placeholder — I'll refine later" |

### Option 1: Paste / File Path

If the user pastes text or provides a file path:
1. Read the content
2. Restructure into the **Brand Profile Template** below
3. Present the generated profile to the user for review
4. Save to `references/brand-profile.md`

### Option 2: Interview

Ask these questions using **AskUserQuestion** (free-text responses via "Other"):

1. **Company name and what you do** — "What's your company/brand name, and what do you sell or offer? (1-2 sentences)"
2. **Target audience** — "Who reads your content? Describe your typical reader (role, experience level, what they care about)."
3. **Voice adjectives** — "Pick 3-5 adjectives that describe your brand's tone. Examples: direct, witty, academic, casual, authoritative, empathetic, contrarian, friendly."
4. **Pronoun preference** — "How do you refer to yourself and the reader?"
   - Options: `"I" + "you" (personal)`, `"We" + "you" (team)`, `Third person (brand name)`, `Other`
5. **Key differentiators** — "What makes your perspective different from competitors? What do you believe that others in your space don't?"
6. **Writing sample (optional)** — "Paste a paragraph or two of writing you're proud of. This helps me match your rhythm and vocabulary. (Skip if you prefer)"

After collecting answers, generate the brand profile using the template below and present for review.

### Option 3: Skip

Write a minimal `brand-profile.md`:

```markdown
# Brand Profile

## About
- **Company:** [To be configured]
- **Product/Service:** [To be configured]

## Voice & Tone
- Clear and direct
- Audience-appropriate vocabulary

## Writing Style
- Second person "you" for instruction
- Short paragraphs, clear sentences

## Audience Context
- [To be configured]
```

### Brand Profile Template

Use this structure when generating `references/brand-profile.md`:

```markdown
# Brand Profile: {Company Name}

## About
- **Company:** {name} — {brief description}
- **Product/Service:** {what they sell/offer}
- **Positioning:** {how they position themselves}

## Voice & Tone
- {adjective 1} — {what this means in practice}
- {adjective 2} — {what this means in practice}
- {adjective 3} — {what this means in practice}
{additional adjectives as provided}

## Content Philosophy
- {key belief 1}
- {key belief 2}
- {differentiators from competitors}

## Writing Style
- {pronoun rules — e.g., 'First person "I" for experience, "you" for instruction'}
- {paragraph style preferences}
- {humor/formality level}

## Audience Context
- {who they are}
- {experience level}
- {what they care about}
- {pain points}

## Voice Examples

**Good:** "{example that matches stated adjectives — generate from voice adjectives + any writing sample provided}"

**Bad:** "{counter-example showing the opposite of stated voice — generate to contrast}"

**Good:** "{second good example}"

**Bad:** "{second bad example}"

## Authorship
{Default authorship notes — e.g., "Write as a generic [brand] author unless told otherwise."}
```

Generate voice examples by:
1. If a writing sample was provided: extract rhythm, vocabulary, and structure patterns, then write 2 good examples that match
2. If no sample: generate examples that embody the stated voice adjectives
3. Bad examples should show the opposite (generic, jargon-heavy, or mismatched tone)

---

## Round 2: Writing Guidelines

**Question:** "I have default writing guidelines covering paragraph limits, fluff blacklist, SEO rules, and formatting standards. Would you like to customize them or use the defaults?"

| Option | Label | Description |
|--------|-------|-------------|
| 1 | Use defaults | "The defaults cover em-dash ban, fluff blacklist, heading hierarchy, SEO rules, word count constraints, and information density standards" |
| 2 | Customize | "Let me review and adjust the defaults" |

### Option 1: Use Defaults

No action needed — `references/writing-guidelines.md` ships with sensible defaults.

### Option 2: Customize

Show the user the current `references/writing-guidelines.md` content and let them request changes. Apply edits.

**Note:** Pronoun rules are NOT in writing-guidelines.md. They live in the brand profile. The writing guidelines reference the brand profile for voice/pronoun rules.

---

## Round 3: Calibration Examples

**Question:** "Providing 2-3 URLs of articles you've written (or admire) helps calibrate the writing style. The articles will be scraped and used as structural references during outline planning and drafting."

| Option | Label | Description |
|--------|-------|-------------|
| 1 | Provide URLs | "I have article URLs to share" |
| 2 | Skip | "Proceed without calibration examples — I can add them later" |

### Option 1: Provide URLs

Ask the user for 2-3 URLs (free text via AskUserQuestion "Other" option).

For each URL:
1. Use **WebFetch** to scrape the article
2. WebFetch prompt: "Extract the full article content as clean markdown. Preserve all headings (H1-H6), lists, bold/italic formatting, and any data tables. Remove navigation, sidebars, ads, and footer. Return only the article body."
3. Save to `references/examples/{slug}.md` with frontmatter:

```markdown
---
source: {url}
scraped: {YYYY-MM-DD}
purpose: writing calibration example
---

{article content}
```

Derive the slug from the URL's last meaningful path segment.

**Failure handling:** If WebFetch fails (403, paywall, JS-rendered):
- Inform the user which URL failed
- Ask if they want to provide alternative URLs or skip
- Stages 3-4 work without examples (they just lose calibration data)

### Option 2: Skip

The `references/examples/` directory stays empty. Stages 3 and 4 will work without calibration examples but won't have structural/voice references.

---

## Round 4: Configuration

**Question:** "Two final settings:"

Use **AskUserQuestion** to collect:

1. **Working directory base** — "Where should article projects be saved? (default: `articles/`)"
   - Options: `Use default`, `Other` (custom path)

2. **Apify actors** — "Which Apify actors should I use for research? (defaults work well for most setups)"
   - YouTube: `streamers/youtube-scraper` (default)
   - X/Twitter: `apidojo/tweet-scraper` (default)

### Write Config

Save `skill_config.json` to the skill directory (`.claude/skills/blog-post-writer/skill_config.json`):

```json
{
  "setup_complete": true,
  "brand_name": "{from brand profile}",
  "base_directory": "{user's choice or default}",
  "apify_actors": {
    "youtube": {
      "actor": "streamers/youtube-scraper",
      "input_template": {
        "searchQueries": ["{{QUERY}}"],
        "maxResults": 15,
        "maxResultStreams": 0,
        "maxResultsShorts": 0,
        "dateFilter": "year",
        "sortingOrder": "relevance",
        "downloadSubtitles": true,
        "preferAutoGeneratedSubtitles": false,
        "saveSubsToKVS": false,
        "subtitlesFormat": "plaintext",
        "subtitlesLanguage": "en"
      }
    },
    "x": {
      "actor": "apidojo/tweet-scraper",
      "input_template": {
        "searchTerms": ["{{QUERY}}"],
        "maxItems": 20,
        "sort": "Latest"
      }
    }
  }
}
```

---

## Reconfiguration

When the user says "reconfigure" (or similar: "redo setup", "change brand profile", "update settings"):

1. Read existing `skill_config.json` and `references/brand-profile.md`
2. Ask which parts to reconfigure:
   - Brand profile
   - Writing guidelines
   - Calibration examples
   - Working directory / Apify config
   - Everything
3. Run only the selected rounds
4. Update `skill_config.json` (preserve unchanged settings)

---

## Setup Complete

After all rounds, confirm to the user:

```
Setup complete. Created:
- Brand profile: references/brand-profile.md
- Writing guidelines: references/writing-guidelines.md (defaults)
- Calibration examples: references/examples/ ({N} articles or "none — skipped")
- Config: skill_config.json

You can now provide a keyword to start writing. Say "reconfigure" anytime to update settings.
```
