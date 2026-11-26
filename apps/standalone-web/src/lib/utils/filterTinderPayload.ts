import type { SwipestatsProfilePayload } from "@/lib/interfaces/TinderDataJSON";
import type { TinderConsentState } from "@/lib/interfaces/TinderConsent";

/**
 * Filters the Tinder payload based on user consent.
 * Returns a new payload with filtered data without mutating the original.
 * Note: Education is always included as schools are large enough to be anonymous.
 */
export function filterPayloadByConsent(
  payload: SwipestatsProfilePayload,
  consent: TinderConsentState,
): SwipestatsProfilePayload {
  const filtered: SwipestatsProfilePayload = {
    ...payload,
    anonymizedTinderJson: {
      ...payload.anonymizedTinderJson,
      User: {
        ...payload.anonymizedTinderJson.User,
      },
    },
  };

  // Remove photos if not consented
  if (!consent.photos) {
    filtered.anonymizedTinderJson.Photos = [];
  }

  // Remove jobs/work if not consented
  if (!consent.work) {
    filtered.anonymizedTinderJson.User.jobs = undefined;
  }

  // Education is always included (not filtered)

  return filtered;
}
