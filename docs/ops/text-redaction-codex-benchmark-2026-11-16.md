# Subscription-backed Codex redaction benchmark

The local adapter invokes `codex exec` with ChatGPT authentication. It reuses the v14 exact-quote policy and applies edits through the existing validated replacement code. It has no paid API fallback. The CLI runs locally; inference runs remotely.

## Scope

The deterministic benchmark selects 32 conversations from the saved 1,000-conversation Tinder/Hinge fixture: eight previously changed and eight screening-negative conversations per provider. It is enriched for redactions and is not a population-weighted throughput or recall estimate. Previous model outputs are comparison evidence, not hand-labeled ground truth.

Calls contain up to eight complete conversations and 40,000 payload characters. Results must account for every conversation exactly once. Code preserves message order and metadata and rejects nonexistent, cross-conversation, overlapping or unmatched replacements. Completed calls are private, fingerprinted checkpoints that can be resumed.

No new Jev calls, database writes or research exports are involved. The current production ingestion/export paths have not been switched to this adapter.

## Luna result before the interrupted connection

GPT-6 Luna at medium reasoning completed 16 conversations and 282 messages in 148.7 seconds of successful call time. It used 45,298 input tokens and 932 output tokens. Its output matched the previous baseline on 280 messages.

The two differences were inspected in conversation context: a Spanish Instagram exchange supplied a handle in a later message; a Polish conversation shared precise coordinates with text describing the sender waiting nearby. Luna left both values unchanged. Both qualify for redaction under the current policy. Matching unchanged messages is not evidence of high identifier recall.

The local connection interrupted verification of the remaining Luna batches. Only the completed checkpoints are counted. All 14 focused tests, targeted ESLint and TypeScript checks passed after adding the adapter and benchmark.

## Terra comparison

Kristian requested GPT-6.1 Terra. The same 32-conversation selection and unchanged v14 policy completed at medium reasoning in four calls:

| Measure | Terra result |
| --- | ---: |
| Conversations | 32 (16 Tinder, 16 Hinge) |
| Messages | 414 |
| Successful call time | 314.464 seconds |
| Input tokens | 86,105 |
| Cached input tokens (part of input) | 11,904 |
| Output tokens | 1,665 |
| Messages changed | 17 |
| Exact baseline matches | 413 |
| Processing or metadata-integrity errors | 0 |

Terra redacted both values Luna missed. All 16 baseline-positive conversations retained their previously identified redactions, and all 16 selected negative conversations remained unchanged. The only baseline difference was a contact introduced with `amos`: Terra emitted `[SNAPCHAT_HANDLE]` rather than `[SOCIAL_HANDLE]`. The identifying span was removed in both outputs. This network classification is model interpretation, not a separately established ground-truth label.

On the same first 16 conversations (282 messages), Terra took 154.358 seconds versus Luna's 148.700 seconds. Terra caught both inspected misses; Luna left those values unchanged. The 32-conversation Terra sample is larger than the verified Luna sample, so their full-run totals should not be compared as throughput measures.

The Codex adapter and benchmark now default to GPT-6.1 Terra. No policy changes were made for this comparison. Fourteen focused tests and targeted ESLint passed after the default change; TypeScript passed on the adapter implementation. All 414 returned messages were checked for unchanged IDs, order, timestamps, message type and count.

Next run Terra on a larger independent selection and inspect disagreements before broad processing. This small, enriched comparison does not establish population recall or completion time across quota resets. Production persistence, sanitized-only exports, new-upload integration and the full backfill remain pending.

## Usage and execution

Before the Terra run, the account reported ordinary included usage allowed, 31% of the weekly allowance used, and an unchanged credit balance compared with the earlier Luna preflight. The percentage is rounded and cannot establish a reliable per-profile quota cost from this small pilot.

After Terra completed, ordinary included usage was still allowed, displayed weekly usage was 32%, and the reported credit balance was unchanged. The displayed percentage includes other shared account activity and is rounded; do not attribute exactly one percentage point to this benchmark or scale it into a completion promise. No additional credits were purchased, and no paid API or Jev calls were made.

The benchmark command is:

```sh
CODEX_REDACTION_MODEL=gpt-6.1-terra bun privacy:benchmark-text-codex temp/text-redaction/large1000-v9 temp/text-redaction/codex-benchmark-terra-v1 4
```

The last argument caps batches in this fixed sample. The default is one batch. In the restricted assistant environment, Codex uses a writable temporary runtime with links to existing authentication and rules. Required network proxy settings are retained; application API keys are not passed to the child process. Do not run the broad `codex doctor` diagnostic here: automatic review rejected its connection to an unrelated unverified host. Direct ChatGPT-backed execution worked without that diagnostic.

Private evidence lives in `temp/text-redaction/codex-benchmark-v1/` and `temp/text-redaction/codex-benchmark-terra-v1/`.
