import { PostHog } from "posthog-node";

import type {
  AnalyticsMetadata,
  ServerAnalyticsEventName,
  ServerEventPropertiesDefinition,
} from "@/lib/analytics/analytics.types";
import { omitNullish } from "@/lib/analytics/analytics.utils";
import { env } from "@/env";

// Export the singleton getter for use in instrumentation.ts
export { getPostHogServer };

// =====================================================
// POSTHOG CLIENT (Singleton)
// =====================================================

let posthogInstance: PostHog | null = null;

function getPostHogServer() {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    throw new Error("NEXT_PUBLIC_POSTHOG_KEY is not configured");
  }

  if (!posthogInstance) {
    posthogInstance = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: "https://eu.i.posthog.com", // PostHog EU ingestion API (server-side)
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogInstance;
}

// =====================================================
// SERVER EVENT TRACKING
// =====================================================

/**
 * Track a server-side event in PostHog
 */
export async function trackPosthogServerEvent<
  T extends ServerAnalyticsEventName,
>(
  userId: string,
  event: T,
  properties: ServerEventPropertiesDefinition[T],
  meta?: AnalyticsMetadata,
): Promise<void> {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    console.warn(
      "⚠️ [PostHog] NEXT_PUBLIC_POSTHOG_KEY not configured, skipping event",
    );
    return;
  }

  try {
    const posthog = getPostHogServer();

    posthog.capture({
      distinctId: userId,
      event: event,
      properties: {
        ...omitNullish(properties as Record<string, unknown>),
        // Include $ip for PostHog's automatic GeoIP enrichment
        ...(meta?.ip ? { $ip: meta.ip } : {}),
      },
      timestamp: meta?.timestamp,
      groups: meta?.groups
        ? (omitNullish(meta.groups) as Record<string, string | number>)
        : undefined,
    });

    await posthog.shutdown();
  } catch (error) {
    console.error(
      "❌ [PostHog] Server track error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
