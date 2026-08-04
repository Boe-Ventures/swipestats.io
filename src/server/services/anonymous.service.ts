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
  rayaProfileTable,
  swipeRankProfileTable,
  tinderProfileTable,
  userTable,
} from "@/server/db/schema";
import { lockTinderSwipeRankMutationsInTx } from "./swipe-rank/lifecycle.service";
import { invalidatePublicSwipeRankCache } from "./swipe-rank/public-cache";
import { lockHingeProviderOwnershipTransferInTx } from "./hinge/hinge-upload-lock";

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
 * - Raya profiles (userId)
 * - Events (userId)
 * - Custom data (userId)
 * - Original anonymized files (userId)
 * - Purchases (userId)
 * - Posts (createdById)
 * - Attachments (uploadedBy)
 * - Profile comparisons (userId)
 * - Profile comparison feedback (authorId)
 * - SwipeRank live ownership
 * - User preferences and data (dating app activity, location, self-assessment, history, subscription/tier)
 * - Deletion of the old anonymous user only after every transfer succeeds
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
    await lockTinderSwipeRankMutationsInTx(tx);
    // Serialize with Hinge uploads before reading/updating ownership. A shared
    // upload lock is insufficient here: a cross-account merge replaces its
    // source row and an already-running bulk UPDATE could otherwise miss the
    // replacement immediately before this transaction deletes fromUserId.
    await lockHingeProviderOwnershipTransferInTx(tx);
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

    // Transfer Raya profiles
    const rayaProfilesUpdated = await tx
      .update(rayaProfileTable)
      .set({ userId: toUserId })
      .where(eq(rayaProfileTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${rayaProfilesUpdated.rowCount ?? 0} Raya profiles`,
    );

    // Check if user had any profiles
    hadProfile =
      (tinderProfilesUpdated.rowCount ?? 0) > 0 ||
      (hingeProfilesUpdated.rowCount ?? 0) > 0 ||
      (rayaProfilesUpdated.rowCount ?? 0) > 0;

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

    // Keep SwipeRank ownership aligned with the transferred provider profile.
    const swipeRankProfilesUpdated = await tx
      .update(swipeRankProfileTable)
      .set({ userId: toUserId })
      .where(eq(swipeRankProfileTable.userId, fromUserId));
    console.log(
      `[Anonymous] Transferred ${swipeRankProfilesUpdated.rowCount ?? 0} SwipeRank profiles`,
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

    // Better Auth's native anonymous deletion is disabled. Delete here so the
    // resource transfer and old-account cleanup either commit together or roll
    // back together.
    await tx.delete(userTable).where(eq(userTable.id, fromUserId));
    console.log("[Anonymous] Deleted transferred anonymous user");
  });

  invalidatePublicSwipeRankCache();

  console.log(
    `[Anonymous] Successfully transferred all data from ${fromUserId} to ${toUserId}`,
  );

  return { hadProfile };
}

// Export as a service object for consistency with other services
export const anonymousService = {
  transferAnonymousUserData,
};
