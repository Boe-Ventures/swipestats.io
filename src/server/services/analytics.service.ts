import { track as vercelServerTrack } from "@vercel/analytics/server";
import { ipAddress, waitUntil } from "@vercel/functions";

import type {
  AnalyticsMetadata,
  ServerAnalyticsEventName,
  ServerEventPropertiesDefinition,
  UserTraits,
} from "@/lib/analytics/analytics.types";
import {
  omitNullish,
  sanitizeForVercel,
} from "@/lib/analytics/analytics.utils";
import {
  aliasUser,
  identifyUser,
  trackPosthogServerEvent,
} from "@/server/clients/posthog.client";
import { trackSlackEvent } from "@/server/clients/slack.client";
import {
  identifyAmplitudeServerUser,
  trackAmplitudeServerEvent,
} from "@/server/clients/amplitude.server";
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
  identifyServerUser?: (
    userId: string,
    traits: UserTraits,
  ) => Promise<unknown> | void;
  /** Merge an anonymous user's history into the real user (PostHog only). */
  aliasServerUser?: (
    anonymousUserId: string,
    newUserId: string,
  ) => Promise<unknown> | void;
}

// =====================================================
// PROVIDER CONFIGURATION
// =====================================================

const serverAnalyticsProviders: ServerAnalyticsProvider[] = [
  {
    id: "posthog",
    trackServerEvent: trackPosthogServerEvent,
    identifyServerUser: (userId, traits) =>
      identifyUser({ distinctId: userId, properties: omitNullish(traits) }),
    aliasServerUser: (anonymousUserId, newUserId) =>
      aliasUser({ anonymousId: anonymousUserId, userId: newUserId }),
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
    id: "amplitude",
    trackServerEvent: <T extends ServerAnalyticsEventName>(
      userId: string,
      event: T,
      properties: ServerEventPropertiesDefinition[T],
      meta?: AnalyticsMetadata,
    ) =>
      trackAmplitudeServerEvent(
        userId,
        event,
        properties as Record<string, unknown>,
        meta?.ip,
      ),
    identifyServerUser: (userId, traits) =>
      identifyAmplitudeServerUser(userId, traits),
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
      const operational = OPERATIONAL_SERVER_EVENTS.has(event);

      // Consent: prefer what the request context passed (ctx.analyticsConsent);
      // otherwise load it — but only for BEHAVIORAL events, which actually gate
      // on it. Operational events fire regardless, so they skip the lookup and
      // default to no IP (the privacy-safe choice when consent is unknown).
      const consent =
        meta?.consent !== undefined
          ? meta.consent
          : operational
            ? null
            : await loadConsent(userId);
      const analyticsAllowed = consent?.preferences.analytics === true;

      // Behavioral analytics needs consent; operational events run under
      // legitimate interest.
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

/**
 * Set the user's traits across analytics providers (PostHog + Amplitude).
 *
 * Gated strictly on `analytics` consent — identifying is pure analytics, so it
 * never runs under legitimate interest (unlike operational events). This is
 * where server-only traits (tier, city, country) reach analytics — the client
 * session doesn't carry them. Fire-and-forget via waitUntil.
 */
export function identifyServerUser(userId: string, traits: UserTraits): void {
  console.log("🟢 [Analytics] Server identify:", { userId });

  waitUntil(
    (async () => {
      const consent = await loadConsent(userId);
      if (consent?.preferences.analytics !== true) return;

      for (const provider of serverAnalyticsProviders) {
        await provider.identifyServerUser?.(userId, traits);
      }
    })(),
  );
}

/**
 * Merge an anonymous user's analytics history into the real user on conversion
 * (PostHog alias). Gated on the ANON user's consent — they're the one whose
 * tracked history we're merging; without their analytics consent there's
 * nothing to merge anyway. Fire-and-forget via waitUntil.
 */
export function aliasServerUser(
  anonymousUserId: string,
  newUserId: string,
): void {
  console.log("🟢 [Analytics] Server alias:", { anonymousUserId, newUserId });

  waitUntil(
    (async () => {
      const consent = await loadConsent(anonymousUserId);
      if (consent?.preferences.analytics !== true) return;

      for (const provider of serverAnalyticsProviders) {
        await provider.aliasServerUser?.(anonymousUserId, newUserId);
      }
    })(),
  );
}
