import type {
  AnonymizedHingeDataJSON,
  SwipestatsHingeProfilePayload,
} from "@/lib/interfaces/HingeDataJSON";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";

type HingeOptionalDataConsent = Pick<
  HingeConsentState,
  "sharePhotos" | "shareWorkInfo"
>;

/**
 * Enforce optional-data consent on the canonical payload. This runs both in the
 * browser and again on the server because request flags cannot prove that a
 * caller actually removed the corresponding fields before upload.
 */
export function filterHingeJsonByConsent(
  hingeJson: AnonymizedHingeDataJSON,
  consent: HingeOptionalDataConsent,
): AnonymizedHingeDataJSON {
  let filtered = hingeJson;

  if (!consent.sharePhotos) {
    filtered = { ...filtered, Media: [] };
  }

  if (!consent.shareWorkInfo) {
    filtered = {
      ...filtered,
      User: {
        ...filtered.User,
        profile: {
          ...filtered.User.profile,
          job_title: "",
          job_title_displayed: false,
          workplaces: "",
          workplaces_displayed: false,
        },
      },
    };
  }

  return filtered;
}

/**
 * Filter Hinge payload based on user consent
 * Removes data that the user has opted not to share
 */
export function filterPayloadByConsent(
  payload: SwipestatsHingeProfilePayload,
  consent: HingeConsentState,
): SwipestatsHingeProfilePayload {
  return {
    ...payload,
    anonymizedHingeJson: filterHingeJsonByConsent(
      payload.anonymizedHingeJson,
      consent,
    ),
  };
}
