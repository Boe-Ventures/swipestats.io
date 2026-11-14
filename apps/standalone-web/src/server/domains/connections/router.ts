import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withTransaction } from "@/server/db";
import {
  oauthConsentTable,
  oauthClientTable,
  oauthAccessTokenTable,
  oauthRefreshTokenTable,
} from "@/server/db/schema";
import { protectedProcedure } from "../procedure";
export const connectionsRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    return context.db
      .select({
        clientId: oauthConsentTable.clientId,
        name: oauthClientTable.name,
        scopes: oauthConsentTable.scopes,
        createdAt: oauthConsentTable.createdAt,
      })
      .from(oauthConsentTable)
      .innerJoin(
        oauthClientTable,
        eq(oauthClientTable.clientId, oauthConsentTable.clientId),
      )
      .where(eq(oauthConsentTable.userId, context.session.user.id));
  }),
  revoke: protectedProcedure
    .input(z.object({ clientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await withTransaction(async (tx) => {
        await tx
          .delete(oauthConsentTable)
          .where(
            and(
              eq(oauthConsentTable.userId, userId),
              eq(oauthConsentTable.clientId, input.clientId),
            ),
          );
        await tx
          .delete(oauthAccessTokenTable)
          .where(
            and(
              eq(oauthAccessTokenTable.userId, userId),
              eq(oauthAccessTokenTable.clientId, input.clientId),
            ),
          );
        await tx
          .delete(oauthRefreshTokenTable)
          .where(
            and(
              eq(oauthRefreshTokenTable.userId, userId),
              eq(oauthRefreshTokenTable.clientId, input.clientId),
            ),
          );
      });
      return { disconnected: true };
    }),
};
