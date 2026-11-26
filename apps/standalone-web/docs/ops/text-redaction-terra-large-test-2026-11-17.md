# Larger subscription-backed Terra test

## Setup

Kristian authorized a larger test after the 32-conversation comparison. The new deterministic selection contains 256 conversations and 3,423 messages: 192 Tinder and 64 Hinge conversations, with zero overlap with the previous Terra selection. It includes all 61 remaining baseline-positive conversations, 97 flagged-but-unchanged conversations and 98 screening-negative conversations.

This is an enriched comparison against saved model outputs, not a population-weighted estimate or hand-labeled recall benchmark. All data comes from the existing private 1,000-conversation fixture. No database extraction or new Jev calls are required.

GPT-6.1 Terra uses medium reasoning and the unchanged v14 exact-quote policy. The larger test packs up to 32 complete conversations per call within a 40,000-character target, producing 14 batches. A single larger conversation remains intact and must fit the adapter's 60,000-character hard limit. Conversation context is isolated in the prompt, and code validates identity and exact replacement spans. The processing path has no paid API fallback.

## Reproduce or resume

```sh
CODEX_REDACTION_MODEL=gpt-6.1-terra bun privacy:benchmark-text-codex temp/text-redaction/large1000-v9 temp/text-redaction/codex-benchmark-terra256-v1 40 --large
```

The 40 argument caps the number of batches, while this selected run contains only 14. Completed calls are resumed by input/configuration fingerprint. In the restricted assistant environment, also set `CODEX_HOME=/tmp/swipestats-codex-runtime`, which links existing authentication and rules and provides writable runtime files. Ordinary terminal use can use the normal Codex home.

Before the run, the account allowed included usage and displayed 33% of its weekly allowance used. The credit balance was unchanged from the previous test. Do not interpret rounded, shared account percentages as exact per-run consumption.

## Status

All 14 batches completed on November 17. After reconnecting, the final offline scan verified all 256 selected conversations and 3,423 messages. Final evidence is stored privately in `temp/text-redaction/codex-benchmark-terra256-v1/summary.json`, `manifest.json`, `differences.json`, `review.json`, `adjudication.json`, and per-call checkpoints.

| Measure | Result |
| --- | ---: |
| Model | GPT-6.1 Terra, medium reasoning |
| Successful batches | 14/14 |
| Conversations | 256 (192 Tinder, 64 Hinge) |
| Messages | 3,423 (2,680 Tinder, 743 Hinge) |
| Call time | 1,007.781 seconds (16m48s) |
| Input tokens | 393,638, including 71,424 cached |
| Output tokens | 9,302 |
| Changed conversations/messages | 59/65 |
| Exact baseline matches | 3,414 messages |
| Differences inspected in context | 9 |
| Processing or metadata-integrity errors | 0 |
| Negative-screen conversations changed | 0 |
| Residual email/phone candidates outside URLs | 0 |

The nine differences comprise three baseline over-redactions (neighborhood, birthday without a year, workplace street), two approximate-location boundaries kept by Terra, two additional plausible identifiers (a two-part personal name and a contextual Instagram handle), one network-marker difference, and one possible over-redaction of a residential street associated with unnamed friends. The last case remains a minor calibration issue. No clear missed contact identifier was found in the inspected differences. This is assistant context review and model comparison, not independent human-labeled recall.

The final check preserved message IDs, order, timestamps, message type and count. The residual scan is limited to simple email/phone candidates and does not establish absence of every identifier.

At the later post-reconnection usage read, ordinary included usage was allowed, displayed weekly usage was 34% (33% before the run), and the credit balance was unchanged. The reading was not taken immediately at completion and includes shared account activity, so it is not an exact benchmark quota charge. No extra credits were purchased and no Jev or paid API calls were made.

Conclusion: the completed benchmark supports moving on to shared processing, persistence and sanitized-only export integration with Terra. It does not mean the full dataset has been processed or that Ali's message supplement is ready.

The large-sample selection change passed targeted ESLint and TypeScript checks. No production writes, ingestion changes, full backfill, export or delivery are part of this benchmark.
