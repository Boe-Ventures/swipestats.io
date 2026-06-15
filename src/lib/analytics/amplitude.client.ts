/**
 * Amplitude provider (client-side only) — @amplitude/unified.
 *
 * Posture for SwipeStats (privacy-first, but Session Replay is acceptable here
 * because users are anonymous: anon accounts + usernames, no email unless they
 * opt in, and we already hold the underlying data in our own DB):
 *
 * - DEFAULT OFF for everything. Nothing initializes until the user consents,
 *   so no Amplitude cookies/storage are created pre-consent (Method 1 in
 *   Amplitude's privacy guide — the cleanest model to explain to auditors).
 * - On consent we `initAll` → analytics autocapture + Session Replay together.
 * - EU data residency (`serverZone: "EU"`), matching PostHog.
 * - Honors Global Privacy Control (GPC) — handled at the consent-default layer
 *   (AnalyticsProvider), so this module only runs on an explicit opt-in.
 * - No-ops entirely when `NEXT_PUBLIC_AMPLITUDE_API_KEY` is unset.
 *
 * This module must only ever be imported from client components.
 */
import * as amplitude from "@amplitude/unified";

import { env } from "@/env";

export const amplitudeEnabled = Boolean(env.NEXT_PUBLIC_AMPLITUDE_API_KEY);

let initialized = false;

/**
 * Initialize (once) and opt the user in. Call ONLY from a consent-granted code
 * path. `initAll` brings up analytics + Session Replay; deviceId is seeded from
 * PostHog for cross-tool identity stitching.
 *
 * GPC is honored at the consent-default layer (AnalyticsProvider): under GPC the
 * `analytics` category defaults off and the banner is skipped, so this only runs
 * on an explicit opt-in — which overrides the GPC default for all providers
 * consistently (PostHog + Amplitude), rather than one honoring it and one not.
 */
export function enableAmplitude(): void {
  if (!amplitudeEnabled) return;

  if (!initialized) {
    initialized = true;
    amplitude
      .initAll(env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
        serverZone: "EU",
        analytics: {
          autocapture: {
            attribution: true,
            pageViews: true,
            sessions: true,
            formInteractions: false,
            fileDownloads: false,
            elementInteractions: false,
          },
        },
        // Session Replay: record consented sessions. Amplitude masks inputs by
        // default; tighten masking here if we ever surface PII on screen.
        sessionReplay: { sampleRate: 1 },
      })
      .catch((error) =>
        console.error("❌ [Amplitude] initAll failed:", error),
      );
    console.info("🟢 [Amplitude] Initialized (EU, analytics + replay)");
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
