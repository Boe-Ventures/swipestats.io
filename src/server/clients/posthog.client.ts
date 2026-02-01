import { PostHog } from "posthog-node";

import type {
  AnalyticsMetadata,
  ServerAnalyticsEventName,
  ServerEventPropertiesDefinition,
} from "@/lib/analytics/analytics.types";
import { omitNullish } from "@/lib/analytics/analytics.utils";
import { env } from "@/env";

// =====================================================
// CLIENT INITIALIZATION
// =====================================================

/**
 * Check if PostHog is configured
 *
 * Use this to conditionally enable PostHog features without throwing.
 * For most use cases, prefer using the analytics service abstraction layer.
 */
export const isPostHogConfigured = !!env.NEXT_PUBLIC_POSTHOG_KEY;

if (!isPostHogConfigured) {
  console.warn(
    "⚠️ [PostHog] NEXT_PUBLIC_POSTHOG_KEY not configured. PostHog client will not be available.",
  );
}

/**
 * PostHog server client instance (singleton)
 *
 * Configured for serverless environments:
 * - flushAt: 1 - Send events immediately (no batching)
 * - flushInterval: 0 - No time-based flushing
 * - shutdown() is called after each operation per PostHog serverless best practices
 *
 * @throws {Error} If NEXT_PUBLIC_POSTHOG_KEY is not configured (at module initialization)
 * @see https://posthog.com/docs/libraries/node#short-lived-processes-like-serverless-environments
 */
export const posthog = isPostHogConfigured
  ? new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: "https://eu.i.posthog.com", // EU endpoint (matching reverse proxy)
      flushAt: 1,
      flushInterval: 0,
    })
  : (null as unknown as PostHog); // Type assertion to maintain type safety but fail at runtime

// =====================================================
// EVENT TRACKING
// =====================================================

/**
 * Capture a server-side event in PostHog
 *
 * Uses shutdown() per PostHog serverless recommendations.
 * Will fail if PostHog is not configured - use analytics service for graceful degradation.
 *
 * @example
 * ```ts
 * await captureEvent({
 *   distinctId: userId,
 *   event: "user_signed_up",
 *   properties: { plan: "pro" }
 * });
 * ```
 */
export async function captureEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  groups?: Record<string, string | number>;
}): Promise<void> {
  console.log("🔵 [PostHog] Capturing event:", {
    event: params.event,
    distinctId: params.distinctId,
  });

  posthog.capture({
    distinctId: params.distinctId,
    event: params.event,
    properties: params.properties ?? {},
    timestamp: params.timestamp,
    groups: params.groups,
  });

  await posthog.shutdown(); // Required for serverless

  console.log("✅ [PostHog] Event captured successfully:", {
    event: params.event,
  });
}

/**
 * Capture an exception in PostHog
 *
 * Used by instrumentation.ts for server-side error tracking.
 * Will fail if PostHog is not configured - caller should handle gracefully.
 *
 * @example
 * ```ts
 * await captureException(error, userId);
 * ```
 */
export async function captureException(
  err: Error,
  distinctId?: string,
): Promise<void> {
  posthog.capture({
    distinctId: distinctId ?? "unknown",
    event: "$exception",
    properties: {
      $exception_message: err.message,
      $exception_type: err.name,
      $exception_stack_trace: err.stack,
    },
  });

  await posthog.shutdown();

  console.log("✅ [PostHog] Exception captured successfully");
}

// =====================================================
// LEGACY ADAPTER (for analytics.service.ts)
// =====================================================

/**
 * Track a server-side event in PostHog (legacy interface)
 *
 * This adapter maintains compatibility with the analytics service layer.
 * New code should use captureEvent() directly.
 *
 * @deprecated Use captureEvent() directly for new code
 */
export async function trackPosthogServerEvent<
  T extends ServerAnalyticsEventName,
>(
  userId: string,
  event: T,
  properties: ServerEventPropertiesDefinition[T],
  meta?: AnalyticsMetadata,
): Promise<void> {
  try {
    await captureEvent({
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
  } catch (error) {
    console.error(
      "❌ [PostHog] Server track error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// =====================================================
// USER IDENTIFICATION
// =====================================================

/**
 * Identify a user in PostHog with their traits
 *
 * Will fail if PostHog is not configured - use analytics service for graceful degradation.
 *
 * @example
 * ```ts
 * await identifyUser({
 *   distinctId: userId,
 *   properties: {
 *     email: "user@example.com",
 *     name: "John Doe",
 *     plan: "pro"
 *   }
 * });
 * ```
 */
export async function identifyUser(params: {
  distinctId: string;
  properties: Record<string, unknown>;
}): Promise<void> {
  console.log("🔵 [PostHog] Identifying user:", {
    distinctId: params.distinctId,
  });

  posthog.identify({
    distinctId: params.distinctId,
    properties: params.properties,
  });

  await posthog.shutdown(); // Required for serverless

  console.log("✅ [PostHog] User identified successfully");
}

/**
 * Alias two user IDs in PostHog to merge their event history
 *
 * This is used when an anonymous user converts to a real user.
 * All events tracked under the anonymous ID will be linked to the new user.
 * Will fail if PostHog is not configured - use analytics service for graceful degradation.
 *
 * @example
 * ```ts
 * await aliasUser({
 *   anonymousId: "anon_123",
 *   userId: "user_456"
 * });
 * ```
 */
export async function aliasUser(params: {
  anonymousId: string;
  userId: string;
}): Promise<void> {
  console.log("🔵 [PostHog] Aliasing user:", {
    anonymousId: params.anonymousId,
    userId: params.userId,
  });

  posthog.alias({
    distinctId: params.userId,
    alias: params.anonymousId,
  });

  await posthog.shutdown(); // Required for serverless

  console.log("✅ [PostHog] User aliased successfully");
}

// =====================================================
// GROUP ANALYTICS
// =====================================================

/**
 * Identify a group (organization, team, etc.) in PostHog
 *
 * Will fail if PostHog is not configured - use analytics service for graceful degradation.
 *
 * @example
 * ```ts
 * await identifyGroup({
 *   groupType: "organization",
 *   groupKey: "org_123",
 *   properties: {
 *     name: "Acme Corp",
 *     plan: "enterprise",
 *     seats: 50
 *   }
 * });
 * ```
 */
export async function identifyGroup(params: {
  groupType: string;
  groupKey: string;
  properties: Record<string, unknown>;
}): Promise<void> {
  console.log("🔵 [PostHog] Identifying group:", {
    groupType: params.groupType,
    groupKey: params.groupKey,
  });

  posthog.groupIdentify({
    groupType: params.groupType,
    groupKey: params.groupKey,
    properties: params.properties,
  });

  await posthog.shutdown(); // Required for serverless

  console.log("✅ [PostHog] Group identified successfully");
}

// =====================================================
// FEATURE FLAGS
// =====================================================

/**
 * Check if a feature flag is enabled for a user
 *
 * Will fail if PostHog is not configured.
 * For graceful degradation, wrap in try-catch or check isPostHogConfigured before calling.
 *
 * @example
 * ```ts
 * const isEnabled = await isFeatureEnabled({
 *   distinctId: userId,
 *   featureFlag: "new-dashboard"
 * });
 *
 * if (isEnabled) {
 *   // Show new dashboard
 * }
 * ```
 */
export async function isFeatureEnabled(params: {
  distinctId: string;
  featureFlag: string;
  groups?: Record<string, string | number>;
}): Promise<boolean> {
  console.log("🔵 [PostHog] Checking feature flag:", {
    featureFlag: params.featureFlag,
    distinctId: params.distinctId,
  });

  const isEnabled = await posthog.isFeatureEnabled(
    params.featureFlag,
    params.distinctId,
    {
      groups: params.groups
        ? Object.fromEntries(
            Object.entries(params.groups).map(([k, v]) => [k, String(v)]),
          )
        : undefined,
    },
  );

  await posthog.shutdown(); // Required for serverless

  console.log("✅ [PostHog] Feature flag checked:", {
    featureFlag: params.featureFlag,
    isEnabled: isEnabled ?? false,
  });

  return isEnabled ?? false;
}

/**
 * Get the value of a feature flag (for multivariate flags)
 *
 * Will fail if PostHog is not configured.
 * For graceful degradation, wrap in try-catch or check isPostHogConfigured before calling.
 *
 * @example
 * ```ts
 * const variant = await getFeatureFlagValue({
 *   distinctId: userId,
 *   featureFlag: "button-color"
 * });
 *
 * if (variant === "blue") {
 *   // Show blue button
 * }
 * ```
 */
export async function getFeatureFlagValue(params: {
  distinctId: string;
  featureFlag: string;
  groups?: Record<string, string | number>;
}): Promise<string | boolean | undefined> {
  console.log("🔵 [PostHog] Getting feature flag value:", {
    featureFlag: params.featureFlag,
    distinctId: params.distinctId,
  });

  const value = await posthog.getFeatureFlag(
    params.featureFlag,
    params.distinctId,
    {
      groups: params.groups
        ? Object.fromEntries(
            Object.entries(params.groups).map(([k, v]) => [k, String(v)]),
          )
        : undefined,
    },
  );

  await posthog.shutdown(); // Required for serverless

  console.log("✅ [PostHog] Feature flag value retrieved:", {
    featureFlag: params.featureFlag,
    value,
  });

  return value;
}
