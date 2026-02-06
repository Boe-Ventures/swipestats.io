import { track as vercelServerTrack } from "@vercel/analytics/server";
import { ipAddress, waitUntil } from "@vercel/functions";

import type {
  AnalyticsMetadata,
  ServerAnalyticsEventName,
  ServerEventPropertiesDefinition,
} from "@/lib/analytics/analytics.types";
import { sanitizeForVercel } from "@/lib/analytics/analytics.utils";
import { trackPosthogServerEvent } from "@/server/clients/posthog.client";
import { trackSlackEvent } from "@/server/clients/slack.client";
import { headers } from "next/headers";

// =====================================================
// PROVIDER INTERFACE
// =====================================================

interface ServerAnalyticsProvider {
  id: string;
  trackServerEvent?: <T extends ServerAnalyticsEventName>(
    userId: string,
    event: T,
    properties: ServerEventPropertiesDefinition[T],
    meta?: AnalyticsMetadata,
  ) => Promise<unknown> | void;
}

// =====================================================
// PROVIDER CONFIGURATION
// =====================================================

const serverAnalyticsProviders: ServerAnalyticsProvider[] = [
  {
    id: "posthog",
    trackServerEvent: trackPosthogServerEvent,
  },
  {
    id: "vercel",
    trackServerEvent: <T extends ServerAnalyticsEventName>(
      userId: string,
      event: T,
      properties: ServerEventPropertiesDefinition[T],
    ) => {
      try {
        return vercelServerTrack(
          event,
          sanitizeForVercel({
            userId,
            ...properties,
          }),
        );
      } catch (error) {
        console.error("❌ [Vercel] Server track error:", error);
      }
    },
  },
  {
    id: "slack",
    trackServerEvent: trackSlackEvent,
  },
];

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Track a server-side analytics event
 *
 * Fire-and-forget operation using waitUntil - doesn't block HTTP response.
 *
 * @example
 * ```ts
 * trackServerEvent(userId, "user_signed_up", {
 *   email: "user@example.com",
 *   method: "google"
 * });
 * ```
 */
export function trackServerEvent<T extends ServerAnalyticsEventName>(
  userId: string,
  event: T,
  properties: ServerEventPropertiesDefinition[T],
  meta?: AnalyticsMetadata,
): void {
  console.log("🟢 [Analytics] Server event:", {
    userId,
    event,
    properties,
  });

  waitUntil(
    (async () => {
      // Auto-extract IP for PostHog GeoIP if not provided
      const ip = meta?.ip ?? ipAddress({ headers: await headers() });
      const enrichedMeta = ip ? { ...meta, ip } : meta;

      for (const provider of serverAnalyticsProviders) {
        if (provider.trackServerEvent) {
          await provider.trackServerEvent(
            userId,
            event,
            properties,
            enrichedMeta,
          );
        }
      }
    })(),
  );
}
