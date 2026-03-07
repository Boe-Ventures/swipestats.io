# SwipeStats Writing Guide

## Voice & Tone — THIS IS THE #1 PRIORITY

**Voice is not decoration. Voice IS the content.** If a paragraph is informative but boring, it fails. Every sentence must either make the reader laugh, teach them something, or ideally both. If it does neither, delete it or rewrite it.

**Model:** Mark Manson. Not "inspired by" Mark Manson. Not "slightly like" Mark Manson. Actually write like him.

**What that means in practice:**

- **Roast the reader with love.** Assume they're making mistakes. Call those mistakes out directly. "Your photos are your Tinder resume. Stop submitting the equivalent of crayon drawings." Not "consider improving your photos."
- **Swear naturally.** Not in every sentence, but when a clean word doesn't hit as hard, use profanity. "Tinder knows you're too broke to afford the premium versions" is better than "Tinder limits free users." Use profanity as a precision tool, not decoration.
- **Assume the worst about the reader's situation.** "Is your phone drier than Gandhi's flip-flops during a desert marathon?" creates intimacy. "Some users may experience lower match rates" creates distance.
- **Build the insult INTO the factual sentence.** Don't add jokes as kickers after neutral facts. The dig should be load-bearing. "Free users get a limited number of likes per day because Tinder knows you're too broke" not "Free users get limited likes. Sucks, right?"
- **Use first person when it adds texture.** "I've put Hinge through its paces" or "Here's something that surprised us in the data." A narrator with a personality, not a faceless content machine.
- **Never let up in the middle sections.** Voice is not something you turn on in the intro and off in the FAQ. Every bullet point, every list item, every section header should carry the voice. If a section reads like a different person wrote it, rewrite it.

**The 3 mechanical rules that make it work:**

1. **Build the insult INTO the factual sentence, not after it.** "Free users get limited likes because Tinder knows you're too broke" works. "Free users get limited likes. Sucks, right?" doesn't. The dig must be load-bearing.
2. **Address the reader directly and assume the worst.** "Is your phone drier than Gandhi's flip-flops?" assumes bad results and creates intimacy. "Some users may experience lower match rates" hedges and creates distance.
3. **Never let up in the middle sections.** The strongest posts are funny in EVERY bullet of a bullet list. Weak posts are funny in the intro and generic in the middle. Voice is a sustained posture, not a toggle.

**The test:** Read every paragraph out loud. If it sounds like something a smart, funny friend would say at a bar, keep it. If it sounds like a content agency wrote it, burn it down and start over.

## Gold Standard Example Posts

Before writing ANY content, read these 3 posts in their entirety. They ARE the voice reference:

1. `.claude/skills/swipestats-content-creator/references/example-tinder-likes-reset.mdx` — Peak voice. Every bullet has a barb. The gold standard.
2. `.claude/skills/swipestats-content-creator/references/example-tinder-more-matches.mdx` — Consistent warm-brutal tone. Strong analogies.
3. `.claude/skills/swipestats-content-creator/references/example-tinder-review.mdx` — Best review with personality. Same format as app reviews.

Do not summarize these. Read them fully. Match that energy.

**Do:**
- Lead with data, follow with a roast or insight
- Use "you" directly and aggressively
- Use vivid, specific metaphors ("Gandhi's flip-flops" not "very dry")
- Use fragment sentences for punch ("No fluff. No theory. Just data.")
- Acknowledge dating apps can be frustrating, then make fun of everyone involved
- Short sentences. Short paragraphs. White space.
- Rhetorical questions for rhythm, answered directly

**Don't:**
- Generic AI dating advice ("be yourself", "smile more")
- Clickbait without substance
- Patronizing tone ("don't worry, you'll find someone!")
- Filler words and hedge phrases
- Overly academic/dry presentation of data
- Buzzwords ("optimize your love life", "hack the algorithm")
- Politely skeptical journalism voice ("while concerns exist...")
- Safe, mild humor that could appear in a corporate blog

## Data Usage

SwipeStats has proprietary data from 7,000+ real Tinder profiles:
- 294M total swipes analyzed
- 3.14M matches
- Detailed usage patterns, message rates, match rates

**Rules for using data:**
- Always specify the sample size when citing stats
- Use percentages for comparisons, absolute numbers for impact
- Round to reasonable precision (not "23.847%", just "24%")
- Compare against benchmarks where possible (e.g., "the average male right-swipe rate is 53%")
- Cite the source as "SwipeStats data" or "our analysis of X profiles"
- Translate every number: 1.69% = "1-2 matches per 100 swipes"
- Present data as confirmation of something the reader suspects, not as academic proof

**Data points commonly used:**
- Average match rates by gender
- Right-swipe rates and patterns
- Message-to-match ratios
- Active usage duration
- Swipe volume patterns
- Profile completion correlations
- Age and gender distributions

## Content Patterns

### Statistics Posts
- Lead with the most surprising finding
- Use comparison tables and percentile breakdowns
- Include "what this means for you" sections
- End with actionable takeaways

### Guide Posts
- Start with the problem/frustration
- Break into clear, actionable steps
- Include data to back up recommendations
- Use before/after or comparison framing

### App Reviews
- Honest assessment, not promotional
- Compare against alternatives with data
- Include pricing and value analysis
- Address common complaints directly
- Roast the app's flaws, don't politely note them

### Hinge Prompt Posts
- Focus on what actually works (data-backed when possible)
- Provide specific examples, not just principles
- Categorize by type (funny, serious, creative)
- Include what to avoid

## SEO Writing

- Primary keyword in first paragraph naturally
- Secondary keywords spread across H2 headings and body
- Use question keywords as H2/H3 headings where natural
- Keep meta descriptions compelling and click-worthy
- H1 should be engaging, not just SEO-stuffed
- **SEO serves the voice, not the other way around.** Never sacrifice personality to hit a keyword. Weave keywords in naturally after writing with full voice.

## Formatting

- Use `<TLDR>` component for quick summary at top of longer posts
- Use `<Video>` component for embedded YouTube videos
- Markdown tables for data comparisons
- Bold for emphasis on key statistics
- Bullet lists for scannable information
- Keep paragraphs to 2-4 sentences max

## Anti-Slop Rules (non-negotiable)

- NO em-dashes (—). Never. Use a period or a short new sentence instead.
- NO "however", "moreover", "furthermore", "in conclusion", "it's worth noting"
- NO passive voice constructions ("it can be seen that", "users are given")
- NO hedging openers ("When it comes to X...", "In the world of dating...")
- NO politely skeptical phrasing ("while some users may find...", "it's fair to say...")
- Short sentences. One idea per sentence. If you're using a comma to hold two thoughts, split it.
- Write like a smart friend roasting you at a bar, not a content agency.

## Internal Linking

- Link to `/upload` when mentioning getting your own stats
- Link to `/insights` when referencing aggregate data
- Link to relevant blog posts for deeper dives
- Anchor text: 2-5 words max. Describe what the linked page is about (match the linked page's topic).
- Never use "click here" or generic anchors
- No more than 1 link per 200 words
- Do not use the same anchor text more than once per post
- 3-8 internal links per post
- Spread across sections, don't cluster

## Sources

- End each post with a sources section (if using external data)
- Prioritize: academic studies, official reports, reputable publications
- Never link to direct competitors
- SwipeStats own data doesn't need external sourcing
