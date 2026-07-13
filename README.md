# SwipeStats

> Visualize your dating data

A modern dating app analytics platform that helps you understand your Tinder and Hinge performance through beautiful insights and data visualizations.

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

```bash
# Install dependencies
bun install

# Start development server
bun dev
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
