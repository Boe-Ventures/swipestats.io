import { z } from "zod";
import { eq } from "drizzle-orm";
import { matchTable, messageTable } from "@/server/db/schema";
import { publicProcedure, tinderProfileOwnerProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";

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

  // Get all messages for a specific match
  getMessages: publicProcedure
    .input(
      z.object({
        matchId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.query.messageTable.findMany({
        where: eq(messageTable.matchId, input.matchId),
        orderBy: (table, { asc }) => [asc(table.sentDate)],
      });

      return messages;
    }),
} satisfies TRPCRouterRecord;
