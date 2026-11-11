import { eq } from "drizzle-orm";
import { withTransaction } from "@/server/db";
import {
  aiOutputTable,
  attachmentTable,
  catalogEntryMemberTable,
  cohortDefinitionTable,
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
  type User,
} from "@/server/db/schema";
import { invalidatePublicSwipeRankCache } from "./swipe-rank/public-cache";
import { lockHingeProviderOwnershipTransferInTx } from "./hinge/hinge-upload-lock";
import { lockTinderProviderOwnershipTransferInTx } from "./profile/upload-lock";

export interface TransferResult {
  hadProfile: boolean;
}

/**
 * Transfer application resources from a guest to a registered account.
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
 * - SwipeRank live ownership, AI artifacts and custom cohort definitions
 * - Application preferences/history without replacing destination account identity
 * - Destination billing is preserved; any source billing requires reconciliation
 * - Deletion of the old anonymous user only after every transfer succeeds
 */
export async function transferAnonymousUserData(
  fromUserId: string,
  toUserId: string,
): Promise<TransferResult> {
  console.log(
    `[Anonymous] Transferring data from ${fromUserId} to ${toUserId}`,
  );

  if (fromUserId === toUserId) {
    throw new Error("Guest conversion requires two different accounts.");
  }

  let hadProfile = false;

  await withTransaction(async (tx) => {
    // Serialize with provider uploads before reading/updating ownership. A shared
    // upload lock is insufficient here: a cross-account merge replaces its
    // source row and an already-running bulk UPDATE could otherwise miss the
    // replacement immediately before this transaction deletes fromUserId.
    await lockHingeProviderOwnershipTransferInTx(tx);
    await lockTinderProviderOwnershipTransferInTx(tx);

    // Read both accounts under row locks only after provider locks. This keeps
    // billing snapshots current and avoids racing uploads that hold user FKs.
    const users = new Map<string, User>();
    for (const id of [fromUserId, toUserId].sort()) {
      const [user] = await tx
        .select()
        .from(userTable)
        .where(eq(userTable.id, id))
        .for("update");
      if (user) users.set(id, user);
    }
    const source = users.get(fromUserId);
    const destination = users.get(toUserId);
    if (source?.isAnonymous !== true) {
      throw new Error(
        "Guest conversion requires an existing anonymous source.",
      );
    }
    if (destination?.isAnonymous !== false) {
      throw new Error(
        "Guest conversion requires an existing registered destination.",
      );
    }
    // Billing webhooks (including lifetime refunds) reference the checkout's
    // original user ID. No local transfer can safely reconcile that identity.
    if (
      source.swipestatsTier !== "FREE" ||
      source.isLifetime ||
      source.subscriptionProviderId ||
      source.subscriptionCurrentPeriodEnd
    ) {
      throw new Error(
        "This guest account has billing history. Contact support to reconcile purchases and subscriptions before conversion; neither account has been changed.",
      );
    }

    // Do not silently choose which owned profile/history to retain. The unique
    // constraints also reject a concurrent collision and roll back everything.
    for (const table of [
      tinderProfileTable,
      hingeProfileTable,
      rayaProfileTable,
    ]) {
      const [sourceProfile] = await tx
        .select({ userId: table.userId })
        .from(table)
        .where(eq(table.userId, fromUserId))
        .limit(1);
      const [destinationProfile] = await tx
        .select({ userId: table.userId })
        .from(table)
        .where(eq(table.userId, toUserId))
        .limit(1);
      if (sourceProfile && destinationProfile) {
        throw new Error(
          "Both accounts already have a profile for the same dating app. Contact support to preserve both histories.",
        );
      }
    }
    // Catalog membership is an access grant, not an ordinary preference. Do
    // not discard it through cascade or implicitly transfer privileged access.
    const [membership] = await tx
      .select({ userId: catalogEntryMemberTable.userId })
      .from(catalogEntryMemberTable)
      .where(eq(catalogEntryMemberTable.userId, fromUserId))
      .limit(1);
    if (membership) {
      throw new Error(
        "This guest account has catalog access that requires support-assisted conversion.",
      );
    }

    // Explicit application-field allowlist: identity, security, consent and
    // destination billing fields must never be overwritten by guest defaults.
    const mergeHistory = (current: unknown, incoming: unknown): unknown[] => {
      if (!Array.isArray(current) || !Array.isArray(incoming)) {
        throw new Error(
          "Account history needs review before guest conversion.",
        );
      }
      const unique = new Map<string, unknown>();
      for (const value of [
        ...(current as unknown[]),
        ...(incoming as unknown[]),
      ]) {
        unique.set(JSON.stringify(value), value);
      }
      return [...unique.values()];
    };
    const fieldsToTransfer = {
      activeOnTinder: destination.activeOnTinder || source.activeOnTinder,
      activeOnHinge: destination.activeOnHinge || source.activeOnHinge,
      activeOnBumble: destination.activeOnBumble || source.activeOnBumble,
      activeOnHappn: destination.activeOnHappn || source.activeOnHappn,
      activeOnOther: destination.activeOnOther || source.activeOnOther,
      otherDatingApps: [
        ...new Set([
          ...(destination.otherDatingApps ?? []),
          ...(source.otherDatingApps ?? []),
        ]),
      ],
      languages: [...new Set([...destination.languages, ...source.languages])],
      currentHotness: destination.currentHotness ?? source.currentHotness,
      currentHappiness: destination.currentHappiness ?? source.currentHappiness,
      timeZone: destination.timeZone ?? source.timeZone,
      city: destination.city ?? source.city,
      country: destination.country ?? source.country,
      region: destination.region ?? source.region,
      continent: destination.continent ?? source.continent,
      firstStartedWithDatingApps:
        destination.firstStartedWithDatingApps ??
        source.firstStartedWithDatingApps,
      happinessHistory: mergeHistory(
        destination.happinessHistory,
        source.happinessHistory,
      ),
      hotnessHistory: mergeHistory(
        destination.hotnessHistory,
        source.hotnessHistory,
      ),
      locationHistory: mergeHistory(
        destination.locationHistory,
        source.locationHistory,
      ),
      pastDatingApps: mergeHistory(
        destination.pastDatingApps,
        source.pastDatingApps,
      ),
      relationshipHistory: mergeHistory(
        destination.relationshipHistory,
        source.relationshipHistory,
      ),
    };

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

    // Preserve generated/purchased artifacts and user-defined cohorts before
    // deleting the source account, whose foreign keys otherwise cascade.
    await tx
      .update(aiOutputTable)
      .set({ userId: toUserId })
      .where(eq(aiOutputTable.userId, fromUserId));
    await tx
      .update(cohortDefinitionTable)
      .set({ createdByUserId: toUserId })
      .where(eq(cohortDefinitionTable.createdByUserId, fromUserId));

    // Transfer user preferences and data
    await tx
      .update(userTable)
      .set(fieldsToTransfer)
      .where(eq(userTable.id, toUserId));
    console.log(
      `[Anonymous] Transferred application preferences (${Object.keys(fieldsToTransfer).length} fields); destination billing preserved`,
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
