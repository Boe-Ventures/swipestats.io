import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";

/**
 * Filter Hinge payload based on user consent
 * Removes data that the user has opted not to share
 */
export function filterPayloadByConsent(
  payload: SwipestatsHingeProfilePayload,
  consent: HingeConsentState,
): SwipestatsHingeProfilePayload {
  const filtered = { ...payload };

  // If user doesn't consent to share photos, remove media
  if (!consent.sharePhotos) {
    filtered.anonymizedHingeJson = {
      ...filtered.anonymizedHingeJson,
      Media: [],
    };
  }

  // If user doesn't consent to share work info, clear job-related fields
  if (!consent.shareWorkInfo) {
    filtered.anonymizedHingeJson = {
      ...filtered.anonymizedHingeJson,
      User: {
        ...filtered.anonymizedHingeJson.User,
        profile: {
          ...filtered.anonymizedHingeJson.User.profile,
          job_title: "",
          job_title_displayed: false,
          workplaces: "",
          workplaces_displayed: false,
        },
      },
    };
  }

  // If user doesn't consent to share matches, remove them
  if (!consent.shareMatches) {
    filtered.anonymizedHingeJson = {
      ...filtered.anonymizedHingeJson,
      Matches: [],
    };
  }

  // If user doesn't consent to share messages, filter them out from matches
  if (!consent.shareMessages) {
    filtered.anonymizedHingeJson = {
      ...filtered.anonymizedHingeJson,
      Matches: filtered.anonymizedHingeJson.Matches.map((match) => ({
        ...match,
        chats: [], // Remove all chat messages
      })),
    };
  }

  // If user doesn't consent to share prompts, remove them
  if (!consent.sharePrompts) {
    filtered.anonymizedHingeJson = {
      ...filtered.anonymizedHingeJson,
      Prompts: [],
    };
  }

  return filtered;
}
