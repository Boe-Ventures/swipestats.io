/**
 * Golden design-system primitives that span the app + blog surfaces.
 * (Marketing primitives live in src/app/(marketing)/_components/marketing-ui.)
 */
export {
  AppPageHeader,
  Panel,
  PanelHeader,
  HeroStats,
  CohortBadge,
  StatTiles,
} from "./app";
export { Funnel, PercentileBars } from "./data-viz";
export {
  GOLDEN_CHART_COLORS,
  GOLDEN_CHART_SERIES,
  BarHistogram,
  AreaSparkline,
} from "./charts";
export { Prose, Tldr, PullStat } from "./blog";
export { LockedValue, UpsellCard } from "./premium-gate";
export { ErrorState } from "./error-state";
export {
  GoldenAppHeader,
  GoldenSidebar,
  DEFAULT_GOLDEN_NAV,
} from "./app-shell";
export type { GoldenNavKey, GoldenNavLink } from "./app-shell";
