import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { hingeProfileTable } from "@/server/db/schema";
import { normalizeHingeComparison } from "@/lib/hinge/comparison";

export async function getHingeComparisonProfile(hingeId: string) {
  const profile = await db.query.hingeProfileTable.findFirst({
    where: eq(hingeProfileTable.hingeId, hingeId),
    columns: {
      hingeId: true,
      createDate: true,
      firstAccountCreateDate: true,
      lastSeenAt: true,
      csvActivity: true,
    },
    with: {
      matches: {
        columns: { matchedAt: true },
        with: { messages: { columns: { sentDate: true } } },
      },
      interactions: { columns: { type: true, timestamp: true } },
    },
  });
  return profile ? normalizeHingeComparison(profile) : null;
}
