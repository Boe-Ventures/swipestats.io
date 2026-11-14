import type {
  AnonymizedTinderDataJSON,
  FullTinderDataJSON,
  SwipestatsProfilePayload,
} from "@/lib/interfaces/TinderDataJSON";
import { isNewPhotoFormat } from "@/lib/interfaces/TinderDataJSON";
import {
  anonymizedTinderDataSchema,
  fullTinderDataSchema,
} from "@/lib/interfaces/TinderDataJSON.schema";
import { deriveTinderProfileIdFromExport } from "./tinder-profile-id";

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
  } else if (!Number.isFinite(Date.parse(tinderJson.User.birth_date))) {
    errors.user_birth_date = {
      message: "birth_date is invalid",
    };
  }

  // Validate or infer create_date
  if (!tinderJson.User.create_date) {
    const appOpens = Object.keys(tinderJson.Usage.app_opens).sort();
    const earliestDate = appOpens[0];
    if (earliestDate) {
      // REVIEW(provider assumption): older Tinder exports can omit account
      // creation time. The earliest observed app-open day is a conservative
      // upper bound, not the true signup instant. It is retained only because
      // the profile column is currently required; period metrics use observed
      // usage dates and must not treat this inferred value as source evidence.
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
  } else if (!Number.isFinite(Date.parse(tinderJson.User.create_date))) {
    errors.user_create_date = {
      message: "create_date is invalid",
    };
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

function sanitizeCountry(
  value: unknown,
): string | { code: string } | undefined {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "code" in value &&
    typeof value.code === "string"
  ) {
    return { code: value.code };
  }
  return undefined;
}

/**
 * Build the exact public-blob contract from known analytical inputs.
 *
 * REVIEW(provider assumption): profile photo URLs and prompt text are public
 * Tinder-profile content when photo sharing is enabled. Provider IDs,
 * filenames, timestamps, verification metadata, and future photo fields are
 * deliberately excluded because the insights pipeline does not need them.
 */
function createAnonymizedTinderData(
  tinderJson: FullTinderDataJSON,
  createDateInferred: boolean,
): AnonymizedTinderDataJSON {
  const userWithCountry = tinderJson.User as FullTinderDataJSON["User"] & {
    country?: unknown;
  };
  const activeTime = tinderJson.User.active_time;

  const candidate = {
    Usage: {
      app_opens: tinderJson.Usage.app_opens,
      swipes_likes: tinderJson.Usage.swipes_likes,
      swipes_passes: tinderJson.Usage.swipes_passes,
      superlikes: tinderJson.Usage.superlikes,
      matches: tinderJson.Usage.matches,
      messages_sent: tinderJson.Usage.messages_sent,
      messages_received: tinderJson.Usage.messages_received,
    },
    User: {
      ...(typeof activeTime === "string"
        ? { active_time: activeTime }
        : undefined),
      age_filter_max: tinderJson.User.age_filter_max,
      age_filter_min: tinderJson.User.age_filter_min,
      birth_date: tinderJson.User.birth_date,
      create_date: tinderJson.User.create_date,
      create_date_inferred: createDateInferred,
      gender: tinderJson.User.gender,
      gender_filter: tinderJson.User.gender_filter,
      interested_in: tinderJson.User.interested_in,
      bio: tinderJson.User.bio,
      city:
        typeof tinderJson.User.city === "string"
          ? tinderJson.User.city
          : tinderJson.User.city
            ? {
                name: tinderJson.User.city.name,
                region: tinderJson.User.city.region,
              }
            : undefined,
      education: tinderJson.User.education,
      jobs: tinderJson.User.jobs?.map((job) => ({
        company: job.company
          ? {
              displayed: job.company.displayed,
              name: job.company.name,
            }
          : undefined,
        title: job.title
          ? { displayed: job.title.displayed, name: job.title.name }
          : undefined,
      })),
      schools: tinderJson.User.schools?.map((school) => ({
        displayed: school.displayed,
        name: school.name,
      })),
      user_interests: tinderJson.User.user_interests,
      sexual_orientations: tinderJson.User.sexual_orientations,
      descriptors: tinderJson.User.descriptors?.map((descriptor) => ({
        name: descriptor.name,
        choices: descriptor.choices,
        visibility: descriptor.visibility,
      })),
      instagram: !!tinderJson.User.instagram,
      spotify: getSpotifyConnectionStatus(tinderJson.User.spotify),
      country: sanitizeCountry(userWithCountry.country),
    },
    Messages: tinderJson.Messages.map((match) => ({
      match_id: match.match_id,
      messages: match.messages.map((message) => ({
        to: message.to,
        message: message.message,
        sent_date: message.sent_date,
        type: message.type,
        fixed_height: message.fixed_height,
      })),
    })),
    Photos: isNewPhotoFormat(tinderJson.Photos)
      ? tinderJson.Photos.map((photo) => ({
          type: photo.type,
          url: photo.url,
          prompt_text: photo.prompt_text,
        }))
      : tinderJson.Photos,
  };

  return anonymizedTinderDataSchema.parse(
    candidate,
  ) as AnonymizedTinderDataJSON;
}

/**
 * Extract and anonymize Tinder data from JSON string
 */
export async function extractTinderData(
  jsonString: string,
): Promise<SwipestatsProfilePayload> {
  try {
    const parsedJson = JSON.parse(jsonString) as unknown;
    const fullDataResult = fullTinderDataSchema.safeParse(parsedJson);
    if (!fullDataResult.success) {
      const issue = fullDataResult.error.issues[0];
      throw new Error(
        `Tinder data validation failed: ${issue?.path.join(".") || "unknown"}: ${issue?.message ?? "invalid export data"}`,
      );
    }
    const createDateInferred = !fullDataResult.data.User.create_date;
    const tinderJson = fullDataResult.data as FullTinderDataJSON;

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

    // Construct a strict allowlisted payload instead of maintaining a PII
    // denylist. Unknown provider fields never enter the public blob.
    const anonymizedTinderJson = createAnonymizedTinderData(
      tinderJson,
      createDateInferred,
    );

    const profileId =
      await deriveTinderProfileIdFromExport(anonymizedTinderJson);

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
