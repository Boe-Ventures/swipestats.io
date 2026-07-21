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

let initializationPromise: Promise<void> | null = null;

/** Lazily init the singleton; returns false (no-op) when unconfigured. */
async function ensureInitialized(): Promise<boolean> {
  if (!amplitudeServerEnabled) return false;
  if (!initializationPromise) {
    initializationPromise = amplitude
      .init(env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
        serverZone: "EU",
        flushQueueSize: 1, // send promptly — serverless has no background window
      })
      .promise.then(() => undefined);
  }
  await initializationPromise;
  return true;
}

export async function trackAmplitudeServerEvent(
  userId: string,
  eventType: string,
  properties?: Record<string, unknown>,
  options?: {
    timestamp?: Date;
    groups?: Record<string, string | string[]>;
    ip?: string;
  },
): Promise<void> {
  try {
    if (!(await ensureInitialized())) return;
    await amplitude.track({
      event_type: eventType,
      user_id: userId,
      event_properties: properties ? omitNullish(properties) : undefined,
      groups: options?.groups,
      time: options?.timestamp?.getTime(),
      ...(options?.ip ? { ip: options.ip } : {}),
    }).promise;
    await amplitude.flush().promise;
  } catch (error) {
    console.error("❌ [Amplitude server] track failed:", error);
  }
}

/** Map a durable anonymous user_id into the authenticated user_id in EU. */
export async function aliasAmplitudeServerUser(
  anonymousUserId: string,
  newUserId: string,
): Promise<void> {
  if (!amplitudeServerEnabled) return;
  try {
    const url = new URL("https://api.eu.amplitude.com/usermap");
    url.searchParams.set("api_key", env.NEXT_PUBLIC_AMPLITUDE_API_KEY!);
    url.searchParams.set(
      "mapping",
      JSON.stringify([{ user_id: anonymousUserId, global_user_id: newUserId }]),
    );
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) {
      throw new Error(
        `Amplitude user mapping failed (${response.status}): ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error("❌ [Amplitude server] alias failed:", error);
  }
}

export async function identifyAmplitudeServerUser(
  userId: string,
  traits: UserTraits,
): Promise<void> {
  try {
    if (!(await ensureInitialized())) return;
    const identify = new amplitude.Identify();
    for (const [key, value] of Object.entries(omitNullish(traits))) {
      identify.set(key, value as string | number | boolean);
    }
    await amplitude.identify(identify, { user_id: userId }).promise;
    await amplitude.flush().promise;
  } catch (error) {
    console.error("❌ [Amplitude server] identify failed:", error);
  }
}

/** Queue deletion of a user's events and properties in the EU project. */
export async function requestAmplitudeUserDeletion(
  userId: string,
): Promise<void> {
  if (!amplitudeServerEnabled) return;
  if (!env.AMPLITUDE_SECRET_KEY) {
    throw new Error("Amplitude deletion is not configured");
  }

  const credentials = Buffer.from(
    `${env.NEXT_PUBLIC_AMPLITUDE_API_KEY}:${env.AMPLITUDE_SECRET_KEY}`,
  ).toString("base64");
  const response = await fetch(
    "https://analytics.eu.amplitude.com/api/2/deletions/users",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_ids: [userId],
        requester: "SwipeStats account deletion",
        ignore_invalid_id: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Amplitude deletion request failed (${response.status})`);
  }
}
