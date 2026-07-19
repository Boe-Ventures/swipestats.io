# PR #12 blog rescue handoff

Status snapshot: July 14, 2026

## Executive summary

Pull request [#12](https://github.com/Boe-Ventures/swipestats.io/pull/12),
`Add 82 new blog posts (March batch)`, was closed as stale on July 14, 2026.
It was never merged. The remote source branch and head commit are still intact:

- Branch: `blog/new-posts-march-2026`
- Head/source commit: `b3c341d312ac5edf89fda078b880c35a5670f2e0`
- PR state at audit: conflicting with current `main`
- Final commit contents: **81 added posts and 1 modified post**

The PR was stale as a delivery vehicle, but the unmerged content is not
redundant. A sample review found that much of it is worth rescuing after a
factual, editorial, CTA, and publication-date refresh.

Do not merge or cherry-pick the full historical branch. Earlier commits from the
same branch already landed through PR #9, and current `main` has since changed
the blog infrastructure and several overlapping posts. Create a clean worktree
from current `main`, restore only the 81 files added by the final commit, and
open a new PR that references #12.

## What actually landed and what did not

The old branch contains multiple content batches, which made the original PR
look more complete than the final unmerged batch actually was.

- The merge base is commit `4c71f9b7`, `Blog: 50+ new posts, stat updates,
  ImageGrid component (#9)`.
- The final #12 commit added 81 new MDX files and modified
  `content/posts/hinge-verification-not-working.mdx`.
- None of those 81 newly added paths currently exists on `main`.
- The modified Hinge verification post exists on `main`, but its current content
  differs. Review it manually; do not overwrite it wholesale.
- The remote #12 branch still points to the source commit, so no content was
  lost when the PR was closed.

To enumerate the exact 81 files from the preserved source commit:

```bash
git diff-tree --no-commit-id --diff-filter=A --name-only -r \
  b3c341d312ac5edf89fda078b880c35a5670f2e0 -- 'content/posts/*.mdx'
```

## Recommended recovery shape

1. Create an isolated worktree and branch from current `main`.
2. Restore only the 81 paths added by `b3c341d3`.
3. Compare `hinge-verification-not-working.mdx` separately and keep only useful,
   still-current improvements.
4. Apply the editorial and factual review rules below.
5. Assign a dependency-aware publication schedule.
6. Apply the current ProductCard/CTA conventions to the best commercial-intent
   posts.
7. Validate the complete content batch, then open and merge a clean replacement
   PR referencing #12.

Suggested worktree setup:

```bash
git fetch origin
git worktree add ../swipestats-blog-pr12-rescue \
  -b codex/blog-pr12-rescue origin/main
```

Avoid cherry-picking the full commit or merging the old branch. The clean PR
should contain the rescued content and deliberate current-infrastructure
changes, not the old branch's unrelated history.

## Quick content audit

Eight posts were sampled across commercial, evergreen, algorithm, and advice
search intent:

- `hinge-algorithm`
- `tinder-platinum`
- `bumble-premium`
- `how-does-tinder-work`
- `how-to-reset-tinder`
- `best-conversation-starters-over-text`
- `ai-rizz-generator`
- `pick-up-lines`

The sample articles are substantial rather than thin filler: roughly 2,500 to
4,500 words, with useful headings, TL;DR sections, internal links, source
sections, and SwipeStats product/data hooks.

### Strong rescue candidates

These appear commercially or editorially valuable after a light-to-medium
refresh:

- `tinder-platinum`
- `bumble-premium`
- `how-does-tinder-work`
- `best-conversation-starters-over-text`
- `ai-rizz-generator`
- `pick-up-lines`

### Heavy-review candidates

- `hinge-algorithm`: good search intent and framing, but it presents several
  undocumented ranking theories as facts. Hinge currently documents mutual
  dealbreakers, recent activity, and shared liking patterns for Most Compatible;
  it does not substantiate every visibility, mass-liking, new-user-boost, or
  conversation-outcome claim in the draft.
- `how-to-reset-tinder`: the official 90-day retention/restore information is
  useful, but the identity-wipe and detection-evasion guidance should be
  removed. Keep legitimate deletion, subscription-cancellation, restore, and
  profile-improvement guidance.

The sample supports rescuing the batch, but **none of the sampled posts should
be published unchanged**.

## Factual and editorial refresh rules

### Normalize SwipeStats data claims

Use `content/posts/tinder-statistics.mdx` as the current canonical source. At the
time of this audit it distinguishes:

- Average male match rate: approximately 5.3%
- Average female match rate: approximately 44.4%
- Median male match rate: 2.04%
- Dataset: 7,079 profiles, approximately 294 million swipes, and 3.14 million
  matches

Several rescued drafts interchange averages, medians, or older figures such as
1-2%, 5%, 10%, or 30%+. Label the denominator and statistic explicitly. Do not
present Tinder-derived measurements as observed Hinge or Bumble performance.

Also review claims about replies, ghosting, conversation quality, photo effects,
and subscription lift against what the underlying export data can actually
support. Avoid turning plausible advice into a proprietary-data claim without a
reproducible calculation.

### Refresh product features and pricing

Exact subscription prices are dynamic and location-dependent. Prefer current
official feature descriptions, add a checked-on date, and tell readers to verify
the price shown in their app instead of presenting a single permanent price.

Useful current sources:

- [Tinder Priority Likes](https://www.help.tinder.com/hc/en-us/articles/360046802931-Priority-Likes)
- [Tinder First Impressions](https://www.help.tinder.com/hc/en-us/articles/360046358932-First-Impressions)
- [Bumble subscription plans](https://support.bumble.com/hc/en-us/articles/32668790872733-Understanding-Bumble-s-paid-features-and-subscription-plans)
- [Bumble pricing guidance](https://support.bumble.com/hc/en-us/articles/30614091973149-Pricing-information-for-paid-features)
- [Hinge Most Compatible](https://help.hinge.co/hc/en-us/articles/360011233073-What-is-Most-Compatible)
- [Hinge automated decision-making](https://help.hinge.co/hc/en-us/articles/360010956733-Automated-decision-making-and-Profiling-at-Hinge)
- [Tinder account deletion](https://www.help.tinder.com/hc/en-us/articles/6956972185229-Delete-your-Tinder-account)

### Review source quality

The drafts generally include source sections, but source quality varies. Treat
official product documentation, first-party reports, and peer-reviewed research
as stronger evidence than Medium posts, YouTube search-result pages, aggregator
statistics, or personal anecdotes. Either replace weak sources or qualify the
claim.

Examples needing attention:

- The `pick-up-lines` post makes a prominent 50-million-message claim based on a
  Medium article.
- Subscription-review posts use YouTube experiments as if they generalize to all
  users.
- Some algorithm posts convert old interviews and user observations into claims
  about the current production ranking system.

### Keep the voice, reduce repetitive hostility

The drafts have a distinctive, energetic voice, but many repeat insults about
users being desperate, unattractive, lazy, or socially incapable. Keep the wit
and directness while reducing repetitive shaming and unsupported certainty.

Several articles also make first-person claims in Paw's voice, such as personally
testing products or spending money on subscriptions. Verify those statements or
rewrite them as SwipeStats editorial analysis before publishing under the
existing author attribution.

## Publication-date recommendation

The original dates should not be preserved as-is. The 81 posts were compressed
into only eight publication dates:

| Date | Posts |
| --- | ---: |
| 2026-03-25 | 14 |
| 2026-03-26 | 13 |
| 2026-03-27 | 13 |
| 2026-03-28 | 12 |
| 2026-03-29 | 7 |
| 2026-03-30 | 10 |
| 2026-03-31 | 11 |
| 2026-04-01 | 1 |

Current `main` already has posts dated through June 15, 2026. As of the July 14
snapshot, the recommended schedule is:

- Publish 4-6 refreshed evergreen posts immediately with honest recent dates.
- Schedule the remaining posts mostly forward at two per day.
- If six posts are published immediately and 75 are scheduled from July 15,
  two per day fills the calendar through approximately August 21.
- If the rescue starts later, shift the entire schedule forward rather than
  pretending the content was published in March.
- Set `updatedAt` to the actual editorial verification date.

The batch contains 128 unique internal blog targets. All resolve somewhere on
the preserved branch, but 53 point to another post inside this same 81-post
batch. Generate the schedule with dependency ordering so a live article does not
link to a still-future article that returns 404.

## Current CTA and ProductCard conventions

The old drafts predate the current curated ProductCard rollout. Follow
[`BLOG.md`](../BLOG.md) and the implementation in
`src/components/mdx/ProductCard.tsx`.

### Default long-tail behavior

For ordinary long-tail posts, keep:

```yaml
showStickyCTA: true
enableAutoCtAs: true
```

`CtaInjector` will add alternating generic product and newsletter cards. Do not
manually add the same generic card to every rescued article.

### Curated high-intent behavior

For commercially important or especially high-intent posts, use one or two
contextual ProductCards and disable automatic CTA injection:

```yaml
showStickyCTA: true
enableAutoCtAs: false
```

Available product keys and likely rescue-batch uses:

| Product key | Use in rescued posts |
| --- | --- |
| `insights` | Match rates, algorithms, subscriptions, boosts, and worth-it posts |
| `profile-compare` | Photos, bios, profile reviews, and profile optimization |
| `profile-roast` | Strong profile-improvement intent |
| `prompt-assistant` | Hinge/Bumble prompts, openers, and conversation starters |
| `directory` | App comparisons, demographics, datasets, and discovery |

Good first manual-card candidates from the sampled set:

- `tinder-platinum` -> `insights`
- `bumble-premium` -> `insights`
- `how-does-tinder-work` -> `insights`
- `best-conversation-starters-over-text` -> `prompt-assistant`
- `pick-up-lines` -> `prompt-assistant`
- `ai-rizz-generator` -> `prompt-assistant`

ProductCard clicks already emit `blog_product_card_clicked` with source post,
destination product, and destination path through the shared analytics layer.
Reuse that system instead of adding new click instrumentation in individual
posts.

## Suggested execution batches

### Batch 1: Evergreen editorial content

Start with lower-drift texting, opener, and communication posts. Validate their
sources and tone, then use them as the first immediate/future publications.

### Batch 2: Product and subscription guides

Refresh official features, current naming, and price caveats. Add appropriate
`insights` ProductCards to the strongest commercial-intent posts.

### Batch 3: Algorithms, bans, resets, and account behavior

Apply the strictest evidence review. Remove evasion instructions and clearly
separate official facts, SwipeStats measurements, informed inference, and
anecdote.

### Batch 4: Final link graph and schedule

After content edits, regenerate the internal-link graph and assign dates so
dependencies publish first. Confirm every future-dated post remains hidden until
its intended date.

## Merge gate

Before opening the replacement PR:

```bash
bun run velite:build
bun run check
```

Also perform these content-specific checks:

- Verify all 81 slugs build and have unique canonical URLs.
- Confirm `metaTitle` and `metaDescription` satisfy the current Velite schema.
- Check internal links against the final schedule, not only file existence.
- Spot-check one article from every editorial batch in a browser.
- Preview both automatic CTAs and manual ProductCards.
- Verify future posts are absent before `publishedAt` and visible on/after it.
- Review the PR diff to ensure no old blog infrastructure or unrelated branch
  history came along with the content.
- Include the publication schedule and manual QA notes in the replacement PR.

## Definition of done

This rescue is complete when:

- The 81 missing posts have explicit keep/rewrite/drop decisions.
- Kept posts use current factual claims, canonical SwipeStats metrics, and
  defensible sources.
- High-intent posts use the current ProductCard system deliberately.
- Dates form a mostly forward, dependency-safe calendar.
- The replacement PR is based on current `main`, passes the repository gate, and
  is actually merged.

