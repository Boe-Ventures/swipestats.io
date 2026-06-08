import { z } from "zod";

import { AI_MODELS } from "@/lib/ai/models";
import { generateStructured } from "@/lib/ai/generate-structured";
import { getProviderMeta } from "./providers";

/**
 * AI profile *composer*: given the user's already-analyzed gallery photos and a
 * target app, pick the best photos and put them in the ideal order, and write a
 * short app-appropriate bio. Think of it as the roast in reverse — instead of
 * critiquing an existing profile it assembles an optimal one.
 *
 * Text-only and cheap: it reasons over the tagger's structured output
 * (name/description/tags) rather than re-looking at the images, which is exactly
 * what the photo tagger was built to enable. Prompts are handled separately by
 * the existing `suggestPrompts` service, so this stays focused on photo curation.
 */

export const COMPOSE_MODEL = AI_MODELS.sonnet;

const composeSchema = z.object({
  photoOrder: z
    .array(z.number())
    .describe(
      "0-based indexes of the chosen photos from the provided list, in final profile order, lead photo first. Use ONLY indexes that appear in the list. Pick a varied set and never include near-duplicates.",
    ),
  bio: z
    .string()
    .describe(
      "A short, specific, first-person bio in this app's voice — 1-2 sentences, concrete, no clichés.",
    ),
  leadReason: z
    .string()
    .describe("One short line on why the lead photo was chosen."),
});

export type ProfileComposition = z.infer<typeof composeSchema>;

export interface ComposePhotoInput {
  /** Name/description/tags from the photo tagger. */
  name: string;
  description: string;
  tags: string[];
}

export async function composeProfilePhotos(input: {
  providerKey: string;
  /** Indexed in this exact order; `photoOrder` refers back to these indexes. */
  photos: ComposePhotoInput[];
  /** Target number of photos to use (the model may use fewer if it must). */
  count: number;
}): Promise<ProfileComposition> {
  const { name: provider, photoGuidance: guidance } = getProviderMeta(
    input.providerKey,
  );

  const photoLines = input.photos
    .map(
      (p, i) =>
        `${i}: ${p.name} — ${p.description} [${p.tags.join(", ") || "no tags"}]`,
    )
    .join("\n");

  const prompt = `You are an expert dating-profile photo editor building a ${provider} profile from this person's photo library.

About ${provider}: ${guidance}

Their analyzed photos (index: name — description [tags]):
${photoLines}

Choose the best ~${input.count} photos for ${provider} and put them in the ideal order:
- Lead with the single strongest photo — clear face, solo, well-lit, inviting. The lead matters most.
- Maximise variety across the set: mix headshot/close-up, full-body, social/group, and activity/hobby. Each photo should add something new.
- NEVER include near-duplicates or more than one of the same flavour (e.g. not three sunglasses shots, not three selfies).
- Use ONLY the indexes listed above. If there aren't enough good photos, use fewer rather than padding with weak ones.

Then write a short ${provider}-style bio for this person.`;

  return generateStructured({
    schema: composeSchema,
    name: "ProfileComposition",
    description:
      "An ordered selection of the best photos for a dating app plus a short bio.",
    model: COMPOSE_MODEL,
    temperature: 0.7,
    logTag: "[compose-profile]",
    prompt,
  });
}
