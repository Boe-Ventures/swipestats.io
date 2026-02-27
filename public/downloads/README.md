# SwipeStats Demo Dataset

## Overview
This is a FREE sample dataset containing 1 anonymized dating app profiles.

## Format
JSONL (JSON Lines) — one JSON object per line.

- Line 1: metadata object (export info)
- Lines 2–N: profile objects (one per profile)
- Last line: citation object

## What's Included Per Profile
- **Profile Data**: Age, gender, location, bio, interests, education, preferences
- **Aggregated Stats**: Total swipes, matches, messages, conversion rates
- **Full Daily Activity**: Complete app usage history (swipes, matches, messages per day)
- **Match Count**: Total number of matches

## Data Structure

```json
{"type": "metadata", "exportId": "...", "tier": "FREE_SAMPLE", ...}
{"type": "profile", "profile": {...}, "meta": {...}, "usage": [...], "matchCount": 123}
{"type": "citation", "text": "..."}
```

## Privacy & Ethics
- All data is fully anonymized
- No personal identifiers included
- Message content excluded for privacy
- Collected with explicit user consent
- GDPR compliant

## Usage Rights
This sample dataset is provided for:
- Personal exploration and learning
- Testing data analysis workflows
- Understanding the data structure

For commercial use, publication, or larger datasets, please visit:
https://swipestats.io/research

## Need More Data?

| Tier | Profiles | Price |
|------|----------|-------|
| Starter | 10 | $15 |
| Standard | 1,000 | $50 |
| Fresh | 1,000 recent | $150 |
| Premium | 3,000 recent | $300 |
| Academic | 5,000+ custom | From $1,500 |

Visit https://swipestats.io/research to purchase

## Citation
If you use this data in research or publications, please cite as:
"SwipeStats.io Dating App Dataset, 2026, 1 Profiles"

## Questions?
Contact: kris@swipestats.io
Website: https://swipestats.io
