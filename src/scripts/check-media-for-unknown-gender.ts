/**
 * Quick script to check if profiles with UNKNOWN/OTHER/MORE gender have media
 */

import { db } from "@/server/db";
import {
  tinderProfileTable,
  hingeProfileTable,
  mediaTable,
  type Gender,
} from "@/server/db/schema";
import { eq, inArray, and, isNotNull, sql } from "drizzle-orm";

async function checkMediaForUnknownGender() {
  console.log("Checking media for profiles with UNKNOWN/OTHER/MORE gender...\n");

  const targetGenders: Gender[] = ["UNKNOWN", "OTHER", "MORE"];

  // Check Tinder profiles
  console.log("=== TINDER PROFILES ===");
  for (const gender of targetGenders) {
    const profiles = await db
      .select({ tinderId: tinderProfileTable.tinderId })
      .from(tinderProfileTable)
      .where(eq(tinderProfileTable.gender, gender))
      .limit(100);

    const profileIds = profiles.map((p) => p.tinderId);

    const mediaCounts = profileIds.length > 0
      ? await db
          .select({
            tinderProfileId: mediaTable.tinderProfileId,
            count: sql<number>`count(*)::int`,
          })
          .from(mediaTable)
          .where(inArray(mediaTable.tinderProfileId, profileIds))
          .groupBy(mediaTable.tinderProfileId)
      : [];

    const mediaMap = new Map(mediaCounts.map((r) => [r.tinderProfileId, r.count]));
    const profilesWithMedia = mediaCounts.length;
    const totalMedia = mediaCounts.reduce((sum, r) => sum + r.count, 0);

    console.log(
      `${gender}: ${profiles.length} profiles, ${profilesWithMedia} with media (${totalMedia} total media)`,
    );
  }

  // Check Hinge profiles
  console.log("\n=== HINGE PROFILES ===");
  for (const gender of targetGenders) {
    const profiles = await db
      .select({ hingeId: hingeProfileTable.hingeId })
      .from(hingeProfileTable)
      .where(eq(hingeProfileTable.gender, gender))
      .limit(100);

    const profileIds = profiles.map((p) => p.hingeId);

    const mediaCounts = profileIds.length > 0
      ? await db
          .select({
            hingeProfileId: mediaTable.hingeProfileId,
            count: sql<number>`count(*)::int`,
          })
          .from(mediaTable)
          .where(inArray(mediaTable.hingeProfileId, profileIds))
          .groupBy(mediaTable.hingeProfileId)
      : [];

    const profilesWithMedia = mediaCounts.length;
    const totalMedia = mediaCounts.reduce((sum, r) => sum + r.count, 0);

    console.log(
      `${gender}: ${profiles.length} profiles, ${profilesWithMedia} with media (${totalMedia} total media)`,
    );
  }

  // Show a few examples with their media
  console.log("\n=== SAMPLE PROFILES WITH MEDIA ===");
  const sampleTinder = await db
    .select({
      tinderId: tinderProfileTable.tinderId,
      gender: tinderProfileTable.gender,
      bio: tinderProfileTable.bio,
    })
    .from(tinderProfileTable)
    .where(
      and(
        inArray(tinderProfileTable.gender, targetGenders),
        isNotNull(tinderProfileTable.userId),
      ),
    )
    .limit(20);

  const sampleIds = sampleTinder.map((p) => p.tinderId);
  const sampleMedia = sampleIds.length > 0
    ? await db
        .select()
        .from(mediaTable)
        .where(inArray(mediaTable.tinderProfileId, sampleIds))
    : [];

  const sampleMediaByProfile = new Map<string, (typeof sampleMedia)[number][]>();
  for (const m of sampleMedia) {
    if (!m.tinderProfileId) continue;
    const existing = sampleMediaByProfile.get(m.tinderProfileId) ?? [];
    existing.push(m);
    sampleMediaByProfile.set(m.tinderProfileId, existing);
  }

  let shown = 0;
  for (const profile of sampleTinder) {
    const media = sampleMediaByProfile.get(profile.tinderId) ?? [];
    if (media.length > 0 && shown < 5) {
      console.log(`\nTinder ${profile.tinderId.substring(0, 12)}: ${media.length} media`);
      console.log(
        `  Bio: ${profile.bio?.substring(0, 100)}${profile.bio && profile.bio.length > 100 ? "..." : ""}`,
      );
      console.log(`  Media types: ${media.map((m) => m.type).join(", ")}`);
      shown++;
    }
  }
}

checkMediaForUnknownGender().catch(console.error);
