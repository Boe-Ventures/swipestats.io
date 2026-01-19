import { z } from "zod";
import {
  NEWSLETTER_TOPICS,
  type TopicKey,
} from "@/server/clients/resend.constants";

/**
 * Newsletter validators
 *
 * Zod schemas for newsletter subscription operations.
 */

// Zod schema for newsletter topic keys
export const topicKeySchema = z.enum(NEWSLETTER_TOPICS);

// Re-export type for convenience
export type { TopicKey };
