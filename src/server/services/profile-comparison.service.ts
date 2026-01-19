import { and, eq, isNull, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db, withTransaction } from "../db";
import {
  profileComparisonTable,
  comparisonColumnTable,
  comparisonColumnContentTable,
  profileComparisonFeedbackTable,
  attachmentTable,
  userTable,
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

  return comparison;
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
 * Update a column
 */
export async function updateColumn(data: {
  columnId: string;
  userId: string;
  bio?: string;
  title?: string;
  order?: number;
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
    })
    .where(eq(comparisonColumnTable.id, data.columnId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update column");
  }

  return updated;
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

  // Verify the target exists and user has access
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
    },
    owner: {
      id: comparison.user.id,
      name: comparison.user.name,
    },
    photos,
  };
}

/**
 * Create a column from a friend (requires anonymous user)
 */
export async function createFriendColumn(data: {
  shareKey: string;
  userId: string;
  columnLabel: string;
  photoAttachmentIds: string[];
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
    // Get the highest order number for existing columns
    const existingColumns = await tx.query.comparisonColumnTable.findMany({
      where: eq(comparisonColumnTable.comparisonId, comparison.id),
      orderBy: (table, { desc }) => [desc(table.order)],
      limit: 1,
    });

    const order =
      existingColumns.length > 0 ? existingColumns[0]!.order + 1 : 0;

    // Create column with HINGE provider and custom label
    const [column] = await tx
      .insert(comparisonColumnTable)
      .values({
        comparisonId: comparison.id,
        dataProvider: "HINGE",
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
export const ProfileComparisonService = {
  create: createComparison,
  get: getComparison,
  getPublic: getPublicComparison,
  list: listComparisons,
  update: updateComparison,
  delete: deleteComparison,
  addColumn,
  updateColumn,
  addContentToColumn,
  addPhotoToColumn, // legacy
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
