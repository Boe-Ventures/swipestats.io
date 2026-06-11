import type { DataProvider } from "@/server/db/schema";

/**
 * One keyed source of truth for per-provider prompt metadata used by the AI
 * services: the display name plus the app-specific guidance the roast, compose
 * and prompt-suggest flows each inject into their prompts.
 *
 * This is a PURE data + types module (type-only import from schema.ts) so it
 * stays free of server-only deps. It is the prompt-flavour cousin of the client
 * `provider-config.ts` (icons/brand colours) — kept separate on purpose; the
 * two only overlap on `name`.
 *
 * Previously these lived as four separate maps (`PROVIDER_NAME`, `PROVIDER_VIBE`,
 * `PROVIDER_GUIDANCE`, `PROVIDER_PHOTO_GUIDANCE`) with drifting key sets — compose
 * was missing RAYA, so a Raya profile got bespoke roast/suggest guidance but fell
 * through to generic in the composer. Keying the guidance off `GUIDED_PROVIDERS`
 * via `Record<GuidedProvider, …>` makes that drift a compile error.
 */

/** Display name for every DataProvider (raw enum key is the fallback). */
const PROVIDER_NAME: Record<DataProvider, string> = {
  TINDER: "Tinder",
  HINGE: "Hinge",
  BUMBLE: "Bumble",
  GRINDR: "Grindr",
  BADOO: "Badoo",
  BOO: "Boo",
  OK_CUPID: "OkCupid",
  FEELD: "Feeld",
  RAYA: "Raya",
};

/**
 * The providers we give app-specific prompt guidance to. Adding one here forces
 * ALL THREE guidance strings (roastVibe / photoGuidance / promptGuidance) to be
 * filled via the `Record<GuidedProvider, …>` below — that's what keeps
 * roast/compose/suggest in lockstep (and is why compose can't silently miss RAYA).
 */
type GuidedProvider = "TINDER" | "HINGE" | "BUMBLE" | "RAYA";

interface ProviderGuidance {
  /** How to weight a vision roast on this app (roast.service / profile-roast). */
  roastVibe: string;
  /** Photo-curation strategy for the composer (compose-profile.service). */
  photoGuidance: string;
  /** What a good prompt answer looks like (prompt-suggest.service). */
  promptGuidance: string;
}

const GUIDANCE: Record<GuidedProvider, ProviderGuidance> = {
  TINDER: {
    roastVibe:
      "Tinder is fast, swipe-first and photo-driven — people decide in under a second and the vibe skews casual/flirty. The photos carry the profile; bios are short by design. Roast the photo game hardest.",
    photoGuidance:
      "Tinder is photo-first and decided in under a second. The lead photo carries everything: a clear, well-lit, solo shot where the face is unobstructed and inviting. After that, maximise variety — a full-body, something social, an activity/hobby, a personality shot.",
    promptGuidance:
      "Tinder is fast and casual. Answers should be short, punchy and a little flirty — one-liners that spark a swipe. Humour and confidence land; paragraphs don't.",
  },
  HINGE: {
    roastVibe:
      "Hinge brands itself 'designed to be deleted' and is prompt-driven — the prompts are where personality lives; there is no central bio on Hinge, so NEVER penalize a missing bio (if one is written, treat it as a bonus). Roast lazy, cliché or one-word prompt answers hardest; an all-photos-no-prompts Hinge profile is wasting the format.",
    photoGuidance:
      "Hinge interleaves photos with prompts and rewards authenticity over polish. Lead with a warm, clear solo face shot, then vary the set (full-body, social, doing-something) so each photo adds a new angle.",
    promptGuidance:
      "Hinge is prompt-driven — the prompts ARE the personality. Favour specific, story-driven or playfully vulnerable answers with a concrete detail someone can reply to. Avoid generic one-word answers.",
  },
  BUMBLE: {
    roastVibe:
      "On Bumble women message first, so the profile's whole job is to hand her an easy opening line. Reward clear interests and conversation hooks; roast profiles that give her nothing to start a chat with.",
    photoGuidance:
      "Bumble: the profile's job is to hand someone an easy opening line, so favour photos with obvious conversation hooks (a hobby, a place, a pet). Lead with a clear solo shot.",
    promptGuidance:
      "On Bumble women message first, so every answer should hand them an easy opening line — a clear interest, a question, or a hook to react to.",
  },
  RAYA: {
    roastVibe:
      "Raya is invite-only and clout-leaning (creatives, semi-famous). Roast try-hard exclusivity, humblebrags and festival photos.",
    photoGuidance:
      "Raya is invite-only and image-conscious (creatives, semi-famous). Lead with a striking but effortless solo shot; favour photos that signal taste and a creative life over obvious flexing, and keep the set looking curated, not try-hard.",
    promptGuidance:
      "Raya skews creative and clout-aware. Answers should feel effortless and a little intriguing, never try-hard.",
  },
};

/** Field-specific fallbacks for providers without bespoke guidance. */
const GENERIC_GUIDANCE: ProviderGuidance = {
  roastVibe:
    "A modern dating app where photos and a short bio have to do a lot of work fast.",
  photoGuidance:
    "A modern dating app where the lead photo is a clear, inviting solo shot and the rest of the set earns its place by adding variety.",
  promptGuidance:
    "A modern dating app where a short, specific, personable answer beats a generic one every time.",
};

export interface ProviderMeta extends ProviderGuidance {
  name: string;
}

/**
 * Resolve display name + app-specific guidance for a provider key. Unknown keys
 * fall back to the raw key as a name and generic guidance (matching the old
 * `MAP[key] ?? key` / `MAP[key] ?? GENERIC` behaviour).
 */
export function getProviderMeta(key: string): ProviderMeta {
  return {
    name: PROVIDER_NAME[key as DataProvider] ?? key,
    ...(GUIDANCE[key as GuidedProvider] ?? GENERIC_GUIDANCE),
  };
}
