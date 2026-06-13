import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { profileComparisonTable } from "@/server/db/schema";

/**
 * Public, share-gated comparison for `generateMetadata` + `opengraph-image`.
 * Returns `null` (never throws) when the comparison is missing or not public —
 * so the share card falls back to a generic branded image. Mirrors the gating
 * in `getPublicComparison` (shareKey + isPublic), but non-throwing.
 */
export async function getPublicComparisonForShare(shareKey: string) {
  return db.query.profileComparisonTable.findFirst({
    where: and(
      eq(profileComparisonTable.shareKey, shareKey),
      eq(profileComparisonTable.isPublic, true),
    ),
    with: {
      columns: {
        orderBy: (columns, { asc }) => [asc(columns.order)],
        with: {
          content: {
            orderBy: (content, { asc }) => [asc(content.order)],
            with: { attachment: true },
          },
        },
      },
    },
  });
}

export type ShareComparison = NonNullable<
  Awaited<ReturnType<typeof getPublicComparisonForShare>>
>;

/** First photo's blob URL for each column (skips columns with no photo). */
export function columnPhotoUrls(comparison: ShareComparison): string[] {
  return comparison.columns
    .map(
      (column) =>
        column.content.find((c) => c.type === "photo" && c.attachment?.url)
          ?.attachment?.url ?? null,
    )
    .filter((url): url is string => Boolean(url));
}
