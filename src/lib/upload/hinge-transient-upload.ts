import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { filterPayloadByConsent } from "@/lib/utils/filterHingePayload";

export interface PreparedHingeTransientUpload {
  hingeId: string;
  blobBody: string;
  /** Exact serialization of every consent-filtered field bound to the blob. */
  payloadKey: string;
}

/**
 * Prepare the blob body and its retry identity in one pass. Comparing the full
 * serialization is intentionally conservative: any payload or profile-ID
 * change forces a new upload, even when the consent toggles are unchanged.
 */
export function prepareHingeTransientUpload(
  payload: SwipestatsHingeProfilePayload,
  consent: HingeConsentState,
): PreparedHingeTransientUpload {
  const filteredPayload = filterPayloadByConsent(payload, consent);

  return {
    hingeId: filteredPayload.hingeId,
    blobBody: JSON.stringify(filteredPayload.anonymizedHingeJson),
    payloadKey: JSON.stringify(filteredPayload),
  };
}

export function canReuseHingeTransientUpload(
  cachedPayloadKey: string | null | undefined,
  preparedPayloadKey: string,
): boolean {
  return cachedPayloadKey === preparedPayloadKey;
}
