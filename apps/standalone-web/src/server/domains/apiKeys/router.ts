import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/server/better-auth";
import { apiKeyTable, userTable } from "@/server/db/schema";
import {
  apiKeyPermissions,
  loveStoriesAccess,
  LOVE_STORIES_ACCESS,
} from "@/lib/api-keys";
import { protectedProcedure } from "../procedure";
import { DomainError } from "../error";

const accountProcedure = protectedProcedure.use(async ({ context, next }) => {
  const user = await context.db.query.userTable.findFirst({
    where: eq(userTable.id, context.session.user.id),
    columns: { id: true, isAnonymous: true, banned: true, banExpires: true },
  });
  if (
    !user ||
    user.isAnonymous ||
    (user.banned && (!user.banExpires || user.banExpires > new Date()))
  ) {
    throw new DomainError({
      code: "FORBIDDEN",
      message: "Sign in to an active registered account to manage API keys.",
    });
  }
  return next();
});

export const apiKeysRouter = {
  list: accountProcedure.handler(async ({ context }) => {
    const keys = await context.db
      .select({
        id: apiKeyTable.id,
        name: apiKeyTable.name,
        start: apiKeyTable.start,
        createdAt: apiKeyTable.createdAt,
        expiresAt: apiKeyTable.expiresAt,
        lastRequest: apiKeyTable.lastRequest,
        permissions: apiKeyTable.permissions,
      })
      .from(apiKeyTable)
      .where(
        and(
          eq(apiKeyTable.referenceId, context.session.user.id),
          eq(apiKeyTable.enabled, true),
        ),
      )
      .orderBy(desc(apiKeyTable.createdAt));
    return keys.map(({ permissions, ...key }) => ({
      ...key,
      loveStoriesAccess: loveStoriesAccess(permissions),
    }));
  }),
  create: accountProcedure
    .input(
      z.strictObject({
        name: z.string().trim().min(1).max(80),
        loveStoriesAccess: z.enum(LOVE_STORIES_ACCESS).default("none"),
        expiresInDays: z
          .union([z.literal(30), z.literal(90), z.literal(365)])
          .default(90),
      }),
    )
    .handler(async ({ context, input }) => {
      const key = await auth.api.createApiKey({
        body: {
          userId: context.session.user.id,
          name: input.name,
          expiresIn: input.expiresInDays * 24 * 60 * 60,
          permissions: apiKeyPermissions(input.loveStoriesAccess),
        },
      });
      // Only creation returns the plaintext credential. Lists never select its hash.
      return {
        id: key.id,
        name: key.name,
        key: key.key,
        expiresAt: key.expiresAt,
      };
    }),
  revoke: accountProcedure
    .input(z.strictObject({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const [key] = await context.db
        .update(apiKeyTable)
        .set({ enabled: false, updatedAt: new Date() })
        .where(
          and(
            eq(apiKeyTable.id, input.id),
            eq(apiKeyTable.referenceId, context.session.user.id),
          ),
        )
        .returning({ id: apiKeyTable.id });
      if (!key)
        throw new DomainError({
          code: "NOT_FOUND",
          message: "API key not found.",
        });
      return { revoked: true };
    }),
};
