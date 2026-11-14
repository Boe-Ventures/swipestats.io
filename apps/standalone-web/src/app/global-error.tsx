"use client";

import NextError from "next/error";
import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Global error boundary for unhandled errors in root layout
 *
 * In development, re-throws so Next.js's dev error overlay handles it.
 * In production, captures to PostHog and shows a fallback UI.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NODE_ENV === "development") {
    throw error;
  }

  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
