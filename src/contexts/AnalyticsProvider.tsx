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
import posthog from "posthog-js";

import type {
  AnalyticsMetadata,
  ClientAnalyticsEventName,
  ClientEventPropertiesDefinition,
} from "@/lib/analytics/analytics.types";
import { sanitizeForVercel } from "@/lib/analytics/analytics.utils";
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
  hasConsent: boolean;
  trackEvent: <T extends ClientAnalyticsEventName>(
    eventName: T,
    properties?: ClientEventPropertiesDefinition[T],
    meta?: AnalyticsMetadata,
  ) => void;
  identifyUser: () => void;
  reset: () => void;
  reShowConsentBanner: () => void;
}

interface ClientAnalyticsProvider {
  name: string;
  trackEvent: <T extends ClientAnalyticsEventName>(
    eventName: T,
    properties?: ClientEventPropertiesDefinition[T],
    meta?: AnalyticsMetadata,
  ) => void;
  identify?: (userId: string, traits: Record<string, unknown>) => void;
  reset?: () => void;
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
  const lastIdentifiedUserId = useRef<string | null>(null);

  const [hasConsent, setHasConsent] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [eventQueue, setEventQueue] = useState<QueuedEvent[]>([]);

  // PostHog is already initialized in instrumentation-client.ts
  // No need to re-initialize here

  // Auto-consent for ANY user who signs up (anonymous or full)
  useEffect(() => {
    if (session.data?.user && !hasConsent) {
      console.info("🔐 [Analytics] Auto-consent for user:", {
        isAnonymous: session.data.user.isAnonymous,
      });
      localStorage.setItem("cookieConsent", "true");
      localStorage.setItem("cookieConsentTimestamp", Date.now().toString());
      setHasConsent(true);
      setShowBanner(false);

      // Enable PostHog tracking WITHOUT autocapture
      posthog.set_config({
        autocapture: false, // KEEP OFF - manual events only
        capture_pageview: "history_change",
        capture_pageleave: true,
        disable_session_recording: false,
      });

      // Start session replay for ALL users (anonymous and full)
      posthog.startSessionRecording();

      // Capture initial pageview
      posthog.capture("$pageview");
    }
  }, [session.data, hasConsent]);

  // Check stored consent on mount
  useEffect(() => {
    if (!hasConsent && !session.isPending) {
      const storedConsent = localStorage.getItem("cookieConsent");
      const consentTimestamp = localStorage.getItem("cookieConsentTimestamp");

      if (storedConsent === "true") {
        setHasConsent(true);
        setShowBanner(false);

        // Enable PostHog tracking if user previously consented
        posthog.set_config({
          autocapture: false, // KEEP OFF - manual events only
          capture_pageview: "history_change",
          capture_pageleave: true,
          disable_session_recording: false,
        });
        // Start session replay
        posthog.startSessionRecording();
        // Capture initial pageview
        posthog.capture("$pageview");
      } else if (storedConsent === null) {
        // No previous decision - show banner
        setShowBanner(true);
      } else if (storedConsent === "false") {
        // User previously declined - check if 7 days have passed
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const declineTime = consentTimestamp
          ? parseInt(consentTimestamp, 10)
          : 0;

        if (now - declineTime > ONE_WEEK_MS) {
          // Re-show banner after 1 week
          console.debug(
            "🔵 [Analytics] Re-showing banner after 1 week since decline",
          );
          setShowBanner(true);
          localStorage.removeItem("cookieConsent");
          localStorage.removeItem("cookieConsentTimestamp");
        } else {
          // Still within the week - respect their decline
          setHasConsent(false);
          setShowBanner(false);
        }
      }
    }
  }, [hasConsent, session.isPending]);

  // Analytics providers array
  const providers: ClientAnalyticsProvider[] = useMemo(
    () => [
      // PostHog
      {
        name: "PostHog",
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
      // Vercel Analytics
      {
        name: "Vercel",
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
    ],
    [],
  );

  // Track event function
  const trackEvent = useCallback(
    <T extends ClientAnalyticsEventName>(
      eventName: T,
      properties?: ClientEventPropertiesDefinition[T],
      meta?: AnalyticsMetadata,
    ): void => {
      if (!hasConsent) {
        // Queue event for later
        setEventQueue((prev) => [...prev, { eventName, properties, meta }]);
        console.log("📦 [Analytics] Event queued:", eventName);
        return;
      }

      console.log("🔵 [Analytics] Client event:", { eventName, properties });
      providers.forEach((provider) =>
        provider.trackEvent(eventName, properties, meta),
      );
    },
    [hasConsent, providers],
  );

  // Identify user function
  const identifyUser = useCallback(() => {
    if (!hasConsent || !session.data?.user) return;

    const userId = session.data.user.id;

    // Skip if already identified
    if (lastIdentifiedUserId.current === userId) return;

    const user = session.data.user;

    console.log("🔵 [Analytics] Identifying user:", userId);
    providers.forEach((provider) => {
      if (provider.identify) {
        provider.identify(userId, user);
      }
    });

    lastIdentifiedUserId.current = userId;
  }, [hasConsent, session.data, providers]);

  // Reset analytics
  const reset = useCallback(() => {
    console.log("🔵 [Analytics] Resetting all providers");
    providers.forEach((provider) => {
      if (provider.reset) {
        provider.reset();
      }
    });
    lastIdentifiedUserId.current = null;
    setEventQueue([]);
  }, [providers]);

  // Flush queued events when consent is given
  useEffect(() => {
    if (hasConsent && eventQueue.length > 0) {
      console.info(
        `📤 [Analytics] Flushing ${eventQueue.length} queued events`,
      );
      eventQueue.forEach((event, index) => {
        console.debug(
          `📤 [${index + 1}/${eventQueue.length}] Replaying queued event: ${event.eventName}`,
        );
        trackEvent(event.eventName, event.properties, event.meta);
      });
      setEventQueue([]);
      console.info("✅ [Analytics] Event queue flushed successfully");
    }
  }, [hasConsent, eventQueue, trackEvent]);

  // Initialize analytics system when consent is given
  useEffect(() => {
    if (hasConsent) {
      console.info("🚀 [Analytics] Analytics system initialized with consent");

      // Identify user if logged in
      if (session.data?.user) {
        identifyUser();
      }
    }
  }, [hasConsent, session.data, identifyUser]);

  // Handle consent acceptance
  const handleAccept = useCallback(() => {
    console.info("✅ [Analytics] Cookie consent accepted");
    localStorage.setItem("cookieConsent", "true");
    localStorage.setItem("cookieConsentTimestamp", Date.now().toString());
    setHasConsent(true);
    setShowBanner(false);

    // Enable PostHog tracking features now that consent is given
    posthog.set_config({
      autocapture: false, // KEEP OFF - manual events only
      capture_pageview: "history_change", // Track pageviews on navigation
      capture_pageleave: true,
      disable_session_recording: false,
    });

    // Start session replay
    posthog.startSessionRecording();

    // Manually capture the initial pageview that was missed before consent
    posthog.capture("$pageview");
    console.info(
      "✅ [Analytics] PostHog tracking enabled, initial pageview captured",
    );
  }, []);

  // Handle consent decline
  const handleDecline = useCallback(() => {
    console.info("❌ [Analytics] Cookie consent declined");
    localStorage.setItem("cookieConsent", "false");
    localStorage.setItem("cookieConsentTimestamp", Date.now().toString());
    setHasConsent(false);
    setShowBanner(false);
    reset();
    setEventQueue([]); // Clear any queued events
  }, [reset]);

  // Allow users to re-show the consent banner
  const reShowConsentBanner = useCallback(() => {
    console.info("🔵 [Analytics] Re-showing consent banner");
    localStorage.removeItem("cookieConsent");
    localStorage.removeItem("cookieConsentTimestamp");
    setHasConsent(false);
    setShowBanner(true);
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        hasConsent,
        trackEvent,
        identifyUser,
        reset,
        reShowConsentBanner,
      }}
    >
      {children}
      <CookieBanner
        isOpen={showBanner}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </AnalyticsContext.Provider>
  );
}
