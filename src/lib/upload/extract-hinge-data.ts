import type {
  AnonymizedHingeDataJSON,
  FullHingeDataJSON,
  SwipestatsHingeProfilePayload,
  UserData,
  PromptEntryList,
  Conversations,
  AnonymizedHingeUser,
  HingeValidationData,
} from "@/lib/interfaces/HingeDataJSON";

// HingeDataFilePart is documented in HingeDataJSON.ts but we use `unknown[]` 
// at runtime since JSON.parse() doesn't provide type guarantees
import { createSHA256Hash } from "@/lib/utils/hash";
import { omit } from "@/lib/utils/object";

/**
 * Helper functions to detect file types based on content structure
 */
function isUserFile(data: unknown): data is UserData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return !!(obj.preferences || obj.identity || obj.account || obj.profile);
}

function isMatchesFile(data: unknown): data is Conversations {
  if (!Array.isArray(data)) return false;
  return (
    data.length === 0 ||
    (typeof data[0] === "object" &&
      data[0] !== null &&
      ("chats" in data[0] ||
        "like" in data[0] ||
        "match" in data[0] ||
        "block" in data[0] ||
        "we_met" in data[0]))
  );
}

function isPromptsFile(data: unknown): data is PromptEntryList {
  if (!Array.isArray(data)) return false;
  return (
    data.length === 0 ||
    (typeof data[0] === "object" &&
      data[0] !== null &&
      "prompt" in data[0] &&
      ("text" in data[0] || "options" in data[0]) && // Accept either text or options (for poll prompts)
      "type" in data[0])
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
function combineHingeDataParts(dataParts: unknown[]): FullHingeDataJSON {
  const combined: Partial<FullHingeDataJSON> = {
    User: {} as UserData,
    Matches: [],
    Prompts: [],
    Media: [],
    Subscriptions: [],
  };

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
    } else {
      // Fallback: try to merge any unrecognized structure
      if (typeof part === "object" && part !== null) {
        for (const [key, value] of Object.entries(part)) {
          if (!combined[key as keyof FullHingeDataJSON]) {
            (combined as Record<string, unknown>)[key] = value;
          }
        }
      }
    }
  }

  return combined as FullHingeDataJSON;
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

  if (!validationData.age && !validationData.birth_date) {
    errors.birth_date = {
      message: "No birth date or age detected",
      user: hingeJson.User,
    };
  }

  if (!validationData.signup_time) {
    errors.create_date = {
      message: "No signup time detected",
      user: hingeJson.User,
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
 * Create a unique SwipeStats profile ID from birth date equivalent and account creation
 */
async function createSwipestatsProfileId(
  birthDateEquivalent: string,
  createDateEquivalent: string,
): Promise<string> {
  const profileId = await createSHA256Hash(
    birthDateEquivalent + "-" + createDateEquivalent,
  );
  return profileId;
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
): Promise<SwipestatsHingeProfilePayload> {
  try {
    // Parse each file - treat as unknown until validated by type guards
    const hingeDataParts = jsonStrings.map((jsonString) =>
      JSON.parse(jsonString) as unknown,
    );

    const hingeJson = combineHingeDataParts(hingeDataParts);

    const [jsonDataIsValid, invalidKeysAndValues] = isValidHingeJson(hingeJson);

    if (!jsonDataIsValid) {
      console.error("Hinge data is invalid", invalidKeysAndValues);
      throw new Error("Hinge data json is invalid");
    }

    // Anonymize the data
    const anonymizedHingeJson: AnonymizedHingeDataJSON = {
      ...hingeJson,
      User: {
        preferences: hingeJson.User.preferences,
        identity: {
          fbid: hingeJson.User.identity.fbid,
          phone_country_code: hingeJson.User.identity.phone_country_code,
          phone_country_calling_code:
            hingeJson.User.identity.phone_country_calling_code,
          instagram_authorized: hingeJson.User.identity.instagram_authorized,
          has_email: !!hingeJson.User.identity.email,
          has_phone: !!hingeJson.User.identity.phone_number,
          has_phone_carrier: !!hingeJson.User.identity.phone_carrier,
        },
        account: hingeJson.User.account,
        installs: hingeJson.User.installs.map((install) =>
          omit(install, ["ip_address", "idfa", "idfv", "adid", "user_agent"]),
        ),
        devices: hingeJson.User.devices?.map((device) =>
          omit(device, ["device_id", "user_agent"]),
        ),
        location: hingeJson.User.location
          ? { country: hingeJson.User.location.country }
          : undefined,
        profile: {
          ...omit(hingeJson.User.profile, ["first_name", "last_name"]),
          has_first_name: !!hingeJson.User.profile.first_name,
          has_last_name: !!hingeJson.User.profile.last_name,
        },
      } as AnonymizedHingeUser,
    };

    // Use signup_time as create_date equivalent and age for birth_date equivalent
    const createDateEquivalent = anonymizedHingeJson.User.account.signup_time;
    const birthDateEquivalent = anonymizedHingeJson.User.profile.age.toString();

    const profileId = await createSwipestatsProfileId(
      birthDateEquivalent,
      createDateEquivalent,
    );

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
