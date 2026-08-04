import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { hingeProfileTable } from "@/server/db/schema";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hingeId: string }> },
) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { hingeId } = await params;

  if (!hingeId) {
    return NextResponse.json({ error: "hingeId is required" }, { status: 400 });
  }

  try {
    const profile = await db.query.hingeProfileTable.findFirst({
      where: eq(hingeProfileTable.hingeId, hingeId),
      with: {
        user: true,
        matches: {
          orderBy: (matches, { asc }) => [asc(matches.order)],
          with: {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.order)],
            },
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Extract user and matches, return profile without relations
    const { user, matches, ...profileData } = profile;

    return NextResponse.json({
      profile: profileData,
      user: user ?? null,
      matches: matches ?? [],
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
