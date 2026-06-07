import { createHash } from "crypto";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import {
  ROAST_TONES,
  TONE_PERSONA,
  PROVIDER_NAME,
  type RoastTone,
} from "./roast-tone";

// Re-exported so existing importers (e.g. roastRouter) keep their import path.
export { ROAST_TONES, PROVIDER_NAME, type RoastTone };

/**
 * Vision-based roast of a profile-compare "profile" (one comparison column:
 * its photos, prompts and bio). Unlike the stats-based `roast.service.ts`
 * (which roasts ProfileMeta numbers), this one actually *looks* at the photos.
 *
 * Uses Sonnet for sharper visual critique, and `generateText` + `Output.object`
 * (the current AI SDK structured-output pattern).
 */

export const ROAST_MODEL = "claude-sonnet-4-6";

/**
 * Stable hash of whatever profile state a roast was generated against. If the
 * live state hashes differently, the stored roast is stale.
 */
export function fingerprint(value: unknown): string {
  return createHash("sha1").update(JSON.stringify(value)).digest("hex");
}

/** The slice of column content the fingerprint actually hashes over. */
type FingerprintContent = {
  id: string;
  type: string;
  attachmentId: string | null;
  caption: string | null;
  prompt: string | null;
  answer: string | null;
};

/**
 * Canonical hash of the profile state a roast was generated against — ordered
 * content (type/id/attachment/caption/prompt/answer), title, and effective bio.
 * Shared so the roast router (on write) and the comparison query (to flag stale
 * roasts in the UI) compute byte-identical fingerprints.
 */
export function buildRoastFingerprint(
  column: {
    title: string | null;
    content: ReadonlyArray<FingerprintContent>;
  },
  effectiveBio: string | null,
): string {
  return fingerprint({
    bio: effectiveBio,
    title: column.title ?? null,
    content: column.content.map((c) => [
      c.type,
      c.id,
      c.attachmentId,
      c.caption,
      c.prompt,
      c.answer,
    ]),
  });
}

/**
 * Each app has its own culture, so the roast should weigh things differently.
 * Keyed by the DataProvider enum value; falls back to a generic vibe.
 */
const PROVIDER_VIBE: Record<string, string> = {
  TINDER:
    "Tinder is fast, swipe-first and photo-driven — people decide in under a second and the vibe skews casual/flirty. The photos carry the profile; bios are short by design. Roast the photo game hardest.",
  HINGE:
    "Hinge brands itself 'designed to be deleted' and is prompt-and-bio heavy — the prompts are where personality lives. Roast lazy, cliché or one-word prompt answers hardest; an all-photos-no-effort Hinge profile is wasting the format.",
  BUMBLE:
    "On Bumble women message first, so the profile's whole job is to hand her an easy opening line. Reward clear interests and conversation hooks; roast profiles that give her nothing to start a chat with.",
  RAYA: "Raya is invite-only and clout-leaning (creatives, semi-famous). Roast try-hard exclusivity, humblebrags and festival photos.",
};

const GENERIC_VIBE =
  "A modern dating app where photos and a short bio have to do a lot of work fast.";

export interface ProfileRoastPhoto {
  /** Publicly fetchable blob URL passed to the vision model. */
  url: string;
  caption?: string;
}

export interface ProfileRoastPrompt {
  prompt: string;
  answer: string;
}

export interface ProfileRoastInput {
  /** DataProvider enum value, e.g. "TINDER" — maps to display name + app-specific vibe. */
  providerKey: string;
  tone: RoastTone;
  /** Ordered — the model references each as "Photo 1..N"; caller maps back to IDs. */
  photos: ProfileRoastPhoto[];
  /** Ordered — referenced as "Prompt 1..N". */
  prompts: ProfileRoastPrompt[];
  bio?: string;
  /** Optional free-text steer, e.g. "go harder on the sunsets" or "be kinder about the bio". */
  steer?: string;
}

/**
 * The per-photo verdict fields, shared between the full-profile roast (where
 * each is tagged with an `index`) and the single-photo "look again" re-roast.
 * Keeping one shape means the two prompts can't drift apart.
 */
const photoVerdictShape = {
  caption: z
    .string()
    .describe(
      "Neutral, FACTUAL description of what's actually visible — setting, pose, what they're doing, lighting. NOT a joke. e.g. 'Beach at golden hour · arms crossed, dive watch'",
    ),
  title: z
    .string()
    .describe("A short, bold zinger headline for this photo, <50 chars"),
  body: z
    .string()
    .describe(
      "The roast of this photo — ONE punchy sentence (~140 chars max) referencing a specific visible detail. Do not ramble.",
    ),
  keepOrCut: z
    .enum(["keep", "maybe", "cut"])
    .describe("Recommendation for whether to keep this photo"),
};

const singlePhotoRoastSchema = z.object(photoVerdictShape);

/** One photo's verdict — caption/title/body/keepOrCut, no index. */
export type PhotoVerdict = z.infer<typeof singlePhotoRoastSchema>;

const profileRoastSchema = z.object({
  overall: z.object({
    tagline: z
      .string()
      .describe(
        "Short verdict badge, 2-5 words, e.g. 'Solid, but playing it safe'",
      ),
    headline: z
      .string()
      .describe(
        "One punchy, shareable line — the single best roast, <100 chars",
      ),
    verdict: z
      .string()
      .describe(
        "The overall take — punchy, 2 sentences MAX (~240 chars). No rambling.",
      ),
  }),
  photos: z
    .array(
      z.object({
        index: z
          .number()
          .describe(
            "1-based whole-number index of the photo exactly as labeled in the prompt",
          ),
        ...photoVerdictShape,
      }),
    )
    .describe("One entry per photo, in any order; reference each by its index"),
  prompts: z
    .array(
      z.object({
        index: z
          .number()
          .describe("1-based whole-number index of the prompt"),
        roast: z
          .string()
          .describe(
            "The roast of this answer — ONE punchy sentence, no rambling",
          ),
        rewrite: z
          .string()
          .describe(
            "A sharper rewrite of this prompt's ANSWER they could use instead — concrete, in their voice, ~1 sentence",
          ),
      }),
    )
    .describe("One entry per prompt"),
  bio: z
    .object({
      roast: z
        .string()
        .describe("The roast of the bio — punchy, 2 sentences MAX"),
      rewrites: z
        .array(
          z.object({
            label: z
              .string()
              .describe("Short style label, e.g. 'Witty' or 'Sincere'"),
            text: z
              .string()
              .describe(
                "A full rewritten bio in that style — concise, ~1-2 sentences",
              ),
          }),
        )
        .describe(
          "At least 2 alternative bios in distinct named styles (default Witty + Sincere)",
        ),
    })
    .nullable()
    .describe("Roast + rewrites for the bio, or null if there is no bio"),
  realTalk: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "Short imperative headline, e.g. 'Lead with the dog photo'",
          ),
        detail: z
          .string()
          .optional()
          .describe("One short sentence explaining why"),
        action: z
          .enum(["reorder", "editBio", "addPrompt"])
          .optional()
          .describe("Optional machine hint if this maps to a concrete edit"),
      }),
    )
    .describe(
      "2-5 concrete, actionable improvements, most impactful first (realTalk[0] = top fix)",
    ),
});

export type ProfileRoast = z.infer<typeof profileRoastSchema>;

export async function roastProfile(
  input: ProfileRoastInput,
): Promise<ProfileRoast> {
  const { providerKey, tone, photos, prompts, bio, steer } = input;

  const provider = PROVIDER_NAME[providerKey] ?? providerKey;
  const vibe = PROVIDER_VIBE[providerKey] ?? GENERIC_VIBE;

  const promptLines =
    prompts.length > 0
      ? prompts
          .map((p, i) => `Prompt ${i + 1}: "${p.prompt}" — "${p.answer}"`)
          .join("\n")
      : "(no prompts)";

  const instructions = `You are ${TONE_PERSONA[tone]}

You're reviewing someone's ${provider} dating profile.

About ${provider}: ${vibe}
Weight your roast accordingly — judge this profile by what actually matters on ${provider}.

${photos.length} photo(s) are attached below, in order, labeled Photo 1 through Photo ${photos.length}. Reference each photo by its number.

Prompts on the profile:
${promptLines}

Bio: ${bio?.trim() ? bio : "(no bio written)"}

BE CONCISE. This is a punchy roast, not an essay — favour one sharp line over three soft ones. Every field below is SHORT (one or two sentences max). No rambling, no repeating yourself.

Give:
1. Overall: a short "tagline" badge (2-5 words capturing the verdict, e.g. "Solid, but playing it safe"), one shareable "headline" punchline, and a "verdict" summary of 2 sentences MAX. No letter grade, no numeric score.
2. For EACH photo: a "caption" — a neutral, factual description of what is actually visible (setting, pose, activity, lighting; NOT a joke — this proves you looked); a bold "title" zinger; a "body" roast of ONE punchy sentence citing a specific visible detail; and a keep/maybe/cut call.
3. For EACH prompt: a one-sentence "roast" of their answer, plus a "rewrite" — a sharper answer to the SAME prompt they could actually use (concrete, in their voice).
4. Bio (or null if there's none): a "roast" of 2 sentences max; and "rewrites" = at least two concise replacement bios in distinct named styles (default "Witty" and "Sincere").
5. "Real talk": 2-5 prioritized, actionable fixes, each a { title, optional detail, optional action }. Put the highest-impact fix first. Tag "action" when a fix is mechanical: "reorder" (photo order), "editBio", or "addPrompt".

Reference specific details you can actually see in the photos — that's what makes it land.${
    steer?.trim()
      ? `\n\nExtra direction from the user (follow it): ${steer.trim()}`
      : ""
  }`;

  try {
    const { output } = await generateText({
      model: anthropic(ROAST_MODEL),
      temperature: 0.9,
      output: Output.object({
        name: "ProfileRoast",
        description:
          "A vision-based roast of a dating profile: an overall verdict + score, per-photo keep/cut calls, prompt rewrites, bio rewrites, and prioritized fixes.",
        schema: profileRoastSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instructions },
            ...photos.map((p) => ({
              type: "image" as const,
              image: new URL(p.url),
            })),
          ],
        },
      ],
    });

    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("[roast] profile roast: no object generated", {
        cause: error.cause,
        text: error.text,
      });
    }
    throw error;
  }
}

export interface SinglePhotoRoastInput {
  /** DataProvider enum value, e.g. "TINDER". */
  providerKey: string;
  tone: RoastTone;
  photo: { url: string; caption?: string };
  /**
   * What the user wants the AI to look at / correct, e.g. "there's no wine
   * glass — look again" or "focus on the dog, not the background".
   */
  steer: string;
}

/**
 * Re-examine and re-roast a SINGLE photo with a user correction. Used when the
 * full-profile roast mis-read a photo (hallucinated a detail) or the user wants
 * it to focus on something specific. Same tone + app lens as the full roast, so
 * the swapped-in verdict reads consistently with the rest.
 */
export async function roastSinglePhoto(
  input: SinglePhotoRoastInput,
): Promise<PhotoVerdict> {
  const { providerKey, tone, photo, steer } = input;

  const provider = PROVIDER_NAME[providerKey] ?? providerKey;
  const vibe = PROVIDER_VIBE[providerKey] ?? GENERIC_VIBE;

  const instructions = `You are ${TONE_PERSONA[tone]}

You're taking a SECOND look at one photo from someone's ${provider} dating profile, because the first read was off or they want you to focus on something specific.

About ${provider}: ${vibe}

What the user told you to look for / correct (this is authoritative — trust it over your previous read):
"${steer.trim()}"

Look at the attached photo again, carefully. Base everything ONLY on what is genuinely visible — do not invent props, people, or details that aren't there. If your earlier take assumed something that the user says isn't in the photo, drop it.

Return a fresh verdict for THIS photo only:
- "caption": a neutral, factual description of what's actually visible (proves you looked).
- "title": a short bold zinger headline (<50 chars).
- "body": ONE punchy sentence (~140 chars) citing a specific visible detail.
- "keepOrCut": keep / maybe / cut.

BE CONCISE — one sharp line beats three soft ones.`;

  try {
    const { output } = await generateText({
      model: anthropic(ROAST_MODEL),
      temperature: 0.9,
      output: Output.object({
        name: "PhotoVerdict",
        description:
          "A fresh single-photo verdict (factual caption, zinger title, one-line roast, keep/maybe/cut) after a user correction.",
        schema: singlePhotoRoastSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instructions },
            { type: "image" as const, image: new URL(photo.url) },
          ],
        },
      ],
    });

    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("[roast] single-photo roast: no object generated", {
        cause: error.cause,
        text: error.text,
      });
    }
    throw error;
  }
}
