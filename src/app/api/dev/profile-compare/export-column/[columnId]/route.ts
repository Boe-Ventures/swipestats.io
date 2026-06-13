import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { resolveDevUser } from "@/app/api/dev/_lib/guard";
import { sanitizeFilename } from "@/app/api/dev/_lib/zip";
import { db } from "@/server/db";
import { comparisonColumnTable } from "@/server/db/schema";

/**
 * Dev-only: export a SINGLE comparison column as JSON. Emits the same
 * `swipestats.profile-comparison.v1` shape as the full-comparison export, but
 * with exactly one column — so the existing importer recreates it unchanged as
 * a one-column comparison (photo blob URLs are public and survive a DB wipe).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ columnId: string }> },
) {
  const guard = await resolveDevUser();
  if (!guard.ok) return guard.response;

  const { columnId } = await params;

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

  // Ownership is enforced via the column's parent comparison.
  if (column?.comparison.userId !== guard.userId) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  const cmp = column.comparison;
  const colLabel = column.title || `${column.dataProvider} column`;

  const exported = {
    _format: "swipestats.profile-comparison.v1",
    _exportedAt: new Date().toISOString(),
    _readme:
      "Single-column export. Re-imports through the same path as the full " +
      "comparison export: for each content.attachment.url create a `user_photo` " +
      "attachment (the blob URL is still live), then recreate the comparison " +
      "(one column) and its content in `order`.",
    comparison: {
      // Name it after the source comparison + column so it's identifiable.
      name: `${cmp.name ?? "Comparison"} — ${colLabel}`,
      profileName: cmp.profileName,
      defaultBio: cmp.defaultBio,
      age: cmp.age,
      city: cmp.city,
      state: cmp.state,
      country: cmp.country,
      hometown: cmp.hometown,
      nationality: cmp.nationality,
      heightCm: cmp.heightCm,
      educationLevel: cmp.educationLevel,
      // A single extracted column starts private — re-share intentionally.
      isPublic: false,
    },
    columns: [
      {
        dataProvider: column.dataProvider,
        title: column.title,
        bio: column.bio,
        order: 0,
        completedAt: column.completedAt,
        content: column.content.map((c) => ({
          type: c.type,
          order: c.order,
          caption: c.caption,
          prompt: c.prompt,
          answer: c.answer,
          attachment: c.attachment
            ? {
                url: c.attachment.url,
                originalFilename: c.attachment.originalFilename,
                mimeType: c.attachment.mimeType,
                size: c.attachment.size,
              }
            : null,
        })),
      },
    ],
  };

  const label = sanitizeFilename(`${cmp.name || "comparison"}-${colLabel}`);
  return NextResponse.json(exported, {
    headers: {
      "Content-Disposition": `attachment; filename="${label}-export.json"`,
    },
  });
}
