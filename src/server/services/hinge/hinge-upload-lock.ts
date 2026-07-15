import { sql } from "drizzle-orm";

import type { TransactionClient } from "@/server/db";
import { swipeRankBuildLockName } from "@/server/services/swipe-rank/constants";

/** Let Hinge writers coexist while provider-wide repairs take exclusivity. */
export async function lockHingeProviderMutationsInTx(
  tx: TransactionClient,
): Promise<void> {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock_shared(
      hashtextextended(${swipeRankBuildLockName("HINGE")}, 0)
    )
  `);
}

/**
 * Anonymous-account conversion changes every Hinge ownership row at once, so
 * it takes the exclusive form of the provider lock. Otherwise a cross-account
 * upload can replace the source row while the transfer's UPDATE is waiting and
 * the transfer can miss the newly inserted row before deleting the old user.
 */
export async function lockHingeProviderOwnershipTransferInTx(
  tx: TransactionClient,
): Promise<void> {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${swipeRankBuildLockName("HINGE")}, 0)
    )
  `);
}

export function hingeProfileUploadLockName(hingeId: string): string {
  const normalizedId = hingeId.trim();
  if (!normalizedId) {
    throw new Error("Hinge profile upload lock requires a profile ID.");
  }
  return `hinge-profile-upload:${normalizedId}`;
}

/** Serialize same-profile reconciliation; sort multiple IDs to avoid deadlock. */
export async function lockHingeProfileUploadsInTx(
  tx: TransactionClient,
  hingeIds: readonly string[],
): Promise<void> {
  const lockNames = [
    ...new Set(hingeIds.map(hingeProfileUploadLockName)),
  ].sort();
  for (const lockName of lockNames) {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockName}, 0))
    `);
  }
}

/**
 * Apply the canonical Hinge lock order for an admin mutation of one profile.
 * Keeping this composition in one helper prevents rare maintenance endpoints
 * from taking only the row-level lock (or taking the two locks in reverse).
 */
export async function lockHingeAdminProfileMutationInTx(
  tx: TransactionClient,
  hingeId: string,
): Promise<void> {
  await lockHingeProviderMutationsInTx(tx);
  await lockHingeProfileUploadsInTx(tx, [hingeId]);
}
