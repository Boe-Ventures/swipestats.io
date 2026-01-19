# Newsletter & Topics Strategy

## ✅ Migration Complete (Jan 14, 2026)

All topics have been successfully recreated with `opt_out` as the default subscription setting. Users must now **explicitly opt-in** to receive any communications.

### New Topic IDs

```typescript
export const NEWSLETTER_TOPICS = {
  GENERAL: "cd53ae86-7048-4a60-bbbb-edbcc2cfa8ce", // General Newsletter
  DATING_TIPS: "55ef0009-eceb-4592-813e-ddf8497b4e66", // Dating Tips & Advice
  PRODUCT_UPDATES: "16b415f6-150f-45ae-97f5-6b5bfd2221c7", // Product Updates
  RESEARCH_NEWS: "5d0f29c3-e8f0-49e8-911d-db031b8f4a66", // Research & Statistics
  PROFILE_COMPARE: "428e50fc-3cff-4843-8312-1d7fb3862a96", // Profile Compare Waitlist
  BUMBLE_SUPPORT: "a82c1230-dc2e-4a29-878e-5bebe5f40049", // Bumble Support Waitlist
} as const;
```

## Current Subscription Points (Explicit User Actions)

### ✅ Already Implemented - Explicit Opt-In

1. **Marketing Newsletter CTA** (`src/app/(marketing)/NewsletterCTA.tsx`)
   - Topic: `NEWSLETTER_TOPICS.GENERAL`
   - User Action: Clicks "Subscribe to Newsletter" or enters email + "Notify me"
   - Location: Marketing pages
   - ✅ **Good**: Explicit user action required

2. **MDX Newsletter Card** (`src/components/mdx/NewsletterCard.tsx`)
   - Topic: `NEWSLETTER_TOPICS.GENERAL`
   - User Action: Enters email + clicks subscribe button
   - Location: Within blog posts/content
   - ✅ **Good**: Explicit user action required

3. **Coming Soon - Profile Compare** (`src/app/app/dashboard/ProfileCompareSection.tsx`, `src/app/app/profile-compare/page.tsx`)
   - Topic: `NEWSLETTER_TOPICS.PROFILE_COMPARE`
   - User Action: Clicks "Notify me when ready" or enters email
   - Location: Profile Compare feature pages
   - ✅ **Good**: Explicit waitlist signup

4. **Coming Soon - Bumble Support** (likely similar pattern)
   - Topic: `NEWSLETTER_TOPICS.BUMBLE_SUPPORT`
   - User Action: Clicks button to join waitlist
   - ✅ **Good**: Explicit waitlist signup

5. **Newsletter Preferences** (`src/app/app/account/NewsletterPreferencesForm.tsx`)
   - Topics: All topics (GENERAL, PROFILE_COMPARE, BUMBLE_SUPPORT)
   - User Action: User manages their own subscriptions
   - Location: Account settings
   - ✅ **Good**: User-controlled opt-in/out

## Potential New Subscription Points

Consider adding programmatic opt-ins at these natural touchpoints:

### 🎯 High Priority (Strong User Intent)

1. **After First Tinder Data Upload** ⭐
   - **When**: User successfully uploads their first Tinder data
   - **What**: Show a modal/toast asking "Want tips to improve your stats?"
   - **Topics**: 
     - `NEWSLETTER_TOPICS.GENERAL` (recommended)
     - `NEWSLETTER_TOPICS.DATING_TIPS` (optional checkbox)
   - **Why**: High engagement moment, clear value proposition
   - **Implementation**: Add to the data upload success flow

2. **After Viewing Stats Dashboard** ⭐
   - **When**: User spends >30 seconds on their stats dashboard
   - **What**: Small inline banner: "Get personalized tips based on your stats"
   - **Topics**: 
     - `NEWSLETTER_TOPICS.DATING_TIPS`
   - **Why**: User is engaged with their data
   - **Implementation**: Add a dismissible banner to dashboard

3. **When Viewing Limited Feature** ⭐
   - **When**: User clicks on a premium/coming-soon feature
   - **What**: "Get notified when this is available"
   - **Topics**: Feature-specific waitlist topics
   - **Why**: Clear intent to use the feature
   - **Implementation**: Already implemented via `ComingSoonWrapper`

### 🎯 Medium Priority (Moderate User Intent)

4. **Onboarding Flow**
   - **When**: After user creates account but BEFORE data upload
   - **What**: "Stay updated on new features?" checkbox (unchecked by default)
   - **Topics**: `NEWSLETTER_TOPICS.PRODUCT_UPDATES`
   - **Why**: Sets expectations early
   - **Implementation**: Add optional checkbox to signup/onboarding

5. **After Comparing with Friends**
   - **When**: User uses a social/comparison feature
   - **What**: "Want dating tips to improve your results?"
   - **Topics**: `NEWSLETTER_TOPICS.DATING_TIPS`
   - **Why**: Social comparison creates motivation
   - **Implementation**: Add to social features

6. **Blog Post Engagement**
   - **When**: User reads 2+ blog posts
   - **What**: Slide-in: "Enjoy our content? Get it in your inbox"
   - **Topics**: 
     - `NEWSLETTER_TOPICS.RESEARCH_NEWS`
     - `NEWSLETTER_TOPICS.GENERAL`
   - **Why**: Proven content interest
   - **Implementation**: Add scroll tracking to blog layout

### 🎯 Low Priority (Nice to Have)

7. **Before Account Deletion**
   - **When**: User attempts to delete account
   - **What**: "Stay subscribed to newsletter even if you delete account?"
   - **Topics**: `NEWSLETTER_TOPICS.GENERAL`
   - **Why**: Last chance to maintain relationship
   - **Implementation**: Add to account deletion flow

8. **Referral Success**
   - **When**: User refers a friend who signs up
   - **What**: "Want more ways to help your friends with dating?"
   - **Topics**: `NEWSLETTER_TOPICS.DATING_TIPS`
   - **Why**: Social proof and helping motivation
   - **Implementation**: Add to referral success page

## Topic Usage Strategy

### `NEWSLETTER_TOPICS.GENERAL`
- **Purpose**: Main newsletter, broad updates
- **Content**: Mix of tips, product updates, research
- **Frequency**: Weekly or bi-weekly
- **Subscribe When**: Strong engagement (data upload, blog reading)

### `NEWSLETTER_TOPICS.DATING_TIPS`
- **Purpose**: Actionable dating advice
- **Content**: Profile optimization, conversation starters, strategy
- **Frequency**: Weekly
- **Subscribe When**: User shows interest in self-improvement

### `NEWSLETTER_TOPICS.PRODUCT_UPDATES`
- **Purpose**: New features and improvements
- **Content**: Release notes, new capabilities, beta access
- **Frequency**: Monthly or on major releases
- **Subscribe When**: Early in onboarding or when user is power user

### `NEWSLETTER_TOPICS.RESEARCH_NEWS`
- **Purpose**: Data-driven insights
- **Content**: Dataset releases, studies, statistics
- **Frequency**: Monthly or when new research available
- **Subscribe When**: User engages with blog/research content

### `NEWSLETTER_TOPICS.PROFILE_COMPARE`
- **Purpose**: Feature launch notification
- **Content**: Single email when feature goes live
- **Frequency**: One-time
- **Subscribe When**: User tries to access the feature (already implemented)

### `NEWSLETTER_TOPICS.BUMBLE_SUPPORT`
- **Purpose**: Feature launch notification
- **Content**: Single email when feature goes live
- **Frequency**: One-time
- **Subscribe When**: User tries to access Bumble features (already implemented)

## Best Practices

### ✅ DO
- Always require explicit user action (button click, form submit)
- Show clear value proposition ("Get personalized tips based on your stats")
- Allow granular topic selection in account settings
- Make unsubscribe easy and prominent
- Respect user's choice - don't ask repeatedly

### ❌ DON'T
- Auto-subscribe on account creation
- Auto-subscribe on any implicit action
- Hide the subscription or make it hard to find
- Re-subscribe users who unsubscribed
- Send to topics they didn't subscribe to

## GDPR & CAN-SPAM Compliance

✅ **Current Status**: COMPLIANT

- All topics use `opt_out` (require explicit consent)
- All subscription points require user action
- Unsubscribe available in account settings
- Privacy policy linked on all forms
- No pre-checked boxes (if we add checkboxes)

## Current API Endpoints

### `newsletter.subscribe` (tRPC)
- Creates contact in Resend
- Subscribes to specific topic (if provided)
- Used by: All forms/buttons that subscribe users

### `newsletter.getMyTopics` (tRPC)
- Gets current user's subscriptions
- Returns list of topic IDs they're subscribed to
- Used by: Account settings, newsletter status checks

### `newsletter.updateMyTopics` (tRPC)
- Updates user's topic subscriptions
- Takes array of topic IDs to subscribe to
- Unsubscribes from topics not in array
- Used by: Account settings preferences form

## Implementation Notes

All the infrastructure is already in place:

1. ✅ Topics created with `opt_out` default
2. ✅ API endpoints working correctly
3. ✅ Frontend hooks (`useNewsletter`) ready
4. ✅ Forms and components reusable
5. ✅ Account settings page for management

**Next Step**: Just add subscription prompts at the high-priority touchpoints listed above!

## Testing

To test the new opt-out behavior:

```bash
# 1. List all topics and verify opt_out
bun src/scripts/resend/list-topics.ts

# 2. Create a test contact (they won't be auto-subscribed)
# 3. Check their topics - should be empty
# 4. Use the subscribe endpoint to opt them in
# 5. Verify they're now subscribed
```
