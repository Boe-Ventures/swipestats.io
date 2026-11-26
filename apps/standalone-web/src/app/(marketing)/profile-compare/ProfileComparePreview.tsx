"use client";

import { useState } from "react";
import { ArrowRight, Camera, Check, Mountain, Users } from "lucide-react";

const photos = [
  {
    label: "A clear portrait",
    short: "Portrait",
    icon: Camera,
    color: "bg-rose-100 text-rose-900",
  },
  {
    label: "Out on a hike",
    short: "Outdoors",
    icon: Mountain,
    color: "bg-sky-100 text-sky-900",
  },
  {
    label: "With your people",
    short: "Friends",
    icon: Users,
    color: "bg-amber-100 text-amber-900",
  },
] as const;

export function ProfileComparePreview() {
  const [lead, setLead] = useState(0);
  const selected = photos[lead]!;
  const LeadIcon = selected.icon;

  return (
    <div className="border-border bg-card min-w-0 rounded-[28px] border p-5 shadow-xl shadow-rose-950/5 sm:p-7">
      <div className="border-border flex items-center justify-between gap-3 border-b pb-5">
        <span className="text-sm font-semibold">
          Your next first impression
        </span>
        <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 font-mono text-[10px] text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          DEMO
        </span>
      </div>
      <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 sm:gap-5">
        <div className="border-border min-w-0 rounded-2xl border p-3 sm:p-4">
          <p className="text-muted-foreground text-xs font-medium">Version A</p>
          <div className="mt-3 flex aspect-[4/5] flex-col items-center justify-center gap-4 rounded-xl bg-amber-100 px-2 text-amber-900">
            <Users className="size-12 sm:size-16" strokeWidth={1} aria-hidden />
            <span className="text-center text-xs font-medium">
              With your people
            </span>
          </div>
          <p className="text-muted-foreground mt-4 text-[11px]">
            A typical Sunday
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            Friends, food, and something outdoors.
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-rose-300 bg-rose-50/30 p-3 sm:p-4 dark:border-rose-800 dark:bg-rose-950/20">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Version B
          </p>
          <div
            className={`mt-3 flex aspect-[4/5] flex-col items-center justify-center gap-4 rounded-xl px-2 ${selected.color}`}
          >
            <LeadIcon
              className="size-12 sm:size-16"
              strokeWidth={1}
              aria-hidden
            />
            <span
              className="text-center text-xs font-medium"
              aria-live="polite"
            >
              {selected.label}
            </span>
          </div>
          <p className="text-muted-foreground mt-4 text-[11px]">
            A typical Sunday
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            A trail with a view. A bakery on the way home.
          </p>
        </div>
      </div>
      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">
          Try a different opening photo
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <button
              key={photo.short}
              type="button"
              aria-pressed={lead === index}
              onClick={() => setLead(index)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${lead === index ? "border-rose-600 bg-rose-600 text-white" : "border-border bg-background text-foreground hover:border-rose-400"}`}
            >
              {lead === index && <Check className="size-3.5" aria-hidden />}
              {photo.short}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="border-border text-muted-foreground mt-5 flex items-start gap-2 border-t pt-4 text-xs leading-relaxed">
        <ArrowRight className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Illustrative preview. In the editor, use your own photos, prompts, and
          bio.
        </p>
      </div>
    </div>
  );
}
