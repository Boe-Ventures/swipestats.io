# Database migrations

SwipeStats uses checked-in Drizzle migrations for both long-lived Neon
branches: `production` and shared `dev`. Local developers and Vercel Preview
deployments intentionally share `dev`; this is a speed tradeoff and means it may
temporarily contain a migration from a feature branch that is not yet on `main`.

`bun run build` builds the application first and then runs `bun db:migrate`.
Baselining is not part of a normal build.

## Normal schema-change flow

1. Change the Drizzle schema.
2. Run `bun run db:generate` and give the migration a descriptive name.
3. Review the SQL, snapshot, and journal together.
4. Run `bun run db:check` and apply the migration to the intended database with
   `bun run db:migrate`.
5. Commit the schema, SQL, snapshot, and journal in the same change.

Never rewrite, reorder, or delete migration SQL after it has reached shared
`dev` or `production`. If a feature is abandoned, add a corrective migration or
reset `dev` from `production`, then reapply migrations from `main`.

`db:push` is only for a disposable, isolated database. It must not target the
long-lived `dev` or `production` branch.

## Shared dev policy

- Coordinate schema-bearing changes so one migration chain advances at a time.
- Additive changes are the default. Use expand/contract when old and new Preview
  builds need to coexist.
- A `dev` journal entry newer than `main` is expected while its owning branch is
  active; it is not by itself corruption.
- Before a production deploy, committed migrations must form one ordered chain,
  and production must contain matching timestamps and hashes for the migrations
  already applied there.
- The shared `dev` branch is disposable and can be reset from `production` when
  preserving its feature data is not important.

## Existing databases and baselines

An existing database created with `db:push` must be baselined exactly once
before its first migration-managed deploy. Verify its schema against migration
0000, record the matching timestamp and SHA-256 hash in
`drizzle.__drizzle_migrations`, and then run `db:migrate`.

This is an explicit operator action. Do not put automatic baselining in the
build: a deployment must never decide on its own that an existing schema is safe
to mark as migrated.

## Optional Neon branches for risky work

Ordinary additive changes can use shared `dev`. Create a short-lived Neon branch
for destructive rehearsals, complicated backfills, or experiments that may need
their migration chain discarded.

Prefer the globally configured Neon MCP. The authenticated Neon CLI is the
fallback:

```bash
neonctl projects list --org-id <org-id>
neonctl branches list --project-id <project-id>

# Use --parent dev for integration realism, or production for a clean rehearsal.
neonctl branches create --project-id <project-id> \
  --name codex/<task> --parent dev --expires-at <iso-timestamp>

neonctl branches delete codex/<task> --project-id <project-id>
```

Set an expiry as a backstop and still delete the branch explicitly at handoff.
No nightly sweeper is needed.

## Risky changes

For renames, type changes, new `NOT NULL` constraints, enum replacement, or
large backfills:

1. add a backward-compatible shape;
2. deploy code that supports both shapes;
3. backfill separately and verify the result;
4. enforce or remove the old shape in a later migration.

For production recovery, create or restore into a separate Neon branch first,
validate the application against it, and switch over only after verification.
Never destroy the only production branch before a restore has been proven.
