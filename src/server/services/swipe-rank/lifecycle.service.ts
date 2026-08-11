import { and, eq, inArray, sql } from "drizzle-orm";

import type { TransactionClient } from "@/server/db";
import { swipeRankProfileTable } from "@/server/db/schema";

import { swipeRankBuildLockName } from "./constants";

function normalizedProfileIds(profileIds: readonly string[]): string[] {
  return [...new Set(profileIds.map((id) => id.trim()))].filter(Boolean);
}

/**
 * Serialize field-policy changes with full builds and snapshots without
 * pretending that moderation changed source data or invalidating fact lineage.
 */
export async function lockTinderSwipeRankPolicyInTx(
  tx: TransactionClient,
): Promise<void> {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock_shared(
      hashtextextended(${swipeRankBuildLockName("TINDER")}, 0)
    )
  `);
}

/**
 * Remove provider-specific analytical state in the same transaction that
 * removes the source Tinder profile. Live facts and the person's frozen
 * snapshot entries cascade from the registry row. The aggregate edition field
 * size remains an historical count, but no per-person numerator, denominator,
 * or quality record survives erasure.
 */
export async function purgeTinderSwipeRankProfilesInTx(
  tx: TransactionClient,
  profileIds: readonly string[],
): Promise<void> {
  const ids = normalizedProfileIds(profileIds);
  if (ids.length === 0) return;

  await lockTinderSwipeRankPolicyInTx(tx);

  await tx
    .delete(swipeRankProfileTable)
    .where(
      and(
        eq(swipeRankProfileTable.dataProvider, "TINDER"),
        inArray(swipeRankProfileTable.providerProfileId, ids),
      ),
    );
}

/**
 * Rebind a claimed Tinder profile before the old anonymous user is deleted.
 */
export async function transferTinderSwipeRankOwnershipInTx(
  tx: TransactionClient,
  input: {
    providerProfileId: string;
    fromUserId: string;
    toUserId: string;
  },
): Promise<void> {
  const registry = await tx.query.swipeRankProfileTable.findFirst({
    where: and(
      eq(swipeRankProfileTable.dataProvider, "TINDER"),
      eq(swipeRankProfileTable.providerProfileId, input.providerProfileId),
      eq(swipeRankProfileTable.userId, input.fromUserId),
    ),
    columns: { id: true },
  });
  if (!registry) return;

  await tx
    .update(swipeRankProfileTable)
    .set({ userId: input.toUserId })
    .where(eq(swipeRankProfileTable.id, registry.id));
}

/** Purge every Tinder analytical subject owned by an account being deleted. */
export async function purgeTinderSwipeRankUserInTx(
  tx: TransactionClient,
  userId: string,
): Promise<void> {
  const id = userId.trim();
  if (!id) return;

  await lockTinderSwipeRankPolicyInTx(tx);

  await tx
    .delete(swipeRankProfileTable)
    .where(
      and(
        eq(swipeRankProfileTable.dataProvider, "TINDER"),
        eq(swipeRankProfileTable.userId, id),
      ),
    );
}
