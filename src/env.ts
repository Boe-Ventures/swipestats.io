import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    RESEND_API_KEY: z.string().optional(),
    LEMON_SQUEEZY_API_KEY: z.string(),
    LEMON_SQUEEZY_WEBHOOK_SECRET: z.string(),
    ADMIN_TOKEN: z.string().min(32), // Require strong token (32+ chars)
    BLOB_READ_WRITE_TOKEN: z.string().optional(), // Optional for dev without Vercel Blob
    // Slack webhooks
    SLACK_WEBHOOK_BOT_MESSAGES: z.string().url(),
    SLACK_WEBHOOK_AI_PHOTOS: z.string().url(),
    SLACK_WEBHOOK_BOT_DEVELOPER: z.string().url(),
    SLACK_WEBHOOK_SALES: z.string().url(),
    SLACK_WEBHOOK_RICH_MESSAGE_TEST: z.string().url(),
  },

  /**
   * Specify your shared environment variables schema here (accessible on both client and server).
   */
  shared: {
    NEXT_PUBLIC_VERCEL_ENV: z
      .enum(["development", "preview", "production"])
      .optional(),
    NEXT_PUBLIC_IS_PRODUCTION: z.boolean().default(false), // True production: VERCEL_ENV=production AND domain is www.swipestats.io
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_MAPBOX_PUBLIC_API_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    LEMON_SQUEEZY_API_KEY: process.env.LEMON_SQUEEZY_API_KEY,
    LEMON_SQUEEZY_WEBHOOK_SECRET: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    // Slack webhooks
    SLACK_WEBHOOK_BOT_MESSAGES: process.env.SLACK_WEBHOOK_BOT_MESSAGES,
    SLACK_WEBHOOK_AI_PHOTOS: process.env.SLACK_WEBHOOK_AI_PHOTOS,
    SLACK_WEBHOOK_BOT_DEVELOPER: process.env.SLACK_WEBHOOK_BOT_DEVELOPER,
    SLACK_WEBHOOK_SALES: process.env.SLACK_WEBHOOK_SALES,
    SLACK_WEBHOOK_RICH_MESSAGE_TEST: process.env.SLACK_WEBHOOK_RICH_MESSAGE_TEST,
    // Priority: explicit override > true production > branch URL > localhost default
    NEXT_PUBLIC_BASE_URL:
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_ENV === "production" &&
      process.env.VERCEL_PROJECT_PRODUCTION_URL === "www.swipestats.io"
        ? "https://www.swipestats.io"
        : process.env.VERCEL_BRANCH_URL
          ? `https://${process.env.VERCEL_BRANCH_URL}`
          : undefined),
    NEXT_PUBLIC_MAPBOX_PUBLIC_API_KEY:
      process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_API_KEY,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    // True production = VERCEL_ENV is production AND domain is www.swipestats.io
    NEXT_PUBLIC_IS_PRODUCTION:
      process.env.VERCEL_ENV === "production" &&
      process.env.VERCEL_PROJECT_PRODUCTION_URL === "www.swipestats.io",
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

/**
 * Environment-aware value selector
 * Selects values based on current environment (production vs test)
 * Matches LemonSqueezy's test mode (dev/preview) vs production mode
 */
export function envSelect<T>(values: { prod: T; test: T }): T {
  return env.NEXT_PUBLIC_IS_PRODUCTION ? values.prod : values.test;
}
