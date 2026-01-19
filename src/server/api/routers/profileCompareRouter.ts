import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  dataProviderEnum,
  educationLevelEnum,
  userTable,
} from "@/server/db/schema";
import { ProfileComparisonService } from "@/server/services/profile-comparison.service";

export const profileCompareRouter = createTRPCRouter({
  // List user's comparisons
  list: protectedProcedure.query(async ({ ctx }) => {
    return ProfileComparisonService.list(ctx.session.user.id);
  }),

  // Get single comparison with full data
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ProfileComparisonService.get(input.id, ctx.session.user.id);
    }),

  // Get public comparison (no auth required)
  getPublic: publicProcedure
    .input(z.object({ shareKey: z.string() }))
    .query(async ({ input }) => {
      return ProfileComparisonService.getPublic(input.shareKey);
    }),

  // Create new comparison
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        defaultBio: z.string().optional(),
        age: z.number().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        columns: z.array(
          z.object({
            dataProvider: z.enum(dataProviderEnum.enumValues),
            bio: z.string().optional(),
            title: z.string().optional(),
            photoAttachmentIds: z.array(z.string()).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.create({
        userId: ctx.session.user.id,
        ...input,
      });
    }),

  // Update comparison metadata
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        profileName: z.string().optional(),
        defaultBio: z.string().optional(),
        age: z.number().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        nationality: z.string().optional(),
        hometown: z.string().optional(),
        heightCm: z.number().optional(),
        educationLevel: z.enum(educationLevelEnum.enumValues).optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.update({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Delete comparison
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.delete(input.id, ctx.session.user.id);
    }),

  // Add a new column to a comparison
  addColumn: protectedProcedure
    .input(
      z.object({
        comparisonId: z.string(),
        dataProvider: z.enum(dataProviderEnum.enumValues),
        bio: z.string().optional(),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.addColumn({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Update a column
  updateColumn: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        bio: z.string().optional(),
        title: z.string().optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.updateColumn({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Add content (photo or prompt) to column
  addContentToColumn: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        type: z.enum(["photo", "prompt"]),
        attachmentId: z.string().optional(),
        caption: z.string().optional(),
        prompt: z.string().optional(),
        answer: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.addContentToColumn({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Add photo to column (legacy)
  addPhotoToColumn: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        attachmentId: z.string(),
        caption: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.addPhotoToColumn({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Reorder content within a column
  reorderContent: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        contentOrders: z.array(
          z.object({
            id: z.string(),
            order: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.reorderContent({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Reorder photos within a column (legacy)
  reorderPhotos: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        photoOrders: z.array(
          z.object({
            id: z.string(),
            order: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.reorderPhotos({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Update content (caption, prompt, answer)
  updateContent: protectedProcedure
    .input(
      z.object({
        contentId: z.string(),
        caption: z.string().optional(),
        prompt: z.string().optional(),
        answer: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.updateContent({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Delete content from column
  deleteContent: protectedProcedure
    .input(z.object({ contentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.deleteContentFromColumn({
        contentId: input.contentId,
        userId: ctx.session.user.id,
      });
    }),

  // Delete photo from column (legacy)
  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.deletePhotoFromColumn({
        photoId: input.photoId,
        userId: ctx.session.user.id,
      });
    }),

  // Create feedback on content item or column
  createFeedback: protectedProcedure
    .input(
      z
        .object({
          contentId: z.string().optional(),
          columnId: z.string().optional(),
          rating: z.number().optional(),
          body: z.string().optional(),
        })
        .refine(
          (data) => data.contentId || data.columnId,
          "Must target content or column",
        )
        .refine(
          (data) => data.rating !== undefined || data.body,
          "Must provide rating or comment",
        ),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.createFeedback({
        ...input,
        authorId: ctx.session.user.id,
      });
    }),

  // Update feedback
  updateFeedback: protectedProcedure
    .input(
      z.object({
        feedbackId: z.string(),
        rating: z.number().optional(),
        body: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.updateFeedback({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Delete feedback
  deleteFeedback: protectedProcedure
    .input(z.object({ feedbackId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.deleteFeedback({
        feedbackId: input.feedbackId,
        userId: ctx.session.user.id,
      });
    }),

  // Get feedback (for share page - public)
  getFeedback: publicProcedure
    .input(
      z.object({
        comparisonId: z.string().optional(),
        contentId: z.string().optional(),
        columnId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (input.contentId) {
        return ProfileComparisonService.getFeedbackForContent(input.contentId);
      }
      if (input.columnId) {
        return ProfileComparisonService.getFeedbackForColumn(input.columnId);
      }
      if (input.comparisonId) {
        return ProfileComparisonService.getFeedbackForComparison(
          input.comparisonId,
        );
      }
      throw new Error("Must provide comparisonId, contentId, or columnId");
    }),

  // Get feedback for attachment across columns
  getFeedbackForAttachment: publicProcedure
    .input(z.object({ attachmentId: z.string() }))
    .query(async ({ input }) => {
      return ProfileComparisonService.getFeedbackForAttachment(
        input.attachmentId,
      );
    }),

  // Update anonymous user's name (only for anonymous users)
  updateAnonymousUserName: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify user is anonymous
      const user = await ctx.db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.isAnonymous) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This endpoint is only available for anonymous users",
        });
      }

      // Update user name
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set({ name: input.name })
        .where(eq(userTable.id, userId))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user name",
        });
      }

      return updatedUser;
    }),

  // Get comparison + photos for friend creation (public)
  getForFriendCreation: publicProcedure
    .input(z.object({ shareKey: z.string() }))
    .query(async ({ input }) => {
      return ProfileComparisonService.getForFriendCreation(input.shareKey);
    }),

  // Create column from friend (requires anonymous session)
  createFriendColumn: protectedProcedure
    .input(
      z.object({
        shareKey: z.string(),
        columnLabel: z.string().min(1).max(100),
        photoAttachmentIds: z.array(z.string()).min(1).max(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ProfileComparisonService.createFriendColumn({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // Get photo summary with ranking
  getPhotoSummary: protectedProcedure
    .input(z.object({ comparisonId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ProfileComparisonService.getPhotoSummary(
        input.comparisonId,
        ctx.session.user.id,
      );
    }),
});
