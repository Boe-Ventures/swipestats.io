import { eq } from "drizzle-orm";
import { withTransaction } from "@/server/db";
import {
  attachmentTable,
  customDataTable,
  eventTable,
  hingeProfileTable,
  originalAnonymizedFileTable,
  postTable,
  profileComparisonFeedbackTable,
  profileComparisonTable,
  purchaseTable,
  tinderProfileTable,
} from "@/server/db/schema";

/**
 * Transfer all resources from an anonymous user to a newly created real user.
 * This is called when an anonymous user converts their account by signing up or signing in.
 *
 * The transfer includes:
 * - Tinder profiles (userId)
 * - Hinge profiles (userId)
 * - Events (userId)
 * - Custom data (userId)
 * - Original anonymized files (userId)
 * - Purchases (userId)
 * - Posts (createdById)
 * - Attachments (uploadedBy)
 * - Profile comparisons (userId)
 * - Profile comparison feedback (authorId)
 */
export async function transferAnonymousUserData(
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  console.log(
    `[Anonymous] Transferring data from ${fromUserId} to ${toUserId}`,
  );

  await withTransaction(async (tx) => {
    // Transfer Tinder profiles
    const tinderProfilesUpdated = await tx
      .update(tinderProfileTable)
      .set({ userId: toUserId })
      .where(eq(tinderProfileTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${tinderProfilesUpdated.rowCount ?? 0} Tinder profiles`,
    );

    // Transfer Hinge profiles
    const hingeProfilesUpdated = await tx
      .update(hingeProfileTable)
      .set({ userId: toUserId })
      .where(eq(hingeProfileTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${hingeProfilesUpdated.rowCount ?? 0} Hinge profiles`,
    );

    // Transfer events
    const eventsUpdated = await tx
      .update(eventTable)
      .set({ userId: toUserId })
      .where(eq(eventTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${eventsUpdated.rowCount ?? 0} events`,
    );

    // Transfer custom data
    const customDataUpdated = await tx
      .update(customDataTable)
      .set({ userId: toUserId })
      .where(eq(customDataTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${customDataUpdated.rowCount ?? 0} custom data records`,
    );

    // Transfer original anonymized files
    const filesUpdated = await tx
      .update(originalAnonymizedFileTable)
      .set({ userId: toUserId })
      .where(eq(originalAnonymizedFileTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${filesUpdated.rowCount ?? 0} original anonymized files`,
    );

    // Transfer purchases
    const purchasesUpdated = await tx
      .update(purchaseTable)
      .set({ userId: toUserId })
      .where(eq(purchaseTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${purchasesUpdated.rowCount ?? 0} purchases`,
    );

    // Transfer posts (createdById)
    const postsUpdated = await tx
      .update(postTable)
      .set({ createdById: toUserId })
      .where(eq(postTable.createdById, fromUserId));
    console.log(`[Anonymous] Transferred ${postsUpdated.rowCount ?? 0} posts`);

    // Transfer attachments (uploadedBy)
    const attachmentsUpdated = await tx
      .update(attachmentTable)
      .set({ uploadedBy: toUserId })
      .where(eq(attachmentTable.uploadedBy, fromUserId));
    console.log(
      `[Anonymous] Transferred ${attachmentsUpdated.rowCount ?? 0} attachments`,
    );

    // Transfer profile comparisons (userId)
    const comparisonsUpdated = await tx
      .update(profileComparisonTable)
      .set({ userId: toUserId })
      .where(eq(profileComparisonTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${comparisonsUpdated.rowCount ?? 0} profile comparisons`,
    );

    // Transfer profile comparison feedback (authorId)
    const feedbackUpdated = await tx
      .update(profileComparisonFeedbackTable)
      .set({ authorId: toUserId })
      .where(eq(profileComparisonFeedbackTable.authorId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${feedbackUpdated.rowCount ?? 0} profile comparison feedback records`,
    );
  });

  console.log(
    `[Anonymous] Successfully transferred all data from ${fromUserId} to ${toUserId}`,
  );
}

// Export as a service object for consistency with other services
export const anonymousService = {
  transferAnonymousUserData,
};
