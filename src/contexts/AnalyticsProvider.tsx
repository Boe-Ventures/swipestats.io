"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { track as vercelTrack } from "@vercel/analytics";
import { useMutation } from "@tanstack/react-query";
import posthog from "posthog-js";

import { useTRPC } from "@/trpc/react";

import type {
  AnalyticsMetadata,
  ClientAnalyticsEventName,
  ClientEventPropertiesDefinition,
} from "@/lib/analytics/analytics.types";
import { sanitizeForVercel } from "@/lib/analytics/analytics.utils";
import {
  amplitudeIdentify,
  amplitudeReset,
  amplitudeTrack,
  disableAmplitude,
  enableAmplitude,
} from "@/lib/analytics/amplitude.client";
import {
  ALL_OFF,
  ALL_ON,
  isAllowed,
  type ConsentCategory,
  type ConsentPreferences,
} from "@/lib/analytics/consent";
import {
  clearStoredConsent,
  getStoredConsent,
  isConsentStale,
  isGpcEnabled,
  setStoredConsent,
} from "@/lib/analytics/consent.storage";
import { authClient } from "@/server/better-auth/client";
import { CookieBanner } from "@/components/analytics/CookieBanner";

// =====================================================
// TYPES
// =====================================================

interface QueuedEvent {
  eventName: ClientAnalyticsEventName;
  properties?: ClientEventPropertiesDefinition[ClientAnalyticsEventName];
  meta?: AnalyticsMetadata;
}

interface AnalyticsContextType {
  /** Back-compat: true when the `analytics` category is allowed. */
  hasConsent: boolean;
  /** Full per-category preferences, or null until the user has decided. */
  preferences: ConsentPreferences | null;
  trackEvent: <T extends ClientAnalyticsEventName>(
    eventName: T,
    properties?: ClientEventPropertiesDefinition[T],
    meta?: AnalyticsMetadata,
  ) => void;
  identifyUser: () => void;
  reset: () => void;
  /** Persist an explicit decision (essential is always forced on). */
  setConsent: (preferences: Partial<ConsentPreferences>) => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  reShowConsentBanner: () => void;
}

interface ClientAnalyticsProvider {
  name: string;
  /** Which consent category gates this provider. */
  category: ConsentCategory;
  trackEvent: <T extends ClientAnalyticsEventName>(
    eventName: T,
    properties?: ClientEventPropertiesDefinition[T],
    meta?: AnalyticsMetadata,
  ) => void;
  identify?: (userId: string, traits: Record<string, unknown>) => void;
  reset?: () => void;
}

// =====================================================
// SIDE-EFFECTS — enable/disable the analytics-category tools
// =====================================================
//
// PostHog is pre-initialized (tracking off) in instrumentation-client.ts.
// Session replay + Amplitude follow the `analytics` category.

function applyAnalyticsState(allowed: boolean): void {
  if (allowed) {
    posthog.set_config({
      autocapture: false, // manual events only
      capture_pageview: "history_change",
      capture_pageleave: true,
      disable_session_recording: false,
    });
    try {
      posthog.startSessionRecording();
    } catch {
      /* no-op */
    }
    // Capture the initial pageview that was suppressed pre-consent.
    posthog.capture("$pageview");
    enableAmplitude();
    console.info("🟢 [Analytics] analytics category enabled");
  } else {
    posthog.set_config({
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
    });
    try {
      posthog.stopSessionRecording();
    } catch {
      /* no-op */
    }
    try {
      posthog.reset();
    } catch {
      /* no-op */
    }
    disableAmplitude(); // opt out + clear Amplitude identity
    console.info("🔇 [Analytics] analytics category disabled");
  }
}

// =====================================================
// CONTEXT CREATION
// =====================================================

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined,
);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
};

// =====================================================
// PROVIDER COMPONENT
// =====================================================

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const trpc = useTRPC();
  const lastIdentifiedUserId = useRef<string | null>(null);

  // Mirror the local decision into the DB (user.analyticsConsent) so the server
  // can gate events too. Fire-and-forget; failures are non-fatal.
  const syncConsentToDb = useMutation(trpc.consent.set.mutationOptions());
  const lastSyncedRef = useRef<string | null>(null);

  // null = the user has not decided yet (nothing fires, banner shown).
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(
    null,
  );
  const [showBanner, setShowBanner] = useState(false);
  const [eventQueue, setEventQueue] = useState<QueuedEvent[]>([]);

  const decided = preferences !== null;
  const analyticsOn = isAllowed(preferences, "analytics");

  // ── Resolve the initial state on mount (localStorage + GPC) ──────────
  useEffect(() => {
    const gpc = isGpcEnabled();
    const stored = getStoredConsent();

    if (stored && !isConsentStale(stored)) {
      // Honor GPC as an override even over a stored "granted".
      const prefs = gpc
        ? { ...stored.preferences, analytics: false, advertising: false }
        : stored.preferences;
      setPreferences(prefs);
      setShowBanner(false);
    } else if (gpc) {
      // GPC is a valid opt-out signal — respect it, skip the banner.
      setPreferences(ALL_OFF);
      setShowBanner(false);
    } else {
      // Undecided — show the banner; nothing fires until they choose.
      setPreferences(null);
      setShowBanner(true);
    }
    // Run once on mount.
  }, []);

  // ── Apply analytics on/off when the decision changes ─────────────────
  const appliedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (preferences === null) return; // undecided → nothing on
    if (appliedRef.current === analyticsOn) return;
    appliedRef.current = analyticsOn;
    applyAnalyticsState(analyticsOn);
  }, [preferences, analyticsOn]);

  // ── Providers (each tagged with the category that gates it) ──────────
  const providers: ClientAnalyticsProvider[] = useMemo(
    () => [
      {
        name: "PostHog",
        category: "analytics",
        trackEvent: <T extends ClientAnalyticsEventName>(
          eventName: T,
          properties?: ClientEventPropertiesDefinition[T],
        ) => {
          try {
            posthog.capture(eventName, properties as Record<string, unknown>);
          } catch (error) {
            console.error("❌ [Analytics] PostHog track failed:", error);
          }
        },
        identify: (userId, traits) => {
          try {
            posthog.identify(userId, traits);
          } catch (error) {
            console.error("❌ [Analytics] PostHog identify failed:", error);
          }
        },
        reset: () => {
          try {
            posthog.reset();
          } catch (error) {
            console.error("❌ [Analytics] PostHog reset failed:", error);
          }
        },
      },
      {
        name: "Vercel",
        category: "analytics",
        trackEvent: <T extends ClientAnalyticsEventName>(
          eventName: T,
          properties?: ClientEventPropertiesDefinition[T],
        ) => {
          try {
            vercelTrack(eventName, sanitizeForVercel(properties));
          } catch (error) {
            console.error("❌ [Analytics] Vercel track failed:", error);
          }
        },
      },
      {
        name: "Amplitude",
        category: "analytics",
        trackEvent: <T extends ClientAnalyticsEventName>(
          eventName: T,
          properties?: ClientEventPropertiesDefinition[T],
        ) => {
          amplitudeTrack(eventName, properties as Record<string, unknown>);
        },
        identify: (userId, traits) => {
          amplitudeIdentify(userId, traits);
        },
        reset: () => {
          amplitudeReset();
        },
      },
    ],
    [],
  );

  // ── Track ────────────────────────────────────────────────────────────
  const trackEvent = useCallback(
    <T extends ClientAnalyticsEventName>(
      eventName: T,
      properties?: ClientEventPropertiesDefinition[T],
      meta?: AnalyticsMetadata,
    ): void => {
      if (!decided) {
        // Buffer until the user makes a choice, then replay to allowed providers.
        setEventQueue((prev) => [...prev, { eventName, properties, meta }]);
        return;
      }
      providers.forEach((provider) => {
        if (isAllowed(preferences, provider.category)) {
          provider.trackEvent(eventName, properties, meta);
        }
      });
    },
    [decided, preferences, providers],
  );

  // ── Identify ──────────────────────────────────────────────────────────
  const identifyUser = useCallback(() => {
    if (!analyticsOn || !session.data?.user) return;
    const userId = session.data.user.id;
    if (lastIdentifiedUserId.current === userId) return;

    const user = session.data.user;
    providers.forEach((provider) => {
      if (isAllowed(preferences, provider.category) && provider.identify) {
        provider.identify(userId, user);
      }
    });
    lastIdentifiedUserId.current = userId;
  }, [analyticsOn, preferences, session.data, providers]);

  // ── Reset ─────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    providers.forEach((provider) => provider.reset?.());
    lastIdentifiedUserId.current = null;
    setEventQueue([]);
  }, [providers]);

  // ── Flush the buffer once a decision exists ──────────────────────────
  useEffect(() => {
    if (decided && eventQueue.length > 0) {
      eventQueue.forEach((event) =>
        trackEvent(event.eventName, event.properties, event.meta),
      );
      setEventQueue([]);
    }
  }, [decided, eventQueue, trackEvent]);

  // ── Identify the logged-in user once analytics is allowed ────────────
  useEffect(() => {
    if (analyticsOn && session.data?.user) identifyUser();
  }, [analyticsOn, session.data, identifyUser]);

  // ── Sync the decision to the DB on login / change (cross-device) ─────
  useEffect(() => {
    const user = session.data?.user;
    if (!user || preferences === null) return;
    const key = `${user.id}:${JSON.stringify(preferences)}`;
    if (lastSyncedRef.current === key) return;
    lastSyncedRef.current = key;
    syncConsentToDb.mutate({ preferences });
  }, [session.data, preferences, syncConsentToDb]);

  // ── Consent mutations ─────────────────────────────────────────────────
  const setConsent = useCallback(
    (partial: Partial<ConsentPreferences>) => {
      const record = setStoredConsent(partial);
      setPreferences(record.preferences);
      setShowBanner(false);
      // The sync effect mirrors this to user.analyticsConsent when logged in.
    },
    [],
  );

  const acceptAll = useCallback(() => setConsent(ALL_ON), [setConsent]);
  const rejectNonEssential = useCallback(
    () => setConsent(ALL_OFF),
    [setConsent],
  );

  const reShowConsentBanner = useCallback(() => {
    clearStoredConsent();
    setPreferences(null);
    setShowBanner(true);
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        hasConsent: analyticsOn,
        preferences,
        trackEvent,
        identifyUser,
        reset,
        setConsent,
        acceptAll,
        rejectNonEssential,
        reShowConsentBanner,
      }}
    >
      {children}
      <CookieBanner
        isOpen={showBanner}
        onAcceptAll={acceptAll}
        onRejectAll={rejectNonEssential}
      />
    </AnalyticsContext.Provider>
  );
}
