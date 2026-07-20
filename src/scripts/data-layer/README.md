# Ranking data-layer probes

These scripts audit the current aggregate tables and test a replacement shape
without writing to the database. They use the repo's configured `DATABASE_URL`.

## 1. Audit `profile_meta`

```sh
bun run data-layer:audit-profile-meta
bun run data-layer:audit-profile-meta -- --json
bun run data-layer:audit-profile-meta -- --skip-conversations
```

Checks provider-key grain, missing and duplicate rows, formula invariants, raw
Tinder usage totals, conversation aggregates, Hinge capability placeholders,
profile-range exclusions, and all-time eligibility differences.

### Retired: legacy Hinge rates-above-100 audit

```sh
bun run data-layer:audit-profile-meta -- --json
bun run data-layer:repair-conversations -- --provider HINGE --json
```

`data-layer:audit-hinge-over-100` remains as a non-mutating, non-querying
fail-fast wrapper so old runbooks receive actionable guidance. Its linked-thread
origin heuristic was superseded by the canonical persisted-origin model. Use
the profile-meta audit for provider grain, formulas, and stored rates; use the
conversation repair without `--apply` for a read-only comparison against
canonical outbound-like yield. The retired per-profile and source-blob modes do
not have a safe canonical equivalent.

## 2. Verify legacy cohort cleanup after the rollback window

```sh
bun run data-layer:audit-cohorts
bun run data-layer:audit-cohorts -- --json
```

Run this after the follow-up cleanup migration, not as a first-release launch
gate. The initial SwipeRank migration deliberately preserves the obsolete
`cohort_definition` and `cohort_stats` tables so the previous production build
remains rollback-safe, while all new product reads use SwipeRank. This command
then proves those tables are absent, no fake `cohort_*` Tinder profiles remain,
and the activated replacement has versioned facts. Saved editorial cohort
definitions live on immutable SwipeRank snapshots; live age, gender, interest,
and location comparisons use descriptor filters against the same fact build as
ranking.

## 3. Probe a descriptor-defined cohort

```sh
bun run data-layer:probe-cohort -- \
  --tinder-id <id> \
  --period 2025-12

bun run data-layer:probe-cohort -- \
  --period 2025 \
  --gender MALE \
  --interested-in FEMALE \
  --age-min 25 \
  --age-max 34 \
  --country US \
  --series \
  --json
```

With a target ID and no descriptor flags, the script infers gender and
interested-in from the target. The response is a cohort comparison subject, not
a fake Tinder profile inserted into provider tables. The optional monthly series
uses the fixed cohort membership as its denominator, so inactive members count
as zero rather than silently disappearing. Country filters canonicalize
equivalent ISO-2, ISO-3, English-name, native-name, and a small set of
unambiguous aliases (`NO`/`NOR`/`Norway`, `GB`/`UK`) at query time. Source
profile and user location values are not rewritten.

## 4. Audit descriptor coverage and cohort viability

```sh
bun run data-layer:audit-descriptors -- --period 2025
bun run data-layer:audit-descriptors -- \
  --period 2025-12 \
  --tinder-id <id> \
  --json
```

Measures gender, interest, age, and location coverage; raw profile/user location
disagreements; and the number of descriptor combinations that clear candidate
privacy thresholds. Age bands use age observed inside the selected period.

## 5. Inspect period-layer economics

```sh
bun run data-layer:inspect-periods -- --period 2025
bun run data-layer:inspect-periods -- --period 2025-12 --analyze --json
bun run data-layer:inspect-periods -- --period all-time --analyze --full-plans
```

Reports table and index sizes, candidate profile-month/quarter/year row counts,
and query plans for raw period aggregation and ranking. `--analyze` executes the
read-only selects to collect actual timing and buffer data. The default output
keeps only compact plan summaries; add `--full-plans` for every plan node.

## 6. Audit upload-vintage bias

```sh
bun run data-layer:audit-upload-vintage
bun run data-layer:audit-upload-vintage -- --json
```

Separates activity year from database upload year. An old season's field grows
whenever a newly uploaded export contains activity from that season, so a rank
must always carry its source cutoff and sample size.

## Safety

Every active audit/probe command is read-only. Active repair commands are dry
runs unless `--apply` is passed. `data-layer:repair-profile-meta` remains as a
non-mutating, non-querying fail-fast wrapper because its legacy implementation
mixed usage aggregation with superseded conversation formulas and could create
metadata from stale derivatives.

```sh
bun run data-layer:audit-profile-meta -- --json
bun run data-layer:repair-tinder-dates -- --json
bun run data-layer:repair-conversations -- --provider TINDER --json
```

Run all three checks first. During a maintenance window, apply the two focused
repairs and then rerun the audit:

```sh
bun run data-layer:repair-tinder-dates -- --apply --json
bun run data-layer:repair-conversations -- --provider TINDER --apply --json
bun run data-layer:audit-profile-meta -- --json
bun run swipe-rank:launch -- --confirm-write
```

If the audit reports a missing `profile_meta` row, stop. The canonical repair
scripts deliberately do not invent one from partial aggregates; regenerate it
through the profile ingestion/service path instead. A targeted calendar repair
can still use `--tinder-id <id>`, but conversation repair operates at provider
grain.

## 7. Repair legacy Tinder calendar dates

```sh
bun run data-layer:repair-tinder-dates
bun run data-layer:repair-tinder-dates -- --json
bun run data-layer:repair-tinder-dates -- --tinder-id <id> --apply
```

Older ingestion converted provider calendar keys through a local JavaScript
timezone before storing `date_stamp`. The dry run measures that disagreement;
`--apply` restores the `date_stamp_raw` calendar prefix at midnight, recomputes
age-on-day from calendar dates (ignoring a provider birth timestamp's clock
component), profile ranges, and usage-derived `profile_meta` values in one
transaction, and journals the Tinder source mutation. The dry run reports both
timestamp shifts and age mismatches. The repair changes SwipeRank age and
profile-range inputs. Before treating SwipeRank as fresh, run the full build,
independent validation, and activation gate immediately against the same
database:

```sh
bun run swipe-rank:launch -- --confirm-write
```

## 8. Repair conversation derivatives

```sh
bun run data-layer:repair-conversations
bun run data-layer:repair-conversations -- --provider TINDER --json
bun run data-layer:repair-conversations -- --provider HINGE --apply
```

The dry run compares every stored match derivative with a fresh calculation
from its persisted messages. `--apply` orders those messages chronologically,
rebuilds counts, first/last timestamps, median and longest gaps, duration, and
the corresponding all-time conversation metadata. It also replaces legacy
Hinge all-match rates with outbound-like yield, retaining an inline review note
for the legacy `liked_at` origin fallback. Apply mode takes exclusive provider
advisory locks and verifies match, metadata, and Hinge-rate postconditions before
commit. Tinder and Hinge upload transactions take the shared form of the same
provider lock, so apply mode waits for in-flight writes and blocks new writes for
that provider until the repair commits. A maintenance window is still prudent
for operator visibility, but upload quiescence is no longer required for these
cooperating runtime paths.

## 9. Repair duplicate Hinge media URLs

```sh
bun run data-layer:repair-hinge-media -- --json
bun run data-layer:repair-hinge-media -- --apply --json
bun run data-layer:repair-hinge-media -- --json
```

The dry run counts duplicate `(hinge_profile_id, url)` groups. Apply mode takes
the exclusive Hinge provider lock, retains one deterministic row per exact URL,
merges complementary prompt/social/caption/type evidence, and deletes only
surplus rows. Conflicting nonblank prompt/caption/type values abort for manual
review, and postconditions assert both evidence preservation and zero remaining
duplicates before commit. This repair does not change profile metadata because
media counts are not stored in `profile_meta`.

## 10. Audit progressive Hinge like-link collisions

```sh
bun run data-layer:audit-hinge-like-links -- --json
bun run data-layer:audit-hinge-like-links -- --limit 25
bun run data-layer:investigate-hinge-like-lineage -- --json
```

This read-only audit finds exact `(profile, timestamp, comment)` `LIKE_SENT`
keys that contain both a pending row and a match-linked row. The initial review
found nine suspicious historical keys, but identical occurrences can be real,
so the script preserves multiplicity, fingerprints comments rather than
printing their text, and never updates or deletes rows.

The lineage investigation reads only retained Hinge snapshots for users in the
collision set. It compares raw outer and nested reaction timestamps without
emitting URLs, comments, or content, so provider microseconds remain available
to distinguish real source multiplicity from progressive pending-to-linked
history. A key is repairable only when complete lineage shows one exact source
event moving monotonically from pending to linked. Non-monotonic histories,
same-snapshot multiplicity, and distinct raw microsecond events remain
read-only findings.

## 11. Audit and clean transient provider uploads

```sh
bun run data-layer:cleanup-transient-uploads
bun run data-layer:cleanup-transient-uploads -- --apply
```

Tinder and Hinge browser uploads receive a 24-hour, session-bound database
lease. Processing explicitly registers the exact Vercel Blob URL by checking
its metadata, then the provider transaction locks the lease and records
`COMMITTED` before any deletion is attempted. Cleanup failures do not undo a
successful profile commit: they remain visible as retryable ledger rows.

The protected `/api/cron/transient-uploads` worker runs hourly and processes at
most 50 leases per invocation. It deletes every object under the unique lease
prefix, including callback-only orphans. The CLI is dry-run by default and its
apply mode uses the same bounded worker in batches of at most 100. Account
deletion nulls the owner foreign key instead of cascading this ledger, so an
abandoned public object never loses its cleanup pointer.

The installed Vercel Blob client supports public client uploads only. These
leases minimize and account for that exposure window; moving provider exports
to private object storage remains the stronger long-term boundary.
