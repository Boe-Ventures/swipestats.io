# SwipeRank operations

SwipeRank uses closed calendar seasons. At 06:30 UTC on the first day of each
month, `/api/cron/swipe-rank` builds and validates completed facts and publishes
the preceding month. The same invocation also publishes the preceding quarter
on April 1, July 1, October 1, and January 1. January 1 also publishes the
preceding year.

Uploads only persist verified Tinder source data and normal profile insights.
They do not compute, refresh, or schedule SwipeRank.

The publisher is idempotent. Published snapshots remain immutable; a retry
creates only the season snapshots missing from that boundary.

Manual recovery uses the same path as cron:

```bash
bun run swipe-rank:publish -- --confirm-write
```

Read-only checks remain available:

```bash
bun run swipe-rank:validate
bun run swipe-rank:inspect-facts -- --tinder-id <id>
bun run swipe-rank:audit-over-100
```

Moderation remains reversible and acts on published fields:

```bash
bun run swipe-rank:moderate -- --tinder-id <id> --exclude \
  --reason "Confirmed test profile" --actor "admin@example.com" --confirm-write
```
