import { createSHA256Hash } from "@/lib/utils/hash";
import { tryParseHingeTimestampToDate } from "@/lib/hinge/timestamp";

interface HingeProfileIdentityExport {
  User: {
    account: {
      signup_time: string;
    };
  };
}

function normalizeHingeSignupTime(signupTime: string): string {
  const trimmed = signupTime.trim();
  if (!tryParseHingeTimestampToDate(trimmed)) {
    throw new Error("Hinge signup time is invalid.");
  }

  // REVIEW(provider assumption): Hinge emits a stable spelling of signup_time
  // across repeat exports. Existing public v2 IDs hash that spelling after
  // only these two textual substitutions. Do not canonicalize equivalent
  // timestamp spellings here without first shipping an identity-alias
  // migration, or historical profiles can fork on their next upload.
  return trimmed.replace("T", " ").replace(/Z$/, "");
}

/**
 * Hinge does not export a native account ID. SwipeStats therefore derives its
 * stable account key from the export's signup timestamp.
 */
export async function deriveHingeProfileId(
  signupTime: string,
): Promise<string> {
  return createSHA256Hash(
    `hinge-profile:v2:${normalizeHingeSignupTime(signupTime)}`,
  );
}

export async function deriveHingeProfileIdFromExport(
  hingeJson: HingeProfileIdentityExport,
): Promise<string> {
  return deriveHingeProfileId(hingeJson.User.account.signup_time);
}

/**
 * Fail before any ownership or profile mutation when a blob and requested
 * public profile ID do not describe the same Hinge account.
 */
export async function assertHingeProfileIdMatchesExport(
  expectedHingeId: string,
  hingeJson: HingeProfileIdentityExport,
): Promise<void> {
  const derivedHingeId = await deriveHingeProfileIdFromExport(hingeJson);
  if (derivedHingeId !== expectedHingeId) {
    throw new Error(
      "Uploaded Hinge data does not match the requested profile.",
    );
  }
}
