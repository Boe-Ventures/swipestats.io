import { NextResponse } from "next/server";
import {
  createHingeProfile,
  getHingeProfile,
  updateHingeProfile,
} from "@/server/services/hinge/hinge.service";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";

/**
 * Admin endpoint to regenerate a Hinge profile from blob by atomically replacing
 * its derived rows, or creating it when it does not exist.
 * Use this when you need to reprocess with updated extraction logic (e.g., new interaction types).
 *
 * POST /api/admin/regenerate-hinge-from-blob
 * Authorization: Bearer $ADMIN_TOKEN (or a verified admin browser session)
 * Body: { hingeId, userId, blobUrl, timezone?, country? }
 */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    hingeId?: string;
    userId?: string;
    blobUrl?: string;
    timezone?: string;
    country?: string;
  };

  const { hingeId, userId, blobUrl, timezone, country } = body;

  if (!hingeId || !userId || !blobUrl) {
    return NextResponse.json(
      {
        error: "Missing required fields: hingeId, userId, blobUrl",
      },
      { status: 400 },
    );
  }

  try {
    // Step 1: Check if profile exists
    const existing = await getHingeProfile(hingeId);

    // This read only selects the maintenance operation. Both services acquire
    // the provider lock and profile advisory lock, then validate the database
    // identity/ownership under that lock. A concurrent state change therefore
    // fails safely instead of leaving a delete/create gap.
    const result = existing
      ? await updateHingeProfile({
          hingeId,
          blobUrl,
          userId,
          timezone,
          country,
        })
      : await createHingeProfile({
          hingeId,
          blobUrl,
          userId,
          timezone,
          country,
        });

    return NextResponse.json({
      success: true,
      action: existing ? "regenerated" : "created",
      hingeId,
      hadExistingProfile: !!existing,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error("[Admin] regenerate-hinge-from-blob error:", error);
    return NextResponse.json(
      {
        error: "Regeneration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
