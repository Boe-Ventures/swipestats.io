import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import type { TinderUsageInsert } from "@/server/db/schema";
import { computeUsageInput } from "./transform.service";

/**
 * Creates bulk usage records for real days only from the Tinder JSON.
 *
 * Previously, this function expanded missing days with synthetic zero records.
 * Now it only stores real usage data from the original JSON. The frontend
 * aggregation (aggregateUsage.ts) already handles sparse data correctly
 * through grouping by period (monthly, yearly).
 */
export function createUsageRecords(
  json: AnonymizedTinderDataJSON,
  tinderId: string,
  userBirthDate: Date,
): TinderUsageInsert[] {
  // Collect all unique dates from all usage categories
  const allDatesSet = new Set<string>();
  Object.keys(json.Usage.app_opens).forEach((d) => allDatesSet.add(d));
  Object.keys(json.Usage.swipes_likes).forEach((d) => allDatesSet.add(d));
  Object.keys(json.Usage.swipes_passes).forEach((d) => allDatesSet.add(d));
  Object.keys(json.Usage.matches).forEach((d) => allDatesSet.add(d));
  Object.keys(json.Usage.messages_sent).forEach((d) => allDatesSet.add(d));
  Object.keys(json.Usage.messages_received).forEach((d) => allDatesSet.add(d));
  if (json.Usage.superlikes) {
    Object.keys(json.Usage.superlikes).forEach((d) => allDatesSet.add(d));
  }

  // Sort dates chronologically
  const realDates = Array.from(allDatesSet).sort();

  console.log(`   📅 Creating usage records for ${realDates.length} real days`);

  const usageInput = realDates.map((date) => {
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
    );
  });

  return usageInput;
}
