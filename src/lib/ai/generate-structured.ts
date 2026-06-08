import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import type { z } from "zod";

/** `messages` shape, taken straight from the SDK so vision parts type-check. */
type GenerateTextMessages = NonNullable<
  Parameters<typeof generateText>[0]["messages"]
>;

interface GenerateStructuredArgs<T> {
  /** Zod schema describing the structured output. */
  schema: z.ZodType<T>;
  /** Output object name (shown to the model). */
  name: string;
  /** Optional output description. */
  description?: string;
  /** Model id — pass an `AI_MODELS` value. */
  model: string;
  /** Sampling temperature (the services vary this — no default on purpose). */
  temperature?: number;
  /** Log prefix used when the model fails to produce a valid object. */
  logTag: string;
  /** Text-only prompt. Provide this OR `messages`, not both. */
  prompt?: string;
  /** Multi-part messages (e.g. vision). Provide this OR `prompt`, not both. */
  messages?: GenerateTextMessages;
}

/**
 * Thin wrapper around the AI SDK's `generateText` + `Output.object` structured-
 * output pattern, plus the `NoObjectGeneratedError` logging every AI service
 * was hand-rolling identically (only the log tag differed). The per-call args
 * (prompt vs messages, vision images, temperature, model) genuinely vary, so
 * they stay parameters — only the envelope and the error log are shared here.
 */
export async function generateStructured<T>({
  schema,
  name,
  description,
  model,
  temperature,
  logTag,
  prompt,
  messages,
}: GenerateStructuredArgs<T>): Promise<T> {
  // `generateText`'s prompt/messages is a discriminated union, so call it with
  // one shape or the other rather than spreading (which widens to `prompt?`).
  const shared = {
    model: anthropic(model),
    temperature,
    output: Output.object({ name, description, schema }),
  };
  try {
    const { output } = messages
      ? await generateText({ ...shared, messages })
      : await generateText({ ...shared, prompt: prompt ?? "" });
    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error(`${logTag}: no object generated`, {
        cause: error.cause,
        text: error.text,
      });
    }
    throw error;
  }
}
