import type {
  AnonymizedTinderDataJSON,
  FullTinderDataJSON,
  SwipestatsProfilePayload,
} from "@/lib/interfaces/TinderDataJSON";
import { isNewPhotoFormat } from "@/lib/interfaces/TinderDataJSON";
import { createSHA256Hash } from "@/lib/utils/hash";
import { omit } from "@/lib/utils/object";

/**
 * Create a unique SwipeStats profile ID from birth date and account creation date
 */
async function createSwipestatsProfileId(
  birthDate: string,
  appProfileCreateDate: string,
): Promise<string> {
  const profileId = await createSHA256Hash(
    birthDate + "-" + appProfileCreateDate,
  );
  return profileId;
}

/**
 * Validate that Tinder JSON has required fields
 */
export function isValidTinderJson(
  tinderJson: FullTinderDataJSON | AnonymizedTinderDataJSON,
): [boolean, Record<string, { message: string; [key: string]: unknown }>] {
  const errors: Record<string, { message: string; [key: string]: unknown }> =
    {};

  // Validate Usage data
  if (!tinderJson.Usage || typeof tinderJson.Usage !== "object") {
    const topLevelKeys = Object.keys(tinderJson).slice(0, 20).join(", ");
    errors.usage_missing = {
      message: "Usage object is missing or invalid",
      availableFields: topLevelKeys,
      hasUsageField: "Usage" in tinderJson,
      usageType: typeof tinderJson.Usage,
    };
    return [false, errors];
  }

  // Check for all expected usage metrics
  const usageMetrics = [
    "app_opens",
    "swipes_likes",
    "swipes_passes",
    "matches",
    "messages_sent",
    "messages_received",
  ];
  for (const metric of usageMetrics) {
    if (!tinderJson.Usage[metric as keyof typeof tinderJson.Usage]) {
      console.warn(`⚠️  Usage.${metric} is missing`);
    }
  }

  if (!Object.values(tinderJson.Usage.app_opens).length) {
    errors.app_opens = {
      message: "No app opens detected",
      appOpens: tinderJson.Usage.app_opens,
    };
  }

  // Validate Messages array
  if (!tinderJson.Messages || !Array.isArray(tinderJson.Messages)) {
    console.warn("⚠️  Messages array is missing or invalid");
    errors.messages_invalid = {
      message: "Messages array is missing or invalid",
    };
  } else {
    console.log(`✓ Found ${tinderJson.Messages.length} matches`);
  }

  // Validate User data
  if (!tinderJson.User || typeof tinderJson.User !== "object") {
    errors.user_missing = {
      message: "User object is missing or invalid",
    };
    return [false, errors];
  }

  // Validate critical User fields
  const criticalUserFields = [
    "birth_date",
    "gender",
    "gender_filter",
    "interested_in",
    "age_filter_min",
    "age_filter_max",
  ];

  for (const field of criticalUserFields) {
    if (!tinderJson.User[field as keyof typeof tinderJson.User]) {
      console.warn(`⚠️  User.${field} is missing`);
    }
  }

  // Validate birth_date
  if (!tinderJson.User.birth_date) {
    errors.user_birth_date = {
      message: "No birth_date detected in User object",
      user: tinderJson.User,
    };
  }

  // Validate or infer create_date
  if (!tinderJson.User.create_date) {
    const appOpens = Object.keys(tinderJson.Usage.app_opens).sort();
    const earliestDate = appOpens[0];
    if (earliestDate) {
      tinderJson.User.create_date = earliestDate;
      console.warn(
        "create_date was missing, inferred from earliest app open:",
        earliestDate,
      );
    } else {
      errors.user_create_date = {
        message: "No create_date detected",
        user: tinderJson.User,
        usageDayCount: Object.keys(tinderJson.Usage.app_opens).length,
        appOpens: Object.values(tinderJson.Usage.app_opens).reduce(
          (sum, val) => sum + val,
          0,
        ),
      };
    }
  }

  if (Object.keys(errors).length === 0) {
    return [true, {}];
  } else {
    return [false, errors];
  }
}

/**
 * Safely extract Spotify connection status from User object
 * Handles both old format { spotify_connected: boolean } and new format {}
 */
function getSpotifyConnectionStatus(
  spotify: FullTinderDataJSON["User"]["spotify"],
): boolean {
  if (!spotify) return false;
  // Handle empty object from newer exports
  if (Object.keys(spotify).length === 0) return false;
  // Handle old format with spotify_connected
  if ("spotify_connected" in spotify) {
    return !!spotify.spotify_connected;
  }
  return false;
}

/**
 * Extract and anonymize Tinder data from JSON string
 */
export async function extractTinderData(
  jsonString: string,
): Promise<SwipestatsProfilePayload> {
  try {
    const tinderJson = JSON.parse(jsonString) as FullTinderDataJSON;

    const [jsonDataIsValid, invalidKeysAndValues] =
      isValidTinderJson(tinderJson);

    if (!jsonDataIsValid) {
      console.error("Tinder data is invalid", invalidKeysAndValues);
      const errorDetails = Object.entries(invalidKeysAndValues)
        .map(([key, value]) => `${key}: ${value.message}`)
        .join(", ");
      throw new Error(`Tinder data validation failed: ${errorDetails}`);
    }

    // Log format detection for debugging
    const isNewFormat = isNewPhotoFormat(tinderJson.Photos);
    console.log(
      `Tinder data format: ${isNewFormat ? "NEW (2025+)" : "OLD (pre-2025)"}`,
    );

    // Log data quality metrics
    console.log("\n📊 Data Quality Summary:");
    console.log(
      `  - Usage days: ${Object.keys(tinderJson.Usage.app_opens).length}`,
    );
    console.log(`  - Total matches: ${tinderJson.Messages.length}`);
    console.log(
      `  - Photos: ${Array.isArray(tinderJson.Photos) ? tinderJson.Photos.length : "unknown"}`,
    );

    // Log presence of optional/new fields
    const optionalFields = [
      "SocialGraph",
      "ReportContent",
      "Tailor",
      "ShareMyDate",
      "RoomsAndInteractions",
      "SwipeParty",
      "StudentVerifications",
    ];

    const presentOptionalFields = optionalFields.filter(
      (field) => field in tinderJson,
    );

    if (presentOptionalFields.length > 0) {
      console.log(
        `  - Optional fields present: ${presentOptionalFields.join(", ")}`,
      );
    }

    // Log Spotify connection
    if (tinderJson.Spotify) {
      const spotifyConnected =
        typeof tinderJson.Spotify === "object" &&
        "spotify_connected" in tinderJson.Spotify &&
        tinderJson.Spotify.spotify_connected;
      console.log(`  - Spotify connected: ${spotifyConnected ? "Yes" : "No"}`);
    }

    // Anonymize the data - strip all PII
    const anonymizedTinderJson: AnonymizedTinderDataJSON = {
      ...tinderJson,
      User: {
        ...omit(tinderJson.User, [
          // Core PII fields (always present in old format)
          "email",
          "full_name",
          "name",
          "username",
          "phone_id",
          // Additional PII in new format (2025+)
          "authIds", // Authentication IDs
        ]),
        instagram: !!tinderJson.User.instagram,
        spotify: getSpotifyConnectionStatus(tinderJson.User.spotify),
      },
    };

    const profileId = await createSwipestatsProfileId(
      anonymizedTinderJson.User.birth_date,
      anonymizedTinderJson.User.create_date,
    );

    const swipestatsProfilePayload: SwipestatsProfilePayload = {
      tinderId: profileId,
      anonymizedTinderJson,
    };

    return swipestatsProfilePayload;
  } catch (error) {
    console.error("Tinder data extraction failed", error);
    // Re-throw the original error to preserve the validation details
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Something went wrong with profile extraction");
  }
}
