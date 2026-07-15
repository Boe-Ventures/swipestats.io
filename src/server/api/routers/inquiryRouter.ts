import { z } from "zod";

import { INQUIRY_KINDS } from "@/lib/inquiries";
import { SPONSOR_PLACEMENTS } from "@/lib/sponsorship";
import { inquiryTable } from "@/server/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const inquiryRouter = createTRPCRouter({
  submit: publicProcedure
    .input(
      z.object({
        kind: z.enum(INQUIRY_KINDS),
        name: z.string().trim().min(2).max(120),
        email: z.email(),
        company: z.string().trim().max(180).optional(),
        website: z.url().optional(),
        message: z.string().trim().min(10).max(3000),
        budget: z.string().trim().max(80).optional(),
        sourcePath: z.string().trim().min(1).max(500),
        placement: z.enum(SPONSOR_PLACEMENTS).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [inquiry] = await ctx.db
        .insert(inquiryTable)
        .values({
          kind: input.kind,
          name: input.name,
          contactEmail: input.email.toLowerCase(),
          data: {
            message: input.message,
            company: input.company,
            website: input.website,
            budget: input.kind === "SPONSORSHIP" ? input.budget : undefined,
            sourcePath: input.sourcePath,
            placement:
              input.kind === "SPONSORSHIP" ? input.placement : undefined,
          },
        })
        .returning({ id: inquiryTable.id });

      return { id: inquiry!.id };
    }),
});
