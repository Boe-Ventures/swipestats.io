import type { DirectoryProfile } from "@/lib/types/directory";

/**
 * Demo profile IDs that free users can compare against
 * These are real profile IDs from the directory that we've selected
 * to showcase as free comparison examples
 */
export const DEMO_PROFILE_IDS = [
  "862b4f91e365c43dc5d7cf5483c710bcd235f4913472cfa8e3cb147075988553",
];

/**
 * Hardcoded demo profiles with representative stats
 * Intentionally empty to avoid showing fake profiles.
 */
export const DEMO_PROFILES: DirectoryProfile[] = [];

/**
 * Check if a profile ID is a demo profile
 */
export function isDemoProfile(profileId: string): boolean {
  return DEMO_PROFILE_IDS.includes(profileId);
}

/**
 * Get demo profile by ID
 */
export function getDemoProfile(
  profileId: string,
): DirectoryProfile | undefined {
  return DEMO_PROFILES.find((p) => p.id === profileId);
}

/**
 * Get special label for demo profile
 */
export function getDemoProfileLabel(profileId: string): string | null {
  if (
    profileId ===
    "862b4f91e365c43dc5d7cf5483c710bcd235f4913472cfa8e3cb147075988553"
  ) {
    return "Creator of SwipeStats";
  }
  return null;
}
