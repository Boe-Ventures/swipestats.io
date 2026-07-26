# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` is a
symlink to this file.

## What this is

**SwipeStats** — a dating app analytics platform that helps users understand
their Tinder and Hinge data. T3 stack: Next.js 16 (App Router), tRPC, Drizzle
on Neon Postgres, Better Auth, Tailwind 4 + Radix, Velite for MDX, React Email
+ Resend, LemonSqueezy billing, Vercel AI SDK v7 with `@ai-sdk/anthropic`.
Package manager is **Bun**.

`bun check` (migration-history validation + ESLint + tsc) is the pre-PR gate.
Scripts, env vars, directory layout, and the table list are discoverable from
`package.json`, `.env.example`, `src/env.ts`, and the file tree. This file
covers what they don't tell you.

## Migrations — the important one

SwipeStats intentionally runs **separate long-lived Neon `production` and
shared `dev` branches**; local development and Preview deployments both share
`dev`.

- Use `bun db:generate` then `bun db:migrate`.
- **Never `db:push` against either long-lived branch.**
- Regenerate emitted SQL rather than hand-editing it.
- **Never rewrite a migration that has reached a shared database.**

Branch and recovery policy is in `docs/ops/database-migrations.md`.

This is why `bun check` validates migration history — a broken chain here is
expensive to unwind.

## Domain knowledge

### Upload pipelines

Two providers, same shape: parse → transform → compute stats.

- **Tinder**: user uploads `data.json` → `extract-tinder-data.ts` →
  `profile.service.ts` → `meta.service.ts`
- **Hinge**: user uploads `matches.json` + `account.json` →
  `extract-hinge-data.ts` → `hinge-transform.service.ts` →
  `hinge-meta.service.ts`

Both store the original in `original_anonymized_file`, create a
`tinder_profile`/`hinge_profile` record, and precompute `profile_meta` so
analytics queries stay fast.

### Cohort system

Precomputed percentile distributions that power "you're in the top 10%"
comparisons. System cohorts key on gender + data provider (e.g.
`tinder_male`); users can define custom cohorts with extra filters.
`cohort_stats` holds P10/P25/P50/P75/P90 and mean per metric.

## Gotchas

**`adminProcedure` requires an admin email in production but is unauthenticated
in dev.** Don't mistake local access for real authorization.

**Better Auth runs an anonymous plugin**, so guest sessions exist — a session
being present does not mean the user is registered.

**`snake_case` in the database, `camelCase` in TypeScript.** Configured in
`drizzle.config.ts`; Drizzle converts automatically.

**`velite build` must run before `next build`.** It's wired into `bun build`,
and `.velite/` is gitignored.

**Local auth:** `GET /api/dev/login` mints a real Better Auth session for an
existing user. Dev-only — production and preview return 404. Add `?mode=token`
for a cookie header instead of a browser redirect.

## Conventions

- Routers live in `src/server/api/routers/[name]Router.ts` and **must be
  registered in `src/server/api/root.ts`** to exist.
- Procedures (`src/server/api/trpc.ts`): `publicProcedure` (session still
  readable if present), `protectedProcedure`, `adminProcedure`. Context carries
  `db`, `session`, `headers`.
- Business logic belongs in `src/server/services/`; shared helpers in
  `src/lib`, not inside feature folders.
- `src/server/db/schema.ts` is the single source of truth for schema.
- Import from `src/` with the `@/*` alias.
- Client modules need `"use client"`.
- Prettier owns formatting (2-space, double quotes, 80 cols, sorted Tailwind
  classes) — run `bun format:write` before committing.

For tRPC query/mutation/prefetch patterns, use the **`trpc-patterns`** skill.
For commit and PR conventions, use the **`git-conventions`** skill.

## Testing

Dedicated suites are still forming, so `bun check`, `bun typecheck`, and
`bun preview` are the baseline. New specs go beside the feature as
`.spec.ts(x)`, stub tRPC calls, and reuse fixtures from `test-data/`. Document
manual QA in the PR until automation lands.

## Deeper docs

- `docs/ops/database-migrations.md` — Neon branch and recovery policy
