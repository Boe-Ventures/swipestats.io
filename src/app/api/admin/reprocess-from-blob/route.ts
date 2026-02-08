import { NextResponse } from "next/server";

import {
  createTinderProfile,
  getTinderProfile,
} from "@/server/services/profile/profile.service";
import { additiveUpdateProfile } from "@/server/services/profile/additive.service";
import {
  createHingeProfile,
  getHingeProfile,
} from "@/server/services/hinge/hinge.service";
import { additiveUpdateHingeProfile } from "@/server/services/hinge/hinge-additive.service";
import { env } from "@/env";

/**
 * Admin endpoint to re-trigger profile extraction from an existing blob URL.
 * Automatically determines create vs additive update based on existing profile state.
 *
 * POST /api/admin/reprocess-from-blob?token=xxx
 * Body: { provider, profileId, userId, blobUrl, timezone?, country? }
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || token !== env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    provider?: string;
    profileId?: string;
    userId?: string;
    blobUrl?: string;
    timezone?: string;
    country?: string;
  };

  const { provider, profileId, userId, blobUrl, timezone, country } = body;

  if (!provider || !profileId || !userId || !blobUrl) {
    return NextResponse.json(
      {
        error: "Missing required fields: provider, profileId, userId, blobUrl",
      },
      { status: 400 },
    );
  }

  if (provider !== "tinder" && provider !== "hinge") {
    return NextResponse.json(
      { error: 'provider must be "tinder" or "hinge"' },
      { status: 400 },
    );
  }

  try {
    if (provider === "tinder") {
      const existing = await getTinderProfile(profileId);

      if (existing) {
        console.log(
          `🔄 [Admin] Additive update for existing Tinder profile: ${profileId}`,
        );
        const result = await additiveUpdateProfile({
          tinderId: profileId,
          blobUrl,
          userId,
          timezone,
          country,
        });
        return NextResponse.json({
          success: true,
          action: "updated",
          provider,
          profileId,
          metrics: result.metrics,
        });
      }

      console.log(
        `📝 [Admin] Creating new Tinder profile: ${profileId}`,
      );
      const result = await createTinderProfile({
        tinderId: profileId,
        blobUrl,
        userId,
        timezone,
        country,
      });
      return NextResponse.json({
        success: true,
        action: "created",
        provider,
        profileId,
        metrics: result.metrics,
      });
    }

    // Hinge
    const existing = await getHingeProfile(profileId);

    if (existing) {
      console.log(
        `🔄 [Admin] Additive update for existing Hinge profile: ${profileId}`,
      );
      const result = await additiveUpdateHingeProfile({
        hingeId: profileId,
        blobUrl,
        userId,
        timezone,
        country,
      });
      return NextResponse.json({
        success: true,
        action: "updated",
        provider,
        profileId,
        metrics: result.metrics,
      });
    }

    console.log(
      `📝 [Admin] Creating new Hinge profile: ${profileId}`,
    );
    const result = await createHingeProfile({
      hingeId: profileId,
      blobUrl,
      userId,
      timezone,
      country,
    });
    return NextResponse.json({
      success: true,
      action: "created",
      provider,
      profileId,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error("[Admin] reprocess-from-blob error:", error);
    return NextResponse.json(
      {
        error: "Reprocessing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
