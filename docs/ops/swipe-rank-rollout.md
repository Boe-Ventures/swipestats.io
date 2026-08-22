# SwipeRank rollout

SwipeRank publishes frozen, completed calendar seasons. The production cron runs
at 06:30 UTC on the first day of each month. It always publishes the preceding
month, adds the preceding quarter at quarter boundaries, and adds the preceding
year on January 1.

Uploads do not perform SwipeRank work. Public, owner, and admin reads use only
published snapshots.

## Before merge

1. Confirm the PR is based on current `main`, is mergeable, and has a successful
   Vercel Preview deployment.
2. Run `bun check`.
3. Confirm production has applied migrations through
   `0010_swipe_rank_and_upload_pipeline` and has not applied `0011` or `0012`.
4. Confirm the production Vercel environment contains `DATABASE_URL`,
   `CRON_SECRET`, and either `SWIPE_RANK_PUBLIC_ID_SECRET` or
   `BETTER_AUTH_SECRET`.
5. Rehearse `bun db:migrate` and `bun run swipe-rank:publish -- --confirm-write`
   on an expiring Neon branch created from production.
6. Verify the rehearsal produces a published snapshot, matching entry and field
   counts, no validation mismatches, and no activated legacy build.

## Deploy

The production Vercel build runs `bun db:migrate` after the application build.
Migrations `0011` and `0012` are additive. A failed migration prevents the new
deployment from becoming active.

After Vercel reports a successful production deployment:

1. Confirm both migration hashes appear in `drizzle.__drizzle_migrations`.
2. Confirm `tinder_export_revision` exists and `swipe_rank_entry` has the eight
   period-correct fields from migration `0011`.
3. Open `/leaderboard`. It should remain in the unpublished state.
4. Check `/insights` with an owned Tinder profile. The SwipeRank card should say
   that the first ranking appears after a completed month is published.
5. Check `/admin/swipe-rank` with a production admin session.

## First publication

Run `/api/cron/swipe-rank` from the production deployment summary in Vercel.
This uses the configured cron authorization and exercises the same route as the
monthly schedule.

The invocation must finish within the route's 300-second limit and return:

- `ok: true`;
- `validation.valid: true`;
- zero duplicate, unsupported-period, open-period, raw-month, rate-input,
  quality-flag, and registry-descriptor mismatches;
- one published snapshot for every season due at that month boundary;
- equal `fieldSize` and `entryCount` values for each snapshot.

Then verify:

1. The latest complete build still has `activated_at IS NULL`. This keeps the
   pre-release application fail-closed if Vercel must roll back.
2. The public period inventory contains only the newly published closed season.
3. `/leaderboard` renders the full field and does not offer an open period.
4. An eligible owner sees the same closed season on `/insights`.
5. `/admin/swipe-rank` shows the snapshot and retains profile view and ban tools.

The publisher is idempotent. A retry should return `alreadyPublished: true`
without creating a build or snapshot.

## Recovery

Before the first publication, a normal Vercel rollback is sufficient. The two
additive migrations can remain in production.

After publication, the same rollback remains safe because the monthly publisher
does not activate the legacy live-fact readiness marker. Published snapshot rows
can stay in place for a later redeploy.

Do not delete or rewrite migrations that reached shared `dev` or production.
Do not remove published snapshots during an application rollback. Investigate
on a Neon branch created from production, then fix forward or restore from a
verified point-in-time branch.
