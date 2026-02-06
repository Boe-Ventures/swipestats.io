# Resend Management Scripts

Scripts for managing Resend topics, contacts, and email preferences.

## 📚 Documentation

- **[TOPICS_AND_BROADCASTS.md](./TOPICS_AND_BROADCASTS.md)** - Complete guide for implementing Resend Broadcasts with Topics (for when you're ready to send marketing emails)
- **[NEWSLETTER_STRATEGY.md](./NEWSLETTER_STRATEGY.md)** - Current subscription strategy and touchpoints

## Prerequisites

Make sure you have `RESEND_API_KEY` set in your `.env` file:

```bash
RESEND_API_KEY=re_xxxxx
```

## Scripts

### List Topics

View all existing topics in your Resend account:

```bash
bun src/scripts/resend/list-topics.ts
```

### Create Topics

Automatically create all topics defined in `NEWSLETTER_TOPICS`:

```bash
bun src/scripts/resend/create-topics.ts
```

This will:
- Check for existing topics
- Create any missing topics with the correct IDs
- Skip topics that already exist

The topics created are:
- `general_newsletter` - General Newsletter
- `dating_tips` - Dating Tips & Advice
- `product_updates` - Product Updates
- `research_news` - Research & Statistics
- `profile_compare_waitlist` - Profile Compare Waitlist
- `bumble_waitlist` - Bumble Support Waitlist

### Bulk Unsubscribe from Topics

Unsubscribe all contacts from all topics (useful for cleanup):

```bash
bun src/scripts/resend/bulk-unsubscribe-topics.ts
```

This will:
- Fetch all contacts
- Unsubscribe each contact from all topics
- Respect rate limits (2 req/sec)
- Show success/error counts

⚠️ WARNING: This unsubscribes from ALL topics including newsletter topics!

### Re-subscribe Newsletter Members

Re-subscribe existing newsletter contacts to General Newsletter:

```bash
bun src/scripts/resend/resubscribe-newsletter-members.ts
```

This will:
- Fetch all contacts
- Subscribe them to General Newsletter topic
- Leave product waitlists unsubscribed (Profile Compare, Bumble)
- Respect rate limits (2 req/sec)

Use this after bulk unsubscribe to restore newsletter subscriptions.

## Topic IDs

The topic IDs are defined in `src/lib/newsletter-topics.ts` and must match exactly:

```typescript
export const NEWSLETTER_TOPICS = {
  GENERAL: "general_newsletter",
  DATING_TIPS: "dating_tips",
  PRODUCT_UPDATES: "product_updates",
  RESEARCH_NEWS: "research_news",
  PROFILE_COMPARE: "profile_compare_waitlist",
  BUMBLE_SUPPORT: "bumble_waitlist",
} as const;
```

## Notes

- Topic IDs are unique identifiers used in your code
- Topic names are display names shown to users
- All topics are set to `opt_in` by default (users must explicitly subscribe)
- All topics are `public` (visible on unsubscribe pages)
