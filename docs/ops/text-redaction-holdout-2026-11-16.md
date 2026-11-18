# Social network markers and 100-conversation audit

Completed November 16, 2026. Current code: `jev-text-v9`.

## Result

All 100 prepared conversations (1,376 messages, 13 pilot profiles) completed independent Jev screening and Sonnet redaction with zero processing failures. This was a conversation holdout, not a profile holdout. No new Hinge data was tested.

| Stratum | Conversations | Sonnet changed | Jev positive at 0.5 | Jev positive at 0.3 |
| --- | ---: | ---: | ---: | ---: |
| General sample | 60 | 2 | 3 | 6 |
| Contact-enriched sample | 40 | 27 | 27 | 28 |
| Total | 100 | 29 | 30 | 34 |

Do not extrapolate the combined rate to the whole dataset: 40 conversations were deliberately enriched for contact patterns.

## Network detection

The model returns a bounded network field. Code prioritizes a recognized URL hostname; otherwise the model uses explicit conversation context, including previous messages. Ambiguity produces [SOCIAL_HANDLE]. Handles and personal profile URLs share the platform marker. No URLs are visited and no account identities are resolved.

The initial audit produced 19 INSTAGRAM_HANDLE, one SNAPCHAT_HANDLE and one FACEBOOK_HANDLE marker, plus phone, name and location replacements. Instagram/Snapchat marker contexts were checked for explicit platform evidence. Public content links remain distinct from personal profile links.

Review caught a Facebook-specific mistake: the platform abbreviation `fb` itself was marked while the offered full name used FULL_NAME. The prompt now treats a name offered as a social account as the handle, and code preserves platform-only labels. A live rerun of that entire conversation produced:

- `Texte moi [PHONE_NUMBER]`
- `Ou [FACEBOOK_HANDLE] sur fb`

This targeted correction is saved separately as facebook-v9.json. The full 100-conversation results remain the original v8 baseline, not a full v9 rerun.

## Screening threshold and manual review

At 0.5 there were three Jev/Sonnet disagreements:

1. Jev 0.52, Sonnet unchanged: broad neighborhood/location discussion; no precise home address found in review.
2. Jev 0.70, Sonnet unchanged: discussion mentioning a public brand handle, not the participant's contact.
3. Jev 0.38, Sonnet redacted an abbreviated French street reference in a housing discussion. Treat this as a potential missed private location, not grounds to trust a negative screen.

The default threshold is now 0.3 in both the shared processor and fixture runner. Applied retrospectively to these scores, it catches every conversation Sonnet changed and skips 66/100 redaction calls (54/60 general; 12/40 enriched). This threshold was calibrated on the batch and needs independent validation; it is not a measured guarantee of recall.

Four higher-scoring negative conversations were manually inspected; they contained broad place descriptions, ordinary conversational details and a standalone surname under the current policy. A local residual scan found no email-like or 9-15 digit phone-like strings outside URLs in the sanitized baseline. Regex scans and model agreement do not establish anonymization completeness.

## Cost and checks

- Jev input tokens: 143,948; estimated $0.006045816.
- Sonnet input tokens: 245,028; output tokens: 2,725; estimated $0.775959.
- Total baseline audit estimate: $0.782004816. The targeted Facebook rerun is additional. Account balances were not checked.
- Twelve focused tests, ESLint and typecheck pass; existing Velite metadata warnings remain.
- All original inputs, metadata and identifiers are preserved by the fixture; changes are validated exact-quote replacements.

Private inputs/results: temp/text-redaction/holdout100/input.jsonl, manifest.json, results-v8/, evaluation-v8.json and facebook-v9.json. Do not commit or distribute these raw audit artifacts.

## Next

Freeze v9, evaluate unseen profiles and representative Hinge data, and spot-check the new threshold on an independent set. Then connect the common processor to sanitized persistence, export exclusion of unprocessed/failed text, and new/repeated uploads. Full backfill and Ali's promised text supplement remain unfinished. No production database mutations, deployment, full export or additional message to Ali occurred during this batch.
