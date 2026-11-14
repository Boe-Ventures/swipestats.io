import { z } from "zod";

import {
  protectedProcedure,
  publicProcedure,
} from "@/server/domains/procedure";
import { postTable } from "@/server/db/schema";

export const postRouter = {
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .handler(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      await ctx.db.insert(postTable).values({
        name: input.name,
        createdById: ctx.session.user.id,
      });
    }),

  getLatest: protectedProcedure.handler(async ({ context: ctx }) => {
    const post = await ctx.db.query.postTable.findFirst({
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });

    return post ?? null;
  }),

  getSecretMessage: protectedProcedure.handler(() => {
    return "you can now see this secret message!";
  }),
};
