import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { tinderProfileTable, userTable, mediaTable } from "@/server/db/schema";
import { env } from "@/env";
import { sendEvent } from "@/server/clients/slack.client";

/**
 * Test endpoint for debugging Slack message formatting
 * POST /api/admin/test-slack?token=xxx&tinderId=xxx
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const tinderId = searchParams.get("tinderId");

  // Verify admin token
  if (!token || token !== env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!tinderId) {
    return NextResponse.json(
      { error: "tinderId query parameter is required" },
      { status: 400 },
    );
  }

  try {
    // Fetch profile with user
    const profile = await db.query.tinderProfileTable.findFirst({
      where: eq(tinderProfileTable.tinderId, tinderId),
      columns: {
        userId: true,
        gender: true,
        birthDate: true,
        city: true,
        country: true,
        bio: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!profile.userId) {
      return NextResponse.json(
        { error: "Profile has no userId" },
        { status: 400 },
      );
    }

    // Fetch user and media
    const [user, media] = await Promise.all([
      db.query.userTable.findFirst({
        where: eq(userTable.id, profile.userId),
        columns: { name: true, email: true },
      }),
      db.query.mediaTable.findMany({
        where: eq(mediaTable.tinderProfileId, tinderId),
        columns: { url: true },
        limit: 5,
      }),
    ]);

    // Prepare the data that would be sent to Slack
    const mockProperties = {
      tinderId,
      matchCount: 675,
      messageCount: 5628,
      photoCount: 8,
      usageDays: 857,
      hasPhotos: true,
      processingTimeMs: 2771,
      jsonSizeMB: 0.73,
    };

    // Sanitize text helper
    const sanitizeSlackText = (text: string | undefined | null): string => {
      if (!text) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .slice(0, 500);
    };

    // Calculate actual age from birthDate
    const calculateAge = (birthDate: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    };

    const userAge = profile?.birthDate
      ? calculateAge(profile.birthDate)
      : undefined;

    const fields = {
      tinderId: mockProperties.tinderId,
      userName: sanitizeSlackText(user?.name) || "Unknown",
      userEmail: sanitizeSlackText(user?.email) || "No email",
      gender: profile?.gender ?? undefined,
      age: userAge,
      city: sanitizeSlackText(profile?.city) || undefined,
      country: sanitizeSlackText(profile?.country) || undefined,
      matches: mockProperties.matchCount,
      messages: mockProperties.messageCount,
      photos: mockProperties.photoCount,
      usageDays: mockProperties.usageDays,
      processingTimeMs: mockProperties.processingTimeMs,
    };

    // Get image URLs
    const imageUrls = media
      .map((m) => m.url)
      .filter((url): url is string => !!url);

    console.log(
      "📤 [Test] Sending Slack notification for tinderId:",
      mockProperties.tinderId,
    );

    // Call the actual sendEvent function
    sendEvent({
      channel: "bot-developer",
      emoji: "📊",
      title: "Tinder Profile Created",
      fields,
      eventName: "tinder_profile_created",
      imageUrls,
    });

    return NextResponse.json({
      success: true,
      message: "Slack notification sent - check #bot-developer channel",
      tinderId: mockProperties.tinderId,
      imageCount: imageUrls.length,
    });
  } catch (error) {
    console.error("Error in test-slack endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
