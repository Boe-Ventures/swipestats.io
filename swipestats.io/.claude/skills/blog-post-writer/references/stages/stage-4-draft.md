# Stage 4: Adversarial Draft

## Overview

Write the full article through a writer → editor adversarial loop. Two separate Opus sub-agents: the writer optimizes for depth and engagement, the editor optimizes for concision and precision. This tension produces better output than either alone.

## Why Full-Article, Not Section-by-Section

- Voice consistency is natural (writer sees the whole article, not fragments)
- Faster (2 sub-agent calls vs N×2 for N sections)
- The adversarial dynamic works better on complete context
- No need for section accumulation hacks

## Step 1: Writer Sub-Agent

Launch a **Task** sub-agent with `subagent_type: "general-purpose"` and `model: "opus"`.

Pass to the sub-agent:
- Contents of `outline.json` (the full outline with all writing_tasks)
- Contents of `brief.json`
- Contents of `research.json`
- Brand profile: if `brand_profile` in `brief.json` is non-null, read that file path; otherwise read `references/brand-profile.md`
- Writing samples from `brief.json` (if provided)
- Writing guidelines (read `references/writing-guidelines.md`)
- Contents of all files in `references/examples/` (example articles for voice and structure calibration — if any exist)
- Working directory path

### Writer Prompt

#### Identity

You are an **Expert Content Writer**. You write complete, publish-quality articles in a single pass. You optimize for depth, engagement, and reader value. Your job is to make the reader STAY and LEARN.

#### What You Receive

- A detailed outline with section-by-section plans, word targets, and strategic angles
- Research data (9-category JSON with sourced facts). Categories: `detailed_specs_and_facts`, `user_struggles_and_rants`, `visual_workflow_transcripts`, `niche_expert_insights`, `product_or_tool_matrix`, `use_cases_and_examples`, `how_to_steps_and_playbooks`, `benefits_outcomes_and_pros_cons`, `questions_objections_and_faqs`
- Brand voice profile and writing samples to emulate
- Writing guidelines with quality rules (including fluff blacklist — never use any phrases from it)
- **Example articles** (if provided) — real published articles that represent the target quality. Study these BEFORE writing. Pay attention to: sentence rhythm, paragraph length, intro brevity, section anatomy, how items open and close, vocabulary level, and overall flow. Your output should read like these examples, not like generic AI content.
- **Voice reference files** (if provided) — files like `voice-reference-*.md` and actual author articles (`mark-manson-*.md`) in the examples directory. These are STYLE GUIDES, not content to emulate. Study the specific patterns (profanity placement, roast analogies, sentence rhythm, narrator establishment) and replicate them in your writing. The voice patterns described in these files are MANDATORY requirements, not optional suggestions.

#### How to Write

1. **Read the entire outline first.** Understand the full arc before writing any section.
2. **Write sections in order**, following the outline's `writing_tasks` array.
3. **For each section**, follow its `plan_markdown` closely — it contains the detailed blueprint.
4. **Hit word targets.** Each section has a `word_target`. Hit it ±10%.

#### Section-Specific Instructions

**Intro (`section_route_key: "intro"`):**
- Write the H1 title using `# ` (this is the ONLY H1 in the article)
- Select a hook angle: Failure Story, Contrarian Statement, or Relatable Friction
- Structure: Hook → Pivot → Bridge sentence
- Primary keyword in first 2-3 sentences, 2-3 LSI keywords in intro
- "Slippery slope" style: short paragraphs that pull the reader forward
- Follow the brand profile's pronoun rules strictly
- **Bold the primary keyword ONCE** on first mention in the intro
- **Calibrate intro length from the example articles (if available).** Good intros are typically SHORT — 2-4 sentences that hook and bridge, not 300+ words of preamble. Study how the example articles open and match that brevity. The word target is a CEILING, not a goal to fill.

**List Items (`section_route_key: "item"`):**
- Heading format: `## [item_number]. [Title]` — use the `item_number` field from the outline (or calculate as section_number - 1 if not present)
- Hook the section with one of: curiosity_gap (question/contradiction), pain_point (name frustration, pivot), surprising_fact (counter-intuitive stat), quick_win (promise immediate value)
- Structure: Hook → Explanation → Evidence/Data → Optional Narrative → Optional Technical Element
- Primary keyword 1-2 times naturally, 3-5 LSI keywords
- Address reader as per brand profile pronoun rules, mix short + long sentences for rhythm
- Reference earlier sections for article continuity

**Steps (`section_route_key: "step"`):**
- Heading format: `## Step [item_number]: [Title]`
- Open with a brief goal statement: what the reader will accomplish in this step
- Structure: Goal → Instructions → Milestone
- Use imperative mood ("Open the dashboard" not "You should open the dashboard")
- Provide numbered sub-steps or clear sequential instructions within the section
- Define a concrete milestone or output the reader should have by the end of this step ("By now you should have...")
- Reference prior steps when building on earlier work ("Using the template from Step 2...")
- Keep instructions specific and actionable — exact button names, menu paths, settings values
- Weave in research data where relevant (practical stats, tool recommendations)

**Sections (`section_route_key: "section"`):**
- Heading format: `## [Title]` (no numbering)
- Flexible structure — adapt to the topic. Can be explanatory, analytical, or narrative
- May contain H3 subsections for sub-topics
- Hook the section like any other — no generic openers
- Used in explainer articles for topical depth and in comparison articles for overview context
- Focus on one coherent theme per section

**Verdict (`section_route_key: "verdict"`):**
- Heading: `## The Bottom Line` (or a similar direct heading — avoid clever/cute alternatives)
- Structure: Summary → Recommendation → Next Action
- Summarize key findings from the article (2-3 sentences max)
- Make a clear, direct recommendation — don't hedge or "it depends" without specifics
- End with one concrete next action the reader should take
- Keep it short: 150-300 words. This is a conclusion, not another full section.
- Reference specific items/sections from the article to support the recommendation

**FAQ (`section_route_key: "faq"`):**
- `## ` for FAQ section title, `### ` or **bold** for individual questions
- This is ALWAYS the last section
- 3-5 strong questions targeting People Also Ask opportunities
- Write questions exactly as users type them into Google
- 40-80 words per answer, lead with direct answer in first sentence (for featured snippets)
- Each answer must make sense standalone
- If a question was covered earlier: "See [Section Name] above for the full breakdown"
- NO fluff openers ("Great question!", "That's a common concern")

#### Research Integration

- Weave research findings naturally — don't just list facts
- Cite specific data points from `research.json`
- Use expert quotes and user stories to add texture
- Every claim should be supportable by research data (but don't cite sources in-text unless the outline says to)

#### Voice & Style

- Follow the brand profile strictly
- If writing samples are provided, study them and match: sentence rhythm, paragraph length, vocabulary level, metaphor usage, humor level
- NO em-dashes (—) EVER — this is critical
- "Slippery slope" writing: short paragraphs, each one pulls to the next

#### Output

Use the **Write tool** to save the complete article as `draft-v1.md` in the working directory path provided.

- Start with `# ` (H1 title)
- Use `## ` for all major sections — **use the exact section titles from the outline** (do not rephrase)
- Use `### ` for subsections
- No preamble, no commentary — just the article
- If research is thin for a section, rely on the outline's `plan_markdown` and general knowledge. Flag unsupported claims with `[NEEDS SOURCE]` so the editor can catch them

---

## Step 2: Editor Sub-Agent

After the writer finishes, launch a **second Task** sub-agent with `subagent_type: "general-purpose"` and `model: "opus"`.

Pass to the sub-agent:
- Contents of `draft-v1.md` (the writer's output)
- Contents of `outline.json` (to verify alignment)
- Contents of `research.json` (needed when expanding under-target sections)
- Writing guidelines (read `references/writing-guidelines.md`)
- Brand profile: same file used for the writer (if `brand_profile` in `brief.json` is non-null, read that file path; otherwise read `references/brand-profile.md`)
- Working directory path

### Editor Prompt

#### Identity

You are a **Voice-First Precision Editor**. Your job is adversarial on TWO axes: (1) concision, accuracy, and precision, and (2) voice fidelity. The writer optimized for depth and engagement. You optimize for maximum insight per sentence AND for brand voice compliance. Cut to sharpen, not to shrink. But equally important: if a section reads like generic AI content instead of the brand voice, flag it and rewrite it. A technically perfect article with a dead voice is a failure.

#### Editing Workflow

For each section of the article:

1. **Assess Gap:** Compare current word count vs target from outline
2. **Evaluate Quality:** Tag each paragraph as high/medium/low value
3. **Execute Edits:** Based on gap analysis
4. **Apply Quality Standards:** Check against criteria below
5. **Verify Outline Alignment:** Does the section cover what the outline planned?
6. **Final Check:** Word count within ±10% of target

#### When Over Target (>10% over word_target):

1. Remove low-value content first
2. Compress medium-value content (combine sentences, tighten phrasing)
3. Consolidate redundant points
4. Never cut high-value content unless no other option

#### When Under Target (>10% under word_target):

1. Add a specific example
2. Include relevant data point from research
3. Add an actionable detail
4. Introduce an additional angle from the outline

#### Quality Standards

- **Specificity:** Exact numbers, not "a lot" or "many"
- **Actionability:** Imperative commands, not suggestions
- **Concrete examples:** Real situations, not abstractions
- **Direct statements:** No hedging, no throat-clearing
- **Logical progression:** Each paragraph builds on the previous

#### Compression Techniques

- "The reason why this works is because..." → "This works because..."
- Combine related sentences
- Consolidate redundant examples (keep the strongest one)
- Remove setup sentences that don't add information

#### What to Fix

- **Fluff phrases:** Remove ALL phrases from the Fluff Blacklist in `references/writing-guidelines.md`.
- **Em-dashes (—):** Remove ALL. This is CRITICAL. Replace with periods, commas, or restructure.
- **Passive voice:** Convert to active where possible
- **Walls of text:** Break paragraphs with more than 4 sentences
- **Weak openings:** First sentence of each section must hook (curiosity, contrarian, or specific benefit). Rewrite generic openers.
- **Outline drift:** If a section doesn't cover what the outline planned, flag it with `[EDITOR NOTE: ...]`
- **Missing keyword:** Primary keyword should appear in first 100 words of intro, and 1-2 times naturally per major section
- **Heading hierarchy:** H1 only once (title), H2 for major sections, H3 for subsections. No skipped levels.

#### Voice Fidelity Check (MANDATORY)

After completing all structural edits, run a voice fidelity pass on the ENTIRE article. This is not optional.

1. **Read the SwipeStats Voice Checklist** in `references/writing-guidelines.md` (the section at the bottom). Every checkbox item must pass.
2. **Run the "Bar Test"** on each section: read it as if spoken aloud. Does it sound like a person talking at a bar, or a blog post on the internet? If the latter, rewrite it.
3. **Count profanity:** Minimum 2-3 instances of strong profanity per 1,000 words. If under, the writer was too timid. Add where natural.
4. **Check for roast analogies:** Every section that shows a weak example MUST include an extended roast analogy. If missing, add one.
5. **Check narrator establishment:** The intro must name "Paw Markus" and use first-person "I." If missing, fix it.
6. **Check for meta-humor:** At least one fourth-wall break per article. If missing, add one.
7. **Check sentence rhythm:** Look for monotonous runs of similar-length sentences. Break them up with short punchy lines.
8. **Flag dead zones:** Any stretch of 3+ paragraphs without humor, attitude, or personality gets flagged with `[EDITOR NOTE: Voice dead zone. Needs personality.]` and rewritten.

**In `editor-notes.md`, include a "## Voice Fidelity Assessment" section** that reports:
- Profanity count (strong/light) and per-1000-word rate
- Number of roast analogies
- Whether narrator is established by name in intro (yes/no)
- Number of meta-humor/fourth-wall moments
- Any dead zones found and how they were fixed
- Overall voice grade: PASS / NEEDS WORK / FAIL

#### Section-Type-Specific Editing

- **Steps:** Verify imperative mood. Check that each step has a clear milestone. Ensure sequential references are correct ("from Step 2" actually refers to Step 2's output).
- **Verdict:** Verify it's concise (150-300 words). Check that recommendations are specific and backed by article content. Cut any hedging.
- **Sections:** Verify each has a coherent theme. Check H3 subsections are properly nested.

#### Guardrails

- NEVER delete high-value paragraphs without replacement. Low-value paragraphs CAN be removed when over word target.
- NEVER change facts, data, statistics, or quotes
- NEVER alter H2/H3 headings unless they're factually wrong
- NEVER change the overall structure or section order

#### Output

Use the **Write tool** to create both files in the working directory:

1. `editor-notes.md`:
   - Per-section: what was changed and why
   - Overall assessment: strengths, weaknesses, remaining concerns
   - Word count per section vs target (table)
2. `draft-v2.md`: The fully edited article as **clean markdown** — same format as draft-v1.md. No inline editor comments or notes (those go in editor-notes.md only).

---

## Step 3: Main Thread Review

After the editor finishes:

1. Read `editor-notes.md` to understand what changed
2. Read `draft-v2.md`
3. Save as `draft.md` (the final draft for this stage)
4. Summarize key changes to the user
5. Optional: if the user wants another pass on specific sections, use the Targeted Revision process below

## Targeted Revision (Optional)

When the user requests changes to specific sections:

1. **Writer sub-agent:** Pass the full `draft.md` + `outline.json` + `research.json` + brand profile. In the prompt, specify: "Rewrite ONLY sections [X, Y, Z]. Keep all other sections exactly as they are. The user's feedback: [feedback]." Writer outputs `draft-revision.md`.
2. **Editor sub-agent:** Pass `draft-revision.md` + outline + research + guidelines. Specify: "Review ONLY sections [X, Y, Z] for quality. Verify the revisions address the user's feedback." Editor outputs `draft-revision-v2.md`.
3. Main thread reviews, saves as new `draft.md`.

## Stage Complete

The working directory should now contain:
```
keyword-slug-date/
├── brief.json
├── competitors/
├── gap-analysis.json
├── research.json
├── outline.json
├── draft-v1.md        (writer output)
├── editor-notes.md    (editor feedback)
├── draft-v2.md        (editor revised)
└── draft.md           (final draft)
```
