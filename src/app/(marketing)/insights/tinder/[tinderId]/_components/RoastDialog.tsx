"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  Flame,
  Heart,
  Loader2,
  Lock,
  MessageSquare,
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
import { useTinderProfile } from "../TinderProfileProvider";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface RoastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://swipestats.io";

function scoreColor(score: number) {
  return score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
}

/** SVG progress ring, mirrors the profile-compare roast hero. */
function ScoreRing({ score, size = 104 }: { score: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = scoreColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl leading-none font-black" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-white/50">/ 100</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Loading theater — the wait is the entertainment. Ported from the
 * profile-compare roast: pulsing flame, rotating status lines, and a
 * sequential analysis tracker tuned to the stats roast.
 * ---------------------------------------------------------------- */

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

const LOADING_STEPS = [
  { label: "Stats", icon: BarChart3 },
  { label: "Swipes", icon: Heart },
  { label: "Messages", icon: MessageSquare },
  { label: "Verdict", icon: Trophy },
] as const;

function RoastLoadingState() {
  const [lineIdx, setLineIdx] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const lineTimer = setInterval(
      () => setLineIdx((i) => (i + 1) % LOADING_LINES.length),
      2600,
    );
    const stepTimer = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      4500,
    );
    return () => {
      clearInterval(lineTimer);
      clearInterval(stepTimer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 px-6 py-10 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 animate-pulse rounded-full bg-rose-500/25 blur-3xl"
        />

        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/40">
          <Flame className="h-8 w-8 animate-pulse text-white" />
          <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-rose-400/60" />
        </div>

        <p
          key={lineIdx}
          className="mx-auto mt-5 flex min-h-[3.5rem] max-w-sm items-center justify-center font-serif text-xl text-white italic duration-500 animate-in fade-in slide-in-from-bottom-1 sm:text-2xl"
        >
          {LOADING_LINES[lineIdx]}
        </p>

        <div className="mx-auto mt-6 flex max-w-sm items-start justify-between">
          {LOADING_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="relative flex flex-1 flex-col items-center gap-2"
              >
                {i > 0 && (
                  <span
                    className={cn(
                      "absolute top-4 z-0 h-0.5 transition-colors",
                      done || active ? "bg-rose-500" : "bg-white/15",
                    )}
                    style={{
                      left: "calc(-50% + 20px)",
                      right: "calc(50% + 20px)",
                    }}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 grid h-8 w-8 place-items-center rounded-full border transition-colors",
                    done &&
                      "border-transparent bg-gradient-to-br from-rose-400 to-rose-600 text-white",
                    active && "border-rose-400 text-rose-300",
                    !done && !active && "border-white/15 text-white/40",
                  )}
                >
                  {active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    done || active ? "text-white" : "text-white/40",
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* skeleton so the reveal doesn't jump */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 bg-white/10" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
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

  const getShareUrl = (shareKey: string) =>
    `${BASE_URL}/share/roast/${shareKey}`;

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

    const text = `My dating app dateability score: ${roast.overallScore}/100 🔥\n\n"${roast.headline}"\n\nGet your own AI roast:`;
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
        className="border-white/10 bg-[#0f0a1e] p-0 text-white"
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

          {/* No roast yet — owner without one */}
          {!isGenerating && !roastQuery.isLoading && isOwner && !roast && (
            <div className="space-y-4 py-8 text-center">
              <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/40">
                <Flame className="h-8 w-8 text-white" />
                <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-rose-400/50" />
              </div>
              <p className="text-white/70">
                Get a data-driven AI roast of your dating app performance.
              </p>
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
                <Button
                  onClick={() =>
                    generateMutation.mutate({ tinderProfileId: tinderId })
                  }
                  className="bg-rose-600 text-white hover:bg-rose-500"
                >
                  Generate My Roast 🔥
                </Button>
              )}
            </div>
          )}

          {/* Roast content */}
          {!isGenerating && roast && (
            <div className="space-y-6">
              {/* Hero — score ring + headline */}
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 sm:p-6">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                  <ScoreRing score={roast.overallScore} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Badge
                      variant="secondary"
                      className="border-0 bg-white/10 font-semibold tracking-widest text-white/60 uppercase"
                    >
                      Dateability Score
                    </Badge>
                    <p className="font-serif text-xl leading-snug text-white italic sm:text-2xl">
                      &ldquo;{roast.headline}&rdquo;
                    </p>
                  </div>
                </div>
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
