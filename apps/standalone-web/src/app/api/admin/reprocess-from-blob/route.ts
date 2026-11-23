import { NextResponse } from "next/server";
import { deriveTinderProfileIdFromExport } from "@/lib/upload/tinder-profile-id";
import { fetchBlobJson } from "@/server/services/blob.service";
import { parseAnonymizedTinderData } from "@/server/services/profile/validation.service";
import { resolveTinderUploadTarget } from "@/server/services/profile/tinder-upload-target";

import {
  createTinderProfile,
  getTinderProfile,
  replaceTinderProfileRevision,
} from "@/server/services/profile/profile.service";
import {
  createHingeProfile,
  getHingeProfile,
} from "@/server/services/hinge/hinge.service";
import { additiveUpdateHingeProfile } from "@/server/services/hinge/hinge-additive.service";
import { fetchVerifiedHingeProfileBlob } from "@/server/services/hinge/hinge-blob.service";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";

/**
 * Admin endpoint to re-trigger profile extraction from an existing blob URL.
 * Automatically determines create vs complete replacement based on profile state.
 *
 * POST /api/admin/reprocess-from-blob
 * Authorization: Bearer $ADMIN_TOKEN (or a verified admin browser session)
 * Body: { provider, profileId, userId, blobUrl, timezone?, country? }
 */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthorized(request))) {
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
      if (existing && existing.userId !== userId) {
        throw new Error(
          "The requested Tinder profile is not owned by this user.",
        );
      }
      const verifiedTinderJson = parseAnonymizedTinderData(
        await fetchBlobJson<unknown>(blobUrl),
      );
      const verifiedTinderId =
        await deriveTinderProfileIdFromExport(verifiedTinderJson);
      const target = await resolveTinderUploadTarget({
        userId,
        birthDate: verifiedTinderJson.User.birth_date,
        createDate: verifiedTinderJson.User.create_date,
        existingProfile: existing,
      });
      if (existing && !target.isSameAccount) {
        throw new Error("This export does not match the owned Tinder account.");
      }
      if (
        !existing &&
        profileId !== verifiedTinderId &&
        profileId !== target.tinderId
      ) {
        throw new Error(
          "The requested Tinder ID does not match the export and owner.",
        );
      }

      if (existing) {
        console.log(
          `🔄 [Admin] Replacing existing Tinder profile: ${profileId}`,
        );
        const result = await replaceTinderProfileRevision({
          tinderId: profileId,
          verifiedTinderId,
          verifiedTinderJson,
          blobUrl,
          userId,
          timezone,
          country,
        });
        return NextResponse.json({
          success: true,
          action: "updated",
          provider,
          profileId: result.profile.tinderId,
          metrics: result.metrics,
        });
      }

      console.log(`📝 [Admin] Creating new Tinder profile: ${profileId}`);
      const result = await createTinderProfile({
        tinderId: target.tinderId,
        verifiedTinderId,
        verifiedTinderJson,
        blobUrl,
        userId,
        timezone,
        country,
      });
      return NextResponse.json({
        success: true,
        action: "created",
        provider,
        profileId: result.profile.tinderId,
        metrics: result.metrics,
      });
    }

    // Hinge
    const existing = await getHingeProfile(profileId);
    const verifiedJson = await fetchVerifiedHingeProfileBlob(blobUrl, {
      hingeId: profileId,
      userId,
      existingProfile: existing,
    });

    // This preflight only chooses create vs additive reconciliation. Both
    // mutation services acquire the canonical provider/profile advisory locks
    // and re-check identity/ownership inside their database transaction.
    if (existing) {
      console.log(
        `🔄 [Admin] Additive update for existing Hinge profile: ${profileId}`,
      );
      const result = await additiveUpdateHingeProfile({
        verifiedJson,
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

    console.log(`📝 [Admin] Creating new Hinge profile: ${profileId}`);
    const result = await createHingeProfile({
      verifiedJson,
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
