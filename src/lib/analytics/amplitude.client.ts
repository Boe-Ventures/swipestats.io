/**
 * Amplitude browser provider (client-side only).
 *
 * Privacy-first posture for SwipeStats:
 * - EU data residency (`serverZone: "EU"`), matching PostHog.
 * - Identity stitching: Amplitude `deviceId` is seeded from PostHog's
 *   `distinct_id` so a user is the same person across both tools.
 * - NO Session Replay. Recording a screen full of someone's dating history is
 *   highly sensitive; we use `@amplitude/analytics-browser` (no replay) rather
 *   than `@amplitude/unified`. Revisit only behind explicit opt-in + masking.
 * - Consent-gated: never initialized until the user has consented, and we
 *   honor Global Privacy Control (GPC) as an automatic opt-out signal.
 * - No-ops entirely when `NEXT_PUBLIC_AMPLITUDE_API_KEY` is unset.
 *
 * This module must only ever be imported from client components.
 */
import * as amplitude from "@amplitude/analytics-browser";
import posthog from "posthog-js";

import { env } from "@/env";

export const amplitudeEnabled = Boolean(env.NEXT_PUBLIC_AMPLITUDE_API_KEY);

let initialized = false;

/** Browser-set Global Privacy Control signal (opt-out). */
function gpcEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

/**
 * Initialize (once) and opt the user in. Call this only from a consent-granted
 * code path. Seeds the Amplitude deviceId from PostHog for identity stitching.
 */
export function enableAmplitude(): void {
  if (!amplitudeEnabled) return;

  // Respect Global Privacy Control even if the user clicked "accept".
  if (gpcEnabled()) {
    console.info("🟠 [Amplitude] GPC detected — staying opted out");
    if (initialized) amplitude.setOptOut(true);
    return;
  }

  if (!initialized) {
    amplitude.init(env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
      serverZone: "EU",
      // Share PostHog's anonymous id so the two tools resolve to one person.
      deviceId: posthog.get_distinct_id(),
      autocapture: {
        attribution: true,
        pageViews: true,
        sessions: true,
        formInteractions: false,
        fileDownloads: false,
        elementInteractions: false,
      },
    });
    initialized = true;
    console.info("🟢 [Amplitude] Initialized (EU)");
  }

  amplitude.setOptOut(false);
}

/** Opt the user out and clear identity (on decline / reset). */
export function disableAmplitude(): void {
  if (!amplitudeEnabled || !initialized) return;
  amplitude.setOptOut(true);
  amplitude.reset();
}

export function amplitudeTrack(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (!amplitudeEnabled) return;
  try {
    amplitude.track(eventName, properties);
  } catch (error) {
    console.error("❌ [Amplitude] track failed:", error);
  }
}

export function amplitudeIdentify(
  userId: string,
  traits: Record<string, unknown>,
): void {
  if (!amplitudeEnabled) return;
  try {
    amplitude.setUserId(userId);
    const identify = new amplitude.Identify();
    for (const [key, value] of Object.entries(traits)) {
      if (value !== null && value !== undefined) {
        identify.set(key, value as string | number | boolean);
      }
    }
    amplitude.identify(identify);
  } catch (error) {
    console.error("❌ [Amplitude] identify failed:", error);
  }
}

export function amplitudeReset(): void {
  if (!amplitudeEnabled) return;
  try {
    amplitude.reset();
  } catch (error) {
    console.error("❌ [Amplitude] reset failed:", error);
  }
}

/** Inspect the current Amplitude device/user/session ids (for the debug page). */
export function getAmplitudeIds(): {
  enabled: boolean;
  initialized: boolean;
  deviceId?: string;
  userId?: string;
  sessionId?: number;
} {
  if (!amplitudeEnabled || !initialized) {
    return { enabled: amplitudeEnabled, initialized };
  }
  return {
    enabled: amplitudeEnabled,
    initialized,
    deviceId: amplitude.getDeviceId(),
    userId: amplitude.getUserId(),
    sessionId: amplitude.getSessionId(),
  };
}
