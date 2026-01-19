import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { hingeProfileTable } from "@/server/db/schema";
import { env } from "@/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hingeId: string }> },
) {
  const { hingeId } = await params;

  if (!hingeId) {
    return NextResponse.json({ error: "hingeId is required" }, { status: 400 });
  }

  // Verify admin token from query params
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || token !== env.ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const profile = await db.query.hingeProfileTable.findFirst({
      where: eq(hingeProfileTable.hingeId, hingeId),
      with: {
        user: true,
        profileMeta: true,
        prompts: {
          orderBy: (prompts, { asc }) => [asc(prompts.createdPromptAt)],
        },
        media: true,
        customData: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Extract relations, return profile without relations
    const { user, profileMeta, prompts, media, customData, ...profileData } =
      profile;

    return NextResponse.json({
      profile: profileData,
      user: user ?? null,
      profileMeta: profileMeta ?? [],
      prompts: prompts ?? [],
      media: media ?? [],
      customData: customData ?? null,
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
