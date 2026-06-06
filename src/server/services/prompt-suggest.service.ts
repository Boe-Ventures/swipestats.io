import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * AI prompt suggestions for a profile-compare "profile" (one comparison
 * column). Text-only and cheap (Haiku) — unlike the vision-based roast, this
 * doesn't look at photos, it riffs on the app + the user's existing
 * prompts/bio to suggest new prompt/answer pairs personalised to them.
 *
 * Two modes:
 *  - "full"        → prompt + a written answer they can add as-is
 *  - "promptsOnly" → just the best-fit prompt shells; they write the answers
 *
 * Structured so an image-generation equivalent can live in a parallel service
 * (suggestImages / generateImage) and reuse the same router/UI shape.
 */

export const PROMPT_SUGGEST_MODEL = "claude-haiku-4-5-20251001";

export const SUGGEST_MODES = ["full", "promptsOnly"] as const;
export type SuggestMode = (typeof SUGGEST_MODES)[number];

/** DataProvider enum value -> display name (server-safe). */
const PROVIDER_NAME: Record<string, string> = {
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
 * App-specific guidance for what a *good* prompt answer looks like — this is
 * the suggestion-flavoured cousin of the roast service's PROVIDER_VIBE.
 */
const PROVIDER_GUIDANCE: Record<string, string> = {
  TINDER:
    "Tinder is fast and casual. Answers should be short, punchy and a little flirty — one-liners that spark a swipe. Humour and confidence land; paragraphs don't.",
  HINGE:
    "Hinge is prompt-and-bio heavy — the prompts ARE the personality. Favour specific, story-driven or playfully vulnerable answers with a concrete detail someone can reply to. Avoid generic one-word answers.",
  BUMBLE:
    "On Bumble women message first, so every answer should hand them an easy opening line — a clear interest, a question, or a hook to react to.",
  RAYA: "Raya skews creative and clout-aware. Answers should feel effortless and a little intriguing, never try-hard.",
};

const GENERIC_GUIDANCE =
  "A modern dating app where a short, specific, personable answer beats a generic one every time.";

export interface ExistingPrompt {
  prompt: string;
  answer: string;
}

export interface ProfileContext {
  name?: string;
  age?: number;
  bio?: string;
  city?: string;
  educationLevel?: string;
}

const suggestionSchema = z.object({
  prompt: z
    .string()
    .describe(
      "The prompt text. When an official prompt list is provided, use one of those prompts VERBATIM. Otherwise write a prompt in this app's style.",
    ),
  answer: z
    .string()
    .describe(
      "A specific, personal answer in the user's first-person voice — one sentence, concrete, no clichés. EMPTY STRING when the user only asked for prompt ideas.",
    ),
  rationale: z
    .string()
    .describe(
      "One short line on why this prompt fits this person specifically (shown as a hint).",
    ),
});

export type PromptSuggestion = z.infer<typeof suggestionSchema>;

const outputSchema = z.object({
  suggestions: z.array(suggestionSchema),
});

/** Shared context block describing the app + the person, reused by both calls. */
function buildContextBlock(args: {
  providerKey: string;
  mode: SuggestMode;
  bankPrompts: string[];
  existingPrompts: ExistingPrompt[];
  context: ProfileContext;
}): string {
  const { providerKey, mode, bankPrompts, existingPrompts, context } = args;
  const provider = PROVIDER_NAME[providerKey] ?? providerKey;
  const guidance = PROVIDER_GUIDANCE[providerKey] ?? GENERIC_GUIDANCE;

  const aboutLines = [
    context.name ? `Name: ${context.name}` : null,
    context.age ? `Age: ${context.age}` : null,
    context.city ? `City: ${context.city}` : null,
    context.educationLevel
      ? `Education: ${context.educationLevel.replace(/_/g, " ")}`
      : null,
    context.bio?.trim() ? `Bio: "${context.bio.trim()}"` : null,
  ].filter(Boolean);

  const about =
    aboutLines.length > 0
      ? aboutLines.join("\n")
      : "(no profile details provided — keep answers broadly appealing but still specific)";

  const existing =
    existingPrompts.length > 0
      ? existingPrompts
          .map((p) => `- "${p.prompt}"${p.answer ? ` — "${p.answer}"` : ""}`)
          .join("\n")
      : "(none yet)";

  const bank =
    bankPrompts.length > 0
      ? `Official ${provider} prompts you MUST pick from (use the exact wording):\n${bankPrompts
          .map((p) => `- ${p}`)
          .join("\n")}`
      : `${provider} has no fixed prompt list here — invent prompts written in ${provider}'s style.`;

  return `App: ${provider}
About ${provider}: ${guidance}

About this person:
${about}

Prompts already on their profile (do NOT repeat these, and complement them):
${existing}

${bank}

${
  mode === "promptsOnly"
    ? 'The user only wants PROMPT IDEAS — leave every "answer" as an empty string and put your reasoning in "rationale".'
    : 'For each suggestion, write the "answer" too — specific to this person, one sentence, concrete, in their voice, no clichés.'
}`;
}

/**
 * Generate a batch of prompt suggestions tailored to the app + the person.
 */
export async function suggestPrompts(input: {
  providerKey: string;
  mode: SuggestMode;
  bankPrompts: string[];
  existingPrompts: ExistingPrompt[];
  context: ProfileContext;
  count: number;
}): Promise<PromptSuggestion[]> {
  const contextBlock = buildContextBlock(input);

  const prompt = `You are a sharp dating-profile copywriter helping someone fill out their ${
    PROVIDER_NAME[input.providerKey] ?? input.providerKey
  } profile.

${contextBlock}

Give exactly ${input.count} suggestions. Vary them across different vibes (funny, sincere, intriguing, niche-interest) so there's real choice. Every suggestion must be distinct from the others and from what's already on the profile.`;

  const result = await generateObject({
    model: anthropic(PROMPT_SUGGEST_MODEL),
    schema: outputSchema,
    prompt,
    temperature: 0.9,
  });

  return result.object.suggestions;
}

/**
 * Regenerate a single suggestion with free-text steering from the user
 * (e.g. "make it funnier" or "mention that I love climbing").
 */
export async function regeneratePrompt(input: {
  providerKey: string;
  mode: SuggestMode;
  bankPrompts: string[];
  existingPrompts: ExistingPrompt[];
  context: ProfileContext;
  current: { prompt: string; answer: string };
  steer: string;
}): Promise<PromptSuggestion> {
  const contextBlock = buildContextBlock(input);

  const prompt = `You are a sharp dating-profile copywriter helping someone refine ONE prompt on their ${
    PROVIDER_NAME[input.providerKey] ?? input.providerKey
  } profile.

${contextBlock}

The suggestion they want to change:
- Prompt: "${input.current.prompt}"${
    input.current.answer ? `\n- Answer: "${input.current.answer}"` : ""
  }

Their direction for the change (follow it closely): ${input.steer.trim()}

Return a SINGLE improved suggestion. You may keep the same prompt and only rework the answer, or switch to a better-fitting prompt — whatever best satisfies their direction.`;

  const result = await generateObject({
    model: anthropic(PROMPT_SUGGEST_MODEL),
    schema: outputSchema,
    prompt,
    temperature: 0.9,
  });

  const first = result.object.suggestions[0];
  if (!first) {
    throw new Error("No suggestion generated");
  }
  return first;
}
