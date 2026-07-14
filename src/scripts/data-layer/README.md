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

### Hinge rates above 100%

```sh
bun run data-layer:audit-hinge-over-100
bun run data-layer:audit-hinge-over-100 -- --json
bun run data-layer:audit-hinge-over-100 -- --verify-blobs
bun run data-layer:audit-hinge-over-100 -- \
  --hinge-id <id> --show-ids --json
```

Reconstructs outbound- versus inbound-like match origins from persisted thread
links, checks profile-meta totals, event grain, referential integrity, ranges,
timestamps, low denominators, and upload history, and classifies each stored
rate above 100%. `--verify-blobs` additionally compares the latest linked
source export without printing blob URLs or message content. Database queries
run in a read-only transaction.

## 2. Verify legacy cohort retirement

```sh
bun run data-layer:audit-cohorts
bun run data-layer:audit-cohorts -- --json
```

Proves that the obsolete `cohort_definition` and `cohort_stats` tables are
absent, that no fake `cohort_*` Tinder profiles remain, and that the activated
SwipeRank replacement has versioned facts. Saved editorial cohort definitions
live on immutable SwipeRank snapshots; live age, gender, interest, and location
comparisons use descriptor filters against the same fact build as ranking.

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

Every audit/probe command is read-only. `repair-profile-meta` is the sole write
command and is a dry run unless `--apply` is passed. It repairs only Tinder
profile ranges and usage-derived `profile_meta` fields, bumps the repaired
source profile's `updated_at`, and creates a complete metadata row when one is
missing. Existing conversation fields are preserved; conversation aggregates
for a missing row are reconstructed from match/message relations. The write
transaction takes the shared Tinder SwipeRank mutation lock and advances the
privacy-safe source mutation journal, so later reconciliation can detect that
facts may need rebuilding.

```sh
bun run data-layer:repair-profile-meta
bun run data-layer:repair-profile-meta -- --tinder-id <id> --apply
```
