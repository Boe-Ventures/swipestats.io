import type { Gender } from "@/server/db/schema";
import type { TinderJsonGender } from "@/server/db/constants";

/**
 * Maps Tinder JSON gender strings to our Gender enum
 */
export function mapTinderGender(gender: TinderJsonGender): Gender {
  const genderMap: Record<TinderJsonGender, Gender> = {
    M: "MALE",
    F: "FEMALE",
    Other: "OTHER",
    More: "MORE",
    Unknown: "UNKNOWN",
  };
  return genderMap[gender] ?? "UNKNOWN";
}

/**
 * Maps Hinge JSON gender strings to our Gender enum
 */
export function mapHingeGender(hingeGender: string): Gender {
  const genderMap: Record<string, Gender> = {
    Man: "MALE",
    Woman: "FEMALE",
    Nonbinary: "OTHER",
    "Non-binary": "OTHER",
  };
  return genderMap[hingeGender] ?? "UNKNOWN";
}

/**
 * Get display name for Gender enum
 */
export function getGenderDisplayName(gender: Gender): string {
  const displayMap: Record<Gender, string> = {
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    MORE: "More",
    UNKNOWN: "Unknown",
  };
  return displayMap[gender];
}

/**
 * Check if gender data is unknown or missing
 * Now treats "Other" and "More" as valid (not unknown)
 */
export function isGenderDataUnknown(gender: string | undefined): boolean {
  if (!gender) return true;
  return gender === "UNKNOWN" || gender === "Unknown";
}

/**
 * Get display text for gender (legacy - supports both raw and enum formats)
 * @deprecated Use getGenderDisplayName for Gender enum values
 */
export function getGenderDisplay(gender: string): string {
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
