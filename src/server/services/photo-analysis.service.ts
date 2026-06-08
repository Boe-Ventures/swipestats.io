import { z } from "zod";

import { PHOTO_TAGS } from "@/lib/photo-analysis";
import { AI_MODELS } from "@/lib/ai/models";
import { generateStructured } from "@/lib/ai/generate-structured";

/**
 * Vision-based analysis of a SINGLE gallery photo: a friendly name, a factual
 * description, and category tags. Each photo is analyzed in isolation (callers
 * fan these out in parallel), which keeps regeneration cheap and lets the user
 * steer a single photo's re-read the same way the roast dialog's "look again"
 * does.
 *
 * Uses Sonnet (Haiku mis-tags too often) and the `generateText` + `Output.object`
 * structured-output pattern, matching `profile-roast.service.ts`.
 */

export const PHOTO_ANALYSIS_MODEL = AI_MODELS.sonnet;

// No min/max on the tags array on purpose: range constraints make the model's
// structured output unreliable, and "every tag that applies" already implies a
// sensible count (an empty list is valid when nothing fits).
const photoAnalysisSchema = z.object({
  name: z
    .string()
    .describe(
      "A short, friendly 2-5 word name for the photo, e.g. 'Sunset beach selfie', 'Gym mirror pic', 'Hiking with the dog'",
    ),
  description: z
    .string()
    .describe(
      "ONE factual sentence describing what's actually visible — setting, subject, pose, activity, lighting. Neutral, not a judgement.",
    ),
  tags: z
    .array(z.enum(PHOTO_TAGS))
    .describe(
      "Every tag from the fixed set that clearly applies to this photo. Only include a tag if it is genuinely visible; an empty list is fine when none fit.",
    ),
});

export type PhotoAnalysisResult = z.infer<typeof photoAnalysisSchema>;

export interface AnalyzePhotoInput {
  /** Publicly fetchable blob URL passed to the vision model. */
  url: string;
  /**
   * Optional correction, e.g. "that's a kayak, not a car" or "this is my
   * brother, not me". Authoritative — trusted over the model's first read.
   */
  steer?: string;
}

export async function analyzePhoto(
  input: AnalyzePhotoInput,
): Promise<PhotoAnalysisResult> {
  const { url, steer } = input;

  const tagList = PHOTO_TAGS.join(", ");
  const instructions = `You are tagging a single photo from someone's dating-app photo library so they can organise their gallery and plan which shots to use.

Look ONLY at what is genuinely visible — never invent props, people, or details that aren't there.

Return:
- "name": a short, friendly 2-5 word name for the photo (e.g. "Sunset beach selfie", "Gym mirror pic").
- "description": ONE factual sentence describing what's visible (setting, subject, pose, activity, lighting). Neutral.
- "tags": every tag from this fixed set that clearly applies — ${tagList}. A few are easy to confuse, so judge them precisely:
  • "selfie" = arm's-length self-portrait; "mirror-selfie" = shot into a mirror (often phone visible).
  • "group" = the subject with one or more other people.
  • "thirst-trap" = deliberately revealing / shirtless / gym-body / posed for sex appeal.
  • "activity" = actively doing a sport or active hobby; "gym" = in a gym specifically.
  • "fish" = holding a fish or an angling catch.
  • "sunset" = a sunset/sunrise sky is a clear feature.
Only include tags you can actually see. It's fine to return one tag, several, or none.${
    steer?.trim()
      ? `\n\nExtra direction from the user (authoritative — trust it over your first read): ${steer.trim()}`
      : ""
  }`;

  return generateStructured({
    schema: photoAnalysisSchema,
    name: "PhotoAnalysis",
    description:
      "A factual name, description, and category tags for a single dating-profile photo.",
    model: PHOTO_ANALYSIS_MODEL,
    // Tagging should be fairly stable, so run cooler than the roast (0.9).
    temperature: 0.3,
    logTag: "[photo-analyze]",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instructions },
          { type: "image" as const, image: new URL(url) },
        ],
      },
    ],
  });
}
