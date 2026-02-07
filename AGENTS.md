# Repository Guidelines

## Project Structure & Module Organization
Swipestats is a Bun-driven Next.js app with routes and handlers in `src/app`, UI primitives in `src/components`, and shared logic across `src/lib`, `src/contexts`, and `src/hooks`. Server-only helpers plus TRPC routers sit in `src/server` and `src/trpc`. Velite content (`content/`), React Email templates (`emails/`), static assets (`public`, `test-data`), and ops files (`workflows/`, `drizzle.config.ts`, `velite.config.ts`, `start-database.sh`) cover marketing material, exports, cron, schema, and DB bootstrap.

## Build, Test, and Development Commands
- `bun run dev` – Next dev server with Turbo.
- `bun run build` + `bun run preview` – Build Velite + Next + `bun db:push`, then run `next start` for prod-like QA.
- `bun run check` – `eslint` + `tsc --noEmit`; treat as the pre-PR gate.
- `bun run lint` / `bun run lint:fix` / `bun run format:write` – Keep ESLint + Prettier + Tailwind ordering enforced.
- `bun run db:migrate | db:push | db:studio` – Manage Drizzle schema changes and inspect data.
- `bun run velite:dev` / `bun run email:dev` – Watch content and email previews while editing marketing flows.

## Coding Style & Naming Conventions
TypeScript is mandatory; components are functional and `PascalCase`, hooks/context exports use `camelCase`, and route files follow Next defaults (`page.tsx`, `layout.tsx`, `route.ts`). Prettier enforces 2-space indentation, double quotes, 80-character lines, and sorted Tailwind classes, so run it before committing. Client modules must include `"use client"`, and shared helpers belong in `src/lib` rather than inside feature folders.

## Testing Guidelines
Dedicated suites are still forming, so `bun run check`, `bun run typecheck`, and `bun run preview` define the baseline. New specs should live beside each feature as `.spec.ts(x)` files, stub TRPC calls, reuse fixtures from `test-data`, and document manual QA steps in the PR until automation lands.

## Commit & Pull Request Guidelines
History uses short, imperative titles (`lint cleanup`, `download dataset improvements`), so keep commits single-purpose, reference issues with `[#123]`, and call out schema or content changes in the body. PRs need a summary, screenshots or Looms, confirmation that build/check commands succeeded, and rebases with `main`.

## Database & Configuration Tips
Launch the local DB via `start-database.sh` (or Neon) before running Drizzle commands, and store `DATABASE_URL`, auth secrets, and analytics keys in `.env.local`. Generate or migrate schemas with `bun run db:generate` and `bun run db:migrate`; never edit emitted SQL. For marketing or email updates, follow with `bun run velite:build` and `bun run email:dev` to validate output.
