# Ali message supplement: prepared backfill and export

## Current state

Rollout authorized November 18, including production persistence. The user requested a review after roughly 10% before continuing. Main has been integrated at `ccc8880`; the regenerated migration passed on an isolated production-derived branch. PR #96 was merged and deployed at `a7e9731`. The initial 20-conversation check passed. The first session-bound bulk process then exited without an error log; a database reconciliation found 90 completed conversations, with $0.003363906 charged/reserved in the Jev ledger. Resume using the cumulative stage boundary below. An attempted detached process received a managed-network HTTP 403 (domain not in allowlist), so unattended execution from this managed environment remains blocked.

The November 18 read-only production preflight used the original private 3,871-profile mapping, preserving Ali's existing research pseudonyms. Actual database rows: 621,096 conversations, 513,188 nonempty conversations and 4,129,631 messages. All 4,129,631 messages currently have null `content_sanitized`. Stored counters used in the earlier estimate were slightly higher. Current estimated Jev screening cost is $23.781987, extrapolated from the 1,000-conversation sample, not a quote. The user reported adding $40, implying about $45 available including renewed monthly credit; this is not an independently verified balance.

The prepared run has a hard $30 Jev ledger cap. Terra uses the authenticated Codex subscription, with no paid OpenAI or Anthropic API fallback. There is no automatic top-up, quota-reset redemption or model substitution. Failed requests stop the worker and remain resumable. Oversized conversations remain pending, are recorded privately, and block complete export.

## Prepared changes

- `privacy:research-text` supports `plan`, `run` and `export` against an explicit `TEXT_REDACTION_DATABASE_URL`. It never silently uses the application's default development connection.
- The generated migration `0019_message_text_redaction_receipts.sql` adds nullable `match.text_redaction`. Each successful receipt binds the pipeline configuration, full conversation input, sanitized output, screening score and completion time.
- Messages retain `content` and `content_raw`; only `content_sanitized` is written. Negative screens explicitly save unchanged text as processed.
- Database saves bulk-write sanitized messages and receipts for a page in one transaction, with ownership and affected-row checks. They do not explicitly lock profiles or reread source text. Source freshness is checked at export; rerun the fixed cohort if export detects changed data.
- New matches start pending. Tinder and Hinge additive/repeat-upload paths invalidate receipts in the same transaction as source changes. A local `--pending` worker handles both through the same processor. Processing is an on-demand offline job; the web upload request does not invoke the subscription CLI.
- Screening is one whole conversation per Jev call at cutoff 0.2. Flagged conversations are batched through GPT-6.1 Terra medium, up to 32 conversations and a 40,000-character target; the hard per-conversation bound is 60,000 characters. No message is silently truncated.
- Jev results, Codex results, input fingerprints and spend reservations survive restarts. The ledger reserves the documented full 32k input window before each Jev request, then replaces the reservation with measured cost on success. Ambiguous failures retain their conservative charge. The cap is cumulative for this output directory, including subsequent invocations. Keep using that directory when resuming.
- Export streams a gzip JSONL supplement using only validated, current sanitized content. It includes the original profile aliases and deterministically pseudonymized conversation/message IDs. Raw content, source IDs, processing receipts and API scores are excluded. The entire export fails on pending, stale or incomplete work; it never falls back to raw text. A final file is only published locally after completion.
- The existing public quantitative dataset export remains unchanged and has no message text. The older offline raw-input extractor remains a private preprocessing tool, not the delivery path.

## Launch sequence

Working directory:

```sh
cd /Users/boconsulting/Documents/ChatGPT/Life/swipestats-text-redaction
```

Private setup is already present: `.env.research-text.local` holds the verified production connection and existing TypeSafe key with mode 0600, and Git ignores it. It is separate from the original application's `.env.local`. Private mapping: `temp/text-redaction/ali-cohort.json`. Resume/output directory: `temp/text-redaction/ali-launch`. The mapping and outputs must never be committed or shared.

1. Reconcile this branch with current main before deployment. Review the generated migration and its journal, rehearse the migration on an isolated production-derived branch, and apply via the normal Drizzle migration flow to production. Do not use `db:push`. Deploy the upload invalidation changes with the schema addition. The November 18 production check confirmed the column is not yet present.
2. Verify `codex login status` uses Kristian's ChatGPT account. The prepared adapter uses Terra medium and included subscription usage. In a restricted agent session, the previously prepared writable `CODEX_HOME=/tmp/swipestats-codex-runtime` may be necessary; normal terminal use can retain its usual Codex home.
3. Repeat the read-only preflight if needed:

```sh
bun --env-file=.env.research-text.local run privacy:research-text plan \
  --cohort temp/text-redaction/ali-cohort.json \
  --output temp/text-redaction/ali-launch
```

4. Start with 20 conversations to verify live persistence before continuing the cohort:

```sh
bun --env-file=.env.research-text.local run privacy:research-text run \
  --cohort temp/text-redaction/ali-cohort.json \
  --output temp/text-redaction/ali-launch \
  --write --max-conversations 20 --jev-cap 30
```

5. Inspect the saved receipts and sanitized text privately. Process the first 10% checkpoint with `--max-conversations 1000000 --max-total-conversations 62110`. The total limit counts already-current conversations as well as new attempts, so restarting does not add another 10%. The cohort is traversed in its fixed order; oversized cases occupy a position and remain exceptions for review. Assess measured Jev cost, actual throughput, errors, receipt integrity, changed-text samples and negative screens. Remove `--max-total-conversations` and continue with `--max-conversations 1000000` only after that assessment passes; the user already authorized continuation on good results. That limit covers the current 621,096 matches, including empty matches which need no model call. The worker stops on provider/quota failures or the cumulative cap. Rerun after normal quota availability returns. Completed database records and cached model work are reused. Never delete the spend ledger to make room in the cap.
6. Resolve any entries in `exceptions.jsonl`; over-limit conversations are deliberately not published. Run export after processing:

```sh
bun --env-file=.env.research-text.local run privacy:research-text export \
  --cohort temp/text-redaction/ali-cohort.json \
  --output temp/text-redaction/ali-launch
```

The deliverable is `temp/text-redaction/ali-launch/messages.jsonl.gz`. It contains a manifest, profile records (including profiles with zero conversations), conversation records, and a final count summary. It covers stored outgoing messages, not both sides of conversations. Verify totals and review examples before uploading to Ali's existing restricted Drive destination. Neither upload nor notification is part of these commands.

## New uploads and the remaining corpus

After Ali, use the same worker with `--pending` instead of `--cohort`, and a separate explicitly budgeted output directory. Invoke it while the local authenticated Codex worker is available. New uploads queue automatically, but no unattended schedule or always-on worker is installed by this change. Keep the raw data and sanitized receipt freshness check in any future research export implementation.

## Verification

Full `bun check` passed: copy validation, migration history, content generation, ESLint (existing warnings only), TypeScript and 90 tests across 38 files after integrating current main. Later bounded-preflight/timeout changes also passed the PostgreSQL integration test, typecheck and targeted lint.

The new tests protect export exclusion of raw/pending/stale content, cohort alias uniqueness, crash-safe budget accounting, source changes during inference, original retention, ownership checks and rollback after a message update but before receipt persistence. Database tests execute the store's actual SQL and generated migration against ephemeral in-process PostgreSQL via a development-only PGlite dependency. They do not establish multi-session locking behavior or Neon transport performance; the initial 20-conversation production run still needs verification. Existing 256-conversation Terra benchmark evidence remains in the November 17 report.

Minor policy calibration still open: possible over-redaction of a street associated with unnamed friends. No prompt changes were made during this preparation, preserving the tested redactor behavior.

## Background execution and checkpoints

For unattended execution, run the command below in a normal local terminal. A session-bound tool command did not survive the first handoff, and detaching inside the managed environment received a network HTTP 403. Do not assume a background launch is working merely because it returned a PID. The existing `worker.lock` prevents duplicate workers. `progress.json` is atomically refreshed after every completed page and includes visited count, total limit, timestamp and cumulative Jev cost. It is an observation checkpoint; database receipts remain authoritative after an abrupt exit. Keep the same output directory on every resume. The worker stops on errors and the checkpoint; it does not automatically bypass review or redeem quota credits.

```sh
cd /Users/boconsulting/Documents/ChatGPT/Life/swipestats-text-redaction
bun --env-file=.env.research-text.local run privacy:research-text run \
  --cohort temp/text-redaction/ali-cohort.json \
  --output temp/text-redaction/ali-launch \
  --write --max-conversations 1000000 --max-total-conversations 62110 --jev-cap 30
```

Only one worker may use the directory. Stop or finish an active foreground run before launching this command. A small live resume with a total limit of 20 correctly observed 20 current conversations and made zero new model calls or database writes.

## Transient Jev failures

A Warp run reached at least 563 completed conversations before a Jev `ECONNRESET`. Screening now makes at most five attempts for connection resets/timeouts and HTTP 408, 429, 500, 502, 503 or 504, waiting 2, 4, 8 and 16 seconds between attempts. Authorization failures, invalid responses and ledger errors still stop immediately. Each retry reserves its own worst-case cost; ambiguous failed reservations remain in the same cumulative $30 ledger. This changes transport recovery only, so existing receipts and model checkpoints remain reusable. After a stopped run, rerun the same fixed-total command in Warp.


## Codex conversation ID recovery (November 19)

The resumed Warp worker reached 851 conversations at its last complete page,
then Codex returned ten results for a ten-conversation batch with one foreign
ID replacing one expected ID. Read-only reconstruction matched the failed
batch fingerprint exactly. Validation rejected the result before saving that
batch; previously saved receipts and cached Jev screens remain reusable.

The adapter now constrains the response schema to the supplied conversation
IDs and exact result count. Completed responses that fail JSON, identity or
quote validation get at most three attempts total. Every attempt uses the
same validation; no raw-text fallback is introduced. Provider/quota failures,
unexpected tool activity and filesystem errors remain terminal. Private
attempt directories preserve each response and log; successful checkpoints
include token usage from rejected completed responses as well. Existing
valid checkpoints and pipeline receipts remain reusable.

Resume with the same Warp command above. Keep the same output directory,
62,110-conversation checkpoint and $30 cumulative Jev cap. No duplicate worker
was launched while preparing this fix. Mocked regression coverage exercises
foreign IDs, invalid quotes, successful recovery, exhausted validation retries
and terminal quota errors. A live replay from the managed session could not
initialize the Codex app-server (Operation not permitted); Warp replay remains
to be verified.


## Offline page writes (November 19)

This processor is an offline research-export preparation tool, not a live
upload dependency. The database schema stays unchanged. A page stages screened
and redacted results in memory, then bulk-updates sanitized messages and
completion receipts in one transaction. There are four database statements per
written page (begin, two updates, commit), instead of eight per conversation.
The ordinary page read is unchanged. Explicit profile/row locks and the source
reread were removed; PostgreSQL still takes its normal update locks.

If a page fails, it is rolled back and can be retried using the existing model
checkpoints. Raw text remains untouched. Source/output digests still gate every
research export. If an upload changes a conversation while this offline job is
running, export rejects the stale result; rerun the fixed cohort to refresh it.
The --pending selector is a convenience for invalidated/new profiles, not a
substitute for the fixed-cohort freshness pass before export.

Regression coverage uses real SQL in isolated PGlite for mixed multi-conversation
pages (including empty conversations), full-page rollback, ownership, both
providers, and export rejection after source additions or edits. Production
throughput has not been benchmarked for this change. An already-running Warp
process keeps its loaded code until restarted; no worker was stopped or started
while preparing this optimization.
