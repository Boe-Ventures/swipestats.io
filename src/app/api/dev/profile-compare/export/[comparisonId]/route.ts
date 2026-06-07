import { NextResponse } from "next/server";

import { resolveDevUser } from "@/app/api/dev/_lib/guard";
import { sanitizeFilename } from "@/app/api/dev/_lib/zip";
import { ProfileComparisonService } from "@/server/services/profile-comparison.service";

/**
 * Dev-only: export a full comparison as JSON so it can be handed to an AI agent
 * to recreate after a database reset. Photo blob URLs are public and survive a
 * DB wipe, so re-import means: create a `user_photo` attachment row for each
 * `content.attachment.url`, then recreate the comparison → columns → content
 * preserving `order`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ comparisonId: string }> },
) {
  const guard = await resolveDevUser();
  if (!guard.ok) return guard.response;

  const { comparisonId } = await params;

  // `.get` throws when the comparison is missing or not owned by the user.
  const comparison = await ProfileComparisonService.get(
    comparisonId,
    guard.userId,
  ).catch(() => null);

  if (!comparison) {
    return NextResponse.json({ error: "Comparison not found" }, { status: 404 });
  }

  const exported = {
    _format: "swipestats.profile-comparison.v1",
    _exportedAt: new Date().toISOString(),
    _readme:
      "Full export of a SwipeStats profile comparison. To re-import after a DB " +
      "reset: for each content.attachment.url create a `user_photo` attachment " +
      "row (the blob URL is still live), then recreate the comparison, its " +
      "columns and their content in `order`. Mirrors the inputs of " +
      "profileCompare.create / addColumn / addContentToColumn.",
    comparison: {
      name: comparison.name,
      profileName: comparison.profileName,
      defaultBio: comparison.defaultBio,
      age: comparison.age,
      city: comparison.city,
      state: comparison.state,
      country: comparison.country,
      hometown: comparison.hometown,
      nationality: comparison.nationality,
      heightCm: comparison.heightCm,
      educationLevel: comparison.educationLevel,
      isPublic: comparison.isPublic,
    },
    columns: comparison.columns.map((column) => ({
      dataProvider: column.dataProvider,
      title: column.title,
      bio: column.bio,
      order: column.order,
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
    })),
  };

  const label = sanitizeFilename(comparison.name || "comparison");
  return NextResponse.json(exported, {
    headers: {
      "Content-Disposition": `attachment; filename="${label}-export.json"`,
    },
  });
}
