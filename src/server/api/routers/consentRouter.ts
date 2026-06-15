import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { userTable } from "@/server/db/schema";
import {
  CONSENT_VERSION,
  normalizeConsent,
  type ConsentRecord,
} from "@/lib/analytics/consent";

const consentPreferencesSchema = z.object({
  essential: z.boolean(),
  functional: z.boolean(),
  analytics: z.boolean(),
  advertising: z.boolean(),
});

/**
 * Durable, server-readable analytics consent on `user.analyticsConsent`.
 *
 * Pre-login the source of truth is localStorage; on login the client mirrors
 * the decision here so server-side event gating can honor it across devices.
 */
export const consentRouter = createTRPCRouter({
  /** The current user's stored consent record, or null if undecided. */
  get: protectedProcedure.query(({ ctx }) => ctx.analyticsConsent),

  /** Persist a decision (essential always forced on); stamps version + time. */
  set: protectedProcedure
    .input(z.object({ preferences: consentPreferencesSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const record: ConsentRecord = {
        preferences: normalizeConsent(input.preferences),
        version: CONSENT_VERSION,
        decidedAt: new Date().toISOString(),
      };

      await ctx.db
        .update(userTable)
        .set({ analyticsConsent: record })
        .where(eq(userTable.id, ctx.session.user.id));

      return record;
    }),
});
