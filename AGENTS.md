# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, etc.) when working with code in this repository. `CLAUDE.md` is a symlink to this file.

## Project Overview

SwipeStats is a dating app analytics platform that helps users understand their Tinder and Hinge data. Built with the T3 Stack (Next.js, tRPC, Drizzle, Tailwind CSS), driven by Bun.

## Development Commands

```bash
# Development
bun install          # Install dependencies
bun dev              # Start at https://swipestats.localhost:1355 via Portless
bun dev:direct       # Start Next directly (used internally by Portless)
bun dev:turbo        # Optional direct Turbopack server

# Build & Run
bun build            # Build Velite + Next and apply committed Drizzle migrations
bun start            # Start production server
bun preview          # Build and run `next start` without the migration step

# Code Quality
bun check            # Migration-history validation + ESLint + tsc --noEmit; treat as the pre-PR gate
bun lint             # Run ESLint
bun lint:fix         # Fix linting issues
bun typecheck        # Type check without emitting

# Formatting
bun format:check     # Check formatting
bun format:write     # Fix formatting (ESLint + Prettier + Tailwind class ordering)

# Database
bun db:generate      # Generate Drizzle migrations
bun db:migrate       # Run migrations
bun db:push          # Push schema changes directly (never against long-lived branches — see Database & Configuration Tips)
bun db:studio        # Open Drizzle Studio

# Content & Email
bun velite:build     # Build blog content
bun velite:dev       # Watch blog content
bun email:dev        # Email preview server
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **API**: tRPC for type-safe API calls
- **Auth**: Better Auth with username, admin, and anonymous plugins
- **Styling**: Tailwind CSS 4 with Radix UI components
- **Content**: Velite for MDX blog posts
- **Email**: React Email with Resend
- **Billing**: LemonSqueezy subscriptions
- **Package Manager**: Bun

### Directory Structure

```
src/
├── app/                    # Next.js App Router (routes and handlers)
│   ├── (auth)/            # Auth routes (signin, signup, etc.)
│   ├── (marketing)/       # Public pages (landing, blog, upload, insights)
│   ├── app/               # Authenticated app routes
│   └── share/             # Public sharing routes
├── components/            # UI primitives
├── contexts/              # Shared React contexts
├── hooks/                 # Shared React hooks
├── server/
│   ├── api/
│   │   ├── routers/       # tRPC routers (profileRouter, userRouter, etc.)
│   │   ├── root.ts        # Main tRPC router - ADD NEW ROUTERS HERE
│   │   └── trpc.ts        # tRPC setup, context, procedures
│   ├── db/
│   │   ├── schema.ts      # Drizzle schema (single source of truth)
│   │   ├── index.ts       # Database connection
│   │   └── constants.ts   # DB-related constants
│   ├── services/          # Business logic (profile, hinge, cohort, etc.)
│   └── better-auth/       # Auth configuration
├── trpc/                  # tRPC client setup
│   ├── react.tsx          # React Query integration
│   └── server.tsx         # Server-side caller
├── lib/                   # Shared utilities
│   ├── upload/            # Data extraction (Tinder/Hinge)
│   ├── utils/             # Helper functions
│   └── interfaces/        # TypeScript interfaces for data formats
└── scripts/               # Maintenance and utility scripts

content/posts/             # MDX blog posts (Velite)
emails/                    # React Email templates
public/                    # Static assets
test-data/                 # Test fixtures for data exports
workflows/                 # Cron/ops workflows
```

Ops files at the root: `drizzle.config.ts` (schema config), `velite.config.ts` (content config), `start-database.sh` (DB bootstrap).

### Database Schema

The database uses Drizzle ORM with PostgreSQL. Key tables:

**Auth Tables** (Better Auth):

- `user` - User accounts with SwipeStats fields (activeOnTinder, swipestatsTier, etc.)
- `session`, `account`, `verification` - Auth system tables

**Dating App Profile Tables**:

- `tinder_profile` - Tinder profile data and metadata
- `hinge_profile` - Hinge profile data and metadata
- `tinder_usage` - Daily usage statistics (swipes, matches, messages)
- `match` - Matches from both Tinder and Hinge
- `message` - Messages within matches
- `media` - Photos/videos from profiles

**Analytics**:

- `profile_meta` - Pre-computed profile statistics
- `cohort_definition` - Cohort filters (e.g., "tinder_male")
- `cohort_stats` - Percentile distributions for cohort comparisons

**Profile Comparison Feature**:

- `profile_comparison` - Container for A/B test
- `comparison_column` - One column per dating app
- `comparison_column_content` - Photos/prompts in each column
- `profile_comparison_feedback` - Ratings/comments

**Research & Marketing**:

- `dataset_export` - Research dataset exports
- `newsletter`, `email_reminder`, `waitlist`

**Important**: The schema uses `snake_case` column names in the database (configured in drizzle.config.ts), but Drizzle automatically converts to/from `camelCase` in TypeScript.

### tRPC Architecture

**Context** (src/server/api/trpc.ts):

- Available in all procedures: `db`, `session`, `headers`
- Session comes from Better Auth via `auth.api.getSession()`

**Procedure Types**:

- `publicProcedure` - No auth required (can still access session if logged in)
- `protectedProcedure` - Requires authentication
- `adminProcedure` - Requires admin email (no auth in dev mode)

**Adding a New Router**:

1. Create router in `src/server/api/routers/[name]Router.ts`
2. Export router using `createTRPCRouter({ ... })`
3. Import and add to `appRouter` in `src/server/api/root.ts`
4. New routes automatically available in client via `api.[routerName].[procedureName]`

### Better Auth

Authentication is handled by Better Auth with plugins:

- Email/password authentication
- Username plugin (unique usernames)
- Admin plugin (role-based access)
- Anonymous plugin (guest sessions)

Configuration in `src/server/better-auth/config.ts`. Session available in tRPC context.

For local browser or headless testing, `GET /api/dev/login` creates a real
Better Auth session for an existing user. The route is available only under
`next dev`; production and preview deployments return 404. Use
`?mode=token` for a cookie header instead of a browser redirect.

### Data Upload & Processing

**Tinder Data**:

1. User uploads `data.json` file
2. `extract-tinder-data.ts` parses and validates
3. `profile.service.ts` transforms to DB schema
4. `meta.service.ts` computes statistics

**Hinge Data**:

1. User uploads `matches.json` + `account.json`
2. `extract-hinge-data.ts` parses and validates
3. `hinge-transform.service.ts` transforms to DB schema
4. `hinge-meta.service.ts` computes statistics

Both flows:

- Store original files in `original_anonymized_file` table
- Create profile records (tinder_profile/hinge_profile)
- Compute ProfileMeta for quick analytics queries

### Cohort System

Pre-computed percentile distributions for comparing users:

- System cohorts: gender + data provider (e.g., "tinder_male")
- User can create custom cohorts with additional filters
- CohortStats stores P10, P25, P50, P75, P90, mean for key metrics
- Enables "You're in the top 10%" type comparisons

### Blog Content

Uses Velite to process MDX files in `content/posts/`:

- Frontmatter schema in `velite.config.ts`
- Authors defined in `src/lib/blog-authors.ts`
- Auto-detects thumbnails from `public/images/blog/thumbnails/`
- Builds to `.velite/` directory (gitignored)
- Run `bun velite:build` before `bun build`

## Environment Variables

Required variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth encryption key (production only)
- `NEXT_PUBLIC_BASE_URL` - Application URL
- `LEMON_SQUEEZY_API_KEY` - Billing integration
- `LEMON_SQUEEZY_WEBHOOK_SECRET` - Webhook verification
- `NEXT_PUBLIC_MAPBOX_PUBLIC_API_KEY` - Map visualization
- `RESEND_API_KEY` - Email delivery (optional)

Environment validation in `src/env.ts` using `@t3-oss/env-nextjs`.

## Database & Configuration Tips

SwipeStats intentionally uses separate long-lived Neon `production` and shared
`dev` branches; local development and Preview deployments share `dev`. Generate
and apply migrations with `bun run db:generate` and `bun run db:migrate`;
regenerate emitted SQL rather than editing it by hand, and never rewrite a
migration that has reached a shared database. Do not use `db:push` against either
long-lived branch. See `docs/ops/database-migrations.md` for branch and recovery
policy.

## Coding Style & Naming Conventions

- TypeScript is mandatory.
- Components are functional and `PascalCase`; hooks/context exports use `camelCase`; route files follow Next defaults (`page.tsx`, `layout.tsx`, `route.ts`).
- Prettier enforces 2-space indentation, double quotes, 80-character lines, and sorted Tailwind classes — run it before committing.
- Client modules must include `"use client"`.
- Shared helpers belong in `src/lib` rather than inside feature folders.

## Path Aliases

Use `@/*` to import from `src/`:

```typescript
import { db } from "@/server/db";
import { api } from "@/trpc/react";
```

## Testing Guidelines

Dedicated suites are still forming, so `bun run check`, `bun run typecheck`, and `bun run preview` define the baseline. New specs should live beside each feature as `.spec.ts(x)` files, stub tRPC calls, reuse fixtures from `test-data`, and document manual QA steps in the PR until automation lands.

## Commit & Pull Request Guidelines

History uses short, imperative titles (`lint cleanup`, `download dataset improvements`), so keep commits single-purpose, reference issues with `[#123]`, and call out schema or content changes in the body. PRs need a summary, screenshots or Looms, confirmation that build/check commands succeeded, and rebases with `main`.

## Common Patterns

**Client-side tRPC query** (in React component):

```typescript
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

const trpc = useTRPC();

const profileQuery = useQuery(
  trpc.profile.getById.queryOptions(
    { id: "..." },
    {
      refetchOnWindowFocus: false,
    },
  ),
);

// Access data: profileQuery.data, profileQuery.isLoading, etc.
```

**Client-side tRPC mutation** (in React component):

```typescript
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";

const trpc = useTRPC();

const updateProfileMutation = useMutation(
  trpc.profile.update.mutationOptions({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      void profileQuery.refetch(); // Refetch related queries
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  }),
);

// Trigger mutation: updateProfileMutation.mutate({ id: "...", data: {...} })
```

**Server-side tRPC call** (in Server Component - immediate fetch):

```typescript
import { trpcApi } from "@/trpc/server";

export default async function Page() {
  const caller = await trpcApi();
  const profile = await caller.profile.getById({ id: "..." });

  return <div>{profile.name}</div>;
}
```

**Server-side tRPC prefetch** (for client components):

```typescript
import { trpc, HydrateClient, prefetch } from "@/trpc/server";

export default async function Page() {
  const session = await getSession();

  if (session) {
    // Prefetch data for client components
    prefetch(trpc.user.me.queryOptions());
  }

  return (
    <HydrateClient>
      <ClientComponent /> {/* Can access prefetched data */}
    </HydrateClient>
  );
}
```

**Direct database query** (when you don't need tRPC):

```typescript
import { db } from "@/server/db";
import { eq } from "drizzle-orm";

const user = await db.query.userTable.findFirst({
  where: eq(userTable.id, userId),
  with: { tinderProfiles: true, hingeProfiles: true },
});
```

**Admin procedure** (in router):

```typescript
deleteProfile: adminProcedure
  .input(z.object({ profileId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Only accessible in dev or to admin emails in production
  }),
```
