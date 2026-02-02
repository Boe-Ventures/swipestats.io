import { differenceInYears } from "date-fns";
import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import type { HingeProfileInsert } from "@/server/db/schema";
import { mapHingeGender } from "@/lib/utils/gender";

/**
 * Safely parse JSON-encoded string arrays from Hinge export
 * Example: "[\"Asian\",\"Indian\"]" -> ["Asian", "Indian"]
 */
function parseJsonArray(value: string | undefined): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

/**
 * Convert Hinge string booleans to actual booleans
 * Hinge uses "Yes"/"No" strings in the export
 */
function parseBooleanString(value: string | undefined): boolean {
  return value === "Yes" || value === "yes" || value === "true";
}

/**
 * Derive birth date from age and signup time
 * This is an approximation since we don't have exact birth date
 */
function deriveBirthDate(age: number, signupTime: string): Date {
  const signupDate = new Date(signupTime);
  const birthYear = signupDate.getFullYear() - age;
  // Use January 1st as a default since we don't have the exact date
  return new Date(birthYear, 0, 1);
}

/**
 * Transform AnonymizedHingeDataJSON to HingeProfileInsert
 */
export function transformHingeJsonToProfile(
  json: AnonymizedHingeDataJSON,
  options: {
    hingeId: string;
    userId: string;
    timezone?: string;
    country?: string;
  },
): Omit<HingeProfileInsert, "createdAt" | "updatedAt"> {
  const user = json.User;
  const profile = user.profile;
  const account = user.account;
  const preferences = user.preferences;

  // Derive birth date from age
  const birthDate = deriveBirthDate(profile.age, account.signup_time);
  const createDate = new Date(account.signup_time);
  const ageAtUpload = differenceInYears(new Date(), birthDate);

  // Parse JSON-encoded arrays
  const ethnicities = parseJsonArray(profile.ethnicities);
  const religions = parseJsonArray(profile.religions);
  const workplaces = parseJsonArray(profile.workplaces);
  const schools = parseJsonArray(profile.schools);
  const hometowns = parseJsonArray(profile.hometowns);
  const ethnicityPreference = parseJsonArray(preferences.ethnicity_preference);
  const religionPreference = parseJsonArray(preferences.religion_preference);

  // Aggregate device information
  const devices = user.devices ?? [];
  const devicePlatforms = [
    ...new Set(devices.map((d) => d.device_platform).filter(Boolean)),
  ];
  const deviceOsVersions = [
    ...new Set(devices.map((d) => d.device_os_versions).filter(Boolean)),
  ];
  const appVersions = [
    ...new Set(devices.map((d) => d.app_version).filter(Boolean)),
  ];

  return {
    hingeId: options.hingeId,
    userId: options.userId,
    birthDate,
    ageAtUpload,
    createDate,
    heightCentimeters: profile.height_centimeters ?? 0,
    gender: mapHingeGender(profile.gender ?? ""),
    genderStr: profile.gender ?? "unknown",
    genderIdentity: profile.gender_identity ?? profile.gender ?? "unknown",
    genderIdentityDisplayed: profile.gender_identity_displayed ?? false,
    ethnicities: ethnicities ?? [],
    ethnicitiesDisplayed: profile.ethnicities_displayed ?? false,
    religions: religions ?? [],
    religionsDisplayed: profile.religions_displayed ?? false,
    workplaces: workplaces ?? [],
    workplacesDisplayed: profile.workplaces_displayed ?? false,
    jobTitle: profile.job_title ?? "",
    jobTitleDisplayed: profile.job_title_displayed ?? false,
    schools: schools ?? [],
    schoolsDisplayed: profile.schools_displayed ?? false,
    hometowns: hometowns ?? [],
    hometownsDisplayed: profile.hometowns_displayed ?? false,
    smoking: parseBooleanString(profile.smoking),
    smokingDisplayed: profile.smoking_displayed ?? false,
    drinking: parseBooleanString(profile.drinking),
    drinkingDisplayed: profile.drinking_displayed ?? false,
    marijuana: parseBooleanString(profile.marijuana),
    marijuanaDisplayed: profile.marijuana_displayed ?? false,
    drugs: parseBooleanString(profile.drugs),
    drugsDisplayed: profile.drugs_displayed ?? false,
    children: profile.children ?? "",
    childrenDisplayed: profile.children_displayed ?? false,
    familyPlans: profile.family_plans ?? "",
    familyPlansDisplayed: profile.family_plans_displayed ?? false,
    educationAttained: profile.education_attained ?? "",
    politics: profile.politics ?? "",
    politicsDisplayed: profile.politics_displayed ?? false,
    instagramDisplayed: profile.instagram_displayed ?? false,
    datingIntention: profile.dating_intention ?? "",
    datingIntentionDisplayed: profile.dating_intention_displayed ?? false,
    languagesSpoken: "", // Not in current data structure
    languagesSpokenDisplayed: false,
    relationshipType: profile.relationship_types ?? "",
    relationshipTypeDisplayed: profile.relationship_type_displayed ?? false,
    selfieVerified: profile.selfie_verified ?? false,
    distanceMilesMax: preferences.distance_miles_max ?? 0,
    ageMin: preferences.age_min ?? 18,
    ageMax: preferences.age_max ?? 99,
    ageDealbreaker: preferences.age_dealbreaker ?? false,
    heightMin: preferences.height_min ?? 0,
    heightMax: preferences.height_max ?? 300,
    heightDealbreaker: preferences.height_dealbreaker ?? false,
    genderPreference: preferences.gender_preference ?? "",
    ethnicityPreference: ethnicityPreference ?? [],
    ethnicityDealbreaker: preferences.ethnicity_dealbreaker ?? false,
    religionPreference: religionPreference ?? [],
    religionDealbreaker: preferences.religion_dealbreaker ?? false,
    deviceCount: devices.length || null,
    devicePlatforms: devicePlatforms.length > 0 ? devicePlatforms : [],
    deviceOsVersions: deviceOsVersions.length > 0 ? deviceOsVersions : [],
    appVersions: appVersions.length > 0 ? appVersions : [],
    country: options.country ?? user.location?.country ?? null,
  };
}
