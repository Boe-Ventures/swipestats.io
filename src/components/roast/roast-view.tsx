"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { CircleDot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/lib/utils";

/** keep / maybe / cut → badge colour. Shared so the dialog + share page agree. */
export const KEEP_CUT_STYLES: Record<string, string> = {
  keep: "bg-green-500/15 text-green-600 dark:text-green-400",
  maybe: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  cut: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export const SECTION_HEADER =
  "text-muted-foreground text-xs font-semibold tracking-widest uppercase";

/**
 * The fields `RoastView` renders — the read-only intersection of the dialog's
 * `getProfileRoast` and the share page's `getPublicProfileRoast` (both produced
 * by `hydrateRoast`, so they agree structurally). Typed loosely so either
 * caller's richer object satisfies it.
 */
export interface RoastViewData {
  overall: { tagline: string; headline: string; verdict: string };
  photos: {
    contentId: string | null;
    /** null when the roast was shared without the profile preview. */
    url: string | null;
    keepOrCut: "keep" | "maybe" | "cut";
    title: string;
    body: string;
  }[];
  prompts: {
    contentId: string | null;
    prompt: string | null;
    answer: string | null;
    roast: string;
    rewrite: string;
  }[];
  bio: { roast: string; text: string | null } | null;
  realTalk: { title: string; detail?: string }[];
}

/**
 * Pure, read-only presentation of a profile roast: hero, photo verdicts, prompt
 * verdicts, bio and "what to change". The share page renders this directly; the
 * profile-compare dialog layers its own interactive affordances (re-roast,
 * "look again", copy, apply) and is intentionally NOT routed through here.
 *
 * Photo tiles keep their verdict text even when the image is withheld (roast
 * shared without the preview) — the tile falls back to a numbered placeholder.
 */
export function RoastView({
  data,
  footer,
}: {
  data: RoastViewData;
  /** Optional slot below the roast (e.g. the share page's "roast yours" CTA). */
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 text-white sm:p-6">
        <div className="space-y-3">
          <Badge
            variant="secondary"
            className="border-0 bg-white/10 font-medium text-white"
          >
            {data.overall.tagline}
          </Badge>
          <p className="font-serif text-2xl leading-snug italic sm:text-3xl">
            {data.overall.headline}
          </p>
          <p className="text-sm text-zinc-300">{data.overall.verdict}</p>
        </div>
      </div>

      {/* Photo verdicts */}
      {data.photos.length > 0 && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>Photo verdicts</h3>
          {data.photos.map((p, i) => (
            <div key={p.contentId ?? i} className="flex gap-3">
              <div className="bg-muted relative h-24 w-20 shrink-0 overflow-hidden rounded-lg">
                {p.url && (
                  <Image
                    src={p.url}
                    alt={`Photo ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                )}
                <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <Badge
                  className={cn(
                    "mb-1 border-0 capitalize",
                    KEEP_CUT_STYLES[p.keepOrCut],
                  )}
                >
                  {p.keepOrCut}
                </Badge>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Prompt verdicts */}
      {data.prompts.length > 0 && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>Prompts</h3>
          {data.prompts.map((p, i) => (
            <div
              key={p.contentId ?? i}
              className="space-y-2 rounded-xl border p-3"
            >
              {p.prompt && (
                <p className="text-muted-foreground text-xs font-medium">
                  {p.prompt}
                </p>
              )}
              {p.answer && (
                <p className="text-sm leading-relaxed italic">
                  &ldquo;{p.answer}&rdquo;
                </p>
              )}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {p.roast}
              </p>
              {p.rewrite && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <span className="text-sm font-semibold">Try this instead</span>
                  <p className="mt-1 text-sm leading-relaxed italic">
                    &ldquo;{p.rewrite}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Bio */}
      {data.bio && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>The bio</h3>
          {data.bio.text && (
            <div className="rounded-xl border p-3">
              <p className="text-sm leading-relaxed italic">
                &ldquo;{data.bio.text}&rdquo;
              </p>
            </div>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {data.bio.roast}
          </p>
        </section>
      )}

      {/* What to change */}
      {data.realTalk.length > 0 && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>What to change</h3>
          <ul className="space-y-2.5">
            {data.realTalk.map((item, i) => (
              <li key={i} className="flex gap-2.5">
                <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.detail && (
                    <p className="text-muted-foreground text-xs">
                      {item.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {footer}
    </div>
  );
}
