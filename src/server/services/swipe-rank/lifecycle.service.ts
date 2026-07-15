import { waitUntil } from "@vercel/functions";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db, withTransaction, type TransactionClient } from "@/server/db";
import {
  swipeRankProfileTable,
  tinderProfileTable,
  userTable,
} from "@/server/db/schema";

import { swipeRankBuildLockName } from "./constants";
import { invalidatePublicSwipeRankCache } from "./public-cache";
import type { RecomputeTinderSwipeRankFactsOptions } from "./recompute.service";

type RecomputeSwipeRankFacts = (
  options: RecomputeTinderSwipeRankFactsOptions,
) => Promise<unknown>;

export interface TinderSwipeRankRefreshDependencies {
  recompute: RecomputeSwipeRankFacts;
  defer: (task: Promise<unknown>) => void;
  logError: (message: string, error: unknown) => void;
}

export interface TinderSwipeRankUserRefreshDependencies extends TinderSwipeRankRefreshDependencies {
  listProfileIdsForUser: (userId: string) => Promise<string[]>;
}

const defaultDependencies: TinderSwipeRankRefreshDependencies = {
  recompute: async (options) => {
    const { recomputeTinderSwipeRankFacts } =
      await import("./recompute.service");
    return recomputeTinderSwipeRankFacts(options);
  },
  defer: waitUntil,
  logError: (message, error) => console.error(message, error),
};

const defaultUserDependencies: TinderSwipeRankUserRefreshDependencies = {
  ...defaultDependencies,
  listProfileIdsForUser: async (userId) => {
    const profiles = await db
      .select({ tinderId: tinderProfileTable.tinderId })
      .from(tinderProfileTable)
      .where(
        and(
          eq(tinderProfileTable.userId, userId),
          eq(tinderProfileTable.computed, false),
        ),
      );
    return profiles.map((profile) => profile.tinderId);
  },
};

function normalizedProfileIds(profileIds: readonly string[]): string[] {
  return [...new Set(profileIds.map((id) => id.trim()))].filter(Boolean);
}

function reportFailure(
  dependencies: Pick<TinderSwipeRankRefreshDependencies, "logError">,
  message: string,
  error: unknown,
): void {
  // Logging must not become the reason a committed upload is reported failed.
  try {
    dependencies.logError(message, error);
  } catch {
    // Deliberately ignored: the source mutation has already committed.
  }
}

/**
 * Source/profile transactions take a shared provider-wide lock. Uploads can
 * run concurrently with each other, while the exclusive recompute/snapshot
 * lock waits for every source transaction to commit before taking its source
 * snapshot.
 * Call this before mutating Tinder or SwipeRank rows so a build cannot recreate
 * ownership state from a pre-deletion REPEATABLE READ snapshot.
 */
export async function lockTinderSwipeRankMutationsInTx(
  tx: TransactionClient,
): Promise<void> {
  await lockTinderSwipeRankPolicyInTx(tx);
  await tx.execute(sql`
    INSERT INTO swipe_rank_source_mutation (data_provider, created_at)
    VALUES ('TINDER', now())
  `);
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

export function tinderProfileUploadLockName(tinderId: string): string {
  const normalizedId = tinderId.trim();
  if (!normalizedId) {
    throw new Error("Tinder profile upload lock requires a profile ID.");
  }
  return `tinder-profile-upload:${normalizedId}`;
}

/**
 * Serialize additive uploads for one Tinder profile inside their transaction.
 * The provider-wide shared lock protects SwipeRank snapshots but deliberately
 * permits unrelated profiles to upload concurrently; this narrower exclusive
 * lock closes the read/reconcile/insert race for the same profile.
 */
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

/**
 * Recompute one or more Tinder subjects without allowing analytical failures
 * to escape into the already-committed upload response.
 */
export async function refreshTinderSwipeRankBestEffort(
  profileIds: readonly string[],
  dependencies: Pick<
    TinderSwipeRankRefreshDependencies,
    "recompute" | "logError"
  > = defaultDependencies,
): Promise<boolean> {
  const ids = normalizedProfileIds(profileIds);
  if (ids.length === 0) return false;

  try {
    await dependencies.recompute({ profileIds: ids });
    invalidatePublicSwipeRankCache();
    return true;
  } catch (error) {
    reportFailure(
      dependencies,
      `[SwipeRank] Background refresh failed for ${ids.length} committed Tinder profile mutation(s).`,
      error,
    );
    return false;
  }
}

/**
 * Attach a best-effort refresh to the request lifecycle without extending the
 * upload response. If no request context exists (for example, a local script),
 * the already-started and internally guarded promise continues in process.
 */
export function scheduleTinderSwipeRankRefresh(
  profileIds: readonly string[],
  dependencies: TinderSwipeRankRefreshDependencies = defaultDependencies,
): void {
  const task = refreshTinderSwipeRankBestEffort(profileIds, dependencies);

  try {
    dependencies.defer(task);
  } catch (error) {
    reportFailure(
      dependencies,
      "[SwipeRank] Could not attach a refresh to the request lifecycle; it will continue in process.",
      error,
    );
    void task;
  }
}

/**
 * Refresh descriptor-backed registry rows after the owning user's location
 * changes. The user lookup and recompute are both attached to the request
 * lifetime so the registry cannot silently keep an old city/region/country.
 */
export function scheduleTinderSwipeRankUserRefresh(
  userId: string,
  dependencies: TinderSwipeRankUserRefreshDependencies = defaultUserDependencies,
): void {
  const id = userId.trim();
  if (!id) return;

  const task = (async () => {
    try {
      const profileIds = await dependencies.listProfileIdsForUser(id);
      return await refreshTinderSwipeRankBestEffort(profileIds, dependencies);
    } catch (error) {
      reportFailure(
        dependencies,
        "[SwipeRank] Could not resolve Tinder profiles after a user descriptor update.",
        error,
      );
      return false;
    }
  })();

  try {
    dependencies.defer(task);
  } catch (error) {
    reportFailure(
      dependencies,
      "[SwipeRank] Could not attach a user descriptor refresh to the request lifecycle; it will continue in process.",
      error,
    );
    void task;
  }
}

/**
 * Update user fields that feed Tinder rank descriptors under the same shared
 * source lock/journal used by profile uploads. This makes location changes
 * visible to launch/snapshot lineage even when a later upload step fails.
 */
export async function updateTinderSwipeRankUserLocation(input: {
  userId: string;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  timeZone?: string | null;
  continent?: string | null;
}) {
  const { userId, ...values } = input;
  const updatedUser = await withTransaction(async (tx) => {
    await lockTinderSwipeRankMutationsInTx(tx);
    const updated = await tx
      .update(userTable)
      .set(values)
      .where(eq(userTable.id, userId))
      .returning();
    if (!updated[0]) {
      throw new Error(`User ${userId} was not found for location update.`);
    }
    return updated[0];
  });

  invalidatePublicSwipeRankCache();
  scheduleTinderSwipeRankUserRefresh(userId);
  return updatedUser;
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

  await tx
    .delete(swipeRankProfileTable)
    .where(
      and(
        eq(swipeRankProfileTable.dataProvider, "TINDER"),
        eq(swipeRankProfileTable.userId, id),
      ),
    );
}
