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
import { OPERATIONAL_SERVER_EVENTS } from "@/lib/analytics/analytics.registry";
import type { ConsentRecord } from "@/lib/analytics/consent";
import { db } from "@/server/db";
import { userTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * Read the user's durable analytics consent (mirror of their localStorage
 * decision). Returns null if undecided, unknown, or the column isn't migrated
 * yet — all treated as "no analytics consent on record".
 */
async function loadConsent(userId: string): Promise<ConsentRecord | null> {
  try {
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
      columns: { analyticsConsent: true },
    });
    return user?.analyticsConsent ?? null;
  } catch {
    return null;
  }
}

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
      // Respect the user's stored analytics consent (durable DB mirror).
      const consent = await loadConsent(userId);
      const analyticsAllowed = consent?.preferences.analytics === true;
      const operational = OPERATIONAL_SERVER_EVENTS.has(event);

      // Behavioral analytics needs consent; operational events run under
      // legitimate interest. Drop behavioral events when consent is absent.
      if (!operational && !analyticsAllowed) return;

      // IP (PostHog GeoIP) is personal data — only forward it with consent,
      // and strip any caller-provided IP when consent is absent.
      const ip = analyticsAllowed
        ? (meta?.ip ?? ipAddress({ headers: await headers() }))
        : undefined;
      const enrichedMeta: AnalyticsMetadata | undefined = meta
        ? { ...meta, ip }
        : ip
          ? { ip }
          : undefined;

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
