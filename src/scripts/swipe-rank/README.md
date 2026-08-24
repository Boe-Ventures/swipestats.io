# SwipeRank operations

SwipeRank uses closed calendar seasons. At 06:30 UTC on the first day of each
month, `/api/cron/swipe-rank` builds and validates completed facts and publishes
the preceding month. The same invocation also publishes the preceding quarter
on April 1, July 1, October 1, and January 1. January 1 also publishes the
preceding year.

Uploads only persist verified Tinder source data and normal profile insights.
They do not compute, refresh, or schedule SwipeRank.

The publisher is idempotent. Published snapshots remain immutable; a retry
creates only the season snapshots missing from that boundary.

Manual recovery uses the same path as cron:

```bash
bun run swipe-rank:publish -- --confirm-write
```

Read-only checks remain available:

```bash
bun run swipe-rank:validate
bun run swipe-rank:inspect-facts -- --tinder-id <id>
bun run swipe-rank:audit-over-100
```

## Local Codex rehearsal

`swipe-rank:review-codex` prepares a profile-centered review of the top 50
profiles in each of the latest 12 closed monthly seasons. Database work runs in
a PostgreSQL `READ ONLY` transaction. The command writes redacted evidence,
downloaded image copies, a private profile map, Codex event logs, and structured
verdicts beneath the git-ignored `temp/swipe-rank-codex-review/` directory.

Prepare five profiles without invoking a model:

```bash
bun run swipe-rank:review-codex -- \
  --neon-project little-breeze-40351572 \
  --neon-branch production \
  --limit 5
```

Run the same calibration with ChatGPT-authenticated Codex and GPT-5.6 Terra:

```bash
bun run swipe-rank:review-codex -- \
  --neon-project little-breeze-40351572 \
  --neon-branch production \
  --limit 5 \
  --model gpt-5.6-terra \
  --reasoning high \
  --run
```

Pass `--limit 0 --run` after inspecting the calibration to review the complete
one-year union. This tool never persists reviews, exclusions, or snapshots to
the database. Use `--offset N --limit M` for bounded sequential batches.

Persisted AI reviews use the stable `swipe_rank_profile` as their subject. One
review bundles every current published placement and the profile's complete
monthly history. A matching evidence hash reuses the stored review across
seasons. New source evidence or a newly published placement changes the hash
and triggers a fresh review the next time the profile enters a review batch.
The older entry-scoped review table remains read-only migration history.

Moderation remains reversible and acts on published fields:

```bash
bun run swipe-rank:moderate -- --tinder-id <id> --exclude \
  --reason "Confirmed test profile" --actor "admin@example.com" --confirm-write
```
