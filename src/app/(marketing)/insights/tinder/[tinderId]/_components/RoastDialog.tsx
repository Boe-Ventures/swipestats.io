"use client";

import { useState } from "react";
import {
  BarChart3,
  Copy,
  Flame,
  Heart,
  Lock,
  MessageSquare,
  RefreshCw,
  Share2,
  Trophy,
} from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/lib/utils";
import {
  RoastLoadingTheater,
  type LoadingStep,
} from "@/components/roast/roast-loading-theater";
import { TONES, type Tone } from "@/components/roast/tones.client";
import { useTinderProfile } from "../TinderProfileProvider";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface RoastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://swipestats.io";

/* Loading theater copy + tracker, tuned to the stats roast. The animation
 * itself is the shared <RoastLoadingTheater>. */

const LOADING_LINES = [
  "Warming up the grill…",
  "Crunching your swipe numbers…",
  "Calculating your match rate…",
  "Counting the ghosts…",
  "Measuring your app addiction…",
  "Doing the math on your love life…",
  "Preheating the burn unit…",
  "Plating up the verdict…",
];

const LOADING_STEPS: LoadingStep[] = [
  { label: "Stats", icon: BarChart3 },
  { label: "Swipes", icon: Heart },
  { label: "Messages", icon: MessageSquare },
  { label: "Verdict", icon: Trophy },
];

function RoastLoadingState() {
  return (
    <RoastLoadingTheater
      lines={LOADING_LINES}
      steps={LOADING_STEPS}
      stepIntervalMs={4500}
      skeleton={
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-white/10" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      }
    />
  );
}

export function RoastDialog({ open, onOpenChange }: RoastDialogProps) {
  const { tinderId, isOwner, isAnonymous } = useTinderProfile();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const trpc = useTRPC();
  const [isCopied, setIsCopied] = useState(false);

  const isPaid = effectiveTier === "PLUS" || effectiveTier === "ELITE";
  const canFetchRoast = isOwner && !isAnonymous;

  const roastQuery = useQuery(
    trpc.roast.getByProfile.queryOptions(
      { tinderProfileId: tinderId },
      {
        refetchOnWindowFocus: false,
        enabled: open && canFetchRoast,
      },
    ),
  );

  const generateMutation = useMutation(
    trpc.roast.generate.mutationOptions({
      onSuccess: () => {
        void roastQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to generate roast");
      },
    }),
  );

  const makePublicMutation = useMutation(
    trpc.roast.makePublic.mutationOptions({
      onSuccess: () => {
        void roastQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to make roast public");
      },
    }),
  );

  const roast = roastQuery.data;
  // Keep the theater up from click through the post-generate refetch, so the
  // "generate" button doesn't flash before the fresh roast renders.
  const isGenerating =
    generateMutation.isPending || (generateMutation.isSuccess && !roast);

  // The tone currently in flight (optimistic) or saved on the roast; drives the
  // selector's active state. Falls back to "mild" before anything is roasted.
  const activeTone: Tone =
    generateMutation.variables?.tone ??
    (roast?.tone as Tone | null) ??
    "mild";

  // Explicit tone clicks always re-roll (server reuses cache only for the same
  // tone); for the first-ever roast `regenerate` is a harmless no-op.
  const runRoast = (tone: Tone) =>
    generateMutation.mutate({
      tinderProfileId: tinderId,
      tone,
      regenerate: true,
    });

  const getShareUrl = (shareKey: string) =>
    `${BASE_URL}/share/stats-roast/${shareKey}`;

  const ensurePublicAndGetUrl = async (): Promise<string | null> => {
    if (!roast) return null;
    if (roast.isPublic && roast.shareKey) {
      return getShareUrl(roast.shareKey);
    }
    const result = await makePublicMutation.mutateAsync({ roastId: roast.id });
    return result.shareKey ? getShareUrl(result.shareKey) : null;
  };

  const handleShare = async () => {
    const shareUrl = await ensurePublicAndGetUrl();
    if (!shareUrl || !roast) return;

    const text = `My AI dating roast 🔥\n\n"${roast.headline}"\n\nGet your own:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    const shareUrl = await ensurePublicAndGetUrl();
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        scrollable
        className="border-white/10 bg-[#0f0a1e] p-0 text-white [&_[data-slot=dialog-close]]:bg-white/10 [&_[data-slot=dialog-close]]:text-white/80 [&_[data-slot=dialog-close]]:hover:bg-white/20 [&_[data-slot=dialog-close]]:hover:text-white"
      >
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-black text-white">
              <Flame className="h-6 w-6 text-rose-500" />
              Your AI Roast
            </DialogTitle>
          </DialogHeader>

          {/* Generating — the loading theater owns the screen */}
          {isGenerating && <RoastLoadingState />}

          {/* Loading existing */}
          {!isGenerating && roastQuery.isLoading && (
            <div className="py-12 text-center text-white/60">
              Loading your roast...
            </div>
          )}

          {/* Not the owner */}
          {!isGenerating && !roastQuery.isLoading && !isOwner && (
            <div className="py-8 text-center text-white/50">
              Only the profile owner can generate a roast.
            </div>
          )}

          {/* No roast yet — owner without one: pick a heat level to generate */}
          {!isGenerating && !roastQuery.isLoading && isOwner && !roast && (
            <div className="space-y-5 py-6 text-center">
              <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/40">
                <Flame className="h-8 w-8 text-white" />
                <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-rose-400/50" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-white">Pick your heat</p>
                <p className="text-sm text-white/60">
                  A data-driven roast of your stats — you choose how hard we go.
                </p>
              </div>
              {!isPaid ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/40">
                    AI Roast requires SwipeStats+
                  </p>
                  <Button
                    onClick={() => openUpgradeModal({ feature: "aiRoast" })}
                    className="bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Upgrade to Get Roasted
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2 text-left sm:grid-cols-3">
                  {TONES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => runRoast(t.key)}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-4 text-center transition-colors hover:border-rose-400/60 hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
                    >
                      <span className="text-2xl transition-transform group-hover:scale-110">
                        {t.emoji}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {t.label}
                      </span>
                      <span className="text-xs leading-snug text-white/50">
                        {t.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roast content */}
          {!isGenerating && roast && (
            <div className="space-y-6">
              {/* Hero — tagline + headline + verdict */}
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 sm:p-6">
                <div className="space-y-3 text-center sm:text-left">
                  <Badge
                    variant="secondary"
                    className="border-0 bg-white/10 font-semibold tracking-widest text-white/60 uppercase"
                  >
                    {roast.tagline || "The Roast"}
                  </Badge>
                  <p className="font-serif text-2xl leading-snug text-white italic sm:text-3xl">
                    &ldquo;{roast.headline}&rdquo;
                  </p>
                  {roast.verdict && (
                    <p className="text-sm leading-relaxed text-white/60">
                      {roast.verdict}
                    </p>
                  )}
                </div>
              </div>

              {/* Tone dial — re-roll at a different heat */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-medium text-white/40">
                  Re-roast:
                </span>
                {TONES.map((t) => (
                  <Button
                    key={t.key}
                    size="sm"
                    variant="outline"
                    onClick={() => runRoast(t.key)}
                    className={cn(
                      "border-white/15 bg-white/5 text-white hover:bg-white/15 hover:text-white",
                      activeTone === t.key &&
                        "border-rose-400/60 bg-rose-500/20 text-white",
                    )}
                  >
                    {activeTone === t.key ? (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <span className="mr-1.5">{t.emoji}</span>
                    )}
                    {t.label}
                  </Button>
                ))}
              </div>

              {/* Roast lines */}
              <section>
                <h3 className="mb-3 text-xs font-semibold tracking-widest text-white/40 uppercase">
                  The Roast
                </h3>

                {/* First 3 lines — always visible */}
                <ul className="space-y-2">
                  {roast.roastLines.slice(0, 3).map((line, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <span className="mt-0.5 text-base">🔥</span>
                      <p className="text-sm leading-relaxed text-white/85">
                        {line}
                      </p>
                    </li>
                  ))}
                </ul>

                {/* Lines 4+: blurred paywall for FREE tier */}
                {roast.roastLines.length > 3 && (
                  <div className="relative mt-2">
                    <ul
                      className={`space-y-2 ${!isPaid ? "pointer-events-none select-none" : ""}`}
                      aria-hidden={!isPaid}
                    >
                      {roast.roastLines.slice(3).map((line, i) => (
                        <li
                          key={i + 3}
                          className={`flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all ${!isPaid ? "blur-sm" : ""}`}
                        >
                          <span className="mt-0.5 text-base">🔥</span>
                          <p className="text-sm leading-relaxed text-white/85">
                            {line}
                          </p>
                        </li>
                      ))}
                    </ul>

                    {!isPaid && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#0f0a1e]/80 backdrop-blur-sm">
                        <Lock className="mb-2 h-6 w-6 text-white/60" />
                        <p className="mb-1 font-bold text-white">
                          +{roast.roastLines.length - 3} more roast lines
                        </p>
                        <p className="mb-4 text-sm text-white/50">
                          Plus Real Talk insights
                        </p>
                        <Button
                          onClick={() =>
                            openUpgradeModal({ feature: "aiRoast" })
                          }
                          className="bg-rose-600 text-white hover:bg-rose-500"
                          size="sm"
                        >
                          Unlock with SwipeStats+
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Real Talk — PLUS/ELITE only */}
              {isPaid &&
                roast.realTalkInsights &&
                roast.realTalkInsights.length > 0 && (
                  <section>
                    <h3 className="mb-3 text-xs font-semibold tracking-widest text-white/40 uppercase">
                      Real Talk
                    </h3>
                    <ul className="space-y-2">
                      {roast.realTalkInsights.map((insight, i) => (
                        <li
                          key={i}
                          className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3"
                        >
                          <span className="mt-0.5 text-base">💡</span>
                          <p className="text-sm leading-relaxed text-white/85">
                            {insight}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {/* Share section — owner only */}
              {isOwner && (
                <section className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <p className="text-center text-sm font-semibold text-white/80">
                    Share your roast 🔥
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleShare}
                      disabled={makePublicMutation.isPending}
                      className="flex-1 border border-white/20 bg-black text-white hover:bg-zinc-900"
                      size="sm"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share on X
                    </Button>
                    <Button
                      onClick={handleCopyLink}
                      disabled={makePublicMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {isCopied ? "Copied!" : "Copy Link"}
                    </Button>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
