import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import type { HingeProfileInsert } from "@/server/db/schema";
import { mapHingeGender } from "@/lib/utils/gender";
import { deriveApproximateHingeBirthDate } from "@/lib/hinge/age";
import { parseHingeTimestampToDate } from "@/lib/hinge/timestamp";

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
  // REVIEW(provider assumption): these Hinge lifestyle answers are stored in
  // legacy boolean columns. Only an explicit affirmative value maps to true;
  // categories such as "Sometimes" currently collapse together with "No" and
  // missing. Preserving the provider category requires a future schema change.
  return value === "Yes" || value === "yes" || value === "true";
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
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
  const exportedCountry = user.location?.country?.trim();
  const identityGender = mapHingeGender(profile.gender_identity ?? "");
  const broadGender = mapHingeGender(profile.gender ?? "");
  // Hinge can export a custom identity label (for example "Agender") beside a
  // broad provider gender. Preserve the label below, but use the broad value for
  // the finite cohort enum when the custom label has no direct mapping.
  const gender = identityGender === "UNKNOWN" ? broadGender : identityGender;

  const birthDate = deriveApproximateHingeBirthDate(
    profile.age,
    account.last_seen,
  );
  const createDate = parseHingeTimestampToDate(
    account.signup_time,
    "Hinge signup timestamp",
  );
  const lastSeenAt = parseHingeTimestampToDate(
    account.last_seen,
    "Hinge last-seen timestamp",
  );
  const ageAtUpload = profile.age;

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
    ...new Set(devices.map((d) => d.device_platform).filter(isNonEmptyString)),
  ];
  const deviceOsVersions = [
    ...new Set(
      devices.map((d) => d.device_os_versions).filter(isNonEmptyString),
    ),
  ];
  const appVersions = [
    ...new Set(devices.map((d) => d.app_version).filter(isNonEmptyString)),
  ];

  return {
    hingeId: options.hingeId,
    userId: options.userId,
    birthDate,
    ageAtUpload,
    createDate,
    firstAccountCreateDate: createDate,
    lastSeenAt,
    // REVIEW(provider assumption): the non-null legacy profile columns below
    // use neutral-looking sentinels when an export omits a value. In cohort
    // work, 0/18/99/300/empty string must be treated as unavailable rather than
    // a measured preference or attribute until these columns become nullable.
    heightCentimeters: profile.height_centimeters ?? 0,
    gender,
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
    languagesSpoken: profile.languages_spoken ?? "",
    languagesSpokenDisplayed: profile.languages_spoken_displayed ?? false,
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
    // The export is provider-authored profile data; the request country is only
    // a browser-derived fallback and must not overwrite it.
    country: exportedCountry || options.country || null,
  };
}
