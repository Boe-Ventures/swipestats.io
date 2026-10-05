# Testing principles

Keep roughly the most valuable 10% of tests. The aim is a small suite that
catches consequential mistakes without making ordinary changes expensive.
The percentage is a selection heuristic, not a quota or a coverage target.

## What earns a test

A test should detect a concrete failure with meaningful user or business cost:

- Raw dating identifiers reaching uploaded blobs, public responses, analytics,
  or model prompts; photo/work consent being ignored.
- Unverified admin access, cross-account uploads, or claims that delete an
  account still owning data.
- Invalid paid research entitlement, incorrect purchased quantities, or
  fulfillment silently treating a provider failure as a smaller purchase.
- Reuploads deleting retained messages, collapsing repeated occurrences, or
  losing optional evidence.
- Publishing small identifiable cohorts, invalid build lineage, or images
  whose privacy review is uncertain.
- Destructive repairs proceeding after failed postconditions.

Prefer exercising the behavior with realistic input and both acceptance and
rejection boundaries. Mock database/provider calls; do not use live customer
data or shared database credentials. Tests should fail for the stated defect,
not just because implementation structure changed.

## What usually does not earn a test

Routine copy, layout, formatting, wrapper plumbing, exhaustive helper
permutations, source-text searches, and assertions that restate an implementation
usually add more maintenance than protection. Use TypeScript, ESLint,
migration-history checks, copy checks, and appropriate manual QA for these.
Deletion does reduce protection against ordinary regressions; 10% does not
promise equivalent coverage or prove the deleted cases useless.

Before adding or restoring a test, explain the specific costly failure and the
gap in existing protection. Prefer replacing a weaker case. Essential new
privacy, billing, ownership, or data-loss protection is allowed even when it
increases the retained percentage. Do not grow the suite for every bug fix or
remove essential tests to satisfy a numeric cap.

## Validation

Run `bun check` before a PR. It runs copy and migration-history checks, Velite,
ESLint, TypeScript, and the retained Bun suite. `bun test` uses `test/setup.ts`
through `bunfig.toml` to supply local dummy credentials. Mock external calls;
that preload is not a database sandbox. When changing test setup or removing
suites, also run retained files individually to catch order dependencies.

Do not use `bun build` as a casual test command: it includes `bun db:migrate`.
Preview and local development share the long-lived Neon dev branch. Database
migration work follows the separate migration policy.

## October 2026 selection

The baseline at commit `874890d` passed 404 cases across 100 files, containing
9,791 test lines. Retained: 47 cases across 27 files (11.6%); removed: 357
cases (88.4%). Test source falls from 9,791 to 1,819 lines (81.4% less),
including the fixtures needed by the retained cases. The small exception
above 10% protects distinct high-cost
boundaries, especially consent, import preservation, and publication lineage.

[The retention audit](test-retention-audit.json) records kept and removed titles
against the full baseline commit. Git history preserves deleted suites for
selective restoration if a concrete regression demonstrates a missing guard.
Baseline passing status alone does not demonstrate defect detection quality.
