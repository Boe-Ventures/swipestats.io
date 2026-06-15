import { cn } from "@/components/ui/lib/utils";

/**
 * Golden CHART primitives — lightweight, presentational SVG/CSS chart shapes
 * plus the cohesive golden data-viz palette. (Full interactive Recharts charts
 * live in InsightsShowcase; these are the simple reusable shapes for the golden
 * surfaces.) Server-safe — no hooks, usable from server or client components.
 */

/* ---------------------------------------------------------------- palette */

/**
 * The cohesive golden data-viz palette — oklch values that sit with the
 * rose-600 accent and neutral gray surfaces.
 */
export const GOLDEN_CHART_COLORS = {
  rose: "oklch(0.586 0.253 17.585)",
  amber: "oklch(0.74 0.15 70)",
  teal: "oklch(0.62 0.1 200)",
  violet: "oklch(0.55 0.16 295)",
  slate: "oklch(0.55 0.03 250)",
} as const;

/** Ordered series colors for multi-series charts. */
export const GOLDEN_CHART_SERIES = [
  GOLDEN_CHART_COLORS.rose,
  GOLDEN_CHART_COLORS.teal,
  GOLDEN_CHART_COLORS.violet,
  GOLDEN_CHART_COLORS.amber,
  GOLDEN_CHART_COLORS.slate,
] as const;

/* ---------------------------------------------------------------- bar histogram */

export function BarHistogram({
  bars,
  height = "180px",
  className,
}: {
  bars: {
    label: string;
    /** CSS height of the bar, e.g. "78%". */
    height: string;
    muted?: boolean;
  }[];
  /** Height of the plotting area. */
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {bars.map((bar, i) => (
          <div
            key={`${bar.label}-${i}`}
            className="flex flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              className={cn(
                "w-full rounded-t",
                bar.muted
                  ? "bg-gray-200"
                  : "bg-gradient-to-b from-rose-600 to-rose-700",
              )}
              style={{ height: bar.height }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {bars.map((bar, i) => (
          <span
            key={`${bar.label}-${i}-label`}
            className="flex-1 text-center font-mono text-[10.5px] tabular-nums text-gray-500"
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- area sparkline */

let sparkGradientId = 0;

export function AreaSparkline({
  path,
  width = 220,
  height = 64,
  areaPath,
  className,
}: {
  /** The line "d" path. */
  path: string;
  width?: number;
  height?: number;
  /**
   * The filled-area "d" path (line path closed down to the baseline). When
   * omitted, only the stroked line is drawn.
   */
  areaPath?: string;
  className?: string;
}) {
  // Unique gradient id per instance so multiple sparklines don't collide.
  const gradientId = `golden-spark-${sparkGradientId++}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("block w-full", className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.586 0.253 17.585 / 0.28)" />
          <stop offset="100%" stopColor="oklch(0.586 0.253 17.585 / 0)" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path
        d={path}
        fill="none"
        stroke="var(--color-rose-600)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
