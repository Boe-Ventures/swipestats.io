import type {
  AnonymizedHingeDataJSON,
  FullHingeDataJSON,
  SwipestatsHingeProfilePayload,
  UserData,
  PromptEntryList,
  Conversations,
  HingeValidationData,
} from "@/lib/interfaces/HingeDataJSON";

// HingeDataFilePart is documented in HingeDataJSON.ts but we use `unknown[]`
// at runtime since JSON.parse() doesn't provide type guarantees
import { isPlausibleHingeAge } from "@/lib/hinge/age";
import { tryParseHingeTimestampToDate } from "@/lib/hinge/timestamp";
import { deriveHingeProfileIdFromExport } from "./hinge-profile-id";
import { sanitizeAnonymizedHingeBlob } from "./hinge-runtime-schema";

/**
 * Helper functions to detect file types based on content structure
 */
function isUserFile(data: unknown): data is UserData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return !!(obj.preferences || obj.identity || obj.account || obj.profile);
}

function isMatchesFile(data: unknown): data is Conversations {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      ("chats" in entry ||
        "like" in entry ||
        "match" in entry ||
        "block" in entry ||
        "we_met" in entry ||
        "voice_notes" in entry),
  );
}

function isPromptsFile(data: unknown): data is PromptEntryList {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "type" in entry &&
      ("text" in entry || "options" in entry),
  );
}

function isMediaFile(data: unknown): boolean {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === "object" &&
    data[0] !== null &&
    ("url" in data[0] || "media" in data[0])
  );
}

function isSubscriptionsFile(data: unknown): boolean {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === "object" &&
    data[0] !== null &&
    ("subscription" in data[0] || "plan" in data[0])
  );
}

/**
 * Combine multiple Hinge data file parts into a single structure
 *
 * @param dataParts - Array of parsed Hinge file contents. Expected types:
 *   - UserData (user.json)
 *   - Conversations (matches.json)
 *   - PromptEntryList (prompts.json)
 *   - HingeMedia[] (media.json)
 *
 * Each part is validated with type guards before being merged.
 */
export interface HingeExportFilePresence {
  prompts?: boolean;
}

function combineHingeDataParts(
  dataParts: unknown[],
  filePresence: HingeExportFilePresence,
): FullHingeDataJSON {
  const combined: Partial<FullHingeDataJSON> = {
    User: {} as UserData,
    Matches: [],
    Media: [],
    Subscriptions: [],
  };
  if (filePresence.prompts) combined.Prompts = [];

  // Only recognized core files are merged. Unknown sidecars are ignored because
  // some Hinge exports include selfie audit images or extra prompt metadata.
  for (const part of dataParts) {
    if (isUserFile(part)) {
      combined.User = part;
    } else if (isMatchesFile(part)) {
      combined.Matches = part;
    } else if (isPromptsFile(part)) {
      combined.Prompts = part;
    } else if (isMediaFile(part)) {
      if (Array.isArray(part)) {
        combined.Media = part;
      }
    } else if (isSubscriptionsFile(part)) {
      if (Array.isArray(part)) {
        combined.Subscriptions = part;
      }
    }
  }

  return combined as FullHingeDataJSON;
}

function getLocationCountry(
  location: UserData["location"],
): string | undefined {
  return location?.country ?? location?.country_short;
}

/**
 * Validate that Hinge JSON has required fields
 */
export function isValidHingeJson(
  hingeJson: FullHingeDataJSON | AnonymizedHingeDataJSON,
): [boolean, Record<string, { message: string; [key: string]: unknown }>] {
  const errors: Record<string, { message: string; [key: string]: unknown }> =
    {};

  const validationData: HingeValidationData = {
    birth_date: undefined,
    create_date: undefined,
    signup_time: hingeJson.User.account?.signup_time,
    age: hingeJson.User.profile?.age,
  };

  if (!isPlausibleHingeAge(validationData.age)) {
    errors.birth_date = {
      message: "No plausible adult age detected",
      age: validationData.age,
    };
  }

  const signupTimestamp = validationData.signup_time
    ? tryParseHingeTimestampToDate(validationData.signup_time)?.getTime()
    : Number.NaN;
  if (!Number.isFinite(signupTimestamp)) {
    errors.create_date = {
      message: "No valid signup time detected",
      signup_time: validationData.signup_time,
    };
  }

  const hasMatches = hingeJson.Matches && hingeJson.Matches.length > 0;
  const hasPrompts = hingeJson.Prompts && hingeJson.Prompts.length > 0;

  if (!hasMatches && !hasPrompts) {
    errors.no_data = {
      message: "No meaningful data detected (no matches or prompts)",
      matchesCount: hingeJson.Matches?.length ?? 0,
      promptsCount: hingeJson.Prompts?.length ?? 0,
    };
  }

  if (Object.keys(errors).length === 0) {
    return [true, {}];
  } else {
    return [false, errors];
  }
}

/**
 * Extract and anonymize Hinge data from multiple JSON strings
 *
 * @param jsonStrings - Array of JSON file contents from Hinge export.
 * Expected files: user.json, matches.json, prompts.json, media.json
 * See HingeDataFilePart type in HingeDataJSON.ts for file type details.
 */
export async function extractHingeData(
  jsonStrings: string[],
  filePresence: HingeExportFilePresence = {},
): Promise<SwipestatsHingeProfilePayload> {
  try {
    // Parse each file - treat as unknown until validated by type guards
    const hingeDataParts = jsonStrings.map(
      (jsonString) => JSON.parse(jsonString) as unknown,
    );

    const hingeJson = combineHingeDataParts(hingeDataParts, filePresence);

    const [jsonDataIsValid, invalidKeysAndValues] = isValidHingeJson(hingeJson);

    if (!jsonDataIsValid) {
      console.error("Hinge data is invalid", invalidKeysAndValues);
      throw new Error("Hinge data json is invalid");
    }

    // Anonymize the data
    const anonymizedHingeJson = sanitizeAnonymizedHingeBlob({
      User: {
        preferences: hingeJson.User.preferences,
        identity: {
          phone_country_code: hingeJson.User.identity.phone_country_code,
          phone_country_calling_code:
            hingeJson.User.identity.phone_country_calling_code,
          instagram_authorized:
            hingeJson.User.identity.instagram_authorized ?? false,
          has_email: !!hingeJson.User.identity.email,
          has_phone: !!hingeJson.User.identity.phone_number,
          has_phone_carrier: !!hingeJson.User.identity.phone_carrier,
        },
        account: hingeJson.User.account,
        installs: hingeJson.User.installs,
        devices: hingeJson.User.devices,
        location: hingeJson.User.location
          ? { country: getLocationCountry(hingeJson.User.location) }
          : undefined,
        profile: {
          ...hingeJson.User.profile,
          has_first_name: !!hingeJson.User.profile.first_name,
          has_last_name: !!hingeJson.User.profile.last_name,
        },
      },
      Matches: hingeJson.Matches,
      ...(hingeJson.Prompts !== undefined
        ? { Prompts: hingeJson.Prompts }
        : {}),
      Media: hingeJson.Media,
    });

    const profileId = await deriveHingeProfileIdFromExport(anonymizedHingeJson);

    const swipestatsHingeProfilePayload: SwipestatsHingeProfilePayload = {
      hingeId: profileId,
      anonymizedHingeJson,
    };

    return swipestatsHingeProfilePayload;
  } catch (error) {
    console.error("Hinge data extraction failed", error);
    throw new Error("Something went wrong with Hinge profile extraction");
  }
}
