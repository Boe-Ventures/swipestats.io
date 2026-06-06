"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Flame,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  CircleDot,
  Images,
  AlignLeft,
  MessageSquareText,
  Trophy,
  ImagePlus,
  Plus,
  UtensilsCrossed,
  Info,
  Search,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { useTRPC, type RouterOutputs } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/lib/utils";

type Roast = NonNullable<RouterOutputs["roast"]["getProfileRoast"]>;
type RoastPhoto = Roast["photos"][number];

const TONES = [
  {
    key: "helpful",
    label: "Helpful",
    emoji: "💡",
    blurb: "Constructive, encouraging notes.",
  },
  {
    key: "mild",
    label: "Mild",
    emoji: "😏",
    blurb: "Playful jabs, mostly friendly.",
  },
  {
    key: "spicy",
    label: "Spicy",
    emoji: "🌶️",
    blurb: "No mercy. Bring tissues.",
  },
] as const;

type Tone = (typeof TONES)[number]["key"];

const KEEP_CUT_STYLES: Record<string, string> = {
  keep: "bg-green-500/15 text-green-600 dark:text-green-400",
  maybe: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  cut: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const SECTION_HEADER =
  "text-muted-foreground text-xs font-semibold tracking-widest uppercase";

interface RoastProfileDialogProps {
  columnId: string;
  comparisonId: string;
  displayName: string;
  /** Roastable photos (with an attachment) on this profile. */
  photoCount: number;
  /** Prompt answers on this profile. */
  promptCount: number;
  /** Whether the profile (or its comparison default) has a bio. */
  hasBio: boolean;
  /** Jump into the add-content flow from the empty state. */
  onAddContent: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoastProfileDialog({
  columnId,
  comparisonId,
  displayName,
  photoCount,
  promptCount,
  hasBio,
  onAddContent,
  open,
  onOpenChange,
}: RoastProfileDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Which bio rewrite is selected — shared between the bio toggle and the
  // "Create improved version" apply action so they stay in sync.
  const [rewriteIndex, setRewriteIndex] = useState(0);

  // Per-photo "look again" corrections, keyed by contentId. Layered over the
  // roast's photos so a single-photo re-roast swaps in instantly, regardless of
  // whether the roast came from the mutation or the query. The server also
  // persists the patch, so these reset cleanly on reload.
  const [photoOverrides, setPhotoOverrides] = useState<
    Record<string, RoastPhoto>
  >({});

  const handleReplacePhoto = (photo: RoastPhoto) => {
    if (!photo.contentId) return;
    setPhotoOverrides((prev) => ({ ...prev, [photo.contentId!]: photo }));
  };

  const roastQueryOptions = trpc.roast.getProfileRoast.queryOptions(
    { columnId },
    { enabled: open, refetchOnWindowFocus: false },
  );
  const roastQuery = useQuery(roastQueryOptions);

  const roastMutation = useMutation(
    trpc.roast.roastProfile.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: roastQueryOptions.queryKey,
        });
        // Refresh the comparison so the column's roast-status badge updates.
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
      },
      onError: (error) => toast.error(error.message || "Roast failed"),
    }),
  );

  // Dev-only escape hatch: wipe the saved roast row so the idle/empty states
  // can be re-tested without re-roasting. The mutation itself is gated to
  // non-production on the server; this just hides the button in prod builds.
  const isDev = process.env.NODE_ENV !== "production";
  const deleteRoastMutation = useMutation(
    trpc.roast.deleteProfileRoast.mutationOptions({
      onSuccess: () => {
        // Clear the mutation result too, else `roast` keeps showing the old one.
        roastMutation.reset();
        void queryClient.invalidateQueries({
          queryKey: roastQueryOptions.queryKey,
        });
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        toast.success("Roast deleted");
      },
      onError: (error) => toast.error(error.message || "Failed to delete roast"),
    }),
  );

  const roast: Roast | null = roastMutation.data ?? roastQuery.data ?? null;
  const activeTone = roastMutation.variables?.tone ?? roast?.tone;
  const reRoastTone = (activeTone ?? "mild") as Tone;
  const isGenerating = roastMutation.isPending;
  const isLoadingExisting = roastQuery.isLoading && !roastMutation.data;
  const isStale = !roastMutation.data && !!roastQuery.data?.isStale;

  // Pre-flight gate: the backend needs at least one photo or prompt to roast,
  // so when there's nothing yet we guide instead of letting a tone click fail.
  const notEnoughToRoast =
    !roast &&
    !isGenerating &&
    !isLoadingExisting &&
    photoCount === 0 &&
    promptCount === 0;

  // Idle: profile has roastable content but hasn't been roasted yet. The idle
  // state owns the tone picker, so the compact top selector steps aside until
  // there's a roast to re-roll.
  const isIdle =
    !roast && !isGenerating && !isLoadingExisting && !notEnoughToRoast;

  const runRoast = (tone: Tone) => {
    // A full re-roast replaces every verdict, so drop any per-photo corrections.
    setPhotoOverrides({});
    roastMutation.mutate({ columnId, tone });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* [&>*]:min-w-0 — DialogContent is a CSS grid; without it, grid children
          keep their min-content width and text overflows instead of wrapping. */}
      <DialogContent
        size="lg"
        scrollable
        className="overflow-x-hidden [&>*]:min-w-0"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-500" />
            Roast {displayName}
          </DialogTitle>
        </DialogHeader>

        {/* Tone selector — picking a tone runs (or re-runs) the roast.
            Hidden when there's nothing to roast yet (the empty state owns the
            screen) so a tone click can't fail, and while idle (the idle picker
            owns tone selection). */}
        {!notEnoughToRoast && !isIdle && (
          <div className="flex flex-wrap items-center gap-2">
            {TONES.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={activeTone === t.key ? "default" : "outline"}
                disabled={isGenerating}
                onClick={() => runRoast(t.key)}
              >
                <span className="mr-1.5">{t.emoji}</span>
                {t.label}
              </Button>
            ))}
            {roast && !isGenerating && (
              <span className="text-muted-foreground ml-auto text-xs">
                roasted{" "}
                {formatDistanceToNow(new Date(roast.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        )}

        {/* Stale — profile changed since this roast */}
        {isStale && !isGenerating && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <span className="text-amber-700 dark:text-amber-300">
              This profile changed since the roast — re-run to refresh.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runRoast(reRoastTone)}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Re-roast
            </Button>
          </div>
        )}

        {/* Empty — not enough material to roast yet */}
        {notEnoughToRoast && (
          <RoastEmptyState
            displayName={displayName}
            hasBio={hasBio}
            onAddContent={onAddContent}
          />
        )}

        {/* Idle — has content, no roast yet: the tone picker is the show */}
        {isIdle && (
          <RoastIdleState
            displayName={displayName}
            isBusy={isGenerating}
            onPick={runRoast}
          />
        )}

        {/* Loading — the wait is the show */}
        {(isGenerating || isLoadingExisting) && (
          <RoastLoadingState
            tone={reRoastTone}
            mode={isGenerating ? "roasting" : "loading"}
          />
        )}

        {/* Result */}
        {roast && !isGenerating && (
          <div className="min-w-0 space-y-6">
            <HeroCard
              overall={roast.overall}
              isGenerating={isGenerating}
              onReRoast={() => runRoast(reRoastTone)}
              onDeleteRoast={
                isDev
                  ? () => deleteRoastMutation.mutate({ columnId })
                  : undefined
              }
              isDeleting={deleteRoastMutation.isPending}
            />

            {roast.photos.length > 0 && (
              <PhotoVerdicts
                photos={roast.photos.map((p) =>
                  p.contentId && photoOverrides[p.contentId]
                    ? photoOverrides[p.contentId]!
                    : p,
                )}
                columnId={columnId}
                onReplacePhoto={handleReplacePhoto}
              />
            )}

            {roast.prompts.length > 0 && (
              <section className="space-y-3">
                <h3 className={SECTION_HEADER}>Prompts</h3>
                {roast.prompts.map((p, i) => (
                  <PromptVerdict key={p.contentId ?? i} prompt={p} />
                ))}
              </section>
            )}

            {roast.bio && (
              <BioSection
                bio={roast.bio}
                selected={rewriteIndex}
                onSelect={setRewriteIndex}
              />
            )}

            <WhatToChange items={roast.realTalk} />

            <ApplyCard
              columnId={columnId}
              comparisonId={comparisonId}
              rewriteIndex={roast.bio ? rewriteIndex : undefined}
              onApplied={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- *
 * Loading — the wait is the entertainment: dark hero matching the
 * result, a pulsing flame, rotating tone-aware status lines, a
 * sequential analysis tracker, and a skeleton so the reveal doesn't jump.
 * ---------------------------------------------------------------- */

const LOADING_LINES: Record<Tone, string[]> = {
  helpful: [
    "Warming up the grill…",
    "Looking for the good stuff first…",
    "Reading your bio…",
    "Studying your best angles…",
    "Lining up some honest notes…",
    "Finding the easy wins…",
    "Being constructive, promise…",
    "Plating it up — gently…",
  ],
  mild: [
    "Warming up the grill…",
    "Counting your sunset photos…",
    "Squinting at photo three…",
    "Reading your bio. Interesting.",
    "Consulting the panel of judges…",
    "Taking notes, raising eyebrows…",
    "Workshopping a few zingers…",
    "Plating up a few light jabs…",
  ],
  spicy: [
    "Sharpening the knives…",
    "Counting the gym-mirror selfies…",
    "Zooming in on photo two. Brave.",
    "Reading your bio. Oh no.",
    "Cross-referencing every red flag…",
    "Alerting your matches…",
    "Preheating the burn unit…",
    "Pouring the hot sauce…",
  ],
};

const LOADING_STEPS = [
  { label: "Photos", icon: Images },
  { label: "Bio", icon: AlignLeft },
  { label: "Prompts", icon: MessageSquareText },
  { label: "Verdict", icon: Trophy },
] as const;

function RoastLoadingState({
  tone,
  mode,
}: {
  tone: Tone;
  mode: "roasting" | "loading";
}) {
  const isRoasting = mode === "roasting";
  const lines = LOADING_LINES[tone] ?? LOADING_LINES.mild;
  const [lineIdx, setLineIdx] = useState(0);
  const [step, setStep] = useState(0);

  // Rotate the status copy and advance the tracker only while actively
  // generating — loading an existing roast is a quick fetch, no theater needed.
  useEffect(() => {
    if (!isRoasting) return;
    const lineTimer = setInterval(
      () => setLineIdx((i) => (i + 1) % lines.length),
      2600,
    );
    // Pace the tracker to a realistic roast (~15s to reach the verdict), so it
    // doesn't blow through every step in the first few seconds and then sit.
    const stepTimer = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      5000,
    );
    return () => {
      clearInterval(lineTimer);
      clearInterval(stepTimer);
    };
  }, [isRoasting, lines.length]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 px-6 py-10 text-center">
        {/* ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 animate-pulse rounded-full bg-rose-500/25 blur-3xl"
        />

        {/* flame with ripple */}
        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/40">
          <Flame className="h-8 w-8 animate-pulse text-white" />
          <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-rose-400/60" />
        </div>

        {/* rotating status line */}
        <p
          key={isRoasting ? lineIdx : "loading"}
          className="animate-in fade-in slide-in-from-bottom-1 mx-auto mt-5 flex min-h-[3.5rem] max-w-sm items-center justify-center font-serif text-xl text-white italic duration-500 sm:text-2xl"
        >
          {isRoasting ? lines[lineIdx] : "Loading your roast…"}
        </p>

        {/* analysis tracker */}
        {isRoasting && (
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
                    // Span between the two dot centers, but inset by the dot
                    // radius (16px) + a small gap so the line stops outside the
                    // circles instead of running under them.
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
        )}
      </div>

      {/* skeleton preview — mirrors the photo-verdict rows so the reveal lands
          with no layout jump */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 rounded-xl border p-3">
            <Skeleton className="h-20 w-16 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Idle — has content, no roast yet. Make the choice the moment: three
 * heat levels as tappable cards, each owning its own vibe, so picking a
 * tone IS the call to action instead of "pick a tone above".
 * ---------------------------------------------------------------- */

function RoastIdleState({
  displayName,
  isBusy,
  onPick,
}: {
  displayName: string;
  isBusy: boolean;
  onPick: (tone: Tone) => void;
}) {
  return (
    <Empty className="border-0 px-0 py-4 md:p-0">
      <EmptyHeader>
        <div className="relative mx-auto mb-1 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/30">
          <Flame className="h-7 w-7 text-white" />
          <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-rose-400/50" />
        </div>
        <EmptyTitle>Pick your heat</EmptyTitle>
        <EmptyDescription>
          Choose how hard we go on {displayName}. Switch tones and re-roast
          anytime.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="grid w-full gap-2 sm:grid-cols-3">
          {TONES.map((t) => (
            <button
              key={t.key}
              type="button"
              disabled={isBusy}
              onClick={() => onPick(t.key)}
              className="group focus-visible:ring-ring flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-colors hover:border-rose-300 hover:bg-rose-50/60 focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30"
            >
              <span className="text-2xl transition-transform group-hover:scale-110">
                {t.emoji}
              </span>
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-muted-foreground text-xs leading-snug text-pretty">
                {t.blurb}
              </span>
            </button>
          ))}
        </div>
      </EmptyContent>
    </Empty>
  );
}

/* ---------------------------------------------------------------- *
 * Empty — "not enough to roast". Guide, don't scold: cheeky art, a
 * short requirements checklist tied to the real backend gate, and a
 * jump into the add-content flow.
 * ---------------------------------------------------------------- */

function RoastEmptyState({
  displayName,
  hasBio,
  onAddContent,
}: {
  displayName: string;
  hasBio: boolean;
  onAddContent: () => void;
}) {
  return (
    <div className="px-2 py-6 text-center">
      {/* empty plate + flame spark */}
      <div className="relative mx-auto mb-5 h-24 w-24">
        <div className="grid h-24 w-24 place-items-center rounded-full border bg-gradient-to-b from-white to-zinc-100 shadow-inner dark:from-zinc-800 dark:to-zinc-900">
          <UtensilsCrossed className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        </div>
        <div className="absolute -top-1 -right-1 grid h-9 w-9 rotate-6 place-items-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/30">
          <Flame className="h-5 w-5 text-white" />
        </div>
      </div>

      <h3 className="text-xl font-bold tracking-tight">
        Nothing to roast… yet
      </h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed text-pretty">
        A good roast needs something to work with. Add a photo or two — and a
        bio if you&apos;re feeling brave — then come back. We&apos;ll tear it
        apart. Lovingly.
      </p>

      {/* requirements checklist */}
      <div className="mx-auto mt-6 max-w-sm divide-y overflow-hidden rounded-xl border text-left">
        <RequirementRow
          met={false}
          title="Add a photo or prompt"
          detail="More angles = more to (lovingly) make fun of."
          state="Required"
        />
        <RequirementRow
          met={hasBio}
          title="Write a bio"
          detail="Even one line gives us something to riff on."
          state={hasBio ? "Done" : "Optional"}
        />
      </div>

      <Button
        className="mx-auto mt-6 w-full max-w-sm bg-rose-600 text-white hover:bg-rose-500"
        onClick={onAddContent}
      >
        <ImagePlus className="mr-2 h-4 w-4" />
        Add content
      </Button>
      <p className="text-muted-foreground mt-3 text-xs">
        You can roast {displayName} once there&apos;s something on the profile.
      </p>
    </div>
  );
}

function RequirementRow({
  met,
  title,
  detail,
  state,
}: {
  met: boolean;
  title: string;
  detail: string;
  state: string;
}) {
  return (
    <div className="bg-card flex items-center gap-3 p-3">
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md",
          met
            ? "bg-green-500/15 text-green-600 dark:text-green-400"
            : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        )}
      >
        {met ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-xs">{detail}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-xs font-bold",
          met
            ? "text-green-600 dark:text-green-400"
            : "text-rose-600 dark:text-rose-400",
        )}
      >
        {state}
      </span>
    </div>
  );
}

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
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
        <span className="text-2xl leading-none font-black" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-white/50">/ 100</span>
      </div>
    </div>
  );
}

function HeroCard({
  overall,
  isGenerating,
  onReRoast,
  onDeleteRoast,
  isDeleting,
}: {
  overall: Roast["overall"];
  isGenerating: boolean;
  onReRoast: () => void;
  /** Dev-only: present only outside production. */
  onDeleteRoast?: () => void;
  isDeleting?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 text-white sm:p-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <ScoreRing score={overall.score} />
        <div className="min-w-0 flex-1 space-y-2">
          <Badge
            variant="secondary"
            className="border-0 bg-white/10 font-medium text-white"
          >
            {overall.tagline}
          </Badge>
          <p className="font-serif text-xl leading-snug italic sm:text-2xl">
            {overall.headline}
          </p>
          <p className="text-sm text-zinc-300">{overall.verdict}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          size="sm"
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          disabled={isGenerating}
          onClick={onReRoast}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Re-roast
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled
          className="border-white/10 bg-white/5 text-white/40"
          title="Coming soon"
        >
          Share · Soon
        </Button>
        {onDeleteRoast && (
          <Button
            size="sm"
            variant="outline"
            disabled={isDeleting}
            onClick={onDeleteRoast}
            title="Dev only — delete this saved roast from the database"
            className="border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 sm:ml-auto"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {isDeleting ? "Deleting…" : "Delete roast · Dev"}
          </Button>
        )}
      </div>
    </div>
  );
}

function PhotoVerdicts({
  photos,
  columnId,
  onReplacePhoto,
}: {
  photos: RoastPhoto[];
  columnId: string;
  onReplacePhoto: (photo: RoastPhoto) => void;
}) {
  const counts = { keep: 0, maybe: 0, cut: 0 };
  for (const p of photos) counts[p.keepOrCut]++;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className={SECTION_HEADER}>Photo verdicts</h3>
        <div className="flex gap-1.5 text-[11px] font-medium">
          {(["keep", "maybe", "cut"] as const).map((k) =>
            counts[k] > 0 ? (
              <span
                key={k}
                className={cn("rounded-full px-2 py-0.5", KEEP_CUT_STYLES[k])}
              >
                {counts[k]} {k}
              </span>
            ) : null,
          )}
        </div>
      </div>
      {photos.map((p, i) => (
        <PhotoVerdict
          key={p.contentId ?? i}
          photo={p}
          index={i}
          columnId={columnId}
          onReplace={onReplacePhoto}
        />
      ))}
    </section>
  );
}

function PhotoVerdict({
  photo,
  index,
  columnId,
  onReplace,
}: {
  photo: RoastPhoto;
  index: number;
  columnId: string;
  onReplace: (photo: RoastPhoto) => void;
}) {
  const trpc = useTRPC();
  const [showCaption, setShowCaption] = useState(false);
  const [lookAgainOpen, setLookAgainOpen] = useState(false);
  const [steer, setSteer] = useState("");

  const reroast = useMutation(
    trpc.roast.reroastPhoto.mutationOptions({
      onSuccess: (updated) => {
        onReplace(updated);
        setSteer("");
        setLookAgainOpen(false);
        toast.success("Took another look");
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't redo this photo"),
    }),
  );

  const submitLookAgain = () => {
    if (!steer.trim() || !photo.contentId) return;
    reroast.mutate({
      columnId,
      contentId: photo.contentId,
      steer: steer.trim(),
    });
  };

  const busy = reroast.isPending;

  return (
    <div className={cn("flex gap-3 transition-opacity", busy && "opacity-60")}>
      <div className="bg-muted relative h-24 w-20 shrink-0 overflow-hidden rounded-lg">
        {photo.url && (
          <Image
            src={photo.url}
            alt={`Photo ${index + 1}`}
            fill
            className="object-cover"
          />
        )}
        <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
          {index + 1}
        </span>
        {/* "What the AI saw" is hidden by default — peek it via this icon. */}
        {photo.caption && (
          <button
            type="button"
            onClick={() => setShowCaption((v) => !v)}
            title="What the AI saw"
            aria-label="What the AI saw"
            className="absolute right-1 bottom-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
          >
            <Info className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Badge
          className={cn(
            "mb-1 border-0 capitalize",
            KEEP_CUT_STYLES[photo.keepOrCut],
          )}
        >
          {photo.keepOrCut}
        </Badge>
        <p className="text-sm font-semibold">{photo.title}</p>
        <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
          {photo.body}
        </p>
        {showCaption && photo.caption && (
          <p className="text-muted-foreground/70 mt-1.5 text-xs italic">
            What the AI saw: {photo.caption}
          </p>
        )}

        {/* "Look again" — correct a misread or point the AI at something. Only
            offered for photos the roast can map back to a content item. */}
        {photo.contentId && (
          <div className="mt-1.5">
            {!lookAgainOpen ? (
              <button
                type="button"
                onClick={() => setLookAgainOpen(true)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <Search className="h-3 w-3" />
                Look again
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={steer}
                  onChange={(e) => setSteer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitLookAgain();
                    }
                    if (e.key === "Escape") setLookAgainOpen(false);
                  }}
                  placeholder="What's actually in it? e.g. no wine glass"
                  className="h-8 text-sm"
                  disabled={busy}
                />
                <Button
                  size="sm"
                  onClick={submitLookAgain}
                  disabled={!steer.trim() || busy}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PromptVerdict({ prompt }: { prompt: Roast["prompts"][number] }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!prompt.rewrite) return;
    void navigator.clipboard.writeText(prompt.rewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="space-y-2 rounded-xl border p-3">
      {prompt.prompt && (
        <p className="text-muted-foreground text-xs font-medium">
          {prompt.prompt}
        </p>
      )}
      {prompt.answer && (
        <p className="text-sm leading-relaxed italic">
          &ldquo;{prompt.answer}&rdquo;
        </p>
      )}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {prompt.roast}
      </p>
      {prompt.rewrite && (
        <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Try this instead</span>
            <Button size="sm" variant="outline" className="h-7" onClick={copy}>
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm leading-relaxed italic">
            &ldquo;{prompt.rewrite}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

function BioSection({
  bio,
  selected,
  onSelect,
}: {
  bio: NonNullable<Roast["bio"]>;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const rewrite = bio.rewrites[selected] ?? bio.rewrites[0];

  const copy = () => {
    if (!rewrite) return;
    void navigator.clipboard.writeText(rewrite.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="space-y-3">
      <h3 className={SECTION_HEADER}>The bio</h3>
      {bio.text && (
        <div className="rounded-xl border p-3">
          <p className="text-sm leading-relaxed italic">
            &ldquo;{bio.text}&rdquo;
          </p>
        </div>
      )}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {bio.roast}
      </p>
      {rewrite && (
        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Try this instead</span>
            <div className="flex gap-1">
              {bio.rewrites.map((r, i) => (
                <Button
                  key={r.label}
                  size="sm"
                  variant={selected === i ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => onSelect(i)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-sm leading-relaxed italic">
            &ldquo;{rewrite.text}&rdquo;
          </p>
          <Button size="sm" variant="outline" className="h-7" onClick={copy}>
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
    </section>
  );
}

function WhatToChange({ items }: { items: Roast["realTalk"] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className={SECTION_HEADER}>What to change</h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              {item.detail && (
                <p className="text-muted-foreground text-xs">{item.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ApplyCard({
  columnId,
  comparisonId,
  rewriteIndex,
  onApplied,
}: {
  columnId: string;
  comparisonId: string;
  rewriteIndex?: number;
  onApplied: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const apply = useMutation(
    trpc.roast.applyRoast.mutationOptions({
      onSuccess: (_res, variables) => {
        toast.success(
          variables.mode === "newVersion"
            ? "Created an improved version"
            : "Profile updated",
        );
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        onApplied();
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't apply changes"),
    }),
  );

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
      <p className="font-semibold">Like the notes? Let&apos;s fix it.</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Spin up an improved version with the photo order and bio applied — your
        current profile stays untouched.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1 bg-rose-600 text-white hover:bg-rose-500"
          disabled={apply.isPending}
          onClick={() =>
            apply.mutate({ columnId, mode: "newVersion", rewriteIndex })
          }
        >
          {apply.isPending && apply.variables?.mode === "newVersion" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Create improved version
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={apply.isPending}
          onClick={() =>
            apply.mutate({ columnId, mode: "inPlace", rewriteIndex })
          }
        >
          Update this profile
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Nothing changes until you confirm.
      </p>
    </section>
  );
}
