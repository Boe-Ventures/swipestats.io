# Larger text redaction test, November 16, 2026

> Execution decision corrected: Kristian explicitly rejected the expensive paid API bulk run. It is not a budget option to seek approval for. Use the existing locally authenticated Codex CLI approach for bulk text redaction, optionally retaining inexpensive Jev screening. Do not fall back to Anthropic or OpenAI API billing. No full paid run was launched.


The private fixture contains 1,000 conversations and 9,048 messages from 138 profiles: 800 Tinder conversations from previously untested Ali-cohort profiles and 200 Hinge conversations. Selection is deterministic, capped at 12 conversations per profile. No selected conversation exceeded the 60,000-character limit. This is a general sample, not a population-weighted estimate or a manually labeled benchmark.

## Interrupted baseline

The v9 run stopped after 568 attempts: 555 complete and 13 failed. Failures were eight Jev HTTP 403 responses, four generic provider/validation errors, and one rejected replacement span. Completed results, Jev screens and usage are checkpointed. Failures are not successful unchanged results.

Manual review of the first 464 completed conversations found a Swedish Instagram handle scored 0.06 by Jev but correctly removed by Sonnet. Jev scored the whole conversation. The audit called Sonnet on negatives too; ordinary gated processing would skip this conversation at the previous 0.3 cutoff. A whole-profile screening result has not been established for that profile.

Two Dutch generic phrases were unnecessarily removed: references meaning "your street name" and "your Instagram", without an actual identifier value. A residential building name retained alongside a removed private address also needs review. Screening disagreements and final-output errors must be assessed separately.

## Simpler screening refinement

Kristian preferred making the Jev prompt more permissive before adding routing rules or changing models. Version v10 separates the screening prompt from the detailed redaction policy. Jev now looks broadly for possible identifiers, favors review when uncertain, and considers informal, multilingual and cross-message contact context. The final redactor retains responsibility for precise removal decisions. No regex routing override was added.

A targeted comparison used 65 previously audited Tinder conversations: the 25 lowest-scoring conversations changed by Sonnet, 20 highest-scoring unchanged conversations, and 20 deterministically selected remaining unchanged conversations. These are calibration cases, not independent validation or ground truth. Sonnet's changed set includes known over-redactions.

| Prompt | Cutoff | Routed to redactor | Sonnet-changed conversations skipped |
| --- | ---: | ---: | ---: |
| Previous | 0.3 | 35/65 | 1/25 |
| Broader | 0.3 | 42/65 | 1/25 |
| Broader | 0.2 | 46/65 | 0/25 |
| Broader | 0.1 | 49/65 | 0/25 |
| Broader | 0.05 | 54/65 | 0/25 |

The known missed contact rose from 0.06 to 0.26. Consequently the shared cutoff is now 0.2. All 65 screening calls succeeded; 155,967 input tokens cost an estimated $0.006551 at $0.042 per million. This is usage estimation, not an account-balance check.

The full frozen-v10 audit finished: 996 complete and four processing failures. Every completed conversation was independently redacted, including negatives. None of the 76 Sonnet-changed conversations scored below 0.2. All 200 Hinge conversations completed; all four errors were Tinder cases. This comparison is disagreement detection, not a gold-standard recall measurement. Estimated audit cost: Jev $0.046342 and Sonnet $7.324824.

Twelve focused unit tests, ESLint and typecheck pass. No production database writes, deployment, full Ali-cohort processing or new delivery have occurred.

Private artifacts: `temp/text-redaction/large1000-v9/input.jsonl`, `manifest.json`, `results-v9/`, `screen-v10/comparison.json`, and `results-v10/`. Message contents and source identifiers stay out of this report.


## Redactor refinements and completed verification

Versions v11-v13 clarify that generic requests/references are not identifier values, academic titles do not turn a first name into a full name, a supplied private residential building name qualifies, and a quote must use the message ID containing that literal text rather than the preceding context message. Five targeted cases passed, and all routed conversations in the larger fixture were rerun through v13. Negative conversations retain their original text; their independent audit is from v10.

One persistent validation error came from a single username explicitly shared across Instagram and Snapchat: the model proposed two occurrences although the text contained only one. Version v14 clarifies that this is one edit with an unknown/ambiguous network marker. A two-case recovery audit completed this case and the missing provider result. No validation safeguards were relaxed.

The final verified set is explicitly mixed-version: 998 v13 pipeline results plus two v14 recovery results. v10, v13 and v14 use the same broad Jev prompt and 0.2 cutoff. The final v14 redactor has not been rerun across the entire fixture.

| Provider | Conversations | Messages | Routed | Conversations changed | Messages changed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tinder | 800 | 7,449 | 275 | 59 | 65 |
| Hinge | 200 | 1,599 | 67 | 18 | 19 |
| Total | 1,000 | 9,048 | 342 | 77 | 84 |

All 1,000 have an accounted-for completed result after recovery. No message ID, order, timestamp or message-type integrity errors were found. No negative-screen/changed-output disagreements remain, and the simple residual scan found no email or 9-15-digit phone candidates outside URLs. These checks do not prove the absence of all identifiers. The changed set is not hand-labeled ground truth.

Known residual over-redaction examples include a birthday expressed without a birth year and an arguably broad neighborhood/landmark residence reference. These require policy calibration, but are not identified contact leaks. The generic-reference, academic-title and dual-network cases discussed above are fixed in the inspected reruns.

The gated v13 verification used 343 Sonnet calls including retries, estimated $3.331656. Targeted diagnostics and recovery calls are additional. Private final evidence is in `final-evaluation.json`, `results-v13/`, `recovery-v14/`, `v13-differences.json` and their usage ledgers. No provider account balance was verified.

## Full Ali cohort cost preflight

A read-only production query for the exact existing 3,871-profile mapping reports 621,096 matches, 513,347 with positive message counts, and a sum of 4,132,104 messages. Message volume uses stored match counters; a full extraction has not reconciled these against message rows.

Naively scaling the measured gated conversation cost gives approximately $1,710 in Sonnet usage plus about $24 for conversation-level Jev screening, before retries and exceptions. A practical rough range is $1,500-$2,000. This is not a quote: the sample is capped per profile, includes Hinge, and the full profile-grouping pipeline has different call economics. The earlier $5 discussion concerned Jev credit, not total Sonnet spend.

This paid API bulk configuration is rejected, including the earlier suggestion to request a budget decision. The figures above document the abandoned path only. No Ali-cohort full processing or new delivery has started.


## Existing Codex route recovered

Commit `5667041b1fe0b6d59f20d4d84d8668849eff4cf4` contains `src/scripts/llm-analysis/anonymize-local-codex.ts` (1,313 lines), its 266-line test file, and the `privacy:anonymize-local` package command. The historical runner is in Git history, absent from the current branch's working tree. It invokes the installed `codex exec` CLI, uses existing account authentication without requiring `OPENAI_API_KEY`, prepares bounded message chunks, constrains output with JSON Schema, validates typed redactions, and saves private resumable artifacts. Its historical default is `gpt-5.6-luna`; available models should be checked before reuse.

On November 16, the local executable `/opt/homebrew/bin/codex` reports version 0.167.0 and `codex login status` reports `Logged in using ChatGPT`. The CLI invocation is local; inference is not necessarily offline or on-device. Usage is subject to the authenticated account's allowance and limits, not the Sonnet API extrapolation above.

Next adapt that invocation pattern to the current shared Tinder/Hinge fixture, refined policy, exact-quote replacement schema and network markers. Compare against the saved 1,000-conversation results, then use the account-backed Codex runner for bulk work. Preserve conversation boundaries and resumability. No paid API fallback. No new model calls were made while verifying this correction.
