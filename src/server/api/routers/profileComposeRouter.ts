import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";

import { createTRPCRouter, aiProcedure } from "../trpc";
import {
  attachmentTable,
  profileComparisonTable,
} from "@/server/db/schema";
import { composeProfilePhotos } from "@/server/services/compose-profile.service";
import { suggestPrompts } from "@/server/services/prompt-suggest.service";
import { ProfileComparisonService } from "@/server/services/profile-comparison.service";
import { readPhotoAnalysis, type PhotoAnalysis } from "@/lib/photo-analysis";
import { PROMPT_BANK } from "@/lib/prompt-bank";
import { COMPOSE_PROVIDER_KEYS } from "@/app/app/profile-compare/compose-providers";

const PHOTO_COUNT = 6;
const PROMPT_COUNT = 4;

export const profileComposeRouter = createTRPCRouter({
  /**
   * Compose a fresh profile column for a chosen app from the user's already-
   * analyzed gallery photos: AI picks + orders the best photos, writes a bio,
   * and (for prompt-driven apps) suggests prompts. Adds it as a new column on
   * the target comparison (explicit id > latest used > a fresh one) and returns
   * the comparison id so the client can redirect. PLUS/ELITE only.
   */
  compose: aiProcedure
    .input(
      z.object({
        provider: z.enum(COMPOSE_PROVIDER_KEYS),
        comparisonId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Gather the user's analyzed gallery photos — the composer reasons over
      // the tagger output, so un-analyzed photos can't take part.
      const attachments = await ctx.db.query.attachmentTable.findMany({
        where: and(
          eq(attachmentTable.uploadedBy, userId),
          eq(attachmentTable.resourceType, "user_photo"),
          isNull(attachmentTable.deletedAt),
        ),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 60,
      });

      const analyzed = attachments
        .filter((a) => a.mimeType.startsWith("image/"))
        .map((a) => ({ a, analysis: readPhotoAnalysis(a.metadata) }))
        .filter(
          (x): x is { a: (typeof attachments)[number]; analysis: PhotoAnalysis } =>
            x.analysis !== null,
        );

      if (analyzed.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Analyze some photos first, then I can compose a profile from them.",
        });
      }

      const providerKey = input.provider;
      const wantsPrompts = providerKey === "HINGE" || providerKey === "BUMBLE";
      const bankPrompts = PROMPT_BANK[providerKey].map((p) => p.text);

      // Photo curation + prompts run independently.
      const [composition, promptSuggestions] = await Promise.all([
        composeProfilePhotos({
          providerKey,
          photos: analyzed.map((x) => ({
            name: x.analysis.name,
            description: x.analysis.description,
            tags: x.analysis.tags,
          })),
          count: PHOTO_COUNT,
        }),
        wantsPrompts
          ? suggestPrompts({
              providerKey,
              mode: "full",
              bankPrompts,
              existingPrompts: [],
              context: {},
              count: PROMPT_COUNT,
            })
          : Promise.resolve([]),
      ]);

      // Map the model's indexes back to attachment ids — validate, dedupe, cap.
      // Never trust model-emitted ids; it only ever references our list indexes.
      const seen = new Set<string>();
      const orderedAttachmentIds: string[] = [];
      for (const i of composition.photoOrder) {
        if (!Number.isInteger(i) || i < 0 || i >= analyzed.length) continue;
        const id = analyzed[i]!.a.id;
        if (seen.has(id)) continue;
        seen.add(id);
        orderedAttachmentIds.push(id);
      }
      // Fallback if the model returned nothing usable.
      if (orderedAttachmentIds.length === 0) {
        for (const x of analyzed.slice(0, PHOTO_COUNT)) {
          orderedAttachmentIds.push(x.a.id);
        }
      }
      const finalPhotoIds = orderedAttachmentIds.slice(0, PHOTO_COUNT);

      // Resolve the target comparison: explicit > latest used > a fresh one.
      let comparisonId = input.comparisonId;
      if (!comparisonId) {
        const latest = await ctx.db.query.profileComparisonTable.findFirst({
          where: eq(profileComparisonTable.userId, userId),
          orderBy: (t, { desc }) => [desc(t.updatedAt)],
          columns: { id: true },
        });
        comparisonId = latest?.id;
      }
      if (!comparisonId) {
        const created = await ProfileComparisonService.create({
          userId,
          columns: [],
        });
        comparisonId = created.id;
      }

      // Build the column: photos in order, then prompts.
      const column = await ProfileComparisonService.addColumn({
        comparisonId,
        userId,
        dataProvider: providerKey,
        bio: composition.bio,
        title: "AI draft",
      });

      await ProfileComparisonService.addPhotosToColumn({
        columnId: column.id,
        userId,
        photos: finalPhotoIds.map((id) => ({ attachmentId: id })),
      });

      for (const s of promptSuggestions) {
        if (s.prompt?.trim() && s.answer?.trim()) {
          await ProfileComparisonService.addContentToColumn({
            columnId: column.id,
            userId,
            type: "prompt",
            prompt: s.prompt.trim(),
            answer: s.answer.trim(),
          });
        }
      }

      return {
        comparisonId,
        columnId: column.id,
        provider: providerKey,
        photoCount: finalPhotoIds.length,
      };
    }),
});
