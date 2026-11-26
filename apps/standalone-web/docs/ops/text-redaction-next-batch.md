# Text redaction: social contacts and next batch

This preparation record is superseded by [the completed holdout audit](text-redaction-holdout-2026-11-16.md), including network-specific markers and threshold calibration.

Implementation: `jev-text-v7`, November 16, 2026.

## Decisions

Use `[SOCIAL_CONTACT]` for both a handle and a personal social/messaging account URL. Preserve any platform name already in the prose. Do not infer a platform for an ambiguous handle, resolve an account, or visit links. Recognize contact-sharing context across messages. Ordinary platform mentions, shared posts/reels/pins and casual uses of @ stay unchanged.

Continue exact-quote replacement. The model supplies the quote, message ID and occurrence; code computes the slice, rejects missing/conflicting quotes, and preserves every other character. Rewriting the entire message would make accidental paraphrases harder to detect.

Location proposals now carry a scope. The application discards proposals labeled city/town, public place or shared listing. A speaker's residential street is sensitive even though the street itself is public. This remains dependent on correct model classification, so the holdout must check both missed details and unnecessary removal.

## Verification

The v6 rerun processed all 38 original conversations without errors. Handles and personal URLs used the same marker; shared listing addresses were preserved. It also missed a residential-street association. A targeted v7 clarification and rerun of that full conversation corrected it: only the street is removed, while the town, public institute address, first name and surrounding words remain.

Four live synthetic checks also passed: a handle supplied across messages, a personal profile URL, ambiguous ordinary words/@ usage, and a shared reel plus a town name.

The location and URL corrections were verified on the original tuned sample, not on the new holdout. Ten focused tests, lint and typecheck validate the implementation. The private artifacts are under temp/text-redaction/audit-v6 and location-v7.json.

## Prepared holdout

- 100 conversations, 1,376 messages, from 13 of the original 20 profiles.
- All 38 previously reviewed conversations excluded.
- 60 deterministically sampled general conversations plus 40 contact-enriched conversations.
- Largest serialized conversation: 17,543 characters.
- Conversation-level holdout only; these are not unseen profiles or Hinge validation.
- Keep results separate by stratum. Do not treat the enriched sample's positive rate as population prevalence.
- Private input and manifest: temp/text-redaction/holdout100/input.jsonl and manifest.json.
- No model calls have been made on this new batch.

The reusable audit runner independently redacts Jev negatives too, so it can identify disagreements. Its cache includes input and configuration fingerprints. Reported disagreements require review; Sonnet is not ground truth.

```sh
bun --env-file=/Users/boconsulting/Developer/boe-ventures/swipestats.io/.env.local \
  src/scripts/llm-analysis/audit-text-fixture.ts \
  temp/text-redaction/holdout100/input.jsonl \
  temp/text-redaction/holdout100/results-v7
```

Evaluate contact recall, over-redaction, unchanged surrounding text, failures and cost. Add unseen profiles and Hinge cases afterward. Production persistence, sanitized-only export enforcement, incoming upload integration, full backfill and Ali's text delivery remain unfinished. No database writes or deployments were made for this refinement.
