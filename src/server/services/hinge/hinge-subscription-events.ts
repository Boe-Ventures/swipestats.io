import { and, eq, sql } from "drizzle-orm";
import { createId } from "@/server/db/utils";
import { eventTable } from "@/server/db/schema";
import type { TransactionClient } from "@/server/db";
import type { HingeSubscriptionPeriod } from "@/lib/hinge/csv-activity";

/** Reuse ordinary life events. Account-scoped source hashes make renewals and
 * retries idempotent without introducing a separate subscription model. */
export async function syncHingeSubscriptionEvents(
  tx: TransactionClient,
  userId: string,
  periods: HingeSubscriptionPeriod[] = [],
  retained: HingeSubscriptionPeriod[] = [],
) {
  const previousById = new Map(retained.map((period) => [period.id, period]));
  for (const period of periods) {
    const sourcePrefix = `evt_hinge_subscription_${period.id}_`;
    const existing = await tx.query.eventTable.findFirst({
      where: and(
        eq(eventTable.userId, userId),
        sql`starts_with(${eventTable.id}, ${sourcePrefix})`,
      ),
      columns: { id: true },
    });
    // The prefix survives anonymous-account conversion. A random suffix keeps
    // the same source export from colliding with another owner's event IDs.
    const id = existing?.id ?? `${sourcePrefix}${createId("evt")}`;
    if (!existing)
      await tx
        .insert(eventTable)
        .values({
          id,
          userId,
          name: "Hinge subscription",
          type: "SUBSCRIPTION",
          startDate: new Date(period.startAt),
          endDate: new Date(period.endAt),
        })
        .onConflictDoNothing();
    const previous = previousById.get(period.id);
    if (
      !previous ||
      new Date(period.observedAt) <= new Date(previous.observedAt) ||
      period.endAt === previous.endAt
    )
      continue;
    // Correct source dates only while they still match the imported baseline.
    // Preserve a user's manual date edits and any customized name.
    await tx
      .update(eventTable)
      .set({ endDate: new Date(period.endAt), updatedAt: new Date() })
      .where(
        and(
          eq(eventTable.id, id),
          eq(eventTable.userId, userId),
          eq(eventTable.type, "SUBSCRIPTION"),
          eq(eventTable.startDate, new Date(previous.startAt)),
          eq(eventTable.endDate, new Date(previous.endAt)),
        ),
      );
  }
}
