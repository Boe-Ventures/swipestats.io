/**
 * Newsletter topic constants
 *
 * Defines the available newsletter topics in Resend.
 * These keys provide type-safe access to Resend topics throughout the codebase.
 */
export const NEWSLETTER_TOPICS = [
  "newsletter-general",
  "newsletter-dating-tips",
  "newsletter-product-updates",
  "newsletter-research",
  "waitlist-profile-compare",
  "waitlist-bumble",
  "waitlist-message-analysis",
  "waitlist-directory-profiles",
] as const;

/**
 * Type-safe topic keys for newsletter subscriptions
 *
 * Use these keys throughout the codebase instead of raw UUIDs.
 * The mapping to Resend topic IDs is handled internally in resend.client.ts
 */
export type TopicKey = (typeof NEWSLETTER_TOPICS)[number];

/**
 * Stable acquisition sources for newsletter and waitlist subscriptions.
 *
 * Keep these placement-oriented rather than page-oriented. The current URL is
 * stored separately, so a shared CTA can still be attributed to the page where
 * it was rendered.
 */
export const NEWSLETTER_SOURCES = [
  "general_newsletter_cta",
  "data_request_reminder",
  "blog_newsletter_card",
  "feature_waitlist",
  "bumble_waitlist",
  "account_conversion",
  "design_system",
] as const;

export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];
