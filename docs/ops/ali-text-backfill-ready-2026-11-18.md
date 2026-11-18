# Ali message supplement: prepared backfill and export

## Current state

Rollout authorized November 18, including production persistence. The user requested a review after roughly 10% before continuing. Main has been integrated at `ccc8880`; the regenerated migration passed on an isolated production-derived branch. Production processing has not started yet.

The November 18 read-only production preflight used the original private 3,871-profile mapping, preserving Ali's existing research pseudonyms. Actual database rows: 621,096 conversations, 513,188 nonempty conversations and 4,129,631 messages. All 4,129,631 messages currently have null `content_sanitized`. Stored counters used in the earlier estimate were slightly higher. Current estimated Jev screening cost is $23.781987, extrapolated from the 1,000-conversation sample, not a quote. The user reported adding $40, implying about $45 available including renewed monthly credit; this is not an independently verified balance.

The prepared run has a hard $30 Jev ledger cap. Terra uses the authenticated Codex subscription, with no paid OpenAI or Anthropic API fallback. There is no automatic top-up, quota-reset redemption or model substitution. Failed requests stop the worker and remain resumable. Oversized conversations remain pending, are recorded privately, and block complete export.

## Prepared changes

- `privacy:research-text` supports `plan`, `run` and `export` against an explicit `TEXT_REDACTION_DATABASE_URL`. It never silently uses the application's default development connection.
- The generated migration `0019_message_text_redaction_receipts.sql` adds nullable `match.text_redaction`. Each successful receipt binds the pipeline configuration, full conversation input, sanitized output, screening score and completion time.
- Messages retain `content` and `content_raw`; only `content_sanitized` is written. Negative screens explicitly save unchanged text as processed.
- Database saves acquire the profile ingestion lock and row locks, reread source data, and atomically save all sanitized messages and the receipt. Changed source, wrong ownership, missing messages and incomplete writes cannot be marked complete.
- New matches start pending. Tinder and Hinge additive/repeat-upload paths invalidate receipts in the same transaction as source changes. A local `--pending` worker handles both through the same processor. Processing is asynchronous; the web upload request does not invoke the subscription CLI.
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

5. Inspect the saved receipts and sanitized text privately. Process the first 10% checkpoint with `--max-conversations 62090` after the initial 20, for 62,110 newly processed conversations in total. Assess measured Jev cost, actual throughput, errors, receipt integrity, changed-text samples and negative screens. Continue with `--max-conversations 1000000` only after that assessment passes; the user already authorized continuation on good results. That limit covers the current 621,096 matches, including empty matches which need no model call. The worker stops on provider/quota failures or the cumulative cap. Rerun after normal quota availability returns. Completed database records and cached model work are reused. Never delete the spend ledger to make room in the cap.
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
