# Love Stories: feature or product?

## Direction confirmed November 23, 2026

Finish the SwipeStats Draupnir/oRPC migration first. Then build Love Stories as
a feature inside SwipeStats that is usable independently, like Profile Compare,
without requiring a dating-data upload. Keep the API inside
`apps/standalone-web`; extracting shared packages or launching a separate app is
not a current priority. The original evaluation below remains background, not
an instruction to pursue a standalone product now. See the
[data-model discussion draft](love-stories-data-model.md).

The latest Person direction is a mutable overall reflection on a relationship,
with structured analytics fields on Person, including origin, nationality,
representative integer age, first contact, intent, compatibility, and chemistry.
Encounter reflections can preserve important changes in perception. The current
model supersedes earlier proposals for dated Person snapshots and mandatory
override-history records.

## Recommendation

Pilot **Love Stories by SwipeStats** as a distinct private journal inside the existing account. Give it its own entry point and visual identity. Do not require a Tinder/Hinge upload. Keep its domain and tables separable so a later standalone launch is a product decision, not another backend rewrite.

This is a hypothesis to test, not a validated market conclusion. No customer interviews, conversion experiment, or retention data were collected during this engineering experiment.

## What exists today

The original Love Stories repository contains the Draupnir foundation and design direction, rather than a shipped journal. Its useful constraints are: preserve verbatim memories; attribute and version extraction; explicit edits and clears beat inferred values; allow name-only people and uncertain dates; make subjective reflections optional. Private source fixtures must stay out of Git.

The new `/experiments/love-stories` preview uses fictional people. Its toggle compares integrated and standalone presentations. It demonstrates a roster, per-person story, imprecise dates, reflections, and an ephemeral draft. It does not implement storage, extraction, editing, or a complete journal. Reloading clears typed text. The route is marked noindex.

## Comparison

| Decision         | Inside SwipeStats                                               | Separate product                                                     |
| ---------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Initial audience | Existing dating-data users are a plausible starting cohort      | Must acquire people specifically seeking a journal                   |
| Activation       | Can bridge from a dated event or personal insight               | Can begin with a name and memory, with no data export                |
| Repeat use       | Journaling could give people a reason to return between imports | Journaling must justify its own habit and subscription               |
| Trust            | Analytics/research branding may discourage intimate writing     | A dedicated private identity may make the promise clearer            |
| Engineering      | Reuse account, billing, ownership checks and operations         | Separate deployment/brand still can reuse domain code                |
| Main risk        | Treating people and relationships as another score              | Building a second acquisition, support and billing business too soon |

Those benefits and risks are product hypotheses. Repository evidence supports the reuse argument: SwipeStats already has auth, billing, private events, account deletion, and dating-data ownership. It has no complete Love Stories domain. A generic event table is insufficient for provenance, uncertain dates, people, explicit overrides, or narrative revision history.

## Architecture to keep the choice reversible

Add user-owned `person`, `story_entry`, `entry_person`, `extraction_revision`, and explicit override records behind a `loveStories` domain. Exact schema design should follow the original evidence/provenance contract. Keep original prose and derived facts separate. Never put inferred intimate facts into public profiles, research exports, rank calculations, or analytics events.

Use explicit opt-in links to imported dating data; never make an import a prerequisite. Start with one account and existing billing infrastructure, but decide entitlement and pricing from the pilot. A separate brand or hostname does not require separate identity tables or an organization tenancy model.

The current MCP connector deliberately exposes no journal content. Any future journal tools need separate scopes, readable consent, owner checks and deletion coverage. Share the domain implementation across web and a later connector, with narrower per-surface permissions.

## Smallest useful pilot

1. Ship durable name-only people and verbatim entries, optional dates, edit/delete/export, and the account-deletion cascade. Start with manual entry before AI extraction.
2. Invite a small opted-in cohort from SwipeStats and a separate cohort that has never uploaded dating data. Show both product presentations with the same underlying workflow.
3. With consent, measure first-entry completion, second entry on a different day, week-two and week-four return, voluntary willingness to pay, and whether people understand the privacy promise. Collect counts and timestamps, never prose or names.
4. Interview drop-offs: is the obstacle trust, effort, missing functionality, or a lack of need?

Proposed decision rule: keep it integrated if activation depends mostly on SwipeStats and independent journaling remains weak. Invest in the standalone brand if people without imports repeatedly return, can describe its value independently of analytics, and demonstrate willingness to pay. Set numeric thresholds before recruiting the pilot; the current evidence cannot justify inventing a conversion target.

## What this experiment resolves

Packaging is no longer the blocker: the same Next.js app can run in a Draupnir workspace or export independently. The remaining question is whether remembering and reflecting on relationships becomes a useful recurring habit. The strongest next investment is a small, private, durable journal pilot, not a separate company-sized launch.
