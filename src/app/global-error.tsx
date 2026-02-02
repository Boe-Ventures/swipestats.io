"use client";

import NextError from "next/error";
import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Global error boundary for unhandled errors in root layout
 *
 * This catches errors that occur in the root layout that aren't caught
 * by route-level error boundaries.
 */
export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture the error in PostHog
    posthog.captureException(error);
    console.error("[GlobalError] Unhandled error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
