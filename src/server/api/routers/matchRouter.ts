import { z } from "zod";
import { eq } from "drizzle-orm";
import { matchTable, messageTable } from "@/server/db/schema";
import { buildConversationReplay } from "@/lib/conversation-replay";
import { protectedProcedure, tinderProfileOwnerProcedure } from "../trpc";
import { TRPCError, type TRPCRouterRecord } from "@trpc/server";

export const matchRouter = {
  // Get all matches for a profile (owner-only)
  listMatches: tinderProfileOwnerProcedure.query(async ({ ctx }) => {
    // ctx.profile is already validated by tinderProfileOwnerProcedure
    const matches = await ctx.db.query.matchTable.findMany({
      where: eq(matchTable.tinderProfileId, ctx.profile.tinderId),
      orderBy: (table, { desc }) => [
        desc(table.totalMessageCount),
        desc(table.matchedAt),
      ],
    });

    return matches;
  }),

  // Explainable outgoing-message signals for an owner-only profile replay.
  getConversationReplay: tinderProfileOwnerProcedure.query(async ({ ctx }) => {
    const matches = await ctx.db.query.matchTable.findMany({
      where: eq(matchTable.tinderProfileId, ctx.profile.tinderId),
      columns: {
        id: true,
        order: true,
      },
      with: {
        messages: {
          columns: {
            sentDate: true,
            content: true,
            charCount: true,
          },
          orderBy: (table, { asc }) => [asc(table.sentDate)],
        },
      },
    });

    return buildConversationReplay(matches);
  }),

  // Get all messages for a match only when the signed-in user owns its profile.
  getMessages: protectedProcedure
    .input(
      z.object({
        matchId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const match = await ctx.db.query.matchTable.findFirst({
        where: eq(matchTable.id, input.matchId),
        columns: { id: true },
        with: {
          tinderProfile: { columns: { userId: true } },
          hingeProfile: { columns: { userId: true } },
        },
      });

      const ownsMatch =
        match?.tinderProfile?.userId === ctx.session.user.id ||
        match?.hingeProfile?.userId === ctx.session.user.id;

      // Use NOT_FOUND for both cases so the endpoint does not reveal whether
      // another user's private conversation exists.
      if (!match || !ownsMatch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
      }

      const messages = await ctx.db.query.messageTable.findMany({
        where: eq(messageTable.matchId, input.matchId),
        orderBy: (table, { asc }) => [asc(table.sentDate)],
      });

      return messages;
    }),
} satisfies TRPCRouterRecord;
