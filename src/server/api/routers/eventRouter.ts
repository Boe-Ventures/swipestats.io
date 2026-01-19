import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq, desc, and } from "drizzle-orm";
import { eventTable, eventTypeEnum } from "@/server/db/schema";
import { protectedProcedure, publicProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import { createId } from "@/server/db/utils";

export const eventRouter = {
  // List events for a user (public - anyone can see events when viewing a profile)
  // If userId provided, fetch for that user; otherwise fetch for current authenticated user
  list: publicProcedure
    .input(
      z
        .object({
          userId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Determine which user's events to fetch
      let targetUserId: string | undefined;

      if (input?.userId) {
        // Explicit userId provided - fetch for that user (public viewing)
        targetUserId = input.userId;
      } else if (ctx.session?.user?.id) {
        // No userId provided but user is authenticated - fetch their own events
        targetUserId = ctx.session.user.id;
      } else {
        // No userId and not authenticated - return empty array
        return [];
      }

      const events = await ctx.db.query.eventTable.findMany({
        where: eq(eventTable.userId, targetUserId),
        orderBy: [desc(eventTable.startDate)],
        with: {
          location: true,
        },
      });

      return events;
    }),

  // Create new event
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(eventTypeEnum.enumValues),
        startDate: z.date(),
        endDate: z.date().optional(),
        locationId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate that endDate is after startDate if provided
      if (input.endDate && input.endDate < input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      const [newEvent] = await ctx.db
        .insert(eventTable)
        .values({
          id: createId("evt"),
          name: input.name,
          type: input.type,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          locationId: input.locationId ?? null,
          userId: ctx.session.user.id,
        })
        .returning();

      if (!newEvent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create event",
        });
      }

      return newEvent;
    }),

  // Update existing event
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        type: z.enum(eventTypeEnum.enumValues).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional().nullable(),
        locationId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Check if event exists and belongs to user
      const existingEvent = await ctx.db.query.eventTable.findFirst({
        where: and(
          eq(eventTable.id, id),
          eq(eventTable.userId, ctx.session.user.id),
        ),
      });

      if (!existingEvent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Validate dates if both are being updated or one is being updated
      const finalStartDate = updates.startDate ?? existingEvent.startDate;
      const finalEndDate =
        updates.endDate !== undefined ? updates.endDate : existingEvent.endDate;

      if (finalEndDate && finalEndDate < finalStartDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      const [updatedEvent] = await ctx.db
        .update(eventTable)
        .set(updates)
        .where(eq(eventTable.id, id))
        .returning();

      if (!updatedEvent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update event",
        });
      }

      return updatedEvent;
    }),

  // Delete event
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if event exists and belongs to user
      const existingEvent = await ctx.db.query.eventTable.findFirst({
        where: and(
          eq(eventTable.id, input.id),
          eq(eventTable.userId, ctx.session.user.id),
        ),
      });

      if (!existingEvent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      await ctx.db.delete(eventTable).where(eq(eventTable.id, input.id));

      return { success: true, deletedEventId: input.id };
    }),
} satisfies TRPCRouterRecord;
