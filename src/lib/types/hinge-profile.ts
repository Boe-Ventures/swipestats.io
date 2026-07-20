import type {
  HingeProfile,
  Match,
  Message,
  ProfileMeta,
  HingeInteraction,
} from "@/server/db/schema";

export type HingeInsightsMessage = Pick<Message, "sentDate">;

export type HingeInsightsMatch = Pick<
  Match,
  "id" | "matchedAt" | "likedAt" | "weMet"
> & {
  messages: HingeInsightsMessage[];
};

export type HingeInsightsInteraction = Pick<
  HingeInteraction,
  "type" | "timestamp" | "matchId" | "threadOrigin" | "threadState"
>;

/**
 * Full Hinge profile with stats and related data for insights display
 */
export type HingeProfileWithStats = Pick<
  HingeProfile,
  "hingeId" | "gender" | "ageAtUpload" | "selfieVerified" | "country"
> & {
  matches: HingeInsightsMatch[];
  interactions: HingeInsightsInteraction[];
  profileMeta: ProfileMeta[];
};

/**
 * Helper to get the global profile meta (first/only item in the array)
 */
export function getGlobalMeta(
  profile: HingeProfileWithStats,
): ProfileMeta | null {
  return profile.profileMeta?.[0] ?? null;
}

/**
 * Helper to calculate we_met outcomes
 */
export function getWeMetStats(profile: HingeProfileWithStats): {
  yes: number;
  no: number;
  total: number;
} {
  const weMetYes = profile.matches.filter(
    (m) =>
      m.weMet &&
      (m.weMet as { did_meet_subject?: string }).did_meet_subject === "Yes",
  ).length;
  const weMetNo = profile.matches.filter(
    (m) =>
      m.weMet &&
      (m.weMet as { did_meet_subject?: string }).did_meet_subject === "No",
  ).length;

  return {
    yes: weMetYes,
    no: weMetNo,
    total: weMetYes + weMetNo,
  };
}
