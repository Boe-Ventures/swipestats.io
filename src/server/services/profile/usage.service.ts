import type {
  AnonymizedTinderDataJSON,
  Usage,
} from "@/lib/interfaces/TinderDataJSON";
import { normalizeTinderDateValueMap } from "@/lib/profile.utils";
import type { TinderUsageInsert } from "@/server/db/schema";
import { computeUsageInput } from "./transform.service";

export interface TinderUsageMetricPresence {
  swipeLikes: boolean;
  swipePasses: boolean;
  superLikes: boolean;
  matches: boolean;
  messagesSent: boolean;
  messagesReceived: boolean;
}

/** Preserve whether an optional provider category existed in this export. */
export function getTinderUsageMetricPresence(
  usage: Usage,
): TinderUsageMetricPresence {
  return {
    swipeLikes: usage.swipes_likes !== undefined,
    swipePasses: usage.swipes_passes !== undefined,
    superLikes: usage.superlikes !== undefined,
    matches: usage.matches !== undefined,
    messagesSent: usage.messages_sent !== undefined,
    messagesReceived: usage.messages_received !== undefined,
  };
}

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
  const usage = {
    appOpens: normalizeTinderDateValueMap(json.Usage.app_opens),
    swipeLikes: normalizeTinderDateValueMap(json.Usage.swipes_likes ?? {}),
    swipePasses: normalizeTinderDateValueMap(json.Usage.swipes_passes ?? {}),
    matches: normalizeTinderDateValueMap(json.Usage.matches ?? {}),
    messagesSent: normalizeTinderDateValueMap(json.Usage.messages_sent ?? {}),
    messagesReceived: normalizeTinderDateValueMap(
      json.Usage.messages_received ?? {},
    ),
    superLikes: json.Usage.superlikes
      ? normalizeTinderDateValueMap(json.Usage.superlikes)
      : undefined,
  };

  // Collect all unique dates from all usage categories
  const allDatesSet = new Set<string>();
  Object.keys(usage.appOpens).forEach((d) => allDatesSet.add(d));
  Object.keys(usage.swipeLikes).forEach((d) => allDatesSet.add(d));
  Object.keys(usage.swipePasses).forEach((d) => allDatesSet.add(d));
  Object.keys(usage.matches).forEach((d) => allDatesSet.add(d));
  Object.keys(usage.messagesSent).forEach((d) => allDatesSet.add(d));
  Object.keys(usage.messagesReceived).forEach((d) => allDatesSet.add(d));
  if (usage.superLikes) {
    Object.keys(usage.superLikes).forEach((d) => allDatesSet.add(d));
  }

  // Sort dates chronologically
  const realDates = Array.from(allDatesSet).sort();

  console.log(`   📅 Creating usage records for ${realDates.length} real days`);

  const usageInput = realDates.map((date) => {
    return computeUsageInput(
      {
        appOpensCount: usage.appOpens[date] ?? 0,
        matchesCount: usage.matches[date] ?? 0,
        swipeLikesCount: usage.swipeLikes[date] ?? 0,
        swipeSuperLikesCount: usage.superLikes?.[date] ?? 0,
        swipePassesCount: usage.swipePasses[date] ?? 0,
        messagesSentCount: usage.messagesSent[date] ?? 0,
        messagesReceivedCount: usage.messagesReceived[date] ?? 0,
      },
      date,
      tinderId,
      userBirthDate,
    );
  });

  return usageInput;
}
