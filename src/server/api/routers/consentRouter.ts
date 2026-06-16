import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { userTable } from "@/server/db/schema";
import {
  CONSENT_VERSION,
  normalizeConsent,
  type ConsentRecord,
} from "@/lib/analytics/consent";
import { identifyServerUser } from "@/server/services/analytics.service";

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

      // On grant, set the user's traits in analytics — server-side, so this is
      // where tier/city/country (absent from the client session) reach PostHog
      // + Amplitude. Gated on consent inside identifyServerUser.
      if (record.preferences.analytics) {
        const u = await ctx.db.query.userTable.findFirst({
          where: eq(userTable.id, ctx.session.user.id),
          columns: {
            email: true,
            name: true,
            username: true,
            isAnonymous: true,
            swipestatsTier: true,
            city: true,
            country: true,
          },
        });
        if (u) {
          identifyServerUser(ctx.session.user.id, {
            email: u.email ?? undefined,
            name: u.name ?? undefined,
            username: u.username ?? undefined,
            isAnonymous: u.isAnonymous ?? undefined,
            swipestatsTier: u.swipestatsTier ?? undefined,
            city: u.city ?? undefined,
            country: u.country ?? undefined,
          });
        }
      }

      return record;
    }),
});
