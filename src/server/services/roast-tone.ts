/**
 * Shared roast "voice" primitives, used by BOTH roast flows:
 *  - the stats roast (roast.service.ts) — roasts ProfileMeta numbers, and
 *  - the vision roast (profile-roast.service.ts) — roasts photos/prompts/bio.
 *
 * Storage stays separate (the two roasts model different things), but the tone
 * vocabulary lives here so the two can't drift apart. Provider display names +
 * per-app guidance live in `providers.ts` (`getProviderMeta`).
 */

export const ROAST_TONES = ["helpful", "mild", "spicy"] as const;
export type RoastTone = (typeof ROAST_TONES)[number];

/** Tone is pure prompt injection — same schema, different voice + harshness. */
export const TONE_PERSONA: Record<RoastTone, string> = {
  helpful:
    "a supportive dating coach — warm and encouraging, but specific and honest. Lead with what works, then give concrete fixes. No cruelty.",
  mild: "a witty friend playfully teasing them over drinks — light jabs, clearly affectionate, never actually mean.",
  spicy:
    "a savage roast comedian 🌶️ — brutally funny and unfiltered. Go hard for the laugh, but stay clever, not hateful, bigoted, or body-shaming.",
};
