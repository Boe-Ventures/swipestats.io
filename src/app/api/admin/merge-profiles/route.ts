import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { withTransaction } from "@/server/db";
import {
  tinderProfileTable,
  matchTable,
  messageTable,
  mediaTable,
  tinderUsageTable,
  customDataTable,
  profileMetaTable,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { computeProfileMeta } from "@/server/services/profile/meta.service";
import {
  lockTinderSwipeRankMutationsInTx,
  purgeTinderSwipeRankProfilesInTx,
  scheduleTinderSwipeRankRefresh,
} from "@/server/services/swipe-rank/lifecycle.service";
import { invalidatePublicSwipeRankCache } from "@/server/services/swipe-rank/public-cache";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";

/**
 * Admin endpoint to merge two Tinder profiles
 * POST /api/admin/merge-profiles?oldTinderId=xxx&newTinderId=xxx
 * Authorization: Bearer $ADMIN_TOKEN (or a verified admin browser session)
 *
 * This merges all data from oldTinderId into newTinderId:
 * - Transfers all usage, matches, messages, media, and custom data
 * - Combines date ranges
 * - Recomputes profile meta
 * - Deletes the old profile
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const oldTinderId = searchParams.get("oldTinderId");
  const newTinderId = searchParams.get("newTinderId");

  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!oldTinderId || !newTinderId) {
    return NextResponse.json(
      {
        error: "Both oldTinderId and newTinderId query parameters are required",
      },
      { status: 400 },
    );
  }

  if (oldTinderId === newTinderId) {
    return NextResponse.json(
      { error: "Cannot merge a profile with itself" },
      { status: 400 },
    );
  }

  try {
    console.log(
      `\n🔧 [Admin] Merging profiles: ${oldTinderId} → ${newTinderId}`,
    );

    const result = await withTransaction(async (tx) => {
      await lockTinderSwipeRankMutationsInTx(tx);
      // 1. Fetch both profiles
      const [oldProfile, newProfile] = await Promise.all([
        tx.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.tinderId, oldTinderId),
        }),
        tx.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.tinderId, newTinderId),
        }),
      ]);

      if (!oldProfile) {
        throw new Error(`Old profile not found: ${oldTinderId}`);
      }

      if (!newProfile) {
        throw new Error(`New profile not found: ${newTinderId}`);
      }

      console.log(`   ✓ Found both profiles`);
      console.log(
        `   Old: ${oldProfile.firstDayOnApp.toISOString().split("T")[0]} → ${oldProfile.lastDayOnApp.toISOString().split("T")[0]}`,
      );
      console.log(
        `   New: ${newProfile.firstDayOnApp.toISOString().split("T")[0]} → ${newProfile.lastDayOnApp.toISOString().split("T")[0]}`,
      );

      // 2. Validate no overlap in date ranges
      // Old account should end before new account starts (or at most 1 day overlap for boundary)
      if (oldProfile.lastDayOnApp >= newProfile.firstDayOnApp) {
        const overlapDays = Math.floor(
          (oldProfile.lastDayOnApp.getTime() -
            newProfile.firstDayOnApp.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        throw new Error(
          `Date range overlap detected: Old account ends ${oldProfile.lastDayOnApp.toISOString().split("T")[0]}, ` +
            `new account starts ${newProfile.firstDayOnApp.toISOString().split("T")[0]} ` +
            `(${overlapDays + 1} days overlap). These should be sequential, non-overlapping accounts.`,
        );
      }

      // 3. Compute combined date range
      const combinedFirstDay =
        oldProfile.firstDayOnApp < newProfile.firstDayOnApp
          ? oldProfile.firstDayOnApp
          : newProfile.firstDayOnApp;

      const combinedLastDay =
        oldProfile.lastDayOnApp > newProfile.lastDayOnApp
          ? oldProfile.lastDayOnApp
          : newProfile.lastDayOnApp;

      const combinedDaysInPeriod =
        Math.floor(
          (combinedLastDay.getTime() - combinedFirstDay.getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1;

      console.log(`   ✓ Date ranges validated (no overlap)`);
      console.log(
        `   Combined date range: ${combinedFirstDay.toISOString().split("T")[0]} → ${combinedLastDay.toISOString().split("T")[0]} (${combinedDaysInPeriod} days)`,
      );

      // 4. Update new profile with combined date range
      await tx
        .update(tinderProfileTable)
        .set({
          firstDayOnApp: combinedFirstDay,
          lastDayOnApp: combinedLastDay,
          daysInProfilePeriod: combinedDaysInPeriod,
          updatedAt: new Date(),
        })
        .where(eq(tinderProfileTable.tinderId, newTinderId));

      console.log(`   ✓ Updated new profile with combined date range`);

      // 5. Transfer all data from old → new profile ID
      // Since we validated no date overlap, simple UPDATE statements work
      const transferStart = Date.now();

      // Transfer usage records - simple update since no overlap
      await tx
        .update(tinderUsageTable)
        .set({ tinderProfileId: newTinderId })
        .where(eq(tinderUsageTable.tinderProfileId, oldTinderId));

      // Transfer matches
      await tx
        .update(matchTable)
        .set({ tinderProfileId: newTinderId })
        .where(eq(matchTable.tinderProfileId, oldTinderId));

      // Transfer messages
      await tx
        .update(messageTable)
        .set({ tinderProfileId: newTinderId })
        .where(eq(messageTable.tinderProfileId, oldTinderId));

      // Transfer media
      await tx
        .update(mediaTable)
        .set({ tinderProfileId: newTinderId })
        .where(eq(mediaTable.tinderProfileId, oldTinderId));

      // Transfer custom data
      await tx
        .update(customDataTable)
        .set({ tinderProfileId: newTinderId })
        .where(eq(customDataTable.tinderProfileId, oldTinderId));

      console.log(
        `   ✓ Transferred all data to new profile (${Date.now() - transferStart}ms)`,
      );

      // 6. Delete the old source and its live analytical subject atomically;
      // frozen edition entries detach from the superseded profile.
      await purgeTinderSwipeRankProfilesInTx(tx, [oldTinderId]);
      await tx
        .delete(tinderProfileTable)
        .where(eq(tinderProfileTable.tinderId, oldTinderId));

      console.log(`   ✓ Deleted old profile`);

      // 7. Delete old profile meta and recompute for new profile
      await tx
        .delete(profileMetaTable)
        .where(eq(profileMetaTable.tinderProfileId, newTinderId));

      // Fetch new profile with all relations
      const fullProfile = await tx.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.tinderId, newTinderId),
        with: {
          usage: true,
          matches: {
            with: {
              messages: true,
            },
          },
        },
      });

      if (!fullProfile) {
        throw new Error(
          `Failed to fetch profile for meta computation: ${newTinderId}`,
        );
      }

      // Compute and insert new meta
      const profileMeta = computeProfileMeta(fullProfile);
      await tx.insert(profileMetaTable).values({
        ...profileMeta,
        id: createId("pmeta"),
        tinderProfileId: newTinderId,
        hingeProfileId: null,
      });

      console.log(`   ✓ Recomputed profile meta`);

      // Return summary
      return {
        success: true,
        oldTinderId,
        newTinderId,
        combinedDateRange: {
          firstDay: combinedFirstDay.toISOString().split("T")[0],
          lastDay: combinedLastDay.toISOString().split("T")[0],
          totalDays: combinedDaysInPeriod,
        },
      };
    });

    console.log(
      `\n✅ [Admin] Merge complete: ${oldTinderId} → ${newTinderId}\n`,
    );
    invalidatePublicSwipeRankCache();
    scheduleTinderSwipeRankRefresh([newTinderId]);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in merge-profiles endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
