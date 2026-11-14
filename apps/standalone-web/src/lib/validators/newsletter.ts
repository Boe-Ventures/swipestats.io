import { z } from "zod";
import {
  NEWSLETTER_SOURCES,
  NEWSLETTER_TOPICS,
  type NewsletterSource,
  type TopicKey,
} from "@/server/clients/resend.constants";

/**
 * Newsletter validators
 *
 * Zod schemas for newsletter subscription operations.
 */

// Zod schema for newsletter topic keys
export const topicKeySchema = z.enum(NEWSLETTER_TOPICS);
export const newsletterSourceSchema = z.enum(NEWSLETTER_SOURCES);

// Re-export type for convenience
export type { NewsletterSource, TopicKey };
