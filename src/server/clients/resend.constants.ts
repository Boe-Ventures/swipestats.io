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
