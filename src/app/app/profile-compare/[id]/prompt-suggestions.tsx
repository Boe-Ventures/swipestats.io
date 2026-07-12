"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Plus,
  Wand2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import type { SuggestMode } from "@/server/services/prompt-suggest.service";

type Suggestion = { prompt: string; answer: string; rationale: string };
type SuggestionCardData = Suggestion & { _id: string };

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

interface PromptSuggestionsProps {
  columnId: string;
  /** Add a prompt straight to the profile. Resolves true on success. */
  onAdd: (prompt: string, answer: string) => Promise<boolean>;
  /** Drop a prompt into the custom-prompt form below (prompts-only flow). */
  onUsePrompt: (prompt: string) => void;
}

export function PromptSuggestions({
  columnId,
  onAdd,
  onUsePrompt,
}: PromptSuggestionsProps) {
  const trpc = useTRPC();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const isPaid = effectiveTier === "PLUS" || effectiveTier === "ELITE";
  const [mode, setMode] = useState<SuggestMode>("full");
  const [cards, setCards] = useState<SuggestionCardData[]>([]);

  const withIds = (suggestions: Suggestion[]): SuggestionCardData[] =>
    suggestions.map((s) => ({ ...s, _id: newId() }));

  const suggestMutation = useMutation(
    trpc.promptSuggest.suggest.mutationOptions({
      onSuccess: (data) => setCards(withIds(data.suggestions)),
      onError: (error) =>
        toast.error(error.message || "Couldn't generate suggestions"),
    }),
  );

  const isFull = mode === "full";

  return (
    <div className="space-y-3 rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50/70 to-white p-3 dark:border-rose-900/40 dark:from-rose-950/20 dark:to-transparent">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">Suggest with AI</span>
        </div>

        {/* Mode toggle: full prompt+answer vs prompt shells only */}
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[mode]}
          onValueChange={(values) => {
            const v = values[0];
            if (!v || v === mode) return;
            // Cards carry mode-specific shape (answers in "full"), so drop
            // stale ones when switching — the next Generate matches the toggle.
            setMode(v as SuggestMode);
            setCards([]);
          }}
          className="bg-background"
        >
          <ToggleGroupItem value="full" className="text-xs">
            Prompt + answer
          </ToggleGroupItem>
          <ToggleGroupItem value="promptsOnly" className="text-xs">
            Just prompts
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <p className="text-muted-foreground text-xs">
        {isFull
          ? "Personalised prompt + answer ideas based on your app, bio and existing prompts."
          : "Prompt ideas that fit you — pick one and write your own answer."}
      </p>

      <Button
        size="sm"
        onClick={() =>
          isPaid
            ? suggestMutation.mutate({ columnId, mode })
            : openUpgradeModal({ feature: "aiRoast" })
        }
        disabled={isPaid && suggestMutation.isPending}
        className="w-full bg-rose-600 text-white hover:bg-rose-500"
      >
        {!isPaid ? (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade to unlock
          </>
        ) : suggestMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Thinking…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            {cards.length > 0 ? "Regenerate all" : "Generate ideas"}
          </>
        )}
      </Button>

      {/* Loading skeletons sized to the cards so the reveal doesn't jump */}
      {suggestMutation.isPending && cards.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card space-y-2 rounded-lg border p-3">
              <Skeleton className="h-3 w-1/2" />
              {isFull && <Skeleton className="h-3 w-5/6" />}
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {cards.length > 0 && (
        <div className="space-y-2">
          {cards.map((card) => (
            <SuggestionCard
              key={card._id}
              columnId={columnId}
              mode={mode}
              card={card}
              onAdd={async () => {
                const ok = await onAdd(card.prompt, card.answer);
                if (ok) setCards((cs) => cs.filter((c) => c._id !== card._id));
              }}
              onUse={() => onUsePrompt(card.prompt)}
              onReplace={(next) =>
                setCards((cs) =>
                  cs.map((c) =>
                    c._id === card._id ? { ...next, _id: c._id } : c,
                  ),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SuggestionCardProps {
  columnId: string;
  mode: SuggestMode;
  card: SuggestionCardData;
  onAdd: () => Promise<void> | void;
  onUse: () => void;
  onReplace: (next: Suggestion) => void;
}

function SuggestionCard({
  columnId,
  mode,
  card,
  onAdd,
  onUse,
  onReplace,
}: SuggestionCardProps) {
  const trpc = useTRPC();
  const [steerOpen, setSteerOpen] = useState(false);
  const [steer, setSteer] = useState("");
  const [adding, setAdding] = useState(false);
  const isFull = mode === "full";

  const regenerateMutation = useMutation(
    trpc.promptSuggest.regenerate.mutationOptions({
      onSuccess: (data) => {
        onReplace(data.suggestion);
        setSteer("");
        setSteerOpen(false);
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't regenerate this one"),
    }),
  );

  const runRegenerate = () => {
    if (!steer.trim()) return;
    regenerateMutation.mutate({
      columnId,
      mode,
      current: { prompt: card.prompt, answer: card.answer },
      steer: steer.trim(),
    });
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      await onAdd();
    } finally {
      setAdding(false);
    }
  };

  const busy = regenerateMutation.isPending;

  return (
    <div
      className={cn(
        "bg-card space-y-2 rounded-lg border p-3 transition-opacity",
        busy && "opacity-60",
      )}
    >
      <p className="text-sm leading-snug font-medium">{card.prompt}</p>
      {isFull && card.answer && (
        <p className="text-sm leading-relaxed italic">
          &ldquo;{card.answer}&rdquo;
        </p>
      )}
      {card.rationale && (
        <p className="text-muted-foreground text-xs">{card.rationale}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {isFull ? (
          <Button size="sm" onClick={handleAdd} disabled={adding || busy}>
            {adding ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Add
          </Button>
        ) : (
          <Button size="sm" onClick={onUse} disabled={busy}>
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            Use this prompt
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSteerOpen((v) => !v)}
          disabled={busy}
          className="text-muted-foreground"
        >
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          Tweak
        </Button>
      </div>

      {/* Steering input — free-text direction for regenerating this one */}
      {steerOpen && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            autoFocus
            value={steer}
            onChange={(e) => setSteer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runRegenerate();
              }
            }}
            placeholder={
              isFull
                ? "e.g., funnier, or mention I love climbing"
                : "e.g., more about my career"
            }
            className="h-8 text-sm"
            disabled={busy}
          />
          <Button
            size="sm"
            onClick={runRegenerate}
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
  );
}
