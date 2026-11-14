import { DomainError } from "@/server/domains/error";

import { eq, and, or } from "drizzle-orm";
import {
  customDataTable,
  tinderProfileTable,
  hingeProfileTable,
} from "@/server/db/schema";
import { protectedProcedure } from "../procedure";

import { createId } from "@/server/db/utils";
import { customDataGetSchema, customDataUpsertSchema } from "@/lib/validators";

export const customDataRouter = {
  // Get custom data by profile ID
  get: protectedProcedure
    .input(customDataGetSchema)
    .handler(async ({ context: ctx, input }) => {
      // Must provide at least one profile ID
      if (!input.tinderProfileId && !input.hingeProfileId) {
        throw new DomainError({
          code: "BAD_REQUEST",
          message: "Must provide either tinderProfileId or hingeProfileId",
        });
      }

      // Build where clause based on provided IDs
      const conditions = [];
      if (input.tinderProfileId) {
        conditions.push(
          eq(customDataTable.tinderProfileId, input.tinderProfileId),
        );
      }
      if (input.hingeProfileId) {
        conditions.push(
          eq(customDataTable.hingeProfileId, input.hingeProfileId),
        );
      }

      const customData = await ctx.db.query.customDataTable.findFirst({
        where: and(
          eq(customDataTable.userId, ctx.session.user.id),
          or(...conditions),
        ),
      });

      return customData ?? null;
    }),

  // Upsert custom data
  upsert: protectedProcedure
    .input(customDataUpsertSchema)
    .handler(async ({ context: ctx, input }) => {
      // Must provide at least one profile ID
      if (!input.tinderProfileId && !input.hingeProfileId) {
        throw new DomainError({
          code: "BAD_REQUEST",
          message: "Must provide either tinderProfileId or hingeProfileId",
        });
      }

      // Verify profile ownership if tinderProfileId is provided
      if (input.tinderProfileId) {
        const tinderProfile = await ctx.db.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.tinderId, input.tinderProfileId),
        });

        if (!tinderProfile) {
          throw new DomainError({
            code: "NOT_FOUND",
            message: "Tinder profile not found",
          });
        }

        if (tinderProfile.userId !== ctx.session.user.id) {
          throw new DomainError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this profile",
          });
        }
      }

      // Verify profile ownership if hingeProfileId is provided
      if (input.hingeProfileId) {
        const hingeProfile = await ctx.db.query.hingeProfileTable.findFirst({
          where: eq(hingeProfileTable.hingeId, input.hingeProfileId),
        });

        if (!hingeProfile) {
          throw new DomainError({
            code: "NOT_FOUND",
            message: "Hinge profile not found",
          });
        }

        if (hingeProfile.userId !== ctx.session.user.id) {
          throw new DomainError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this profile",
          });
        }
      }

      // Check if record already exists
      const conditions = [];
      if (input.tinderProfileId) {
        conditions.push(
          eq(customDataTable.tinderProfileId, input.tinderProfileId),
        );
      }
      if (input.hingeProfileId) {
        conditions.push(
          eq(customDataTable.hingeProfileId, input.hingeProfileId),
        );
      }

      const existing = await ctx.db.query.customDataTable.findFirst({
        where: and(
          eq(customDataTable.userId, ctx.session.user.id),
          or(...conditions),
        ),
      });

      const { tinderProfileId, hingeProfileId, ...dataFields } = input;

      if (existing) {
        // Update existing record
        const [updated] = await ctx.db
          .update(customDataTable)
          .set(dataFields)
          .where(eq(customDataTable.id, existing.id))
          .returning();

        if (!updated) {
          throw new DomainError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update custom data",
          });
        }

        return updated;
      } else {
        // Create new record with userId and profile IDs
        const [created] = await ctx.db
          .insert(customDataTable)
          .values({
            id: createId("cdt"),
            userId: ctx.session.user.id,
            tinderProfileId: tinderProfileId ?? null,
            hingeProfileId: hingeProfileId ?? null,
            ...dataFields,
          })
          .returning();

        if (!created) {
          throw new DomainError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create custom data",
          });
        }

        return created;
      }
    }),
};
