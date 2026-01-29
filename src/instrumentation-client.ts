/**
 * Client-side instrumentation (Next.js 15.3+)
 *
 * Initializes PostHog early (before React hydration) with tracking DISABLED.
 * Tracking is enabled later in AnalyticsProvider after user consent is obtained.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */
import posthog from "posthog-js";

import { env } from "./env";

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: "/ingest", // Reverse proxy (better for bypassing ad blockers)
  ui_host: "https://eu.posthog.com", // For session recordings playback
  person_profiles: "identified_only", // Only create profiles for identified users
  defaults: "2025-11-30", // Latest defaults (includes exception autocapture)
  capture_performance: true, // Web Vitals (LCP, FCP, CLS, INP)
  // Disable all tracking until consent is given (exceptions are still captured)
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  disable_session_recording: true,
  loaded: (ph) => {
    if (env.NEXT_PUBLIC_VERCEL_ENV !== "production") {
      ph.debug();
    }
  },
});
