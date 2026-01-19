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
