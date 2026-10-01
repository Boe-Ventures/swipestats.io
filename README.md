# SwipeStats

> Visualize your dating data

A modern dating app analytics platform that helps you understand your Tinder and Hinge performance through beautiful insights and data visualizations.

## Merge workflow

When project owner Kristian (`kristianeboe`) says "yeet to main", "get to
main", or equivalent wording, complete the current agreed work through a
verified merge into `main`: validate, commit, push, open or update the PR,
check its status, and merge. Use an admin merge for his own PRs or PRs
prepared on his behalf if the required-review rule blocks merging; no
separate confirmation is needed.

Failed checks must be reported and fixed before merging. This does not
authorize bypassing unrelated protections, disabling repository review
rules, or waiving review for collaborator-authored PRs without an explicit
exception. Preserve unrelated changes in other checkouts. See
[AGENTS.md](./AGENTS.md) for the full agent instructions; `CLAUDE.md` links
to the same file.

## How to Use

1. **Get your data** from Tinder at [account.gotinder.com/data](https://account.gotinder.com/data) or Hinge
2. **Upload your data** at [swipestats.io](https://swipestats.io)
3. **View insights** - Analyze your matches, messages, swipe patterns, and compare yourself to cohorts
4. **Track your journey** - Add life events and see how they impact your dating app performance

## Privacy

SwipeStats processes dating-app exports in the browser and removes direct
identifiers before upload. Profile IDs are deterministic hashes of stable,
provider-native account timestamps, so repeat exports update the same profile
without using an email address as the identifier.

```typescript
export async function createSHA256Hash(str: string) {
  const utf8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((bytes) => bytes.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
```

Your profile ID is created deterministically, so if you upload your file again in the future, your data will be updated without creating duplicates:

```typescript
const profileId = await createSHA256Hash(
  birthDate + "-" + appProfileCreateDate,
);
```

Learn more: [SHA256 on Wikipedia](https://en.wikipedia.org/wiki/SHA-2)

## Demo

![SwipeStats Insights](./public/placeholder.svg)

## Quick Start

### Development

Install Node.js 24 (the version used by Vercel), Bun, and the Vercel CLI, then
clone the repository. Sign in to Vercel with access to the Boe Ventures
`swipestats` project.

```bash
vercel login
vercel link
vercel env pull .env.local --environment=development
bun install --frozen-lockfile
bun dev
```

Choose the Boe Ventures `swipestats` project when linking. Development and
Preview use the shared Neon `dev` branch. Pull the **Development** environment;
the Production `DATABASE_URL` points at a different, long-lived database. Keep
`.env.local` out of Git. `bun dev` starts Portless, which gives the app a stable
local URL. LocalCan is optional, and the dev script skips tunnel sync when it
isn't installed. The URL printed by Portless is the one to open.

The Vercel Development pull includes the required app credentials. You can use
`.env.example` to see their names or to configure a separate local database.
It contains placeholders, so copying it alone does not start the app. Run the
repository gate before a PR:

```bash
bun check
```

Use `bun db:generate` and `bun db:migrate` for schema changes. `bun build`
also runs migrations after Next.js builds, so use it only with the intended
database URL. See [database migrations](docs/ops/database-migrations.md) before
changing the schema. For a local build check without a migration or PostHog
source-map upload, run:

```bash
POSTHOG_PERSONAL_API_KEY='' bunx next build
```

## Tech Stack

This is a [T3 Stack](https://create.t3.gg/) project with:

- [Next.js](https://nextjs.org) - React framework
- [Drizzle](https://orm.drizzle.team) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [tRPC](https://trpc.io) - Type-safe API
- [Better Auth](https://better-auth.com) - Authentication

## Project Structure

```
src/
├── app/              # Next.js app router
├── server/           # Backend logic
│   ├── db/          # Database schema & queries
│   └── api/         # tRPC routers
├── scripts/          # Maintenance and utility scripts
└── lib/             # Shared utilities
```

## Features

- 📊 **Comprehensive Analytics** - Track swipes, matches, messages, and response times
- 👥 **Cohort Comparisons** - See how you compare to others by gender, age, and location
- 📅 **Life Event Tracking** - Correlate dating performance with trips, relationships, and profile changes
- 🎯 **Profile A/B Testing** - Test different bios and photos to optimize your profile
- 🔒 **Privacy-First** - All data is anonymized using SHA256 hashing
- 📱 **Multi-Platform** - Supports both Tinder and Hinge data
- 📈 **Insights Dashboard** - Beautiful visualizations of your dating journey

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Developer guide for working with this codebase
- **[BLOG.md](BLOG.md)** - Blog content ideas
- **[Database migrations](docs/ops/database-migrations.md)** - Shared dev,
  production, and optional Neon branch workflow

## Project History

This repository is a continuation and complete rewrite of the original [swipestats.io](https://github.com/Boe-Ventures/swipestats.io) project. The new version features:

- PostgreSQL data modeling with Drizzle ORM
- Upgraded to Next.js 16 with App Router
- Modern authentication with Better Auth
- Enhanced analytics and cohort comparison system
- Profile A/B testing functionality
- Improved privacy and data handling

The original repository is archived and this version represents the active development of SwipeStats.

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/):

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available)

## Deployment

Production is deployed on Vercel. `bun run build` builds Velite and Next.js,
then applies committed Drizzle migrations.
