import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { userTable } from "@/server/db/schema";

export async function updateUserLocation(input: {
  userId: string;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  timeZone?: string | null;
  continent?: string | null;
}) {
  const { userId, ...values } = input;
  const updated = await db
    .update(userTable)
    .set(values)
    .where(eq(userTable.id, userId))
    .returning();
  if (!updated[0]) {
    throw new Error(`User ${userId} was not found for location update.`);
  }
  return updated[0];
}
