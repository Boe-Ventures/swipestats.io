# SwipeRank data-layer scripts

The exploration commands compute provisional Tinder leaderboards directly from
daily usage rows. Those probes are read-only. The versioned backfill command is
an explicit write operation and refuses to run without `--confirm-write`.

## Commands

```sh
bun run swipe-rank:profile -- --tinder-id <id>
bun run swipe-rank:profile -- --tinder-id <id> --period 2025-12 --period 2025
bun run swipe-rank:profile -- --tinder-id <id> --period all-time --json

bun run swipe-rank:survey -- --period-type month --last 12
bun run swipe-rank:survey -- --period-type quarter --last 8
bun run swipe-rank:survey -- --period-type year --json
bun run swipe-rank:audit-over-100

# List current exclusions (read-only).
bun run swipe-rank:moderate -- --list

# After inspecting the facts, admins and coding agents use the same locked
# service as the admin platform. Never put sensitive data in the reason.
bun run swipe-rank:moderate -- \
  --tinder-id <id> \
  --exclude \
  --reason "Evidence-based review reason" \
  --actor agent:codex \
  --confirm-write

bun run swipe-rank:moderate -- \
  --tinder-id <id> \
  --restore \
  --actor agent:codex \
  --confirm-write
```

Both scripts use the repo's configured `DATABASE_URL`. They only run `SELECT`
queries.

The moderation list is also read-only. Exclude and restore operations require
`--confirm-write`; they preserve the profile and its facts, change every live
ranking field, and record the current reason, actor, and timestamp. Use
`swipe-rank:inspect-facts` or `swipe-rank:audit-over-100` before excluding a
profile. Restoring clears the active exclusion metadata.

## Versioned fact build

Migrations `0008` onward add the provider-neutral profile registry, auditable
build records and activation state, period facts, and leaderboard
snapshot/entry tables. They do not change or periodize legacy `profile_meta`.

After applying the migration to the intended isolated database branch, run a
write-side rehearsal explicitly:

```sh
# Full Tinder reconciliation. This also removes orphan Tinder registry rows.
bun run swipe-rank:backfill -- --confirm-write

# Incremental recompute after one or more uploads.
bun run swipe-rank:backfill -- \
  --confirm-write \
  --profile-id <tinder-id> \
  --profile-id <another-tinder-id>

# Bounded recovery for refreshes lost after an already-committed upload.
bun run swipe-rank:reconcile -- --confirm-write --limit 100

# Read-only raw/rollup/sentinel/anomaly parity checks.
bun run swipe-rank:validate

# Required launch gate after migrations: one FULL build plus every validation.
# Product reads ignore cron-created partial facts until this succeeds.
bun run swipe-rank:launch -- --confirm-write

# Exact owner-facing global + peer placements from the built facts.
bun run swipe-rank:inspect-facts -- --tinder-id <id>

# Freeze an editorial edition only after a successful launch gate. --publish
# marks workflow state in the database; current product reads remain live-fact
# based and do not consume snapshot/entry tables yet.
bun run swipe-rank:snapshot -- \
  --confirm-write --period 2025-12 --publish
```

The backfill uses every stored `tinder_usage` row and `date_stamp_raw` for
calendar grouping. Months are canonical facts; quarters, years, and all-time
are derived only by summing months. Rates are generated from summed
numerators/denominators, never averages of monthly rates. All-time always uses
the explicit half-open `[0001-01-01, 9999-01-01)` sentinel.

Successful upload and location mutations schedule an immediate scoped refresh.
The daily `/api/cron/swipe-rank` reconciliation repairs missing facts, changed
source watermarks, stale descriptors, and orphan registry rows if a deferred
refresh was ever lost. It processes at most 100 source profiles per run; the
manual command accepts a bounded `--limit` up to 500.

`--confirm-write` is mandatory. The runner does not infer whether a URL points
at shared dev or production, so operators must set `DATABASE_URL` to the
intended branch and follow `docs/ops/database-migrations.md`.

Do not expose the new product surfaces in a deployment until
`swipe-rank:launch` succeeds against that deployment's database. A FULL build
commits in an inactive state, validation independently checks raw/month/rollup,
metric-input, descriptor, freshness, and quality-flag parity, and only then is
that exact unchanged build activated. Public and owner reads follow the newest
completed FULL build: if a newer replacement has not been activated, reads stay
dark rather than falling back to an older approval. PROFILE reconciliation
builds after activation remain live without becoming launch gates themselves.
The launch command only activates the metric version compiled into the product;
arbitrary experimental versions cannot report product readiness.

Database readiness changes atomically. The public leaderboard cache can retain
its prior response for up to 60 seconds, and its period inventory for up to 300
seconds, because command-line activation cannot invalidate every deployed Next
process. Treat those as bounded propagation windows rather than immediate
cross-process cache invalidation.

`swipe-rank:validate` reports fact validity separately from whether the latest
FULL source generation is current enough to freeze an edition. A normal scoped
refresh can leave every fact valid while `snapshotSourceCurrent` is false;
create a fresh launch build immediately before a snapshot.

## Prototype metric contract

- **Metric:** observed matches divided by swipe likes within the period.
- **Calendar:** `tinder_usage.date_stamp_raw` defines period boundaries. This
  avoids shifting older local calendar dates when timestamps are converted to
  UTC.
- **Population:** non-computed Tinder profiles with usage in the period.
- **Exact position:** SQL competition rank, so exact ties share a position.
- **Global field:** all eligible profiles.
- **Peer field:** same gender and interested-in gender. Age and location are
  returned as context but do not filter the first peer leaderboard.
- **Freshness:** every result has an `asOf` timestamp. Rerunning after late
  uploads can change the position and field size.

Default eligibility is intentionally easy enough to keep months competitive:

| Period   | Minimum likes | Minimum active days |
| -------- | ------------: | ------------------: |
| Month    |           100 |                   5 |
| Quarter  |           250 |                  15 |
| Year     |           500 |                  40 |
| All-time |         1,000 |                  40 |

The floors are version-one hypotheses, not permanent product rules. Both can be
overridden from the command line for sensitivity checks.

## Interpretation limits

This match rate is an observed flow ratio, not a conversion probability. A
match can be recorded in a different period from its originating like, so a
profile-period can exceed a 100% match rate. The prototype therefore does not
apply a binomial confidence interval or cap rates at 100%.

Ranks describe uploaded Tinder activity, not attractiveness, dating success, or
human worth. The database is a self-selected sample and late uploads can revise
historical fields. A productized leaderboard should publish a metric version,
eligibility version, and snapshot timestamp alongside every result.
