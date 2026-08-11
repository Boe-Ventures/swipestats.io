# SwipeRank operations

SwipeRank is a closed monthly competition. At 06:30 UTC on the first day of
each month, `/api/cron/swipe-rank` builds and validates completed-month facts,
then publishes the immediately preceding calendar month as an immutable
snapshot.

Uploads only persist verified Tinder source data and normal profile insights.
They do not compute, refresh, or schedule SwipeRank.

The publisher is idempotent. Once a month has a published snapshot, rerunning
the job returns that edition without rebuilding or revising its field.

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
