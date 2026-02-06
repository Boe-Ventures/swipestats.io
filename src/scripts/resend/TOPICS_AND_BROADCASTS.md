# Resend Topics & Broadcasts Implementation Guide

> **Status**: Topics infrastructure ✅ complete | Broadcasts 🚧 not yet implemented  
> **Last Updated**: February 6, 2026  
> **Reference**: [Resend Topics Documentation](https://resend.com/docs/llms.txt)

## Overview

This document provides guidance for implementing Resend Broadcasts with Topics for SwipeStats marketing emails. Our current setup manages topic subscriptions but doesn't yet send Broadcasts.

## Current Implementation Status

### ✅ What We Have
- **8 Topics defined** in `resend.constants.ts` and mapped to Resend UUIDs in `resend.client.ts`
- **Topic management API** (`newsletterRouter.ts`) for subscribe/unsubscribe
- **Client utilities** for creating contacts and managing topic subscriptions
- **Type-safe topic keys** (no raw UUIDs in code)
- **Transactional emails** (email verification) working via `resend.emails.send()`

### 🚧 What We Don't Have Yet
- **Broadcast sending** functionality
- **Segment management** (targeting specific user groups)
- **Custom branded unsubscribe page** (still using default)
- **Marketing email templates** for Broadcasts

## Why Topics Matter for Broadcasts

### The Core Principle
> **Topics don't define who receives a message—they define who asked not to receive that message.**

When you send a Broadcast:
1. **Without Topics**: Users can only unsubscribe from ALL emails (nuclear option)
2. **With Topics**: Users can say "no product updates" but keep "dating tips"

### Impact on Deliverability

Topics improve sender reputation by:
- **Reducing spam complaints** (users opt out of specific content instead of marking as spam)
- **Increasing engagement rates** (only send to people who want that content type)
- **Preventing list attrition** (users stay subscribed to what they value)

Mailbox providers (Gmail, Outlook) track engagement. When you send "Product Updates" to everyone on your list, people who don't care about product updates won't open it—hurting your sender reputation.

## When to Use Topics vs Segments

This is critical: **Topics and Segments serve different purposes.**

| Aspect              | Topics                                    | Segments                                   |
| ------------------- | ----------------------------------------- | ------------------------------------------ |
| **Who controls it** | Recipients (via preferences)              | You (the sender)                           |
| **Visibility**      | Public (shown on unsubscribe page)        | Internal only                              |
| **Purpose**         | Respect recipient content preferences     | Target specific user groups                |
| **Example**         | "Newsletter", "Product Updates"           | "Active Users", "Premium Subscribers"      |
| **Use for**         | "What are we sending"                     | "Who are we sending to"                    |

### How They Work Together

```
Broadcast = Segment (who) + Topic (what)
```

**Example**: Send a product announcement to "Enterprise Customers" Segment, labeled with "Product Updates" Topic.
- Everyone in the Segment receives it...
- **EXCEPT** those who opted out of "Product Updates" Topic

## Our Topic Strategy

### Current Topics

```typescript
// Newsletter Topics (regular content)
"newsletter-general"          // Weekly/monthly general updates
"newsletter-dating-tips"      // Dating advice and tips  
"newsletter-product-updates"  // Product announcements
"newsletter-research"         // Research findings and data

// Waitlist Topics (one-time notifications)
"waitlist-profile-compare"    // Profile comparison feature launch
"waitlist-bumble"            // Bumble integration launch
"waitlist-message-analysis"   // Message analysis feature launch
"waitlist-directory-profiles" // Profile directory feature launch
```

### Topic Design Principles

**Keep it simple**: 3-5 main content types. Too many options overwhelm users.

**Clear names**: "Newsletter" ✅ vs "Category A" ❌

**Add descriptions**: Help users understand frequency and content expectations

**Opt-in vs Opt-out defaults**:
- **Opt-in** (current): All contacts can receive this content by default unless they unsubscribe (good for broad content like general newsletter)
- **Opt-out**: Contacts must explicitly subscribe to receive this content (good for niche content like beta programs)

⚠️ **Note**: You cannot change the default subscription type after creating a Topic.

### Public vs Private Topics

- **Public**: Visible on unsubscribe page to all contacts (current default)
- **Private**: Only visible to contacts already subscribed (good for VIP/beta content)

## Implementing Broadcasts

### 1. Add Broadcast Sending Function

Add to `src/server/clients/resend.client.ts`:

```typescript
/**
 * Send a marketing email via Resend Broadcasts
 * Always requires a topic to protect recipients' preferences
 * 
 * @example
 * await sendBroadcast({
 *   topic: "newsletter-general",
 *   subject: "New dating insights this week",
 *   html: emailHtml,
 *   from: "SwipeStats Newsletter <newsletter@mail.swipestats.io>"
 * });
 */
export async function sendBroadcast(params: {
  topic: TopicKey;
  subject: string;
  html: string;
  from?: string;
  segmentId?: string; // Optional: target specific segment
  scheduledAt?: string; // Optional: ISO 8601 date string for scheduled sending
}) {
  const topicId = getTopicId(params.topic);
  
  try {
    const payload = {
      from: params.from ?? "SwipeStats <noreply@mail.swipestats.io>",
      subject: params.subject,
      html: params.html,
      topic_id: topicId,
      ...(params.segmentId && { segment_id: params.segmentId }),
      ...(params.scheduledAt && { scheduled_at: params.scheduledAt }),
    };

    const response = await resend.broadcasts.send(payload);
    
    console.log(`✅ Broadcast sent with topic ${params.topic}`);
    return { success: true, data: response };
  } catch (error) {
    console.error("❌ Failed to send broadcast:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### 2. Create tRPC Router for Broadcasts (Optional)

If you want to send broadcasts from the app (e.g., admin dashboard):

```typescript
// src/server/api/routers/broadcastRouter.ts
import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { sendBroadcast } from "@/server/clients/resend.client";
import { topicKeySchema } from "@/lib/validators";

export const broadcastRouter = createTRPCRouter({
  send: adminProcedure
    .input(
      z.object({
        topic: topicKeySchema,
        subject: z.string().min(1),
        html: z.string().min(1),
        from: z.string().email().optional(),
        segmentId: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await sendBroadcast(input);
    }),
});
```

### 3. Example Usage in a Script

```typescript
// src/scripts/resend/send-weekly-newsletter.ts
import { sendBroadcast } from "@/server/clients/resend.client";
import { render } from "@react-email/render";
import { WeeklyNewsletterEmail } from "../../../emails/WeeklyNewsletter";

async function sendWeeklyNewsletter() {
  // Render email template
  const emailHtml = await render(
    WeeklyNewsletterEmail({
      stats: { /* weekly stats */ },
      articles: [ /* curated content */ ],
    })
  );

  // Send broadcast
  const result = await sendBroadcast({
    topic: "newsletter-general",
    subject: "Your Weekly Dating Stats Roundup",
    html: emailHtml,
    from: "SwipeStats Newsletter <newsletter@mail.swipestats.io>",
    // Optional: target specific segment
    // segmentId: "active-users-segment-id",
  });

  if (result.success) {
    console.log("✅ Weekly newsletter sent!");
  } else {
    console.error("❌ Failed:", result.error);
  }
}

sendWeeklyNewsletter();
```

## Segments: Targeting User Groups

### What Are Segments?

Segments let you send to specific subsets of your contacts based on criteria you define:

- "Active users" (uploaded data in last 30 days)
- "Tinder users" vs "Hinge users"
- "Premium subscribers"
- "Free trial users"

### Creating Segments

Segments are created via Resend Dashboard or API:

```typescript
// Example: Create segment via API (not yet implemented)
export async function createSegment(params: {
  name: string;
  description?: string;
}) {
  const response = await resend.segments.create({
    name: params.name,
    description: params.description,
  });
  return response;
}
```

### Using Segments with Broadcasts

```typescript
await sendBroadcast({
  topic: "newsletter-product-updates",
  subject: "New Premium Features",
  html: emailHtml,
  segmentId: "premium-users-segment-id", // Only send to premium users
});
```

**Key Point**: Even within a Segment, users who opted out of the Topic won't receive the email.

## Customizing the Unsubscribe Page

### Dashboard Settings

Navigate to: **Resend Dashboard → Settings → Unsubscribe Page**

Customization options:
- **Title and description**
- **Logo** (upload your SwipeStats logo)
- **Colors**: Background, text, accent
- **Footer**: Remove "Powered by Resend" (Pro plan+ only)

### Why This Matters

A branded unsubscribe page:
- Looks professional and trustworthy
- Encourages preference management over full unsubscribe
- Reinforces your brand even during opt-out

### What Users See

When they click "Unsubscribe" in a Broadcast, they see:
1. Your logo and branding
2. All **public** Topics (with your descriptions)
3. Checkboxes to opt in/out of each Topic
4. Option to unsubscribe from everything (required by law)

## Best Practices

### Always Label Broadcasts with a Topic

⚠️ **CRITICAL**: If you send a Broadcast without a Topic and someone unsubscribes, they'll be unsubscribed from **ALL** your emails—not just that content type.

```typescript
// ❌ BAD: No topic specified
await resend.broadcasts.send({
  from: "...",
  subject: "...",
  html: "...",
  // topic_id: missing!
});

// ✅ GOOD: Topic specified
await sendBroadcast({
  topic: "newsletter-general",
  subject: "...",
  html: "...",
});
```

### Use Clear, Descriptive Topic Names

```typescript
// ❌ BAD
"category_a"
"misc"
"emails_type_1"

// ✅ GOOD
"newsletter-general"
"newsletter-dating-tips"
"newsletter-product-updates"
```

### Respect Rate Limits

Resend has a 2 requests/second limit. Our `subscribeToTopics()` function already handles this with 700ms delays.

### Monitor Engagement

After sending broadcasts, track:
- **Open rates** (are people interested?)
- **Click rates** (are people engaging?)
- **Unsubscribe rates** (are we sending too much?)

High unsubscribe rates = reconsider frequency or content quality.

## Environment Variables

### Current Setup

```bash
# Required
RESEND_API_KEY=re_xxxxx
```

### Optional for Broadcasts

```bash
# Optional: Default audience ID (if using multiple audiences)
RESEND_AUDIENCE_ID=aud_xxxxx

# Optional: Custom unsubscribe page URL
NEXT_PUBLIC_UNSUBSCRIBE_URL=https://swipestats.io/unsubscribe
```

## Testing Strategy

### Before Going Live

1. **Test with your own email**:
   ```typescript
   await sendBroadcast({
     topic: "newsletter-general",
     subject: "TEST: Weekly Newsletter",
     html: emailHtml,
     segmentId: "test-segment-id", // Create a segment with just your email
   });
   ```

2. **Verify unsubscribe flow**:
   - Click unsubscribe link
   - Confirm you see branded page
   - Opt out of one topic
   - Verify you still receive other topics

3. **Check spam score**:
   - Use tools like mail-tester.com
   - Ensure proper SPF/DKIM setup
   - Test across Gmail, Outlook, Yahoo

### Monitoring in Production

```bash
# Check recent broadcasts
bun src/scripts/resend/list-broadcasts.ts  # (script not yet created)

# Monitor topic subscriptions
bun src/scripts/resend/list-topics.ts
```

## Migration Path from Current Setup

### Phase 1: Infrastructure (Complete ✅)
- [x] Topics created in Resend
- [x] Topic IDs mapped in `resend.client.ts`
- [x] Subscription management API (`newsletterRouter`)
- [x] Frontend components for topic management

### Phase 2: Broadcast Setup (Next)
- [ ] Implement `sendBroadcast()` function
- [ ] Create email templates for broadcasts
- [ ] Set up segments in Resend dashboard
- [ ] Brand the unsubscribe page
- [ ] Create admin interface for sending broadcasts (optional)

### Phase 3: First Broadcast
- [ ] Write content for first newsletter
- [ ] Create React Email template
- [ ] Send test broadcast to small segment
- [ ] Monitor engagement metrics
- [ ] Iterate based on feedback

### Phase 4: Automation (Future)
- [ ] Scheduled weekly/monthly newsletters
- [ ] Automated onboarding email sequences
- [ ] Feature launch announcements
- [ ] Re-engagement campaigns

## Common Scenarios

### Scenario 1: Weekly Newsletter

```typescript
// Every Friday, send general newsletter
await sendBroadcast({
  topic: "newsletter-general",
  subject: "This Week in Dating: Top Insights",
  html: emailHtml,
  from: "SwipeStats Weekly <newsletter@mail.swipestats.io>",
  // Optional: Only send to engaged users
  segmentId: "active-users-last-30-days",
});
```

### Scenario 2: Product Launch

```typescript
// Announce new feature to all users
await sendBroadcast({
  topic: "newsletter-product-updates",
  subject: "New Feature: AI Message Analysis",
  html: emailHtml,
  // No segment = send to entire audience (who opted in to product updates)
});
```

### Scenario 3: Waitlist Notification

```typescript
// Feature is ready, notify waitlist
await sendBroadcast({
  topic: "waitlist-profile-compare",
  subject: "Profile Compare is Now Live!",
  html: emailHtml,
  // Only people subscribed to this waitlist topic will receive it
});
```

### Scenario 4: Scheduled Send

```typescript
// Schedule for Monday 9am EST
await sendBroadcast({
  topic: "newsletter-dating-tips",
  subject: "5 Tips to Improve Your Match Rate",
  html: emailHtml,
  scheduledAt: "2026-02-10T14:00:00Z", // Monday 9am EST in UTC
});
```

## Troubleshooting

### Broadcast Not Sending

1. **Check API key**: Ensure `RESEND_API_KEY` is set correctly
2. **Verify topic ID**: Ensure the topic exists in Resend dashboard
3. **Check contact list**: Ensure contacts exist and are subscribed to the topic
4. **Review rate limits**: Space out bulk operations

### Low Open Rates

1. **Subject line**: Test different subject lines
2. **From address**: Use a recognizable sender name
3. **Timing**: Experiment with send times (weekday mornings often work best)
4. **Frequency**: Don't send too often (weekly max for most content)

### High Unsubscribe Rates

1. **Too frequent**: Reduce sending frequency
2. **Irrelevant content**: Improve targeting with Segments
3. **Quality issues**: Review content quality and value proposition
4. **Missing topics**: Maybe you need more granular Topics

## Resources

- [Resend Topics Documentation](https://resend.com/docs/dashboard/topics/introduction)
- [Resend Broadcasts API](https://resend.com/docs/api-reference/broadcasts/send-broadcast)
- [Resend Segments Documentation](https://resend.com/docs/dashboard/segments/introduction)
- [React Email Documentation](https://react.email/) (for templates)

## Quick Reference

### Key Files

```
src/
├── server/
│   ├── clients/
│   │   ├── resend.client.ts        # Client & topic management
│   │   └── resend.constants.ts     # Topic definitions
│   └── api/
│       └── routers/
│           └── newsletterRouter.ts # Topic subscription API
│
├── scripts/
│   └── resend/
│       ├── list-topics.ts          # View all topics
│       ├── test-topic-subscription.ts
│       └── TOPICS_AND_BROADCASTS.md # This file
│
└── emails/                          # React Email templates
    └── (future broadcast templates)
```

### Key Commands

```bash
# View current topics
bun src/scripts/resend/list-topics.ts

# Test topic subscription
bun src/scripts/resend/test-topic-subscription.ts

# Send a broadcast (after implementation)
bun src/scripts/resend/send-newsletter.ts
```

---

**Ready to implement?** Start with Phase 2 above. Questions? Check existing docs in this folder or Resend's official documentation.
