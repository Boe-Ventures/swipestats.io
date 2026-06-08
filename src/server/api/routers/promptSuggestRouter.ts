import { z } from "zod";

import type { db as Database } from "@/server/db";
import { aiProcedure } from "../trpc";
import { loadOwnedColumnWithContent } from "@/server/services/comparison-column.service";
import {
  suggestPrompts,
  regeneratePrompt,
  SUGGEST_MODES,
  type ExistingPrompt,
  type ProfileContext,
} from "@/server/services/prompt-suggest.service";
import { getPromptsByApp, isPromptSource } from "@/lib/prompt-bank";

/** Number of suggestions generated per "Generate" click. */
const SUGGEST_COUNT = 4;

/**
 * Load a column (with content + parent comparison) and assemble everything the
 * suggestion service needs: ownership check, the app, the person's existing
 * prompts, this app's prompt bank, and profile context for personalisation.
 */
async function loadColumnContext(
  db: typeof Database,
  columnId: string,
  userId: string,
) {
  const column = await loadOwnedColumnWithContent(db, columnId, userId);

  const existingPrompts: ExistingPrompt[] = column.content
    .filter((c) => c.type === "prompt")
    .map((c) => ({ prompt: c.prompt ?? "", answer: c.answer ?? "" }));

  const bankPrompts = isPromptSource(column.dataProvider)
    ? getPromptsByApp(column.dataProvider).map((p) => p.text)
    : [];

  const comparison = column.comparison;
  const context: ProfileContext = {
    name: comparison.profileName ?? undefined,
    age: comparison.age ?? undefined,
    bio: column.bio ?? comparison.defaultBio ?? undefined,
    city: comparison.city ?? undefined,
    educationLevel: comparison.educationLevel ?? undefined,
  };

  return {
    providerKey: column.dataProvider,
    existingPrompts,
    bankPrompts,
    context,
  };
}

export const promptSuggestRouter = {
  /**
   * Generate a batch of prompt suggestions for a profile, personalised to the
   * app + the user's existing prompts/bio. `mode` toggles whether answers are
   * written too ("full") or just the prompt shells ("promptsOnly").
   */
  suggest: aiProcedure
    .input(
      z.object({
        columnId: z.string(),
        mode: z.enum(SUGGEST_MODES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const loaded = await loadColumnContext(
        ctx.db,
        input.columnId,
        ctx.session.user.id,
      );

      const suggestions = await suggestPrompts({
        ...loaded,
        mode: input.mode,
        count: SUGGEST_COUNT,
      });

      return { suggestions };
    }),

  /**
   * Regenerate a single suggestion with free-text steering from the user
   * (e.g. "make it funnier", "mention I love climbing").
   */
  regenerate: aiProcedure
    .input(
      z.object({
        columnId: z.string(),
        mode: z.enum(SUGGEST_MODES),
        current: z.object({
          prompt: z.string(),
          answer: z.string(),
        }),
        steer: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const loaded = await loadColumnContext(
        ctx.db,
        input.columnId,
        ctx.session.user.id,
      );

      const suggestion = await regeneratePrompt({
        ...loaded,
        mode: input.mode,
        current: input.current,
        steer: input.steer,
      });

      return { suggestion };
    }),
};
