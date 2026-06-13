"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Flame, Loader2, type LucideIcon } from "lucide-react";

import { cn } from "@/components/ui/lib/utils";

export interface LoadingStep {
  label: string;
  icon: LucideIcon;
}

/**
 * The roast "loading theater" — the wait is the entertainment. A dark hero with
 * a pulsing flame, a rotating status line, and a sequential analysis tracker.
 * Shared verbatim by the profile-compare roast dialog and the marketing stats
 * roast; the bits that legitimately differ (the rotating copy, the tracker
 * steps, the skeleton, the timings) are props.
 */
export function RoastLoadingTheater({
  lines,
  steps,
  active = true,
  staticLine = "Loading your roast…",
  lineIntervalMs = 2600,
  stepIntervalMs = 5000,
  skeleton,
}: {
  /** Rotating status copy (cycled while `active`). */
  lines: readonly string[];
  /** Analysis tracker steps (only shown while `active`). */
  steps: readonly LoadingStep[];
  /**
   * True while actively generating: rotate `lines` + advance the tracker. False
   * = "loading an existing roast" — a quick fetch, so show `staticLine` and no
   * tracker.
   */
  active?: boolean;
  staticLine?: string;
  lineIntervalMs?: number;
  stepIntervalMs?: number;
  /** Skeleton preview under the hero so the reveal lands without a jump. */
  skeleton?: ReactNode;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const lineTimer = setInterval(
      () => setLineIdx((i) => (i + 1) % lines.length),
      lineIntervalMs,
    );
    // Pace the tracker to a realistic roast so it doesn't blow through every
    // step in the first few seconds and then sit.
    const stepTimer = setInterval(
      () => setStep((s) => Math.min(s + 1, steps.length - 1)),
      stepIntervalMs,
    );
    return () => {
      clearInterval(lineTimer);
      clearInterval(stepTimer);
    };
  }, [active, lines.length, steps.length, lineIntervalMs, stepIntervalMs]);

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
          key={active ? lineIdx : "static"}
          className="animate-in fade-in slide-in-from-bottom-1 mx-auto mt-5 flex min-h-[3.5rem] max-w-sm items-center justify-center font-serif text-xl text-white italic duration-500 sm:text-2xl"
        >
          {active ? lines[lineIdx] : staticLine}
        </p>

        {/* analysis tracker */}
        {active && (
          <div className="mx-auto mt-6 flex max-w-sm items-start justify-between">
            {steps.map((s, i) => {
              const done = i < step;
              const isActive = i === step;
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
                        done || isActive ? "bg-rose-500" : "bg-white/15",
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
                      isActive && "border-rose-400 text-rose-300",
                      !done && !isActive && "border-white/15 text-white/40",
                    )}
                  >
                    {isActive ? (
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
                      done || isActive ? "text-white" : "text-white/40",
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

      {skeleton}
    </div>
  );
}
