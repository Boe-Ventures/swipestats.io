import { z } from "zod";
import { AI_MODELS } from "@/lib/ai/models";
import { generateStructured } from "@/lib/ai/generate-structured";
import { ROAST_TONES, TONE_PERSONA, type RoastTone } from "./roast-tone";
import { getProviderMeta } from "./providers";

// Re-exported so existing importers (e.g. roastRouter) keep their import path.
export { ROAST_TONES, type RoastTone };

/**
 * Vision-based roast of a profile-compare "profile" (one comparison column:
 * its photos, prompts and bio). Unlike the stats-based `roast.service.ts`
 * (which roasts ProfileMeta numbers), this one actually *looks* at the photos.
 *
 * Uses Sonnet for sharper visual critique, and `generateText` + `Output.object`
 * (the current AI SDK structured-output pattern).
 */

export const ROAST_MODEL = AI_MODELS.sonnet;

export interface ProfileRoastPhoto {
  /** Publicly fetchable blob URL passed to the vision model. */
  url: string;
  caption?: string;
  /**
   * Category tags from the photo tagger (e.g. ["selfie","sunglasses"]), when the
   * photo has been analyzed. Used to ground the read and compute the profile's
   * photo mix so the roast can call out repetition/gaps and justify ordering.
   */
  tags?: string[];
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

  const { name: provider, roastVibe: vibe } = getProviderMeta(providerKey);

  const promptLines =
    prompts.length > 0
      ? prompts
          .map((p, i) => `Prompt ${i + 1}: "${p.prompt}" — "${p.answer}"`)
          .join("\n")
      : "(no prompts)";

  // Photo-tagger context (only when photos have been analyzed): per-photo tags
  // plus the aggregate mix, so the roast can ground its read and give concrete
  // diversity/ordering advice instead of inferring it blind.
  const perPhotoTags = photos
    .map((p, i) =>
      p.tags?.length ? `Photo ${i + 1}: ${p.tags.join(", ")}` : null,
    )
    .filter((line): line is string => line !== null)
    .join("\n");

  const mixCounts: Record<string, number> = {};
  for (const p of photos) {
    for (const tag of p.tags ?? []) mixCounts[tag] = (mixCounts[tag] ?? 0) + 1;
  }
  const mixSummary = Object.entries(mixCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, n]) => `${n}× ${tag}`)
    .join(", ");

  const tagSection = perPhotoTags
    ? `\nThe photos have been auto-tagged. Tags per photo:\n${perPhotoTags}\n\nPhoto mix across the profile: ${mixSummary}.\nThese counts are AUTHORITATIVE: when you state how many photos are of a kind (e.g. group shots), use these exact numbers — never a higher count. Use them to flag repetition and gaps (e.g. no group or full-body shot), and to justify the photo order — surface concrete fixes in "real talk" with action "reorder".\n`
    : "";

  const instructions = `You are ${TONE_PERSONA[tone]}

You're reviewing someone's ${provider} dating profile.

About ${provider}: ${vibe}
Weight your roast accordingly — judge this profile by what actually matters on ${provider}.

${photos.length} photo(s) are attached below, in order, labeled Photo 1 through Photo ${photos.length}. Reference each photo by its number.
${tagSection}
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

CALIBRATION (photo verdicts): judge each photo by its role in the full set, not in isolation. One or two group shots are an asset (social proof), not a flaw — don't cut a photo just for being a group shot. Reserve the group-shot roast for when groups dominate the set, the subject is genuinely hard to pick out, or Photo 1 is a group shot (the lead must be an unmistakable solo).

CONSISTENCY: your "overall" and "real talk" must agree with your per-photo verdicts. Before citing a count (e.g. "five group shots"), count it against the photos you actually flagged as such — never claim more than that. Don't reference a "Photo N" that doesn't exist (there are only ${photos.length}).

Reference specific details you can actually see in the photos — that's what makes it land.${
    steer?.trim()
      ? `\n\nExtra direction from the user (follow it): ${steer.trim()}`
      : ""
  }`;

  return generateStructured({
    schema: profileRoastSchema,
    name: "ProfileRoast",
    description:
      "A vision-based roast of a dating profile: an overall verdict + score, per-photo keep/cut calls, prompt rewrites, bio rewrites, and prioritized fixes.",
    model: ROAST_MODEL,
    temperature: 0.9,
    logTag: "[roast] profile roast",
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

  const { name: provider, roastVibe: vibe } = getProviderMeta(providerKey);

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

CALIBRATION: a group shot isn't a flaw by itself — it's social proof. Only hold "group photo" against it if the subject is genuinely hard to pick out.

BE CONCISE — one sharp line beats three soft ones.`;

  return generateStructured({
    schema: singlePhotoRoastSchema,
    name: "PhotoVerdict",
    description:
      "A fresh single-photo verdict (factual caption, zinger title, one-line roast, keep/maybe/cut) after a user correction.",
    model: ROAST_MODEL,
    temperature: 0.9,
    logTag: "[roast] single-photo roast",
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
}
