# Text redaction pilot, November 16, 2026

Historical experiment log. The latest implementation and prepared holdout are described in [text-redaction-next-batch.md](text-redaction-next-batch.md).

## Outcome

The authorized comparison ran against 38 conversations from 20 profiles in Ali's delivered cohort. Jev screening is inexpensive and promising. The latest exact-quote implementation completes all 38 selected conversations. Standalone names and currency amounts are preserved by code. Some geographic details and public listing addresses are still over-redacted. This is an experiment, not an approved research supplement.

## Fixture and method

The private fixture contains 40,483 messages in 3,957 nonempty conversations. It was extracted read-only from the verified production branch, using the delivered cohort's existing pseudonyms. Original database rows were not changed.

The first 20 cohort members were used, not a random population sample. For each profile we selected a contact-pattern candidate where available and a comparison conversation without those patterns. This yielded 38 conversations. Sonnet independently redacted every selected conversation, including Jev negatives. Its output is a comparison signal, not ground truth.

Seven profile model payloads fit the 60,000-character guard. Only three conversations exceed it; the largest is approximately 94,619 Unicode characters. The maximum profile payload is approximately 1.64 million characters. Character measurements do not guarantee token fit. The exploratory 200,000-character profile screen returned HTTP 400; the response cause still needs diagnosis.

## Results

| Measure | Initial policy | Revised policy |
| --- | ---: | ---: |
| Selected conversations | 38 | 38 |
| Completed comparisons | 35 | 36 |
| Span-validation failures | 3 | 2 |
| Jev positives among completed | 15 | 15 |
| Jev negatives among completed | 20 | 21 |
| Conversations changed by Sonnet | 15 | 16 |
| Changed messages | 18 | 20 |
| Jev input tokens | 74,382 | 76,472 |
| Estimated Jev cost | $0.003124 | $0.003212 |
| Sonnet input tokens | 72,350 | 74,592 |
| Sonnet output tokens | 1,595 | 1,510 |
| Estimated Sonnet cost | $0.240975 | $0.246426 |

Costs use Jev $0.042 per million input tokens and Sonnet 4.6 $3 input / $15 output per million tokens. They cover these two audit passes, not earlier synthetic or failed diagnostic runs, and are estimates rather than verified billing balances. Sonnet pricing reference: https://platform.claude.com/docs/en/models/sonnet-4-6/overview

In the revised-policy completed sample, Jev and Sonnet disagree only on case 31: Jev scores 0.38 while Sonnet replaces an ordinary first name. This is observed redactor overreach, not a confirmed missed identifier. Case 24 still replaces an ordinary first name and public workplace address. The explicit public-link instruction corrected the Pinterest content-link redaction in case 25. Cases 15 and 36 fail span validation and produce no successful sanitized artifact. No claim of population recall follows from this small, selected sample.

## Implementation and validation

The shared processor supports Tinder and Hinge shapes. It retains raw database data, validates replacement spans, and preserves other characters. A live synthetic example exposed incorrect model offsets; exact unique-substring recovery now repairs those while rejecting ambiguous quotes. Six focused tests, ESLint and typecheck passed. Typecheck emitted existing Velite metadata warnings.

Private artifacts remain under temp/text-redaction/: ali20.jsonl, audit-summary.json, audit-v2-summary.json, and audit/ plus audit-v2/. Each output preserves its message IDs. The experiment saves screening scores before redaction and resumes completed conversations. Audit files contain sensitive data and must not be committed or shared with Ali.

## Next work

1. Fix the remaining ordinary-name/public-address over-redaction and inspect the overlapping or invalid spans in cases 15 and 36. Recheck the same authorized sample.
2. Validate a broader set of negatives and representative Hinge conversations before estimating population skip rates. The selected sample's approximately 58% negative rate is not a general forecast.
3. Resolve the larger-input HTTP 400 with synthetic inputs and keep conversation fallback simple.
4. Connect the shared processor to versioned persistence, sanitized-only research exports, and new/repeated uploads. Exercise invalidation and export exclusion of pending/failed rows.
5. Backfill the full authorized cohort, account for exceptions, prepare Ali's text supplement, and deliver it. None of these production steps has happened yet.

Code is in the isolated codex/jev-text-redaction checkout. No deployment, database mutation, full backfill, or new delivery to Ali occurred during this pilot.


## Latest fixes and examples

The final implementation is `jev-text-v5`. The full v3 exact-quote run completed 38/38 conversations with no validation errors; v5 reuses its unaffected results and reruns the salary/contact case after adding a currency guard. Artifacts are in `audit-v3`, `audit-v5`, and their summaries. Nine focused tests, lint and typecheck pass.

- The model now selects an exact quote and occurrence. Code computes offsets, handles Unicode and deduplicates identical proposals. Missing or overlapping conflicting quotes still fail.
- Standalone alphabetic names in Latin, Greek and Cyrillic scripts are preserved; full multi-part names remain eligible. Names in unspaced scripts still require model judgment.
- Currency amounts cannot become ACCOUNT_ID replacements.
- Examples in the prompt distinguish private homes from public workplaces and shared-content URLs. Ordinary greetings and the public Pinterest pin are preserved in the inspected cases.
- A second model review was tested but removed: it mistakenly kept a personal Messenger URL. This experiment is retained as evidence only; it is not the final code path.

Actual excerpts below have contact values masked for display:

| Before | Current output |
| --- | --- |
| Ah well good! You can add me on snapchat. <handle masked> | Ah well good! You can add me on snapchat. [SOCIAL_HANDLE] |
| Well, colour me intrigued. I’m <handle masked> on Instagram. | Well, colour me intrigued. I’m [SOCIAL_HANDLE] on Instagram. |
| Hey Lucrezia :) | Hey Lucrezia :) |
| Haha nah I’ll be honest my salary I got today is $55,620 before super | Unchanged |
| http://m.me/<handle masked> | [URL_WITH_PII] |

Remaining quality issues: the inspected conversation still changes "I live in Herzogenaurach" to [PRIVATE_LOCATION], and a shared public real-estate listing address is still removed. A private street mention is correctly considered sensitive, but its replacement can include surrounding words such as "I live on". These are over-redaction issues to resolve before scaling. All 38 processing successfully does not establish anonymization completeness or production readiness. No further data was sent to Ali and no database rows were changed.
