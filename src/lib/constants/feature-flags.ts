/**
 * Global feature kill-switches.
 *
 * These gate whether a feature is exposed at all, independent of per-user
 * subscription tier (see `gating.service.ts` for tier-based access).
 * Flip to `true` when the feature is ready to ship.
 */

/**
 * AI Roast: data-driven AI roast of a user's dating-app stats.
 * While `false`, the insights-page entry point is hidden and the
 * `roast.generate` endpoint is disabled, even for PLUS/ELITE users.
 */
export const ROAST_ENABLED = true;
