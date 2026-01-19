import { env } from "@/env";

/**
 * Environment-aware value selector
 * Selects values based on current environment (production vs test)
 * Matches LemonSqueezy's test mode (dev/preview) vs production mode
 */
export function envSelect<T>(values: { prod: T; test: T }): T {
  return env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? values.prod
    : values.test;
}
