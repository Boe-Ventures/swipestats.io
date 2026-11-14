import { os, ORPCError } from "@orpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { tinderProfileTable, userTable } from "@/server/db/schema";
import { canAccessFeature } from "@/server/services/gating.service";
import { evaluateAdminAccess } from "@/server/admin-access";
import type { DomainContext } from "./context";
import { DomainError } from "./error";
export const publicProcedure = os
  .$context<DomainContext>()
  .use(async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof DomainError)
        throw new ORPCError(error.code, {
          message: error.message,
          cause: error.cause,
        });
      throw error;
    }
  });
export const protectedProcedure = publicProcedure.use(
  ({ context: ctx, next }) => {
    if (!ctx.session?.user) {
      throw new DomainError({ code: "UNAUTHORIZED" });
    }
    return next({
      context: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  },
);

/**
 * Admin procedure
 *
 * Every environment requires an authenticated, verified admin email.
 * Used for admin operations like profile deletion during development.
 */
export const adminProcedure = publicProcedure.use(({ context: ctx, next }) => {
  const decision = evaluateAdminAccess({
    identity: ctx.session?.user,
  });

  if (decision.isAuthorized) {
    return next({ context: ctx });
  }

  if (decision.reason === "unauthenticated") {
    throw new DomainError({ code: "UNAUTHORIZED" });
  }

  throw new DomainError({
    code: "FORBIDDEN",
    message: "Admin access required",
  });
});

/**
 * Tinder Profile Owner procedure
 *
 * Requires authenticated session AND profile ownership.
 * Use for mutations that modify profile data.
 * - NOT_FOUND if profile doesn't exist
 * - FORBIDDEN if user doesn't own the profile
 *
 * Uses t.procedure with manual auth to avoid TypeScript depth issues
 * when extending protectedProcedure (Homi pattern).
 */
export const tinderProfileOwnerProcedure = publicProcedure
  .input(z.object({ tinderId: z.string() }))
  .use(async ({ context: ctx, next }, input) => {
    // Manual auth check
    if (!ctx.session?.user) {
      throw new DomainError({ code: "UNAUTHORIZED" });
    }

    // Load profile
    const profile = await ctx.db.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, input.tinderId),
    });

    if (!profile) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Profile not found",
      });
    }

    // Ownership check
    if (profile.userId !== ctx.session.user.id) {
      throw new DomainError({
        code: "FORBIDDEN",
        message: "You don't have access to this profile",
      });
    }

    return next({
      context: {
        session: { ...ctx.session, user: ctx.session.user },
        profile,
      },
    });
  });

/**
 * AI feature procedure
 *
 * Gate for every paid AI feature (roast, profile roast, photo analysis,
 * compose, prompt suggestions) - all share the single `aiRoast` entitlement.
 * Resolves auth + entitlement ONCE and injects the loaded `ctx.user`, so AI
 * handlers stay thin and can't ship ungated by omission (the gate was copy-
 * pasted into 6 handlers before, with 5 drifted FORBIDDEN messages).
 *
 * - UNAUTHORIZED if not signed in / user row missing
 * - FORBIDDEN (one canonical message) if the tier lacks AI access
 */
export const AI_ENTITLEMENT_MESSAGE =
  "This AI feature requires a PLUS or ELITE subscription.";

export const aiProcedure = publicProcedure.use(
  async ({ context: ctx, next }) => {
    if (!ctx.session?.user) {
      throw new DomainError({ code: "UNAUTHORIZED" });
    }

    const user = await ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.session.user.id),
    });
    if (!user) {
      throw new DomainError({ code: "UNAUTHORIZED" });
    }
    if (!canAccessFeature(user, "aiRoast")) {
      throw new DomainError({
        code: "FORBIDDEN",
        message: AI_ENTITLEMENT_MESSAGE,
      });
    }

    return next({
      context: {
        session: { ...ctx.session, user: ctx.session.user },
        user,
      },
    });
  },
);
