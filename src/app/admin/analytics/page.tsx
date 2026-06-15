"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import posthog from "posthog-js";
import {
  Activity,
  Database,
  LogIn,
  LogOut,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";
import {
  amplitudeEnabled,
  getAmplitudeIds,
} from "@/lib/analytics/amplitude.client";
import {
  ALL_OFF,
  CONSENT_CATEGORY_META,
  type ConsentCategory,
  type ConsentPreferences,
  type ConsentRecord,
} from "@/lib/analytics/consent";
import {
  getStoredConsent,
  isGpcEnabled,
} from "@/lib/analytics/consent.storage";

interface DebugSnapshot {
  consent: ConsentRecord | null;
  gpc: boolean;
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
    consent: getStoredConsent(),
    gpc: isGpcEnabled(),
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

function consentValue(prefs: ConsentPreferences | null, cat: ConsentCategory) {
  if (cat === "essential") return "✅ on";
  if (prefs === null) return "⏳ undecided";
  return prefs[cat] ? "✅ on" : "🚫 off";
}

export default function AdminAnalyticsPage() {
  const {
    hasConsent,
    preferences,
    trackEvent,
    setConsent,
    acceptAll,
    rejectNonEssential,
    reShowConsentBanner,
  } = useAnalytics();
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
        setServerResult(`✅ fired (userId: ${data.userId}, at ${data.firedAt})`);
      },
      onError: (error) => setServerResult(`❌ ${error.message}`),
    }),
  );

  // DB-backed consent (durable, server-readable mirror).
  const dbConsentQuery = useQuery(
    trpc.consent.get.queryOptions(undefined, { enabled: false }),
  );
  const writeDbConsent = useMutation(
    trpc.consent.set.mutationOptions({
      onSuccess: () => void dbConsentQuery.refetch(),
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

  // --- consent controls (live: setConsent applies to the provider, no reload) ---
  const current = preferences ?? ALL_OFF;
  const toggleCategory = (cat: ConsentCategory, checked: boolean) => {
    setConsent({ ...current, [cat]: checked });
    setTimeout(refresh, 50);
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
  const isFullUser = !!user && !user.isAnonymous;
  const isAnon = !!user && !!user.isAnonymous;
  const authState = isFullUser
    ? "logged in"
    : isAnon
      ? "anonymous session"
      : "logged out";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Debug Harness
          </h1>
          <p className="mt-2 text-gray-600">
            Fire test events, manage granular consent, and inspect identity
            across PostHog, Vercel, and Amplitude. See the{" "}
            <a href="/admin/tracking-plan" className="text-blue-600 underline">
              tracking plan
            </a>{" "}
            for the catalog, or the{" "}
            <a href="/cookies" className="text-blue-600 underline">
              cookies page
            </a>{" "}
            for the user-facing UI.
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
                label="decision"
                value={
                  preferences === null
                    ? "⏳ undecided (banner shows)"
                    : "✅ decided"
                }
              />
              {CONSENT_CATEGORY_META.map((cat) => (
                <Row
                  key={cat.key}
                  label={`consent · ${cat.key}`}
                  value={consentValue(preferences, cat.key)}
                />
              ))}
              <Row
                label="analytics on (back-compat)"
                value={hasConsent ? "✅ yes" : "🚫 no"}
              />
              <Row
                label="Global Privacy Control"
                value={snapshot.gpc ? "⚠️ enabled (forces off)" : "not set"}
              />
              <Row
                label="decidedAt"
                value={
                  snapshot.consent
                    ? new Date(snapshot.consent.decidedAt).toLocaleString()
                    : null
                }
              />
              <Row label="auth" value={authState} />
              <Row label="user" value={user ? user.id : "logged out"} />
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
            goes through the consent-gated provider array (needs{" "}
            <code className="text-xs">analytics</code> consent); server goes
            through the fan-out service. Only the client event reaches Amplitude.
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
              Client event is queued (not sent) until{" "}
              <code>analytics</code> consent is granted below.
            </p>
          )}
          {lastClientNonce && (
            <Row label="last client nonce" value={lastClientNonce} />
          )}
          {serverResult && <Row label="server" value={serverResult} />}
        </Section>

        {/* Granular consent */}
        <Section title="Consent (granular)" icon={ShieldCheck}>
          <p className="text-sm text-gray-600">
            Per-category — written to localStorage via the consent core and
            applied to the provider array live (no reload). Essential is always
            on.
          </p>
          <div className="divide-y divide-gray-100">
            {CONSENT_CATEGORY_META.map((cat) => (
              <div
                key={cat.key}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {cat.label}
                    {cat.locked && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        (always on)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{cat.description}</div>
                </div>
                <Switch
                  checked={cat.key === "essential" ? true : current[cat.key]}
                  disabled={cat.locked}
                  onCheckedChange={(checked) => toggleCategory(cat.key, checked)}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => {
                acceptAll();
                setTimeout(refresh, 50);
              }}
            >
              Accept all
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                rejectNonEssential();
                setTimeout(refresh, 50);
              }}
            >
              Reject non-essential
            </Button>
            <Button variant="outline" onClick={reShowConsentBanner}>
              Re-show banner
            </Button>
            <ButtonLink href="/cookies" variant="outline">
              Open /cookies
            </ButtonLink>
          </div>
        </Section>

        {/* Auth quick actions */}
        <Section title="Auth quick actions" icon={UserPlus}>
          <p className="text-sm text-gray-600">
            Current: <span className="font-medium">{authState}</span>. Actions
            adapt to the session.
          </p>
          <div className="flex flex-wrap gap-2">
            {isFullUser ? (
              <Button variant="outline" disabled>
                <LogIn className="mr-1 h-3 w-3" /> Signed in
              </Button>
            ) : (
              <ButtonLink href="/signin" variant="outline">
                <LogIn className="mr-1 h-3 w-3" />{" "}
                {isAnon ? "Upgrade / sign in" : "Sign in"}
              </ButtonLink>
            )}
            <Button
              variant="outline"
              onClick={signInAnonymous}
              disabled={!!user}
            >
              <UserPlus className="mr-1 h-3 w-3" /> Create anon session
            </Button>
            <Button variant="outline" onClick={signOut} disabled={!user}>
              <LogOut className="mr-1 h-3 w-3" /> Sign out
            </Button>
          </div>
        </Section>

        {/* DB-backed consent */}
        <Section title="DB-backed consent" icon={Database}>
          <p className="text-sm text-gray-600">
            Durable, cross-device consent on{" "}
            <code className="text-xs">user.analyticsConsent</code> (preferences +
            version + timestamp). Server-side event gating reads this. Requires a
            logged-in user.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void dbConsentQuery.refetch()}
              disabled={!user || dbConsentQuery.isFetching}
            >
              {dbConsentQuery.isFetching ? "Reading…" : "Read DB consent"}
            </Button>
            <Button
              variant="outline"
              onClick={() => writeDbConsent.mutate({ preferences: current })}
              disabled={!user || writeDbConsent.isPending}
            >
              {writeDbConsent.isPending ? "Writing…" : "Write DB consent"}
            </Button>
          </div>
          {!user && (
            <p className="text-xs text-amber-600">
              Sign in (or create an anon session) to read/write DB consent.
            </p>
          )}
          {dbConsentQuery.isFetched && (
            <div className="divide-y divide-gray-100 pt-1">
              {dbConsentQuery.data ? (
                <>
                  {CONSENT_CATEGORY_META.map((cat) => (
                    <Row
                      key={cat.key}
                      label={`db · ${cat.key}`}
                      value={
                        dbConsentQuery.data!.preferences[cat.key] ? "✅" : "🚫"
                      }
                    />
                  ))}
                  <Row
                    label="db decidedAt"
                    value={new Date(
                      dbConsentQuery.data.decidedAt,
                    ).toLocaleString()}
                  />
                </>
              ) : (
                <Row label="db record" value="none yet" />
              )}
            </div>
          )}
          {writeDbConsent.isError && (
            <p className="text-xs text-red-600">{writeDbConsent.error.message}</p>
          )}
        </Section>
      </div>
    </div>
  );
}
