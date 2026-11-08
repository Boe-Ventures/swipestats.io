import { sql } from "drizzle-orm";

import type { TransactionClient } from "@/server/db";
import { swipeRankBuildLockName } from "@/server/services/swipe-rank/constants";

/** Coordinate ingestion with account conversion without serializing uploads. */
export async function lockTinderProviderMutationsInTx(
  tx: TransactionClient,
): Promise<void> {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock_shared(
      hashtextextended(${swipeRankBuildLockName("TINDER")}, 0)
    )
  `);
}

/** Conversion must not miss rows created while ownership is being transferred. */
export async function lockTinderProviderOwnershipTransferInTx(
  tx: TransactionClient,
): Promise<void> {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${swipeRankBuildLockName("TINDER")}, 0)
    )
  `);
}

export function tinderProfileUploadLockName(tinderId: string): string {
  const normalizedId = tinderId.trim();
  if (!normalizedId) {
    throw new Error("Tinder profile upload lock requires a profile ID.");
  }
  return `tinder-profile-upload:${normalizedId}`;
}

/** Serialize source ingestion for one Tinder profile. */
export async function lockTinderProfileUploadInTx(
  tx: TransactionClient,
  tinderId: string,
): Promise<void> {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${tinderProfileUploadLockName(tinderId)}, 0)
    )
  `);
}
