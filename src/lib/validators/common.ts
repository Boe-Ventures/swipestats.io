import { z } from "zod";

/**
 * Common reusable Zod validators
 *
 * These validators are used across multiple routers and services.
 */

// Email validation
export const emailSchema = z
  .string()
  .email("Please enter a valid email address");

// ID validation
export const profileIdSchema = z.string().min(1);
export const userIdSchema = z.string().min(1);

// Pagination
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type Pagination = z.infer<typeof paginationSchema>;
