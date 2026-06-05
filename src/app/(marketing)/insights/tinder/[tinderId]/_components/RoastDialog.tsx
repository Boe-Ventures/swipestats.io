"use client";

import { useState } from "react";
import { Copy, Share2, Lock } from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../TinderProfileProvider";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface RoastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://swipestats.io";

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "#4ade80" : score >= 45 ? "#fbbf24" : "#f87171";
  return (
    <div className="text-center">
      <div className="mb-1 text-xs font-semibold tracking-widest text-white/40 uppercase">
        Dateability Score
      </div>
      <div
        className="leading-none font-black"
        style={{ fontSize: "80px", color }}
      >
        {score}
      </div>
      <div className="text-base text-white/40">/ 100</div>
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
            <DialogTitle className="text-center text-2xl font-black text-white">
              🔥 Your AI Roast
            </DialogTitle>
          </DialogHeader>

          {/* Loading */}
          {roastQuery.isLoading && (
            <div className="py-12 text-center text-white/60">
              Loading your roast...
            </div>
          )}

          {/* Not the owner */}
          {!roastQuery.isLoading && !isOwner && (
            <div className="py-8 text-center text-white/50">
              Only the profile owner can generate a roast.
            </div>
          )}

          {/* No roast yet — owner without one */}
          {!roastQuery.isLoading && isOwner && !roast && (
            <div className="space-y-4 py-8 text-center">
              <div className="text-5xl">🔥</div>
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
                  disabled={generateMutation.isPending}
                  className="bg-rose-600 text-white hover:bg-rose-500"
                >
                  {generateMutation.isPending
                    ? "Roasting... 🔥"
                    : "Generate My Roast"}
                </Button>
              )}
            </div>
          )}

          {/* Roast content */}
          {roast && (
            <div className="space-y-6">
              {/* Score */}
              <ScoreCircle score={roast.overallScore} />

              {/* Headline */}
              <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <p className="text-lg font-medium text-white/90 italic">
                  &ldquo;{roast.headline}&rdquo;
                </p>
              </blockquote>

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

                {/* Lines 4–10: blurred paywall for FREE tier */}
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
