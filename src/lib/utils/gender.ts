import type { TinderJsonGender } from "@/server/db/constants";

/**
 * Check if gender data is unknown or missing
 * Now treats "Other" and "More" as valid (not unknown)
 */
export function isGenderDataUnknown(
  gender: TinderJsonGender | string | undefined,
): boolean {
  if (!gender) return true;
  switch (gender) {
    case "Unknown":
      return true;
    case "M":
    case "F":
    case "Other":
    case "More":
      return false;
    default:
      return true;
  }
}

/**
 * Get display text for gender
 */
export function getGenderDisplay(gender: TinderJsonGender | string): string {
  switch (gender) {
    case "M":
      return "Male";
    case "F":
      return "Female";
    case "More":
      return "More";
    case "Unknown":
      return "Unknown";
    case "Other":
      return "Other";
    default:
      return "Unknown";
  }
}
