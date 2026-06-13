import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { attachmentTable } from "@/server/db/schema";
import { resolveDevUser } from "@/app/api/dev/_lib/guard";
import {
  buildZipFromUrls,
  ensureExtension,
  sanitizeFilename,
  zipResponse,
} from "@/app/api/dev/_lib/zip";

/**
 * Dev-only: download the user's entire photo library (every `user_photo`
 * attachment) as a single zip — the gallery that backs all their comparisons.
 */
export async function GET() {
  const guard = await resolveDevUser();
  if (!guard.ok) return guard.response;

  const attachments = await db.query.attachmentTable.findMany({
    where: and(
      eq(attachmentTable.uploadedBy, guard.userId),
      eq(attachmentTable.resourceType, "user_photo"),
      isNull(attachmentTable.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));

  if (images.length === 0) {
    return NextResponse.json(
      { error: "Your photo library is empty" },
      { status: 400 },
    );
  }

  const entries = images.map((attachment, index) => {
    const base = sanitizeFilename(
      attachment.originalFilename || attachment.filename || `photo-${index + 1}`,
    );
    return {
      url: attachment.url,
      name: `${String(index + 1).padStart(3, "0")}-${ensureExtension(base, attachment.mimeType)}`,
    };
  });

  const zip = await buildZipFromUrls(entries);
  return zipResponse(zip, "swipestats-photo-library.zip");
}
