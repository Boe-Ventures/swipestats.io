import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { expandAndAugmentProfileWithMissingDays } from "@/lib/profile.utils";
import type { TinderUsageInsert } from "@/server/db/schema";
import { computeUsageInput } from "./transform.service";

/**
 * Creates bulk usage records for all days in the profile period
 * Expands missing days and augments with activity metadata
 */
export function createUsageRecords(
  json: AnonymizedTinderDataJSON,
  tinderId: string,
  userBirthDate: Date,
): TinderUsageInsert[] {
  const originalDays = {
    appOpens: Object.keys(json.Usage.app_opens).length,
    swipeLikes: Object.keys(json.Usage.swipes_likes).length,
    swipePasses: Object.keys(json.Usage.swipes_passes).length,
  };

  console.log(
    `   📅 Original data: ${originalDays.appOpens} days with app opens, ${originalDays.swipeLikes} with likes, ${originalDays.swipePasses} with passes`,
  );

  const expandedUsageTimeFrame = expandAndAugmentProfileWithMissingDays({
    appOpens: json.Usage.app_opens,
    swipeLikes: json.Usage.swipes_likes,
    swipePasses: json.Usage.swipes_passes,
  });

  const expandedUsageTimeFrameEntries = Object.entries(expandedUsageTimeFrame);
  const missingDays = expandedUsageTimeFrameEntries.filter(
    ([_, meta]) => meta.dateIsMissingFromOriginalData,
  ).length;

  console.log(
    `   📅 Expanded to ${expandedUsageTimeFrameEntries.length} total days (added ${missingDays} missing days)`,
  );

  const usageInput = expandedUsageTimeFrameEntries.map(([date, meta]) => {
    return computeUsageInput(
      {
        appOpensCount: json.Usage.app_opens[date] ?? 0,
        matchesCount: json.Usage.matches[date] ?? 0,
        swipeLikesCount: json.Usage.swipes_likes[date] ?? 0,
        swipeSuperLikesCount: json.Usage.superlikes?.[date] ?? 0,
        swipePassesCount: json.Usage.swipes_passes[date] ?? 0,
        messagesSentCount: json.Usage.messages_sent[date] ?? 0,
        messagesReceivedCount: json.Usage.messages_received[date] ?? 0,
      },
      date,
      tinderId,
      userBirthDate,
      meta,
    );
  });

  return usageInput;
}
