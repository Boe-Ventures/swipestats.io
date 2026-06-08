import { and, eq, isNull, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db, withTransaction } from "../db";
import {
  profileComparisonTable,
  comparisonColumnTable,
  comparisonColumnContentTable,
  profileComparisonFeedbackTable,
  attachmentTable,
  mediaTable,
  tinderProfileTable,
  userTable,
  aiOutputTable,
  type DataProvider,
  type educationLevelEnum,
} from "../db/schema";

// Generate a cryptographically secure random share key
function generateShareKey(): string {
  return nanoid(10); // 10 chars: ~55 bits of entropy, collision-resistant
}

/**
 * Create a new profile comparison
 */
export async function createComparison(data: {
  userId: string;
  name?: string;
  defaultBio?: string;
  age?: number;
  city?: string;
  state?: string;
  country?: string;
  columns: Array<{
    dataProvider: DataProvider;
    bio?: string;
    title?: string;
    photoAttachmentIds?: string[];
  }>;
}) {
  return withTransaction(async (tx) => {
    // 1. Create comparison
    const [comparison] = await tx
      .insert(profileComparisonTable)
      .values({
        userId: data.userId,
        name: data.name,
        defaultBio: data.defaultBio,
        age: data.age,
        city: data.city,
        state: data.state,
        country: data.country,
        shareKey: generateShareKey(),
      })
      .returning();

    if (!comparison) {
      throw new Error("Failed to create comparison");
    }

    // 2. Create columns with photos
    for (const [index, col] of data.columns.entries()) {
      const [column] = await tx
        .insert(comparisonColumnTable)
        .values({
          comparisonId: comparison.id,
          dataProvider: col.dataProvider,
          bio: col.bio,
          title: col.title,
          order: index,
        })
        .returning();

      if (!column) {
        throw new Error("Failed to create column");
      }

      // 3. Link photos to column (legacy support for photoAttachmentIds)
      if (col.photoAttachmentIds && col.photoAttachmentIds.length > 0) {
        for (const [
          photoIndex,
          attachmentId,
        ] of col.photoAttachmentIds.entries()) {
          await tx.insert(comparisonColumnContentTable).values({
            columnId: column.id,
            type: "photo",
            attachmentId,
            order: photoIndex,
          });
        }
      }
    }

    return comparison;
  });
}

/**
 * Get a single comparison with all columns and content
 */
export async function getComparison(comparisonId: string, userId: string) {
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: and(
      eq(profileComparisonTable.id, comparisonId),
      eq(profileComparisonTable.userId, userId),
    ),
    with: {
      columns: {
        orderBy: (columns, { asc }) => [asc(columns.order)],
        with: {
          content: {
            orderBy: (content, { asc }) => [asc(content.order)],
            with: {
              attachment: true,
            },
          },
        },
      },
    },
  });

  if (!comparison) {
    throw new Error("Comparison not found");
  }

  // Roast status lives in ai_output (kind="profile_roast", columnId=column.id).
  // Fetch just the badge metadata for these columns in one query.
  const columnIds = comparison.columns.map((c) => c.id);
  const roastRows = columnIds.length
    ? await db.query.aiOutputTable.findMany({
        where: and(
          eq(aiOutputTable.kind, "profile_roast"),
          inArray(aiOutputTable.columnId, columnIds),
        ),
        columns: {
          columnId: true,
          tone: true,
          updatedAt: true,
        },
      })
    : [];
  const roastBySubject = new Map(roastRows.map((r) => [r.columnId, r]));

  // Derive a lightweight roast status per column (roasted? + tone + when) so the
  // edit page can badge it without shipping the roast payload. Staleness was
  // dropped in favour of on-demand re-roasting.
  const columns = comparison.columns.map((column) => {
    const roast = roastBySubject.get(column.id);
    const roastStatus = roast
      ? {
          roasted: true as const,
          tone: roast.tone,
          updatedAt: roast.updatedAt,
        }
      : {
          roasted: false as const,
          tone: null,
          updatedAt: null,
        };
    return { ...column, roastStatus };
  });

  return { ...comparison, columns };
}

/**
 * Get a public comparison by share key (no auth required)
 */
export async function getPublicComparison(shareKey: string) {
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: and(
      eq(profileComparisonTable.shareKey, shareKey),
      eq(profileComparisonTable.isPublic, true),
    ),
    with: {
      columns: {
        orderBy: (columns, { asc }) => [asc(columns.order)],
        with: {
          content: {
            orderBy: (content, { asc }) => [asc(content.order)],
            with: {
              attachment: true,
            },
          },
        },
      },
    },
  });

  if (!comparison) {
    throw new Error("Comparison not found or not public");
  }

  return comparison;
}

/**
 * List all comparisons for a user
 */
export async function listComparisons(userId: string) {
  const comparisons = await db.query.profileComparisonTable.findMany({
    where: eq(profileComparisonTable.userId, userId),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
    with: {
      columns: {
        orderBy: (columns, { asc }) => [asc(columns.order)],
        with: {
          content: {
            orderBy: (content, { asc }) => [asc(content.order)],
            with: {
              attachment: true,
            },
            limit: 1, // Just get first content item for thumbnail
          },
        },
      },
    },
  });

  return comparisons;
}

/**
 * Update comparison metadata
 */
export async function updateComparison(data: {
  id: string;
  userId: string;
  name?: string;
  profileName?: string;
  defaultBio?: string;
  age?: number;
  city?: string;
  state?: string;
  country?: string;
  nationality?: string;
  hometown?: string;
  heightCm?: number;
  educationLevel?: (typeof educationLevelEnum.enumValues)[number];
  isPublic?: boolean;
}) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.profileName !== undefined) updateData.profileName = data.profileName;
  if (data.defaultBio !== undefined) updateData.defaultBio = data.defaultBio;
  if (data.age !== undefined) updateData.age = data.age;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.nationality !== undefined) updateData.nationality = data.nationality;
  if (data.hometown !== undefined) updateData.hometown = data.hometown;
  if (data.heightCm !== undefined) updateData.heightCm = data.heightCm;
  if (data.educationLevel !== undefined)
    updateData.educationLevel = data.educationLevel;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

  const [comparison] = await db
    .update(profileComparisonTable)
    .set(updateData)
    .where(
      and(
        eq(profileComparisonTable.id, data.id),
        eq(profileComparisonTable.userId, data.userId),
      ),
    )
    .returning();

  if (!comparison) {
    throw new Error("Comparison not found or unauthorized");
  }

  return comparison;
}

/**
 * Delete a comparison
 */
export async function deleteComparison(id: string, userId: string) {
  // Deleting the comparison cascades to its columns, which cascade to their
  // ai_output roasts (columnId FK, onDelete cascade) — nothing to prune.
  const [deleted] = await db
    .delete(profileComparisonTable)
    .where(
      and(
        eq(profileComparisonTable.id, id),
        eq(profileComparisonTable.userId, userId),
      ),
    )
    .returning();

  if (!deleted) {
    throw new Error("Comparison not found or unauthorized");
  }

  return { success: true };
}

/**
 * Add a new column to a comparison
 */
export async function addColumn(data: {
  comparisonId: string;
  userId: string;
  dataProvider: DataProvider;
  bio?: string;
  title?: string;
}) {
  // Verify ownership
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: and(
      eq(profileComparisonTable.id, data.comparisonId),
      eq(profileComparisonTable.userId, data.userId),
    ),
  });

  if (!comparison) {
    throw new Error("Comparison not found or unauthorized");
  }

  // Get the highest order number for existing columns
  const existingColumns = await db.query.comparisonColumnTable.findMany({
    where: eq(comparisonColumnTable.comparisonId, data.comparisonId),
    orderBy: (table, { desc }) => [desc(table.order)],
    limit: 1,
  });

  const order = existingColumns.length > 0 ? existingColumns[0]!.order + 1 : 0;

  const [column] = await db
    .insert(comparisonColumnTable)
    .values({
      comparisonId: data.comparisonId,
      dataProvider: data.dataProvider,
      bio: data.bio,
      title: data.title,
      order,
    })
    .returning();

  if (!column) {
    throw new Error("Failed to create column");
  }

  return column;
}

/**
 * Duplicate a column (and all its content) into the same comparison — the
 * "fork to tweak & compare side by side" action. Photos are shared gallery
 * items, so we reuse the same attachment references rather than re-uploading.
 */
export async function duplicateColumn(data: {
  columnId: string;
  userId: string;
}) {
  const source = await db.query.comparisonColumnTable.findFirst({
    where: eq(comparisonColumnTable.id, data.columnId),
    with: {
      comparison: true,
      content: {
        orderBy: (content, { asc }) => [asc(content.order)],
      },
    },
  });

  if (source?.comparison.userId !== data.userId) {
    throw new Error("Column not found or unauthorized");
  }

  // Place the copy after the current last column.
  const lastColumn = await db.query.comparisonColumnTable.findMany({
    where: eq(comparisonColumnTable.comparisonId, source.comparisonId),
    orderBy: (table, { desc }) => [desc(table.order)],
    limit: 1,
  });
  const order = lastColumn.length > 0 ? lastColumn[0]!.order + 1 : 0;

  // neon-http has no transaction support — withTransaction runs on the
  // WebSocket (neon-serverless) driver, which does.
  return await withTransaction(async (tx) => {
    const [column] = await tx
      .insert(comparisonColumnTable)
      .values({
        comparisonId: source.comparisonId,
        dataProvider: source.dataProvider,
        bio: source.bio,
        title: source.title ? `${source.title} (copy)` : "Copy",
        order,
      })
      .returning();

    if (!column) {
      throw new Error("Failed to duplicate column");
    }

    if (source.content.length > 0) {
      await tx.insert(comparisonColumnContentTable).values(
        source.content.map((c) => ({
          columnId: column.id,
          type: c.type,
          attachmentId: c.attachmentId,
          caption: c.caption,
          prompt: c.prompt,
          answer: c.answer,
          order: c.order,
        })),
      );
    }

    return column;
  });
}

/**
 * Update a column
 */
export async function updateColumn(data: {
  columnId: string;
  userId: string;
  bio?: string;
  title?: string;
  order?: number;
  completed?: boolean;
}) {
  // Verify ownership
  const column = await db.query.comparisonColumnTable.findFirst({
    where: eq(comparisonColumnTable.id, data.columnId),
    with: {
      comparison: true,
    },
  });

  if (column?.comparison.userId !== data.userId) {
    throw new Error("Column not found or unauthorized");
  }

  const [updated] = await db
    .update(comparisonColumnTable)
    .set({
      bio: data.bio !== undefined ? data.bio : column.bio,
      title: data.title !== undefined ? data.title : column.title,
      order: data.order !== undefined ? data.order : column.order,
      // Toggle completion: stamp now when marking done, clear when undone.
      completedAt:
        data.completed === undefined
          ? column.completedAt
          : data.completed
            ? new Date()
            : null,
    })
    .where(eq(comparisonColumnTable.id, data.columnId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update column");
  }

  return updated;
}

/**
 * Reorder columns within a comparison. Takes the full desired ordering and
 * writes each column's new `order` index in a single transaction.
 */
export async function reorderColumns(data: {
  comparisonId: string;
  userId: string;
  columnOrders: Array<{ id: string; order: number }>;
}) {
  // Verify ownership of the parent comparison
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: eq(profileComparisonTable.id, data.comparisonId),
  });

  if (comparison?.userId !== data.userId) {
    throw new Error("Comparison not found or unauthorized");
  }

  // Only touch columns that actually belong to this comparison.
  await withTransaction(async (tx) => {
    for (const columnOrder of data.columnOrders) {
      await tx
        .update(comparisonColumnTable)
        .set({ order: columnOrder.order })
        .where(
          and(
            eq(comparisonColumnTable.id, columnOrder.id),
            eq(comparisonColumnTable.comparisonId, data.comparisonId),
          ),
        );
    }
  });

  return { success: true };
}

/**
 * Remove a column from a comparison. Cascades to the column's content and any
 * feedback (FKs are onDelete: "cascade"), so a single delete is sufficient.
 */
export async function removeColumn(data: { columnId: string; userId: string }) {
  // Verify ownership via the parent comparison
  const column = await db.query.comparisonColumnTable.findFirst({
    where: eq(comparisonColumnTable.id, data.columnId),
    with: {
      comparison: true,
    },
  });

  if (column?.comparison.userId !== data.userId) {
    throw new Error("Column not found or unauthorized");
  }

  // Deleting the column cascades to its ai_output roast (columnId FK).
  await db
    .delete(comparisonColumnTable)
    .where(eq(comparisonColumnTable.id, data.columnId));

  return { success: true };
}

/**
 * Add content (photo or prompt) to a column
 */
export async function addContentToColumn(data: {
  columnId: string;
  userId: string;
  type: "photo" | "prompt";
  attachmentId?: string;
  caption?: string;
  prompt?: string;
  answer?: string;
}) {
  // Verify ownership
  const column = await db.query.comparisonColumnTable.findFirst({
    where: eq(comparisonColumnTable.id, data.columnId),
    with: {
      comparison: true,
      content: {
        orderBy: (content, { desc }) => [desc(content.order)],
        limit: 1,
      },
    },
  });

  if (column?.comparison.userId !== data.userId) {
    throw new Error("Column not found or unauthorized");
  }

  // Get the highest order number for existing content
  const order = column.content.length > 0 ? column.content[0]!.order + 1 : 0;

  const [content] = await db
    .insert(comparisonColumnContentTable)
    .values({
      columnId: data.columnId,
      type: data.type,
      attachmentId: data.attachmentId,
      caption: data.caption,
      prompt: data.prompt,
      answer: data.answer,
      order,
    })
    .returning();

  if (!content) {
    throw new Error("Failed to add content to column");
  }

  return content;
}

/**
 * Add a photo to a column (legacy wrapper)
 */
export async function addPhotoToColumn(data: {
  columnId: string;
  userId: string;
  attachmentId: string;
  caption?: string;
}) {
  return addContentToColumn({
    ...data,
    type: "photo",
  });
}

/**
 * Bulk-add gallery photos to a column in a single transaction, appended in the
 * given array order.
 *
 * Prefer this over calling `addPhotoToColumn` N times in parallel: each of those
 * reads the column's current max `order` independently, so concurrent calls all
 * see the same value and collide on order (every photo lands at the same index,
 * leaving the final order undefined). Here the max is read once and the inserts
 * get sequential `order` values, so the photos keep the order they were passed.
 */
export async function addPhotosToColumn(data: {
  columnId: string;
  userId: string;
  photos: Array<{ attachmentId: string; caption?: string }>;
}) {
  if (data.photos.length === 0) return [];

  return withTransaction(async (tx) => {
    // Verify column ownership and read the current max order in one query.
    const column = await tx.query.comparisonColumnTable.findFirst({
      where: eq(comparisonColumnTable.id, data.columnId),
      with: {
        comparison: true,
        content: {
          orderBy: (content, { desc }) => [desc(content.order)],
          limit: 1,
        },
      },
    });

    if (column?.comparison.userId !== data.userId) {
      throw new Error("Column not found or unauthorized");
    }

    // Verify every attachment belongs to this user and isn't soft-deleted, so a
    // caller can't link someone else's blob into their column (mirrors the
    // ownership guard in createFriendColumn).
    const attachmentIds = data.photos.map((p) => p.attachmentId);
    const owned = await tx.query.attachmentTable.findMany({
      where: and(
        inArray(attachmentTable.id, attachmentIds),
        eq(attachmentTable.uploadedBy, data.userId),
        isNull(attachmentTable.deletedAt),
      ),
      columns: { id: true },
    });
    const ownedIds = new Set(owned.map((a) => a.id));
    if (data.photos.some((p) => !ownedIds.has(p.attachmentId))) {
      throw new Error("Some photos are invalid or not yours");
    }

    const startOrder =
      column.content.length > 0 ? column.content[0]!.order + 1 : 0;

    const rows = await tx
      .insert(comparisonColumnContentTable)
      .values(
        data.photos.map((photo, index) => ({
          columnId: data.columnId,
          type: "photo" as const,
          attachmentId: photo.attachmentId,
          caption: photo.caption,
          order: startOrder + index,
        })),
      )
      .returning();

    return rows;
  });
}

/**
 * Reorder content within a column
 */
export async function reorderContent(data: {
  columnId: string;
  userId: string;
  contentOrders: Array<{ id: string; order: number }>;
}) {
  // Verify ownership
  const column = await db.query.comparisonColumnTable.findFirst({
    where: eq(comparisonColumnTable.id, data.columnId),
    with: {
      comparison: true,
    },
  });

  if (column?.comparison.userId !== data.userId) {
    throw new Error("Column not found or unauthorized");
  }

  // Update the order of each content item
  await withTransaction(async (tx) => {
    for (const contentOrder of data.contentOrders) {
      await tx
        .update(comparisonColumnContentTable)
        .set({ order: contentOrder.order })
        .where(
          and(
            eq(comparisonColumnContentTable.id, contentOrder.id),
            eq(comparisonColumnContentTable.columnId, data.columnId),
          ),
        );
    }
  });

  return { success: true };
}

/**
 * Reorder photos within a column (legacy wrapper)
 */
export async function reorderPhotos(data: {
  columnId: string;
  userId: string;
  photoOrders: Array<{ id: string; order: number }>;
}) {
  return reorderContent({
    columnId: data.columnId,
    userId: data.userId,
    contentOrders: data.photoOrders,
  });
}

/**
 * Update content (caption, prompt, answer)
 */
export async function updateContent(data: {
  contentId: string;
  userId: string;
  caption?: string;
  prompt?: string;
  answer?: string;
}) {
  // Verify ownership
  const content = await db.query.comparisonColumnContentTable.findFirst({
    where: eq(comparisonColumnContentTable.id, data.contentId),
    with: {
      column: {
        with: {
          comparison: true,
        },
      },
    },
  });

  if (content?.column.comparison.userId !== data.userId) {
    throw new Error("Content not found or unauthorized");
  }

  const [updated] = await db
    .update(comparisonColumnContentTable)
    .set({
      caption: data.caption !== undefined ? data.caption : content.caption,
      prompt: data.prompt !== undefined ? data.prompt : content.prompt,
      answer: data.answer !== undefined ? data.answer : content.answer,
    })
    .where(eq(comparisonColumnContentTable.id, data.contentId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update content");
  }

  return updated;
}

/**
 * Delete content from a column
 */
export async function deleteContentFromColumn(data: {
  contentId: string;
  userId: string;
}) {
  // Verify ownership
  const content = await db.query.comparisonColumnContentTable.findFirst({
    where: eq(comparisonColumnContentTable.id, data.contentId),
    with: {
      column: {
        with: {
          comparison: true,
        },
      },
    },
  });

  if (content?.column.comparison.userId !== data.userId) {
    throw new Error("Content not found or unauthorized");
  }

  await db
    .delete(comparisonColumnContentTable)
    .where(eq(comparisonColumnContentTable.id, data.contentId));

  return { success: true };
}

/**
 * Delete a photo from a column (legacy wrapper)
 */
export async function deletePhotoFromColumn(data: {
  photoId: string;
  userId: string;
}) {
  return deleteContentFromColumn({
    contentId: data.photoId,
    userId: data.userId,
  });
}

/**
 * Create feedback on content item or column
 */
export async function createFeedback(data: {
  contentId?: string;
  columnId?: string;
  authorId: string;
  rating?: number;
  body?: string;
}) {
  // Validate that exactly one target is provided
  if (!data.contentId && !data.columnId) {
    throw new Error("Must provide either contentId or columnId");
  }
  if (data.contentId && data.columnId) {
    throw new Error("Cannot provide both contentId and columnId");
  }
  // Validate that at least rating or body is provided
  if (data.rating === undefined && !data.body) {
    throw new Error("Must provide rating or comment body");
  }

  // Verify the target exists and belongs to a public comparison. Feedback is
  // only ever submitted from the public share page, so a private comparison
  // (or a guessed content/column id) must be rejected.
  if (data.contentId) {
    const content = await db.query.comparisonColumnContentTable.findFirst({
      where: eq(comparisonColumnContentTable.id, data.contentId),
      with: {
        column: {
          with: {
            comparison: true,
          },
        },
      },
    });
    if (!content) {
      throw new Error("Content not found");
    }
    if (!content.column?.comparison?.isPublic) {
      throw new Error("Comparison is not public");
    }
  } else if (data.columnId) {
    const column = await db.query.comparisonColumnTable.findFirst({
      where: eq(comparisonColumnTable.id, data.columnId),
      with: {
        comparison: true,
      },
    });
    if (!column) {
      throw new Error("Column not found");
    }
    if (!column.comparison?.isPublic) {
      throw new Error("Comparison is not public");
    }
  }

  const [feedback] = await db
    .insert(profileComparisonFeedbackTable)
    .values({
      contentId: data.contentId ?? null,
      columnId: data.columnId ?? null,
      authorId: data.authorId,
      rating: data.rating ?? null,
      body: data.body ?? null,
    })
    .returning();

  if (!feedback) {
    throw new Error("Failed to create feedback");
  }

  return feedback;
}

/**
 * Update feedback (only author can update)
 */
export async function updateFeedback(data: {
  feedbackId: string;
  userId: string;
  rating?: number;
  body?: string;
}) {
  const feedback = await db.query.profileComparisonFeedbackTable.findFirst({
    where: eq(profileComparisonFeedbackTable.id, data.feedbackId),
  });

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  if (feedback.authorId !== data.userId) {
    throw new Error("Unauthorized: only author can update feedback");
  }

  // Validate that at least rating or body is provided
  const newRating = data.rating !== undefined ? data.rating : feedback.rating;
  const newBody = data.body !== undefined ? data.body : feedback.body;
  if (newRating === null && !newBody) {
    throw new Error("Must provide rating or comment body");
  }

  const [updated] = await db
    .update(profileComparisonFeedbackTable)
    .set({
      rating: data.rating !== undefined ? data.rating : feedback.rating,
      body: data.body !== undefined ? data.body : feedback.body,
    })
    .where(eq(profileComparisonFeedbackTable.id, data.feedbackId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update feedback");
  }

  return updated;
}

/**
 * Delete feedback (soft delete, only author or comparison owner)
 */
export async function deleteFeedback(data: {
  feedbackId: string;
  userId: string;
}) {
  const feedback = await db.query.profileComparisonFeedbackTable.findFirst({
    where: eq(profileComparisonFeedbackTable.id, data.feedbackId),
    with: {
      content: {
        with: {
          column: {
            with: {
              comparison: true,
            },
          },
        },
      },
      column: {
        with: {
          comparison: true,
        },
      },
    },
  });

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  // Check if user is author or comparison owner
  const comparison =
    feedback.content?.column.comparison ?? feedback.column?.comparison;
  if (!comparison) {
    throw new Error("Comparison not found");
  }

  const isAuthor = feedback.authorId === data.userId;
  const isOwner = comparison.userId === data.userId;

  if (!isAuthor && !isOwner) {
    throw new Error("Unauthorized: only author or comparison owner can delete");
  }

  const [deleted] = await db
    .update(profileComparisonFeedbackTable)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(profileComparisonFeedbackTable.id, data.feedbackId))
    .returning();

  if (!deleted) {
    throw new Error("Failed to delete feedback");
  }

  return { success: true };
}

/**
 * Get feedback for a content item
 */
export async function getFeedbackForContent(contentId: string) {
  const feedback = await db.query.profileComparisonFeedbackTable.findMany({
    where: and(
      eq(profileComparisonFeedbackTable.contentId, contentId),
      isNull(profileComparisonFeedbackTable.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      author: true,
    },
  });

  return feedback;
}

/**
 * Get feedback for a column (bio/overall)
 */
export async function getFeedbackForColumn(columnId: string) {
  const feedback = await db.query.profileComparisonFeedbackTable.findMany({
    where: and(
      eq(profileComparisonFeedbackTable.columnId, columnId),
      isNull(profileComparisonFeedbackTable.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      author: true,
    },
  });

  return feedback;
}

/**
 * Get all feedback for a comparison
 */
export async function getFeedbackForComparison(comparisonId: string) {
  // Get all columns for this comparison
  const columns = await db.query.comparisonColumnTable.findMany({
    where: eq(comparisonColumnTable.comparisonId, comparisonId),
    with: {
      content: true,
    },
  });

  const columnIds = columns.map((col) => col.id);
  const contentIds = columns.flatMap((col) => col.content.map((c) => c.id));

  if (columnIds.length === 0 && contentIds.length === 0) {
    return [];
  }

  const conditions = [];
  if (columnIds.length > 0) {
    conditions.push(
      inArray(profileComparisonFeedbackTable.columnId, columnIds),
    );
  }
  if (contentIds.length > 0) {
    conditions.push(
      inArray(profileComparisonFeedbackTable.contentId, contentIds),
    );
  }

  const allFeedback = await db.query.profileComparisonFeedbackTable.findMany({
    where: and(
      or(...conditions),
      isNull(profileComparisonFeedbackTable.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      author: true,
      content: {
        with: {
          column: true,
        },
      },
      column: true,
    },
  });

  return allFeedback;
}

/**
 * Get feedback for same attachment across columns (aggregate view)
 */
export async function getFeedbackForAttachment(attachmentId: string) {
  // Find all content items that use this attachment
  const contentItems = await db.query.comparisonColumnContentTable.findMany({
    where: eq(comparisonColumnContentTable.attachmentId, attachmentId),
  });

  const contentIds = contentItems.map((item) => item.id);

  if (contentIds.length === 0) {
    return [];
  }

  const allFeedback = await db.query.profileComparisonFeedbackTable.findMany({
    where: and(
      inArray(profileComparisonFeedbackTable.contentId, contentIds),
      isNull(profileComparisonFeedbackTable.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      author: true,
      content: {
        with: {
          column: true,
        },
      },
    },
  });

  return allFeedback;
}

/**
 * Get comparison + available photos for friend creation
 * Returns comparison metadata and all photos from the comparison owner
 */
export async function getForFriendCreation(shareKey: string) {
  // Get comparison by shareKey (don't require isPublic - shareKey is permission)
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: eq(profileComparisonTable.shareKey, shareKey),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
        },
      },
      columns: {
        orderBy: (columns, { asc }) => [asc(columns.order)],
        columns: {
          dataProvider: true,
        },
      },
    },
  });

  if (!comparison) {
    throw new Error("Comparison not found");
  }

  // Get all photos from the comparison owner
  const photos = await db.query.attachmentTable.findMany({
    where: and(
      eq(attachmentTable.uploadedBy, comparison.userId),
      eq(attachmentTable.resourceType, "user_photo"),
      isNull(attachmentTable.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return {
    comparison: {
      id: comparison.id,
      name: comparison.name,
      profileName: comparison.profileName,
      defaultBio: comparison.defaultBio,
      age: comparison.age,
      city: comparison.city,
      state: comparison.state,
      country: comparison.country,
      shareKey: comparison.shareKey,
      // The friend's version inherits the app the comparison is built around
      // so the preview + published column match the other columns.
      dataProvider: deriveComparisonProvider(comparison.columns),
    },
    owner: {
      id: comparison.user.id,
      name: comparison.user.name,
    },
    photos,
  };
}

/**
 * Default data provider for a friend-created column: mirror the comparison's
 * existing columns (the first one in display order), falling back to Hinge when
 * there are none yet. The friend can override this from the create UI.
 */
function deriveComparisonProvider(
  columns: { dataProvider: DataProvider }[],
): DataProvider {
  return columns[0]?.dataProvider ?? "HINGE";
}

/**
 * Create a column from a friend (requires anonymous user)
 */
export async function createFriendColumn(data: {
  shareKey: string;
  userId: string;
  columnLabel: string;
  photoAttachmentIds: string[];
  dataProvider?: DataProvider;
}) {
  // Verify user is anonymous
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.id, data.userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isAnonymous) {
    throw new Error("Only anonymous users can create friend columns");
  }

  // Get comparison by shareKey
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: eq(profileComparisonTable.shareKey, data.shareKey),
  });

  if (!comparison) {
    throw new Error("Comparison not found");
  }

  // Verify all photos belong to the comparison owner
  const photos = await db.query.attachmentTable.findMany({
    where: and(
      inArray(attachmentTable.id, data.photoAttachmentIds),
      eq(attachmentTable.uploadedBy, comparison.userId),
      eq(attachmentTable.resourceType, "user_photo"),
      isNull(attachmentTable.deletedAt),
    ),
  });

  if (photos.length !== data.photoAttachmentIds.length) {
    throw new Error(
      "Some photos are invalid or don't belong to the comparison owner",
    );
  }

  return withTransaction(async (tx) => {
    // Get existing columns to compute order + inherit the comparison's app
    const existingColumns = await tx.query.comparisonColumnTable.findMany({
      where: eq(comparisonColumnTable.comparisonId, comparison.id),
      orderBy: (table, { asc }) => [asc(table.order)],
    });

    const order =
      existingColumns.length > 0
        ? Math.max(...existingColumns.map((c) => c.order)) + 1
        : 0;

    // Use the friend's chosen app, falling back to the comparison's own
    const dataProvider =
      data.dataProvider ?? deriveComparisonProvider(existingColumns);

    // Create column with the selected provider and a custom label
    const [column] = await tx
      .insert(comparisonColumnTable)
      .values({
        comparisonId: comparison.id,
        dataProvider,
        title: data.columnLabel,
        order,
      })
      .returning();

    if (!column) {
      throw new Error("Failed to create column");
    }

    // Add photos to column in order
    for (const [
      photoIndex,
      attachmentId,
    ] of data.photoAttachmentIds.entries()) {
      await tx.insert(comparisonColumnContentTable).values({
        columnId: column.id,
        type: "photo",
        attachmentId,
        order: photoIndex,
      });
    }

    return column;
  });
}

/**
 * Get photo summary with ranking for a comparison
 * Groups photos by attachmentId and ranks them by combined score
 */
export async function getPhotoSummary(comparisonId: string, userId: string) {
  // Verify ownership
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: and(
      eq(profileComparisonTable.id, comparisonId),
      eq(profileComparisonTable.userId, userId),
    ),
    with: {
      columns: {
        orderBy: (columns, { asc }) => [asc(columns.order)],
        with: {
          content: {
            orderBy: (content, { asc }) => [asc(content.order)],
            with: {
              attachment: true,
            },
          },
        },
      },
    },
  });

  if (!comparison) {
    throw new Error("Comparison not found or unauthorized");
  }

  // Get all feedback for content items in this comparison
  const contentIds = comparison.columns.flatMap((col) =>
    col.content.map((c) => c.id),
  );

  const allFeedback =
    contentIds.length > 0
      ? await db.query.profileComparisonFeedbackTable.findMany({
          where: and(
            inArray(profileComparisonFeedbackTable.contentId, contentIds),
            isNull(profileComparisonFeedbackTable.deletedAt),
          ),
          with: {
            author: true,
          },
        })
      : [];

  // Group photos by attachmentId
  const photoMap = new Map<
    string,
    {
      attachment: typeof attachmentTable.$inferSelect;
      appearances: Array<{
        columnId: string;
        columnTitle: string | null;
        position: number;
        contentId: string;
      }>;
      ratings: number[];
      comments: Array<{
        id: string;
        body: string;
        author: typeof userTable.$inferSelect;
        createdAt: Date;
      }>;
    }
  >();

  const totalColumns = comparison.columns.length;

  // Process each column's content
  for (const column of comparison.columns) {
    for (const content of column.content) {
      if (
        content.type === "photo" &&
        content.attachmentId &&
        content.attachment
      ) {
        const attachmentId = content.attachmentId;

        if (!photoMap.has(attachmentId)) {
          photoMap.set(attachmentId, {
            attachment: content.attachment,
            appearances: [],
            ratings: [],
            comments: [],
          });
        }

        const photoData = photoMap.get(attachmentId)!;

        // Add appearance
        photoData.appearances.push({
          columnId: column.id,
          columnTitle: column.title,
          position: content.order,
          contentId: content.id,
        });

        // Add feedback for this content item
        const contentFeedback = allFeedback.filter(
          (f) => f.contentId === content.id,
        );

        for (const feedback of contentFeedback) {
          if (feedback.rating !== null && feedback.rating !== undefined) {
            photoData.ratings.push(feedback.rating);
          }
          if (feedback.body?.trim() && feedback.author) {
            photoData.comments.push({
              id: feedback.id,
              body: feedback.body,
              author: feedback.author,
              createdAt: feedback.createdAt,
            });
          }
        }
      }
    }
  }

  // Calculate scores and rank
  const rankedPhotos = Array.from(photoMap.entries()).map(
    ([attachmentId, data]) => {
      // Calculate average position (0-indexed, lower is better)
      const avgPosition =
        data.appearances.length > 0
          ? data.appearances.reduce((sum, a) => sum + a.position, 0) /
            data.appearances.length
          : 0;

      // Find max position across all columns
      const maxPosition = Math.max(
        ...comparison.columns.map((col) => col.content.length - 1),
        0,
      );

      // Position score: (maxPosition - avgPosition) / maxPosition (0-1 scale)
      const positionScore =
        maxPosition > 0 ? (maxPosition - avgPosition) / maxPosition : 0.5;

      // Frequency score: how many unique columns include this photo
      const uniqueColumns = new Set(data.appearances.map((a) => a.columnId));
      const frequency = uniqueColumns.size;
      const frequencyScore = totalColumns > 0 ? frequency / totalColumns : 0;

      // Rating score: average rating normalized to 0-1
      const avgRating =
        data.ratings.length > 0
          ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length
          : null;
      const ratingScore = avgRating !== null ? (avgRating + 1) / 6 : 0.5; // Normalize -1 to 5 scale

      // Combined score (weighted)
      const combinedScore =
        positionScore * 0.4 + frequencyScore * 0.3 + ratingScore * 0.3;

      // Calculate position range for this photo
      const positions = data.appearances.map((a) => a.position);
      const photoMinPosition =
        positions.length > 0 ? Math.min(...positions) : 0;
      const photoMaxPosition =
        positions.length > 0 ? Math.max(...positions) : 0;

      return {
        attachmentId,
        attachment: data.attachment,
        rank: 0, // Will be set after sorting
        score: combinedScore,
        avgPosition,
        minPosition: photoMinPosition,
        maxPosition: photoMaxPosition,
        frequency,
        avgRating,
        totalRatings: data.ratings.length,
        comments: data.comments.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        ),
        appearances: data.appearances,
      };
    },
  );

  // Sort by score (descending) and assign ranks
  rankedPhotos.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-breaker: use attachmentId for consistency
    return a.attachmentId.localeCompare(b.attachmentId);
  });

  // Assign ranks
  rankedPhotos.forEach((photo, index) => {
    photo.rank = index + 1;
  });

  return rankedPhotos;
}

// Service object export
/**
 * Bridge a user's already-uploaded Tinder photos (the `media` table) into
 * `attachment` rows (resourceType "user_photo") by pointing at the same public
 * URLs — no blob copy needed. The unique index on attachment.url keeps this
 * idempotent, so it can run repeatedly without piling up duplicate gallery
 * photos. Returns the attachment ids in media order.
 */
async function importTinderPhotosAsAttachments(
  userId: string,
  tinderId: string,
): Promise<string[]> {
  // 1. The profile must belong to the requesting user
  const profile = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    columns: { tinderId: true, userId: true },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }
  if (profile.userId !== userId) {
    throw new Error("You can only build a comparison from your own profile");
  }

  // 2. Pull the profile's photos. We don't filter on media.type so this stays
  // consistent with the public getMedia query that powers the CTA preview.
  const media = await db.query.mediaTable.findMany({
    where: eq(mediaTable.tinderProfileId, tinderId),
    limit: 9,
  });
  const photos = media.filter((m) => m.url);

  if (photos.length === 0) {
    throw new Error("This profile has no photos to build a comparison from");
  }

  const urls = photos.map((m) => m.url);

  // 3. Mirror each photo into a user_photo attachment (idempotent on url)
  await db
    .insert(attachmentTable)
    .values(
      photos.map((m, index) => ({
        resourceType: "user_photo" as const,
        resourceId: "gallery",
        uploadedBy: userId,
        filename: `tinder-${tinderId}-${index}`,
        originalFilename: `tinder-photo-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        size: 0,
        url: m.url,
        metadata: { source: "tinder_media", tinderId },
      })),
    )
    .onConflictDoNothing({ target: attachmentTable.url });

  // 4. Resolve attachment ids for those URLs, preserving the media order
  const attachments = await db.query.attachmentTable.findMany({
    where: and(
      inArray(attachmentTable.url, urls),
      isNull(attachmentTable.deletedAt),
    ),
  });
  const idByUrl = new Map(attachments.map((a) => [a.url, a.id]));
  const photoAttachmentIds = urls
    .map((url) => idByUrl.get(url))
    .filter((id): id is string => !!id);

  if (photoAttachmentIds.length === 0) {
    throw new Error("Failed to import photos");
  }

  return photoAttachmentIds;
}

/**
 * Seed a brand-new comparison from a user's already-uploaded Tinder photos.
 * Used by the dashboard / insights CTAs where there's no existing comparison.
 */
export async function createFromTinderMedia(data: {
  userId: string;
  tinderId: string;
}) {
  const photoAttachmentIds = await importTinderPhotosAsAttachments(
    data.userId,
    data.tinderId,
  );

  return createComparison({
    userId: data.userId,
    name: "My Tinder profile",
    columns: [{ dataProvider: "TINDER", photoAttachmentIds }],
  });
}

/**
 * Seed an EXISTING comparison's empty columns from the user's uploaded Tinder
 * photos. This is the empty-state "Use my uploaded Tinder photos" path — it
 * fills the comparison the user is already on (consistent with the adjacent
 * "Upload your photos" button) instead of creating a separate one.
 */
export async function seedComparisonFromTinderMedia(data: {
  userId: string;
  comparisonId: string;
  tinderId: string;
}) {
  // Verify comparison ownership and find which columns still need content.
  const comparison = await db.query.profileComparisonTable.findFirst({
    where: eq(profileComparisonTable.id, data.comparisonId),
    with: { columns: { with: { content: { columns: { id: true } } } } },
  });

  if (comparison?.userId !== data.userId) {
    throw new Error("Comparison not found or unauthorized");
  }

  const photoAttachmentIds = await importTinderPhotosAsAttachments(
    data.userId,
    data.tinderId,
  );

  // Seed every empty column so the whole comparison is set up at once. Skip
  // columns that already have content so we never duplicate into a filled one.
  const emptyColumns = comparison.columns.filter(
    (c) => c.content.length === 0,
  );
  const targets = emptyColumns.length > 0 ? emptyColumns : comparison.columns;

  for (const column of targets) {
    await addPhotosToColumn({
      columnId: column.id,
      userId: data.userId,
      photos: photoAttachmentIds.map((attachmentId) => ({ attachmentId })),
    });
  }

  return {
    seededColumns: targets.length,
    photoCount: photoAttachmentIds.length,
  };
}

export const ProfileComparisonService = {
  create: createComparison,
  createFromTinderMedia,
  seedComparisonFromTinderMedia,
  get: getComparison,
  getPublic: getPublicComparison,
  list: listComparisons,
  update: updateComparison,
  delete: deleteComparison,
  addColumn,
  updateColumn,
  reorderColumns,
  removeColumn,
  duplicateColumn,
  addContentToColumn,
  addPhotoToColumn, // legacy
  addPhotosToColumn,
  updateContent,
  reorderContent,
  reorderPhotos, // legacy
  deleteContentFromColumn,
  deletePhotoFromColumn, // legacy
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackForContent,
  getFeedbackForColumn,
  getFeedbackForComparison,
  getFeedbackForAttachment,
  getForFriendCreation,
  createFriendColumn,
  getPhotoSummary,
} as const;
