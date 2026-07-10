import { TRPCError } from "@trpc/server";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import {
  getRayaProfile,
  getRayaProfileForUser,
  saveRayaProfile,
} from "@/server/services/raya/raya.service";

export const rayaProfileRouter = {
  saveProfile: publicProcedure
    .input(
      z.object({
        rayaId: z.string().length(64),
        blobUrl: z.url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Session required. Please sign in to upload your profile.",
        });
      }

      const [targetProfile, userProfile] = await Promise.all([
        getRayaProfile(input.rayaId),
        getRayaProfileForUser(userId),
      ]);

      if (targetProfile?.userId && targetProfile.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This Raya profile belongs to another account.",
        });
      }

      if (userProfile && userProfile.rayaId !== input.rayaId) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Your account already has a different Raya profile. Contact support before replacing it.",
        });
      }

      const result = await saveRayaProfile({
        ...input,
        userId,
      });

      return {
        rayaId: result.profile.rayaId,
        created: result.created,
        metrics: result.metrics,
      };
    }),
} satisfies TRPCRouterRecord;
