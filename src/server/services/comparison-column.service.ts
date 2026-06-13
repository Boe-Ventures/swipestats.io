import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { db as Database } from "@/server/db";
import { comparisonColumnTable } from "@/server/db/schema";

/**
 * Load a comparison column the caller OWNS, or throw NOT_FOUND. Ownership is via
 * the parent comparison's `userId` — this is the authorization-critical lookup
 * the roast/suggest mutations all share, so it lives in one place instead of
 * being hand-rolled per handler (where the ownership check could drift or be
 * forgotten). NOT_FOUND (not FORBIDDEN) on purpose: don't reveal that a column
 * id exists to someone who doesn't own it.
 *
 * Two variants rather than an options bag so each returns a concrete inferred
 * type (drizzle can't narrow the `with` shape from a runtime flag):
 *  - `WithContent` joins the ordered content + attachments (roast/suggest need
 *    photo URLs + prompt text).
 *  - `Light` joins only the parent comparison (ownership-only callers, e.g.
 *    delete).
 */
export async function loadOwnedColumnWithContent(
  db: typeof Database,
  columnId: string,
  userId: string,
) {
  const column = await db.query.comparisonColumnTable.findFirst({
    where: eq(comparisonColumnTable.id, columnId),
    with: {
      comparison: true,
      content: {
        orderBy: (content, { asc }) => [asc(content.order)],
        with: { attachment: true },
      },
    },
  });

  if (column?.comparison.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
  }
  return column;
}

export async function loadOwnedColumnLight(
  db: typeof Database,
  columnId: string,
  userId: string,
) {
  const column = await db.query.comparisonColumnTable.findFirst({
    where: eq(comparisonColumnTable.id, columnId),
    with: { comparison: true },
  });

  if (column?.comparison.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
  }
  return column;
}
