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
  Share2,
  ExternalLink,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { TONES, type Tone } from "@/components/roast/tones.client";
import {
  RoastLoadingTheater,
  type LoadingStep,
} from "@/components/roast/roast-loading-theater";
import { KEEP_CUT_STYLES, SECTION_HEADER } from "@/components/roast/roast-view";
import {
  DEFAULT_PROFILE_ROAST_LENS,
  PROFILE_ROAST_LENSES,
  PROFILE_ROAST_LENS_KEYS,
  type ProfileRoastLensKey,
} from "@/lib/ai/profile-roast-lenses";

type Roast = NonNullable<RouterOutputs["roast"]["getProfileRoast"]>;
type RoastPhoto = Roast["photos"][number];
type ProfileRoastLens = (typeof PROFILE_ROAST_LENSES)[ProfileRoastLensKey];

const CREATOR_LENS_TONE: Tone = "mild";
const ROAST_STAGE_CLASS = "min-h-[300px]";

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
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const isPaid = effectiveTier === "PLUS" || effectiveTier === "ELITE";

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

  // When re-roasting, swap the result for the tone picker again (no top pill
  // row). Reset whenever the dialog (re)opens so it never opens mid-pick.
  const [pickingTone, setPickingTone] = useState(false);
  const [selectedLens, setSelectedLens] = useState<ProfileRoastLensKey>(
    DEFAULT_PROFILE_ROAST_LENS,
  );
  const isCreatorLens = selectedLens !== DEFAULT_PROFILE_ROAST_LENS;
  useEffect(() => {
    if (open) setPickingTone(false);
  }, [open]);

  const handleReplacePhoto = (photo: RoastPhoto) => {
    if (!photo.contentId) return;
    setPhotoOverrides((prev) => ({ ...prev, [photo.contentId!]: photo }));
  };

  const roastQueryOptions = trpc.roast.getProfileRoast.queryOptions(
    { columnId, lens: selectedLens },
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
      onError: (error) =>
        toast.error(error.message || "Failed to delete roast"),
    }),
  );

  const mutationLens =
    roastMutation.variables?.lens ?? DEFAULT_PROFILE_ROAST_LENS;
  const mutationBelongsToSelectedLens = mutationLens === selectedLens;
  const roast: Roast | null =
    (mutationBelongsToSelectedLens ? roastMutation.data : null) ??
    roastQuery.data ??
    null;
  const activeTone =
    (mutationBelongsToSelectedLens ? roastMutation.variables?.tone : null) ??
    roast?.tone;
  const reRoastTone = (activeTone ?? "mild") as Tone;
  const isGenerating = roastMutation.isPending && mutationBelongsToSelectedLens;
  const isLoadingExisting = roastQuery.isLoading && !roast;

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

  // AI Roast is a PLUS/ELITE feature. With no global kill-switch anymore, a free
  // user would otherwise just hit a FORBIDDEN error toast — so show an upgrade
  // card instead (a pre-existing roast from a prior subscription still shows
  // read-only; runRoast guards re-rolls).
  const showUpgrade = !isPaid && !roast;

  const runRoast = (tone: Tone) => {
    if (!isPaid) {
      openUpgradeModal({ feature: "aiRoast" });
      return;
    }
    // A full re-roast replaces every verdict, so drop any per-photo corrections.
    setPhotoOverrides({});
    roastMutation.mutate({ columnId, tone, lens: selectedLens });
  };

  // Publish the roast (idempotent) and copy its public share link.
  const publishMutation = useMutation(
    trpc.roast.publishProfileRoast.mutationOptions({
      onError: (error) =>
        toast.error(error.message || "Couldn't create a share link"),
    }),
  );

  // Sharing a roast shares the roasted profile (verdicts, photos, preview) —
  // never the parent comparison, which stays the owner's internal view.
  const handleShare = async () => {
    const { shareKey } = await publishMutation.mutateAsync({
      columnId,
      lens: selectedLens,
    });
    if (!shareKey) return;
    const url = `${window.location.origin}/share/profile-roast/${shareKey}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
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

        {!notEnoughToRoast && (
          <LensSwitch
            selected={selectedLens}
            onSelect={(lens) => {
              setSelectedLens(lens);
              setPickingTone(false);
              setPhotoOverrides({});
            }}
          />
        )}

        {/* Upgrade — free user, no roast: surface the paywall, not an error */}
        {showUpgrade && (
          <RoastUpgradeCard
            onUpgrade={() => openUpgradeModal({ feature: "aiRoast" })}
          />
        )}

        {/* Empty — not enough material to roast yet */}
        {notEnoughToRoast && !showUpgrade && (
          <RoastEmptyState
            displayName={displayName}
            hasBio={hasBio}
            onAddContent={onAddContent}
          />
        )}

        {/* Default roast owns heat. Creator lenses are their own voice/rubric. */}
        {!isCreatorLens &&
          (isIdle || pickingTone) &&
          !showUpgrade &&
          !isGenerating &&
          !isLoadingExisting &&
          !notEnoughToRoast && (
            <RoastIdleState
              displayName={displayName}
              isBusy={isGenerating}
              onPick={(tone) => {
                setPickingTone(false);
                runRoast(tone);
              }}
            />
          )}

        {isCreatorLens &&
          (isIdle || pickingTone) &&
          !showUpgrade &&
          !isGenerating &&
          !isLoadingExisting &&
          !notEnoughToRoast && (
            <CreatorLensIdleState
              lens={selectedLens}
              isBusy={isGenerating}
              onRun={() => {
                setPickingTone(false);
                runRoast(CREATOR_LENS_TONE);
              }}
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
        {roast && !isGenerating && !pickingTone && (
          <div className="min-w-0 space-y-6">
            <HeroCard
              overall={roast.overall}
              lens={selectedLens}
              isGenerating={isGenerating}
              onReRoast={() => {
                if (isCreatorLens) {
                  runRoast(CREATOR_LENS_TONE);
                  return;
                }
                setPickingTone(true);
              }}
              onShare={() => void handleShare()}
              isSharing={publishMutation.isPending}
              onDeleteRoast={
                isDev
                  ? () =>
                      deleteRoastMutation.mutate({
                        columnId,
                        lens: selectedLens,
                      })
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
                lens={selectedLens}
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
              lens={selectedLens}
              rewriteIndex={roast.bio ? rewriteIndex : undefined}
              onApplied={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LensSwitch({
  selected,
  onSelect,
}: {
  selected: ProfileRoastLensKey;
  onSelect: (lens: ProfileRoastLensKey) => void;
}) {
  return (
    <section>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {PROFILE_ROAST_LENS_KEYS.map((key) => {
          const lens = PROFILE_ROAST_LENSES[key];
          const active = key === selected;
          return (
            <div
              key={key}
              className={cn(
                "flex min-h-48 w-[244px] shrink-0 snap-start flex-col rounded-xl border p-3 transition-colors sm:w-[260px]",
                active
                  ? "border-rose-300 bg-rose-50 text-rose-950 shadow-sm dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-50"
                  : "bg-background hover:bg-muted/60",
              )}
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(key)}
                className="focus-visible:ring-ring -m-1 flex flex-1 flex-col rounded-lg p-1 text-left focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="flex items-start gap-2">
                  <LensAvatar lens={lens} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {lens.creatorName}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {lens.handle ?? lens.label}
                    </span>
                  </span>
                  {active && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  )}
                </span>

                <span className="mt-3 block text-xs leading-snug">
                  {lens.promise}
                </span>
                <span className="text-muted-foreground mt-2 block text-xs leading-snug">
                  {lens.bestFor}
                </span>

                <span className="mt-3 flex flex-wrap gap-1">
                  {lens.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              </button>

              {lens.profileUrl && (
                <a
                  href={lens.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium transition-colors"
                >
                  {lens.handle ? "View profile" : "Visit site"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LensAvatar({ lens }: { lens: ProfileRoastLens }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-500/15 text-xs font-bold text-violet-700 dark:text-violet-200">
      {lens.imageSrc ? (
        <Image
          src={lens.imageSrc}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
        />
      ) : (
        lens.avatar
      )}
    </span>
  );
}

/* ---------------------------------------------------------------- *
 * Loading — the wait is the entertainment: dark hero matching the
 * result, a pulsing flame, rotating tone-aware status lines, and a
 * sequential analysis tracker.
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

const LOADING_STEPS: LoadingStep[] = [
  { label: "Photos", icon: Images },
  { label: "Bio", icon: AlignLeft },
  { label: "Prompts", icon: MessageSquareText },
  { label: "Verdict", icon: Trophy },
];

function RoastLoadingState({
  tone,
  mode,
}: {
  tone: Tone;
  mode: "roasting" | "loading";
}) {
  return (
    <RoastLoadingTheater
      // Loading an existing roast is a quick fetch — no theater, just a label.
      active={mode === "roasting"}
      lines={LOADING_LINES[tone] ?? LOADING_LINES.mild}
      steps={LOADING_STEPS}
      // Pace the tracker to a realistic roast (~15s to reach the verdict).
      stepIntervalMs={5000}
      cardClassName={cn(ROAST_STAGE_CLASS, "flex flex-col justify-center")}
    />
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

function CreatorLensIdleState({
  lens,
  isBusy,
  onRun,
}: {
  lens: ProfileRoastLensKey;
  isBusy: boolean;
  onRun: () => void;
}) {
  const lensMeta = PROFILE_ROAST_LENSES[lens];

  return (
    <Empty
      className={cn(
        ROAST_STAGE_CLASS,
        "justify-start border-0 px-0 pt-10 pb-6 md:px-0 md:pt-10 md:pb-6",
      )}
    >
      <EmptyHeader>
        <div className="relative mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-rose-600 shadow-lg shadow-rose-500/30">
          {lensMeta.imageSrc ? (
            <Image
              src={lensMeta.imageSrc}
              alt=""
              fill
              sizes="56px"
              className="rounded-2xl object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-white">
              {lensMeta.avatar}
            </span>
          )}
          <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-rose-400/50" />
        </div>
        <EmptyTitle>{lensMeta.shortLabel} roast</EmptyTitle>
        <EmptyDescription>
          Run this profile through {lensMeta.creatorName}&apos;s rubric. The
          creator lens is the angle.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          disabled={isBusy}
          onClick={onRun}
          className="bg-rose-600 text-white hover:bg-rose-500"
        >
          {isBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Roasting…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Run {lensMeta.shortLabel} roast
            </>
          )}
        </Button>
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

function HeroCard({
  overall,
  lens,
  isGenerating,
  onReRoast,
  onShare,
  isSharing,
  onDeleteRoast,
  isDeleting,
}: {
  overall: Roast["overall"];
  lens: ProfileRoastLensKey;
  isGenerating: boolean;
  onReRoast: () => void;
  /** Publishes the roast (verdicts + photos + profile preview) and copies the link. */
  onShare: () => void;
  isSharing?: boolean;
  /** Dev-only: present only outside production. */
  onDeleteRoast?: () => void;
  isDeleting?: boolean;
}) {
  const lensMeta = PROFILE_ROAST_LENSES[lens];
  const isCreatorLens = lens !== DEFAULT_PROFILE_ROAST_LENS;

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 text-white sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <HeroLensAvatar lens={lensMeta} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
            Rubric by
          </p>
          <p className="truncate text-sm font-semibold">
            {lensMeta.profileUrl ? (
              <a
                href={lensMeta.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1 hover:text-zinc-200"
              >
                <span className="truncate">
                  {lensMeta.creatorName}
                  {lensMeta.handle ? (
                    <span className="text-zinc-400"> · {lensMeta.handle}</span>
                  ) : null}
                </span>
                <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
              </a>
            ) : (
              <>
                {lensMeta.creatorName}
                {lensMeta.handle ? (
                  <span className="text-zinc-400"> · {lensMeta.handle}</span>
                ) : null}
              </>
            )}
          </p>
        </div>
      </div>
      <div className="space-y-3 text-center sm:text-left">
        <Badge
          variant="secondary"
          className="border-0 bg-white/10 font-medium text-white"
        >
          {overall.tagline}
        </Badge>
        <p className="font-serif text-2xl leading-snug italic sm:text-3xl">
          {overall.headline}
        </p>
        <p className="text-sm text-zinc-300">{overall.verdict}</p>
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
          {isCreatorLens ? "Run again" : "Re-roast"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          disabled={isSharing}
          onClick={onShare}
        >
          {isSharing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-1.5 h-4 w-4" />
          )}
          {isSharing ? "Sharing…" : "Share"}
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

function HeroLensAvatar({ lens }: { lens: ProfileRoastLens }) {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold">
      {lens.imageSrc ? (
        <Image
          src={lens.imageSrc}
          alt=""
          fill
          sizes="32px"
          className="object-cover"
        />
      ) : (
        lens.avatar
      )}
    </span>
  );
}

function PhotoVerdicts({
  photos,
  columnId,
  lens,
  onReplacePhoto,
}: {
  photos: RoastPhoto[];
  columnId: string;
  lens: ProfileRoastLensKey;
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
          lens={lens}
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
  lens,
  onReplace,
}: {
  photo: RoastPhoto;
  index: number;
  columnId: string;
  lens: ProfileRoastLensKey;
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
        // Keep the fresh caption visible — it's the proof the AI actually
        // looked again and saw what the user said it should.
        setShowCaption(true);
        toast.success("Took another look");
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't redo this photo"),
    }),
  );

  // The caption is what the user is correcting against, so always reveal it
  // alongside the input — you can't fix a misread you can't see.
  const openLookAgain = () => {
    setShowCaption(true);
    setLookAgainOpen(true);
  };

  const submitLookAgain = () => {
    if (!steer.trim() || !photo.contentId) return;
    reroast.mutate({
      columnId,
      contentId: photo.contentId,
      steer: steer.trim(),
      lens,
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
            {photo.contentId && !lookAgainOpen && (
              <button
                type="button"
                onClick={openLookAgain}
                className="text-muted-foreground hover:text-foreground ml-1.5 font-medium not-italic underline underline-offset-2 transition-colors"
              >
                Wrong?
              </button>
            )}
          </p>
        )}

        {/* "Look again" — correct a misread or point the AI at something. Only
            offered for photos the roast can map back to a content item. */}
        {photo.contentId && (
          <div className="mt-1.5">
            {!lookAgainOpen ? (
              <button
                type="button"
                onClick={openLookAgain}
                title="Correct what the AI saw and redo this photo's verdict"
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
                  maxLength={500}
                  placeholder={`Correct it — e.g. "that's a shaka sign, not a wine glass"`}
                  className="h-8 text-sm"
                  disabled={busy}
                />
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={submitLookAgain}
                  disabled={!steer.trim() || busy}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Redo
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

function RoastUpgradeCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="space-y-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 text-center dark:border-rose-900/40 dark:from-rose-950/30 dark:to-transparent">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50">
        <Flame className="h-6 w-6 text-rose-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">AI Roast is a SwipeStats+ feature</h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          A brutally honest, data-driven roast of this profile — photo-by-photo
          verdicts, a sharper bio, and one-tap fixes.
        </p>
      </div>
      <Button
        className="bg-rose-600 text-white hover:bg-rose-500"
        onClick={onUpgrade}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Upgrade to unlock 🔥
      </Button>
    </div>
  );
}

function ApplyCard({
  columnId,
  comparisonId,
  lens,
  rewriteIndex,
  onApplied,
}: {
  columnId: string;
  comparisonId: string;
  lens: ProfileRoastLensKey;
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
            apply.mutate({ columnId, mode: "newVersion", rewriteIndex, lens })
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
            apply.mutate({ columnId, mode: "inPlace", rewriteIndex, lens })
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
