import { sql } from "drizzle-orm";

import type { TransactionClient } from "@/server/db";

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
