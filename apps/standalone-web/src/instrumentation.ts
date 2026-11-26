/**
 * Server-side instrumentation
 *
 * Captures server-side errors and sends them to PostHog.
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import type { Instrumentation } from "next";

export function register() {
  // No-op for initialization
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { captureException } =
        await import("@/server/clients/posthog.client");

      // Extract distinct_id from PostHog cookie
      let distinctId: string | undefined;

      const cookieHeader = request.headers.cookie;
      const cookieString = Array.isArray(cookieHeader)
        ? cookieHeader.join("; ")
        : cookieHeader;

      if (cookieString) {
        const postHogCookieMatch = /ph_phc_.*?_posthog=([^;]+)/.exec(
          cookieString,
        );

        if (postHogCookieMatch?.[1]) {
          try {
            const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
            const postHogData = JSON.parse(decodedCookie) as {
              distinct_id: string;
            };
            distinctId = postHogData.distinct_id;
          } catch (e) {
            console.error("[PostHog] Error parsing cookie:", e);
          }
        }
      }

      // Capture the exception
      await captureException(
        err instanceof Error ? err : new Error(String(err)),
        distinctId,
      );
    } catch (captureError) {
      console.error("[PostHog] Error capturing exception:", captureError);
    }
  }
};
