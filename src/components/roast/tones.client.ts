/**
 * The client-facing roast "tone dial" (label / emoji / blurb), shared by the
 * profile-compare roast dialog and the marketing stats-roast dialog so the two
 * can't drift (the `helpful` blurb already had — "Constructive," vs "Honest,").
 *
 * Distinct from the SERVER tone personas in `roast-tone.ts` (`TONE_PERSONA`),
 * which are the prompt-injection voice strings. The tone KEYS match the server
 * enum (`ROAST_TONES`: helpful / mild / spicy).
 */
export const TONES = [
  {
    key: "helpful",
    label: "Helpful",
    emoji: "💡",
    blurb: "Constructive, encouraging notes.",
  },
  {
    key: "mild",
    label: "Mild",
    emoji: "😏",
    blurb: "Playful jabs, mostly friendly.",
  },
  {
    key: "spicy",
    label: "Spicy",
    emoji: "🌶️",
    blurb: "No mercy. Bring tissues.",
  },
] as const;

export type Tone = (typeof TONES)[number]["key"];
