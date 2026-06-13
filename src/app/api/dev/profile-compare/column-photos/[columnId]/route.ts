import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { comparisonColumnTable } from "@/server/db/schema";
import { resolveDevUser } from "@/app/api/dev/_lib/guard";
import {
  buildZipFromUrls,
  ensureExtension,
  sanitizeFilename,
  zipResponse,
} from "@/app/api/dev/_lib/zip";

/**
 * Dev-only: download every photo in a single comparison column as a zip,
 * preserving display order via a numeric filename prefix. Handy for grabbing a
 * profile's photos to re-upload to a dating app.
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

  if (column?.comparison.userId !== guard.userId) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  const photos = column.content.filter(
    (c) => c.type === "photo" && c.attachment?.url,
  );

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "This column has no photos to download" },
      { status: 400 },
    );
  }

  const entries = photos.map((c, index) => {
    const attachment = c.attachment!;
    const base = sanitizeFilename(
      attachment.originalFilename || attachment.filename || `photo-${index + 1}`,
    );
    return {
      url: attachment.url,
      name: `${String(index + 1).padStart(2, "0")}-${ensureExtension(base, attachment.mimeType)}`,
    };
  });

  const zip = await buildZipFromUrls(entries);
  const label = sanitizeFilename(column.title || column.dataProvider);
  return zipResponse(zip, `${label}-photos.zip`);
}
