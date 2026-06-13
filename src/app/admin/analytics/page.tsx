"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import posthog from "posthog-js";
import {
  Activity,
  LogIn,
  LogOut,
  RefreshCw,
  Send,
  Server,
  UserPlus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";
import {
  amplitudeEnabled,
  getAmplitudeIds,
} from "@/lib/analytics/amplitude.client";

interface DebugSnapshot {
  cookieConsent: string | null;
  cookieConsentTimestamp: string | null;
  posthogDistinctId: string | null;
  amplitude: ReturnType<typeof getAmplitudeIds>;
}

function readSnapshot(): DebugSnapshot {
  let posthogDistinctId: string | null = null;
  try {
    posthogDistinctId = posthog.get_distinct_id() ?? null;
  } catch {
    posthogDistinctId = null;
  }
  return {
    cookieConsent: localStorage.getItem("cookieConsent"),
    cookieConsentTimestamp: localStorage.getItem("cookieConsentTimestamp"),
    posthogDistinctId,
    amplitude: getAmplitudeIds(),
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-mono text-xs break-all text-gray-900">
        {value ?? <span className="text-gray-400">—</span>}
      </span>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Icon className="h-4 w-4 text-blue-600" />
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const { hasConsent, trackEvent, reShowConsentBanner } = useAnalytics();
  const session = authClient.useSession();
  const trpc = useTRPC();

  const [mounted, setMounted] = useState(false);
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [lastClientNonce, setLastClientNonce] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<string | null>(null);

  const refresh = useCallback(() => setSnapshot(readSnapshot()), []);

  useEffect(() => {
    setMounted(true);
    setSnapshot(readSnapshot());
  }, []);

  const fireServerEvent = useMutation(
    trpc.admin.fireTestEvent.mutationOptions({
      onSuccess: (data) => {
        setServerResult(
          `✅ fired (userId: ${data.userId}, at ${data.firedAt})`,
        );
      },
      onError: (error) => setServerResult(`❌ ${error.message}`),
    }),
  );

  const fireClientEvent = () => {
    const nonce = crypto.randomUUID();
    setLastClientNonce(nonce);
    trackEvent("admin_test_event_fired", {
      surface: "client",
      nonce,
      source: "admin_analytics_page",
    });
  };

  const fireServer = () => {
    const nonce = crypto.randomUUID();
    setServerResult(`⏳ firing (nonce: ${nonce})…`);
    fireServerEvent.mutate({ nonce, source: "admin_analytics_page" });
  };

  // --- consent controls (debug: write localStorage + reload) ---
  const setConsent = (value: "true" | "false") => {
    localStorage.setItem("cookieConsent", value);
    localStorage.setItem("cookieConsentTimestamp", Date.now().toString());
    window.location.reload();
  };
  const clearConsent = () => {
    localStorage.removeItem("cookieConsent");
    localStorage.removeItem("cookieConsentTimestamp");
    window.location.reload();
  };

  // --- auth quick actions ---
  const signOut = async () => {
    await authClient.signOut();
    // Hard-navigate so the query cache can't leak across accounts.
    window.location.href = "/admin/analytics";
  };
  const signInAnonymous = async () => {
    await authClient.signIn.anonymous();
    window.location.reload();
  };

  const user = session.data?.user;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Debug Harness
          </h1>
          <p className="mt-2 text-gray-600">
            Fire test events, flip consent, and inspect identity across PostHog,
            Vercel, and Amplitude. See the{" "}
            <a href="/admin/tracking-plan" className="text-blue-600 underline">
              tracking plan
            </a>{" "}
            for the full event catalog.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live state */}
        <Section title="Current state" icon={Activity}>
          {!mounted || !snapshot ? (
            <p className="text-sm text-gray-400">Reading client state…</p>
          ) : (
            <div className="divide-y divide-gray-100">
              <Row
                label="Consent (context)"
                value={hasConsent ? "✅ granted" : "🚫 none"}
              />
              <Row
                label="cookieConsent (localStorage)"
                value={snapshot.cookieConsent}
              />
              <Row
                label="consent timestamp"
                value={
                  snapshot.cookieConsentTimestamp
                    ? new Date(
                        Number(snapshot.cookieConsentTimestamp),
                      ).toLocaleString()
                    : null
                }
              />
              <Row
                label="user"
                value={
                  user
                    ? `${user.id}${user.isAnonymous ? " (anon)" : ""}`
                    : "logged out"
                }
              />
              <Row label="user email" value={user?.email ?? null} />
              <Row
                label="PostHog distinct_id"
                value={snapshot.posthogDistinctId}
              />
              <Row
                label="Amplitude"
                value={
                  amplitudeEnabled
                    ? snapshot.amplitude.initialized
                      ? "initialized"
                      : "enabled (not yet init)"
                    : "disabled (no API key)"
                }
              />
              <Row
                label="Amplitude deviceId"
                value={snapshot.amplitude.deviceId ?? null}
              />
              <Row
                label="Amplitude userId"
                value={snapshot.amplitude.userId ?? null}
              />
            </div>
          )}
        </Section>

        {/* Test events */}
        <Section title="Test events" icon={Send}>
          <p className="text-sm text-gray-600">
            Fires <code className="text-xs">admin_test_event_fired</code>. Client
            goes through the consent-gated provider array; server goes through
            the fan-out service.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={fireClientEvent} disabled={!hasConsent}>
              <Send className="mr-1 h-3 w-3" /> Fire client event
            </Button>
            <Button
              variant="secondary"
              onClick={fireServer}
              disabled={fireServerEvent.isPending}
            >
              <Server className="mr-1 h-3 w-3" /> Fire server event
            </Button>
          </div>
          {!hasConsent && (
            <p className="text-xs text-amber-600">
              Client event is queued (not sent) until consent is granted.
            </p>
          )}
          {lastClientNonce && (
            <Row label="last client nonce" value={lastClientNonce} />
          )}
          {serverResult && <Row label="server" value={serverResult} />}
        </Section>

        {/* Consent controls */}
        <Section title="Consent (localStorage)" icon={Activity}>
          <p className="text-sm text-gray-600">
            Today the source of truth is localStorage. Changing it reloads the
            page so the provider re-reads consent.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setConsent("true")}>Grant</Button>
            <Button variant="destructive" onClick={() => setConsent("false")}>
              Decline
            </Button>
            <Button variant="outline" onClick={clearConsent}>
              Clear
            </Button>
            <Button variant="outline" onClick={reShowConsentBanner}>
              Re-show banner
            </Button>
          </div>
        </Section>

        {/* Auth quick actions */}
        <Section title="Auth quick actions" icon={UserPlus}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href="/signin">
                <LogIn className="mr-1 h-3 w-3" /> Sign in
              </a>
            </Button>
            <Button variant="outline" onClick={signInAnonymous}>
              <UserPlus className="mr-1 h-3 w-3" /> Create anon session
            </Button>
            <Button variant="outline" onClick={signOut} disabled={!user}>
              <LogOut className="mr-1 h-3 w-3" /> Sign out
            </Button>
          </div>
        </Section>

        {/* DB-backed consent (planned) */}
        <Section title="DB-backed consent (planned)" icon={Server}>
          <p className="text-sm text-gray-600">
            Durable, cross-device consent will live on a{" "}
            <code className="text-xs">user.analyticsConsent</code> column
            (value + version + timestamp), synced with localStorage on login.
            Requires a schema migration — not wired yet.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled>
              Read DB consent
            </Button>
            <Button variant="outline" disabled>
              Write DB consent
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
