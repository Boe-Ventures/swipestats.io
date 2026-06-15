import { cn } from "@/components/ui/lib/utils";

/**
 * Golden DATA-VIZ primitives — lightweight, presentational chart shapes.
 * (Full interactive charts live in InsightsShowcase / Recharts; these are the
 * simple reusable shapes from golden.css: the dating funnel and percentile
 * comparison bars.) Server-safe.
 */

/* ---------------------------------------------------------------- funnel */

const FUNNEL_COLORS = [
  "var(--color-rose-600)",
  "oklch(0.62 0.1 200)",
  "oklch(0.55 0.16 295)",
  "var(--color-gray-400)",
];

export function Funnel({
  steps,
  className,
}: {
  steps: {
    label: string;
    value: React.ReactNode;
    /** CSS width of the bar, e.g. "100%", "62%". */
    width: string;
    drop?: string;
    color?: string;
  }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {steps.map((s, i) => (
        <div key={s.label}>
          <div
            className="flex h-[46px] items-center justify-between rounded-[9px] px-4 font-semibold text-white"
            style={{
              width: s.width,
              background: s.color ?? FUNNEL_COLORS[i % FUNNEL_COLORS.length],
            }}
          >
            <span className="text-[13.5px]">{s.label}</span>
            <span className="font-mono text-[15px] tabular-nums">{s.value}</span>
          </div>
          {s.drop && (
            <div className="mt-1 pl-0.5 font-mono text-[11px] text-gray-400">
              {s.drop}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- percentile bars */

export function PercentileBars({
  rows,
  className,
}: {
  rows: {
    name: string;
    /** CSS width of the fill, e.g. "89%". */
    width: string;
    value: React.ReactNode;
    color?: string;
  }[];
  className?: string;
}) {
  return (
    <div className={className}>
      {rows.map((r, i) => (
        <div
          key={r.name}
          className={cn(
            "grid grid-cols-[120px_1fr_auto] items-center gap-3.5 py-[9px]",
            i > 0 && "border-t border-gray-200",
          )}
        >
          <span className="text-[13.5px] font-semibold text-gray-800">
            {r.name}
          </span>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: r.width, background: r.color ?? "var(--color-rose-600)" }}
            />
          </div>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-gray-900">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
