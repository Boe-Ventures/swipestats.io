import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { tinderProfileTable } from "@/server/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tinderId: string }> },
) {
  const { tinderId } = await params;

  if (!tinderId) {
    return NextResponse.json(
      { error: "tinderId is required" },
      { status: 400 },
    );
  }

  try {
    const profile = await db.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, tinderId),
      with: {
        user: true,
        usage: {
          orderBy: (usage, { asc }) => [asc(usage.dateStamp)],
        },
        profileMeta: true,
        jobs: true,
        schools: true,
        media: true,
        customData: true,
        rawUsage: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Extract relations, return profile without relations
    const {
      user,
      usage,
      profileMeta,
      jobs,
      schools,
      media,
      customData,
      rawUsage,
      ...profileData
    } = profile;

    return NextResponse.json({
      profile: profileData,
      user: user ?? null,
      usage: usage ?? [],
      profileMeta: profileMeta ?? [],
      jobs: jobs ?? [],
      schools: schools ?? [],
      media: media ?? [],
      customData: customData ?? null,
      rawUsage: rawUsage ?? null,
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
