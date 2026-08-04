import { and, eq, type SQL } from "drizzle-orm";

import { hingeProfileTable } from "@/server/db/schema";

/**
 * Authorization must be part of the mutating SQL predicate, not only a router
 * preflight. An anonymous session can be converted to a real user while an
 * upload is waiting for its provider/profile locks.
 */
export function hingeProfileOwnedBy(
  hingeId: string,
  userId: string,
): SQL<unknown> {
  return and(
    eq(hingeProfileTable.hingeId, hingeId),
    eq(hingeProfileTable.userId, userId),
  )!;
}
