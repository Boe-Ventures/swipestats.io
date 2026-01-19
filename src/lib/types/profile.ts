import type {
  TinderProfile,
  TinderUsage,
  ProfileMeta,
} from "@/server/db/schema";

/**
 * Full profile with usage data and metadata for insights display
 * Note: profileMeta is an array from the DB relation, but we typically only store one
 */
export type TinderProfileWithUsage = TinderProfile & {
  usage: TinderUsage[];
  profileMeta: ProfileMeta[]; // Array from many() relation
};

/**
 * Helper to get the global profile meta (first/only item in the array)
 */
export function getGlobalMeta(
  profile: TinderProfileWithUsage,
): ProfileMeta | null {
  return profile.profileMeta?.[0] ?? null;
}
