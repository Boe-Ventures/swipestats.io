# Local AI batch runs

This guide covers the local operator scripts used for SwipeRank review and
image anonymization. It keeps local Codex account usage, Anthropic API usage,
database access, and persisted output separate.

## The three execution paths

| Path                   | Command                               | Model and billing                                                              | Database effect                              |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| Local image transform  | `bun run privacy:anonymize-image`     | TensorFlow CPU face detection plus Sharp; no model API                         | None                                         |
| Local SwipeRank review | `bun run swipe-rank:review-codex`     | Local `codex exec`; charged against the account authenticated in the Codex CLI | Read-only                                    |
| SwipeRank image batch  | `bun run privacy:anonymize-swiperank` | Local CPU transform followed by Anthropic Sonnet 5 privacy review              | Writes approved Blob URLs and media metadata |

The local Codex runner does not require `OPENAI_API_KEY`. It launches the
installed Codex CLI, which uses the account already authenticated on the
machine. The Sonnet path reads `ANTHROPIC_API_KEY` from the process environment.

## Prerequisites

From the repository root:

```sh
bun install
codex --version
neonctl me
vercel whoami
```

The Codex command must already be authenticated. Neon access is required for
profile review. Vercel access is required when the image batch targets
production Blob storage.

Keep generated evidence under `temp/` or `/private/tmp`. Those directories can
contain message samples, image derivatives, model events, and profile mappings.
They should remain private and outside Git.

## Run the CPU image anonymizer

This command exercises the server-compatible detector and blur implementation
without a database, Blob storage, or an AI API:

```sh
bun run privacy:anonymize-image -- \
  /private/tmp/swipestats-image-check \
  /absolute/path/to/photo-1.jpg \
  /absolute/path/to/photo-2.jpg
```

The output directory contains JPEG derivatives and `manifest.json`. The script
processes files sequentially and exits on the first error.

Use this before changing detector settings. Inspect every derivative at full
resolution when calibrating blur coverage.

## Prepare a read-only SwipeRank review

The local review script defaults to the production Neon branch and opens an
explicit read-only transaction. A preparation run gathers evidence and writes
local artifacts without invoking a model:

```sh
bun run swipe-rank:review-codex -- \
  --from 2025-08-01 \
  --to 2026-08-01 \
  --top 50 \
  --limit 10 \
  --neon-branch production \
  --output-dir /private/tmp/swipestats-review-prepare
```

Use a temporary Neon branch by changing `--neon-branch`. The script asks
`neonctl` for a connection string when `DATABASE_URL` is absent.

The output includes:

- `run.json`, containing the selected scope and database branch;
- `subject-map.json`, containing private subject-to-profile mappings;
- one `evidence.json` file per subject;
- up to three downloaded source images per subject when their stored URLs still
  work;
- `verdict.schema.json`, used to constrain model output.

## Run the same review with local Codex

Add `--run` and select a Codex model:

```sh
bun run swipe-rank:review-codex -- \
  --from 2025-08-01 \
  --to 2026-08-01 \
  --top 50 \
  --limit 10 \
  --model gpt-5.6-terra \
  --reasoning high \
  --neon-branch production \
  --output-dir /private/tmp/swipestats-review-terra \
  --run
```

Useful model choices from the local experiments:

- Terra is the default for profile-level moderation and mixed evidence.
- Luna is suitable for bounded message redaction where the prompt and schema
  carry most of the policy.
- Sol is suitable for the final image privacy judgment.

The runner invokes one ephemeral, read-only Codex process per profile. It saves
`codex-events.jsonl`, `codex-stderr.log`, and the structured verdict beside the
evidence. `verdicts.jsonl` collects successful results. `errors.jsonl` records
failed profiles.

Use `--offset` to advance through a cohort in deliberate slices:

```sh
bun run swipe-rank:review-codex -- \
  --from 2025-08-01 --to 2026-08-01 \
  --top 50 --offset 10 --limit 10 \
  --model gpt-5.6-terra --reasoning high --run
```

`--limit 0` selects every remaining unique profile. Reserve it for a reviewed
full-cohort run.

## Inspect local Codex usage

Every completed Codex turn writes usage into its event file. Aggregate a run
without reading prompts or verdict text:

```sh
find /private/tmp/swipestats-review-terra \
  -type f -name 'codex-events.jsonl' -print0 |
  xargs -0 jq -s '
    {
      turns: (map(select(.type == "turn.completed")) | length),
      input_tokens: (
        map(select(.type == "turn.completed") | .usage.input_tokens // 0)
        | add
      ),
      cached_input_tokens: (
        map(select(.type == "turn.completed")
          | .usage.cached_input_tokens // 0)
        | add
      ),
      output_tokens: (
        map(select(.type == "turn.completed") | .usage.output_tokens // 0)
        | add
      ),
      reasoning_output_tokens: (
        map(select(.type == "turn.completed")
          | .usage.reasoning_output_tokens // 0)
        | add
      )
    }'
```

Observed August 25 calibration:

| Run                                        | Turns |   Input | Cached input | Output | Reasoning output |   Event-file span |
| ------------------------------------------ | ----: | ------: | -----------: | -----: | ---------------: | ----------------: |
| 10 profiles, Terra high                    |    10 | 214,515 |       82,176 |  2,575 |            1,256 | about 115 seconds |
| 10 profiles, Luna messages plus Sol images |    51 | 909,033 |      103,936 | 21,317 |           15,357 | about 672 seconds |

The event-file span is a rough runtime proxy. The fuller run split long message
sets into many turns, which explains the larger token count. Local Codex usage
is governed by the authenticated Codex plan. These figures are operational
measurements rather than an API-dollar invoice.

## Run the Sonnet-reviewed SwipeRank image batch

The default batch selects the latest published Tinder profiles that still have
unfinished images:

```sh
bun run privacy:anonymize-swiperank -- --limit=10
```

For a visible leaderboard cohort, select the closed calendar period directly:

```sh
bun run privacy:anonymize-swiperank -- --period=2026-07 --limit=10
```

Period batches use the latest published snapshot and the same current exclusion
boundary as the admin leaderboard. The limit counts leaderboard profiles.
Profiles without stored source images are reported and skipped, as are profiles
whose stored images already have terminal review states. Limits up to 1,000
make the same command suitable for a larger operator batch.

If a fail-fast run stops on an infrastructure, detector, model, Blob, or
database error, resume after the diagnosed leaderboard row with an offset:

```sh
bun run privacy:anonymize-swiperank -- \
  --period=2026-07 \
  --offset=8 \
  --limit=10
```

The process uses TensorFlow and Sharp locally, sends the anonymized JPEGs to
Sonnet 5 for a strict privacy audit, uploads approved derivatives to Vercel
Blob, and stores the approved URLs on their `media` rows. Each source row also
stores `APPROVED`, `NEEDS_REVIEW`, or `SOURCE_UNAVAILABLE` with a short review
note. A null status means the image is still pending.

Its error behavior is intentionally simple:

- terminal HTTP 400, 401, 403, 404, and 410 source responses are recorded as
  unavailable while the remaining images continue;
- a transport, detector, model, Blob, or database error terminates the batch;
- `NEEDS_REVIEW` is a completed moderation result, records a privacy hold, and
  saves no Blob derivatives for the held images;
- Sonnet structured-output retries are disabled;
- public SwipeRank payloads contain no media URLs. Admin leaderboard thumbnails
  use approved derivatives, while the held-profile section deliberately shows
  original images for administrator review.

Run against a temporary database branch first when testing schema or query
changes. A Blob write still targets the token supplied to the process, so use a
non-production Blob token for a fully isolated rehearsal.

### Production environment without exposing secrets

Vercel marks the Anthropic key as sensitive. `vercel env pull` represents that
value with a placeholder, so use the locally verified Anthropic key while
loading production database and Blob credentials:

```sh
vercel env pull /tmp/swipestats-production.env \
  --environment=production --yes

set -a
source /tmp/swipestats-production.env
PROD_DATABASE_URL="$DATABASE_URL"
PROD_BLOB_READ_WRITE_TOKEN="$BLOB_READ_WRITE_TOKEN"
source .env
LOCAL_ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
set +a

DATABASE_URL="$PROD_DATABASE_URL" \
BLOB_READ_WRITE_TOKEN="$PROD_BLOB_READ_WRITE_TOKEN" \
ANTHROPIC_API_KEY="$LOCAL_ANTHROPIC_API_KEY" \
  bun run privacy:anonymize-swiperank -- --period=2026-07 --limit=10

unlink /tmp/swipestats-production.env
unset PROD_DATABASE_URL PROD_BLOB_READ_WRITE_TOKEN LOCAL_ANTHROPIC_API_KEY
```

Avoid `vercel env run` for this operator workflow. Repository `.env` loading can
override provider-supplied values and make the selected database ambiguous.

## Artifact import

The SwipeRank image script accepts prepared derivatives from the February 2026
experiment format:

```sh
bun run privacy:anonymize-swiperank -- \
  --limit=10 \
  --artifact-dir=/private/tmp/swipestats-anonymization-run
```

The importer matches hashed subjects to current SwipeRank profiles and asks
Sonnet to review the prepared JPEGs before saving them. It is intended for
preserved artifacts whose source mapping is already known. Generic folders of
images should go through `privacy:anonymize-image` instead.

## Current gap in the February experiment

The prior full message-and-image anonymization run produced durable private
artifacts, while its orchestration driver is absent from the repository. The
current committed local Codex script performs moderation over facts, message
samples, and available images. It does not emit a fully anonymized message
dataset.

Before running large message-anonymization batches, promote that experimental
driver into a reviewed repo script with:

- deterministic profile selection and resumable offsets;
- private output permissions and stable subject hashes;
- an explicit message-size cap and chunk manifest;
- local Codex event logs for usage accounting;
- a validation-only mode before any database or Blob persistence.

## Operator checklist

1. Record the source branch, date range, profile offset, limit, model, and
   reasoning effort.
2. Prepare evidence first and inspect two representative subjects.
3. Run 10 profiles and aggregate usage.
4. Inspect all held images plus a sample of approved images at full resolution.
5. Confirm the intended Neon branch and Blob token before a write-capable run.
6. Run `bun check` after code or schema changes.
7. Keep model artifacts private and remove temporary environment files.
