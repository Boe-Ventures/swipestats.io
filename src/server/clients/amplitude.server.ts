/**
 * Amplitude server adapter (Node SDK — @amplitude/analytics-node).
 *
 * Lets server events reach Amplitude alongside PostHog/Vercel, instead of
 * Amplitude being client-only. Mirrors the PostHog server client's posture:
 *
 * - EU data residency (`serverZone: "EU"`), matching the browser SDK + PostHog.
 * - Serverless-friendly: `flushQueueSize: 1` + an awaited `flush()` after each
 *   call so nothing is lost when the function suspends.
 * - No-ops entirely when `NEXT_PUBLIC_AMPLITUDE_API_KEY` is unset.
 * - Consent + IP gating live in analytics.service.ts (the fan-out); this module
 *   just sends what it's given.
 */
import * as amplitude from "@amplitude/analytics-node";

import { env } from "@/env";
import type { UserTraits } from "@/lib/analytics/analytics.types";
import { omitNullish } from "@/lib/analytics/analytics.utils";

export const amplitudeServerEnabled = Boolean(
  env.NEXT_PUBLIC_AMPLITUDE_API_KEY,
);

let initialized = false;

/** Lazily init the singleton; returns false (no-op) when unconfigured. */
function ensureInitialized(): boolean {
  if (!amplitudeServerEnabled) return false;
  if (!initialized) {
    amplitude.init(env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
      serverZone: "EU",
      flushQueueSize: 1, // send promptly — serverless has no background window
    });
    initialized = true;
  }
  return true;
}

export async function trackAmplitudeServerEvent(
  userId: string,
  eventType: string,
  properties?: Record<string, unknown>,
  ip?: string,
): Promise<void> {
  if (!ensureInitialized()) return;
  try {
    amplitude.track({
      event_type: eventType,
      user_id: userId,
      event_properties: properties ? omitNullish(properties) : undefined,
      ...(ip ? { ip } : {}),
    });
    await amplitude.flush().promise;
  } catch (error) {
    console.error("❌ [Amplitude server] track failed:", error);
  }
}

export async function identifyAmplitudeServerUser(
  userId: string,
  traits: UserTraits,
): Promise<void> {
  if (!ensureInitialized()) return;
  try {
    const identify = new amplitude.Identify();
    for (const [key, value] of Object.entries(omitNullish(traits))) {
      identify.set(key, value as string | number | boolean);
    }
    amplitude.identify(identify, { user_id: userId });
    await amplitude.flush().promise;
  } catch (error) {
    console.error("❌ [Amplitude server] identify failed:", error);
  }
}
