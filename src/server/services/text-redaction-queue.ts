import { eq, inArray } from "drizzle-orm";
import type { TransactionClient } from "@/server/db";
import { matchTable } from "@/server/db/schema";

// New matches start pending automatically. Repeat uploads invalidate their
// conversation receipts inside the same transaction as the source changes.
// The subscription-backed worker processes pending matches outside the request.
export async function queueTextRedactionInTx(
  tx: TransactionClient,
  provider: "TINDER" | "HINGE",
  profileIds: string[],
) {
  if (!profileIds.length) return;
  const column =
    provider === "TINDER"
      ? matchTable.tinderProfileId
      : matchTable.hingeProfileId;
  await tx
    .update(matchTable)
    .set({ textRedaction: null })
    .where(
      profileIds.length === 1
        ? eq(column, profileIds[0]!)
        : inArray(column, profileIds),
    );
}
