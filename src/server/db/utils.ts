import { randomUUID } from "crypto";

/**
 * Creates a prefixed ID for database records.
 * Format: {prefix}_{uuid} (e.g., "usr_abc123...")
 *
 * Common prefixes:
 * - usr: user
 * - ses: session
 * - acc: account
 * - ver: verification
 * - pst: post
 */
export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}
