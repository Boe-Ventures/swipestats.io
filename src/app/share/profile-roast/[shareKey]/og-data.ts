import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
  aiOutputTable,
  comparisonColumnTable,
  type ProfileRoastResult,
} from "@/server/db/schema";

export type ShareProfileRoast = {
  result: ProfileRoastResult;
  /** profileName; null when unset (the comparison name is a date label like
   * "Summer 2026", not a person, so it makes a nonsense subject). */
  subject: string | null;
  age: number | null;
  providerKey: string | null;
  /** First photo's live blob URL, for the share card. */
  photoUrl: string | null;
};

/**
 * Public, share-gated profile roast for `generateMetadata` + `opengraph-image`.
 * Returns `null` (never throws) when the roast is missing or not public — so the
 * share card falls back to a generic branded image. Mirrors the gating in
 * `roast.getPublicProfileRoast` (kind === "profile_roast" && isPublic).
 */
export async function getPublicProfileRoastForShare(
  shareKey: string,
): Promise<ShareProfileRoast | null> {
  const row = await db.query.aiOutputTable.findFirst({
    where: eq(aiOutputTable.shareKey, shareKey),
  });
  if (!row?.isPublic || row.kind !== "profile_roast") return null;

  const result = row.output as ProfileRoastResult;

  // columnId is the profile_roast subject; with FK cascade a deleted column
  // takes its roast with it, but guard the nullable type just in case.
  const column = row.columnId
    ? await db.query.comparisonColumnTable.findFirst({
        where: eq(comparisonColumnTable.id, row.columnId),
        with: {
          comparison: true,
          content: {
            orderBy: (content, { asc }) => [asc(content.order)],
            with: { attachment: true },
          },
        },
      })
    : null;

  // The roasted photos ride with any shared roast (mirrors
  // roast.getPublicProfileRoast, where only the profile preview — name, age,
  // bio — stays gated behind the comparison being public), so the unfurl can
  // always lead with the first photo.
  const photoUrl =
    column?.content.find((c) => c.type === "photo" && c.attachment?.url)
      ?.attachment?.url ?? null;

  return {
    result,
    subject: column?.comparison.profileName ?? null,
    age: column?.comparison.age ?? null,
    providerKey: column?.dataProvider ?? null,
    photoUrl,
  };
}
