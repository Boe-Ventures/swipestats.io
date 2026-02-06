import { eq } from "drizzle-orm";
import { db, withTransaction } from "@/server/db";
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
  userTable,
} from "@/server/db/schema";

export interface TransferResult {
  hadProfile: boolean;
}

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
 * - User preferences and data (dating app activity, location, self-assessment, history, subscription/tier)
 */
export async function transferAnonymousUserData(
  fromUserId: string,
  toUserId: string,
): Promise<TransferResult> {
  console.log(
    `[Anonymous] Transferring data from ${fromUserId} to ${toUserId}`,
  );

  // Fetch all anonymous user fields before transaction
  const anonymousUserData = await db.query.userTable.findFirst({
    where: eq(userTable.id, fromUserId),
  });

  if (!anonymousUserData) {
    throw new Error(`Anonymous user ${fromUserId} not found`);
  }

  // Exclude fields that Better Auth manages or are system fields
  const {
    id: _id,
    email: _email,
    name: _name,
    emailVerified: _emailVerified,
    username: _username,
    displayUsername: _displayUsername,
    isAnonymous: _isAnonymous,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...fieldsToTransfer
  } = anonymousUserData;

  let hadProfile = false;

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

    // Check if user had any profiles
    hadProfile =
      (tinderProfilesUpdated.rowCount ?? 0) > 0 ||
      (hingeProfilesUpdated.rowCount ?? 0) > 0;

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

    // Transfer user preferences and data
    await tx
      .update(userTable)
      .set(fieldsToTransfer)
      .where(eq(userTable.id, toUserId));
    console.log(
      `[Anonymous] Transferred user data (${Object.keys(fieldsToTransfer).length} fields): ${fieldsToTransfer.swipestatsTier}`,
    );
  });

  console.log(
    `[Anonymous] Successfully transferred all data from ${fromUserId} to ${toUserId}`,
  );

  return { hadProfile };
}

// Export as a service object for consistency with other services
export const anonymousService = {
  transferAnonymousUserData,
};
