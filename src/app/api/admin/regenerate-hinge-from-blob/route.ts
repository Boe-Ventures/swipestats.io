import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { hingeProfileTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  createHingeProfile,
  getHingeProfile,
} from "@/server/services/hinge/hinge.service";
import { env } from "@/env";

/**
 * Admin endpoint to regenerate a Hinge profile from blob by deleting and recreating.
 * Use this when you need to reprocess with updated extraction logic (e.g., new interaction types).
 *
 * POST /api/admin/regenerate-hinge-from-blob?token=xxx
 * Body: { hingeId, userId, blobUrl, timezone?, country? }
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || token !== env.ADMIN_TOKEN) {
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

    if (existing) {
      console.log(
        `🗑️  [Admin] Deleting existing Hinge profile: ${hingeId}`,
      );
      console.log(
        `   This will cascade delete: interactions, prompts, matches, messages, media, events, profile_meta`,
      );

      // Delete the profile - cascade will handle all related data
      await db
        .delete(hingeProfileTable)
        .where(eq(hingeProfileTable.hingeId, hingeId));

      console.log(`✅ [Admin] Profile deleted successfully`);
    } else {
      console.log(
        `ℹ️  [Admin] No existing profile found for: ${hingeId}`,
      );
    }

    // Step 2: Create fresh profile from blob
    console.log(
      `📝 [Admin] Creating fresh Hinge profile from blob: ${hingeId}`,
    );
    const result = await createHingeProfile({
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
