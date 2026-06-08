import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";

import { createTRPCRouter, aiProcedure } from "../trpc";
import { attachmentTable } from "@/server/db/schema";
import { analyzePhoto } from "@/server/services/photo-analysis.service";
import { METADATA_ANALYSIS_KEY, type PhotoAnalysis } from "@/lib/photo-analysis";

export const photoAnalysisRouter = createTRPCRouter({
  /**
   * Analyze (or re-analyze, with an optional steer) a single gallery photo and
   * persist the result onto the attachment's metadata. Gated behind PLUS/ELITE
   * — same `aiRoast` entitlement as the roast. The caller fans these out one per
   * photo, so each call stays small and independently retryable.
   */
  analyze: aiProcedure
    .input(
      z.object({
        attachmentId: z.string(),
        steer: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const attachment = await ctx.db.query.attachmentTable.findFirst({
        where: and(
          eq(attachmentTable.id, input.attachmentId),
          isNull(attachmentTable.deletedAt),
        ),
      });
      if (attachment?.uploadedBy !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
      }
      if (!attachment.mimeType.startsWith("image/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only images can be analyzed",
        });
      }

      const result = await analyzePhoto({
        url: attachment.url,
        steer: input.steer,
      });

      const analysis: PhotoAnalysis = {
        ...result,
        analyzedAt: new Date().toISOString(),
        steer: input.steer?.trim() || undefined,
      };

      // Merge into existing metadata so we don't clobber blobPathname etc.
      const existingMetadata =
        attachment.metadata && typeof attachment.metadata === "object"
          ? (attachment.metadata as Record<string, unknown>)
          : {};

      await ctx.db
        .update(attachmentTable)
        .set({
          metadata: { ...existingMetadata, [METADATA_ANALYSIS_KEY]: analysis },
        })
        .where(eq(attachmentTable.id, attachment.id));

      return analysis;
    }),
});
