"use client";

/**
 * Try Page — Branded Gateway
 *
 * Ensures a session exists (creating an anonymous one if needed), then drops the
 * visitor straight into a profile comparison — so the marketing "Try it free"
 * CTA never hits the `/app` login wall and never lands on an empty hub.
 *
 * Default flow (no `?next`):
 *   - Reuse the user's most recent comparison if they have one (continuity for
 *     returning anonymous visitors), otherwise seed a fresh one.
 *   - Forward to /app/profile-compare/[id], whose empty state guides next steps.
 *
 * With `?next=/app/...` the gateway skips creation and just forwards there
 * (internal app paths only, to avoid open redirects) — keeping it reusable as a
 * generic "ensure session, then go here" entry point.
 *
 * Shows the SwipeStats mark with a gentle pulse so the brief wait reads as an
 * intentional "Welcome" moment rather than a broken spinner.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { NewOldLogo } from "@/components/ui/NewOldLogo";
import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";
import { getDefaultComparisonName } from "@/app/app/profile-compare/_lib/default-name";
import {
  ANONYMOUS_SOURCES,
  type AnonymousSource,
} from "@/lib/analytics/analytics.types";

/** Columns a freshly seeded comparison starts with — matches the create dialog. */
const DEFAULT_COLUMNS = [
  { dataProvider: "TINDER" as const },
  { dataProvider: "HINGE" as const },
];

/** Only allow internal app paths so `?next=` can't be used as an open redirect. */
function resolveNext(next: string | null): string | null {
  if (next?.startsWith("/app/")) return next;
  return null;
}

/**
 * Where this `/try` visit originated, for lead attribution. External CTAs pass
 * `?source=` (e.g. `roast_share`, `home_banner`); a bare `/try` is the generic
 * gateway. Validated against the shared allowlist so we never forward an
 * arbitrary value into analytics. The source rides along as the
 * `X-Anonymous-Source` header when we mint a guest session, and stays in the URL
 * for PostHog pageview attribution — it does not change where the visitor lands.
 */
function resolveSource(source: string | null): AnonymousSource {
  if (source && (ANONYMOUS_SOURCES as readonly string[]).includes(source)) {
    return source as AnonymousSource;
  }
  return "try_gateway";
}

function Splash({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="animate-in fade-in zoom-in fill-mode-both duration-500">
        <NewOldLogo className="h-14 w-14 animate-pulse text-rose-500" />
      </div>
      <p className="text-muted-foreground animate-in fade-in fill-mode-both mt-4 text-sm delay-500 duration-500">
        {error ? "Something went wrong" : "Welcome to SwipeStats"}
      </p>
      {error && onRetry && (
        <button
          onClick={onRetry}
          className="text-muted-foreground hover:text-foreground mt-2 text-sm underline transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default function TryPage() {
  return (
    <Suspense fallback={<Splash />}>
      <TryGateway />
    </Suspense>
  );
}

function TryGateway() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNext(searchParams.get("next"));
  const source = resolveSource(searchParams.get("source"));
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const hasStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const createComparison = useMutation(
    trpc.profileCompare.create.mutationOptions(),
  );

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const run = async () => {
      try {
        // 1. Ensure a session exists — create an anonymous one if needed.
        const session = await authClient.getSession();
        if (!session.data?.user) {
          const result = await authClient.signIn.anonymous({
            fetchOptions: { headers: { "X-Anonymous-Source": source } },
          });
          if (result.error) {
            throw new Error(result.error.message || "Failed to create session");
          }
        }

        // 2. An explicit destination wins — just forward there.
        if (next) {
          router.replace(next);
          return;
        }

        // 3. Otherwise drop them into a comparison: reuse the most recent one,
        //    or seed a fresh one so they land on the editor, not an empty hub.
        const existing = await queryClient.fetchQuery(
          trpc.profileCompare.list.queryOptions(),
        );
        const target =
          existing[0] ??
          (await createComparison.mutateAsync({
            name: getDefaultComparisonName(),
            columns: DEFAULT_COLUMNS,
          }));

        router.replace(`/app/profile-compare/${target.id}`);
      } catch (err) {
        console.error("Try page error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    };

    void run();
  }, [next, source, router, trpc, queryClient, createComparison]);

  return (
    <Splash
      error={error ?? undefined}
      onRetry={() => {
        setError(null);
        hasStarted.current = false;
        window.location.reload();
      }}
    />
  );
}
