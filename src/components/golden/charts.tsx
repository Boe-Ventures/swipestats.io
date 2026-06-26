/**
 * Golden CHART theming — the cohesive data-viz palette for the golden surfaces.
 *
 * There are intentionally NO hand-rolled chart components here: charts are the
 * real, data-driven Recharts components (see InsightsShowcase and the insights
 * `_components/charts`). This module just provides the golden colour palette to
 * theme them with, so the golden look comes from the originals, not fakes.
 */

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
