/**
 * Single source of truth for the model IDs the AI services run on.
 *
 * The actual model used is also recorded per-row in `ai_output.model`, so this
 * registry is purely config-DRY: it keeps the spelling (and any future model
 * bump) in one place instead of scattered string literals that quietly drift.
 */
export const AI_MODELS = {
  /** Sonnet: vision + sharper reasoning/comedy (roasts, photo analysis, compose). */
  sonnet: "claude-sonnet-4-6",
  /** Haiku: cheap text-only work (prompt suggestions). */
  haiku: "claude-haiku-4-5-20251001",
} as const;

export type AiModelId = (typeof AI_MODELS)[keyof typeof AI_MODELS];
