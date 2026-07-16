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
import { useMutation, useQuery } from "@tanstack/react-query";
import posthog from "posthog-js";

import { useTRPC } from "@/trpc/react";

import type {
  AnalyticsMetadata,
  ClientAnalyticsEventName,
  ClientEventPropertiesDefinition,
  UserTraits,
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
  setStoredConsentRecord,
} from "@/lib/analytics/consent.storage";
import { isAnonymousEmail } from "@/lib/utils/auth";
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
  /** Bring the provider up when its category becomes allowed (init / opt-in). */
  enable?: () => void;
  /** Tear it down when its category is disallowed (opt-out + clear identity). */
  disable?: () => void;
  trackEvent: <T extends ClientAnalyticsEventName>(
    eventName: T,
    properties?: ClientEventPropertiesDefinition[T],
    meta?: AnalyticsMetadata,
  ) => void;
  identify?: (userId: string, traits: Record<string, unknown>) => void;
  /** No-op today — SwipeStats has no org/group concept (cf. homi's groups). */
  group?: (
    groupType: string,
    groupId: string,
    traits?: Record<string, unknown>,
  ) => void;
  reset?: () => void;
}

type ConsentHydrationStatus = "resolving" | "backend" | "done";

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

  const realUser = useMemo(() => {
    const user = session.data?.user;
    if (!user?.email) return null;
    if (user.isAnonymous || isAnonymousEmail(user.email)) return null;
    return user;
  }, [session.data?.user]);

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
  const [hydrationStatus, setHydrationStatus] =
    useState<ConsentHydrationStatus>("resolving");

  const backendConsentQuery = useQuery({
    ...trpc.consent.get.queryOptions(undefined),
    enabled: hydrationStatus === "backend" && realUser !== null,
    retry: false,
  });

  const decided = preferences !== null;
  const analyticsOn = isAllowed(preferences, "analytics");

  // ── Resolve initial state: GPC > fresh local > real-user backend ─────
  useEffect(() => {
    if (session.isPending) return;

    const gpc = isGpcEnabled();
    const stored = getStoredConsent();

    if (gpc) {
      // GPC is a valid opt-out signal and wins over both local and backend
      // state. Do not overwrite localStorage; if the browser signal changes,
      // the user's prior local decision can become active again.
      const prefs =
        stored && !isConsentStale(stored)
          ? { ...stored.preferences, analytics: false, advertising: false }
          : ALL_OFF;
      setPreferences(prefs);
      setShowBanner(false);
      setHydrationStatus("done");
      return;
    }

    if (stored && !isConsentStale(stored)) {
      // Local device state wins when it is fresh.
      setPreferences(stored.preferences);
      setShowBanner(false);
      setHydrationStatus("done");
      return;
    }

    if (realUser) {
      // No fresh local decision; ask the backend for this real user's durable
      // mirror before showing the banner.
      setPreferences(null);
      setShowBanner(false);
      setHydrationStatus("backend");
    } else {
      // Logged-out and anonymous sessions are local-only.
      setPreferences(null);
      setShowBanner(true);
      setHydrationStatus("done");
    }
  }, [realUser, session.isPending]);

  useEffect(() => {
    if (hydrationStatus !== "backend") return;
    if (backendConsentQuery.isPending || backendConsentQuery.isFetching) return;

    const backendRecord = backendConsentQuery.data;
    if (backendRecord && !isConsentStale(backendRecord)) {
      const storedRecord = setStoredConsentRecord(backendRecord);
      if (realUser) {
        lastSyncedRef.current = `${realUser.id}:${JSON.stringify(
          storedRecord.preferences,
        )}`;
      }
      setPreferences(storedRecord.preferences);
      setShowBanner(false);
    } else {
      setPreferences(null);
      setShowBanner(true);
    }

    setHydrationStatus("done");
  }, [
    backendConsentQuery.data,
    backendConsentQuery.isFetching,
    backendConsentQuery.isPending,
    hydrationStatus,
    realUser,
  ]);

  // ── Providers (each tagged with the category that gates it) ──────────
  const providers: ClientAnalyticsProvider[] = useMemo(
    () => [
      {
        name: "PostHog",
        category: "analytics",
        enable: () => {
          posthog.set_config({
            autocapture: false, // manual events only
            capture_pageview: "history_change",
            capture_pageleave: true,
            disable_session_recording: false,
          });
          // Don't force-start recording here: a manual startSessionRecording()
          // overrides PostHog's server-side URL triggers and would record every
          // consented visitor (incl. blog/marketing bounces). Instead we only
          // enable the recorder and let the URL-trigger config (Project Settings
          // → Session Replay) start it when the user reaches a product page
          // (/app, /upload, /insights, /share). The in-memory buffer still
          // captures how they arrived (e.g. blog → upload), and the trigger
          // list stays editable from the dashboard with no deploy.
          // Capture the initial pageview suppressed pre-consent.
          posthog.capture("$pageview");
        },
        disable: () => {
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
        },
        trackEvent: <T extends ClientAnalyticsEventName>(
          eventName: T,
          properties?: ClientEventPropertiesDefinition[T],
          meta?: AnalyticsMetadata,
        ) => {
          try {
            posthog.capture(
              eventName,
              meta?.groups
                ? {
                    ...(properties as Record<string, unknown>),
                    $groups: meta.groups,
                  }
                : (properties as Record<string, unknown>),
              { timestamp: meta?.timestamp },
            );
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
        enable: () => enableAmplitude(),
        disable: () => disableAmplitude(),
        trackEvent: <T extends ClientAnalyticsEventName>(
          eventName: T,
          properties?: ClientEventPropertiesDefinition[T],
          meta?: AnalyticsMetadata,
        ) => {
          amplitudeTrack(
            eventName,
            properties as Record<string, unknown>,
            meta,
          );
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

  // ── Bring each provider up/down as its category flips ────────────────
  // The whole lifecycle now goes through the provider list — no PostHog- or
  // Amplitude-specific code here.
  const appliedRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    if (preferences === null) return; // undecided → nothing on
    for (const provider of providers) {
      const allowed = isAllowed(preferences, provider.category);
      if (appliedRef.current.get(provider.name) === allowed) continue;
      appliedRef.current.set(provider.name, allowed);
      if (allowed) provider.enable?.();
      else provider.disable?.();
    }
  }, [preferences, providers]);

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

    // Send only the curated UserTraits — not the raw user object (which would
    // leak every Better Auth field into analytics person profiles).
    // Only the fields the client session actually carries. tier/city/country
    // live on the server user (not inferred client-side) — they'd need a
    // server-side identify, which we don't have yet.
    const u = session.data.user;
    const traits: UserTraits = {
      email: u.email ?? undefined,
      name: u.name ?? undefined,
      username: u.username ?? undefined,
      isAnonymous: u.isAnonymous ?? undefined,
    };
    providers.forEach((provider) => {
      if (isAllowed(preferences, provider.category) && provider.identify) {
        provider.identify(userId, traits);
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
    if (!realUser || preferences === null) return;
    const key = `${realUser.id}:${JSON.stringify(preferences)}`;
    if (lastSyncedRef.current === key) return;
    lastSyncedRef.current = key;
    syncConsentToDb.mutate({ preferences });
  }, [realUser, preferences, syncConsentToDb]);

  // ── Consent mutations ─────────────────────────────────────────────────
  const setConsent = useCallback((partial: Partial<ConsentPreferences>) => {
    const record = setStoredConsent(partial);
    setPreferences(record.preferences);
    setShowBanner(false);
    // The sync effect mirrors this to user.analyticsConsent when logged in.
  }, []);

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
