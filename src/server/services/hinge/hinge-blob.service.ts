import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import {
  assertHingeProfileIdMatchesExport,
  deriveHingeProfileIdFromExport,
} from "@/lib/upload/hinge-profile-id";
import { parseAnonymizedHingeBlob } from "@/lib/upload/hinge-runtime-schema";
import { fetchBlobJson } from "@/server/services/blob.service";
import { resolveHingeUploadTarget } from "./hinge-upload-target";

export async function fetchVerifiedHingeBlob(
  blobUrl: string,
  expectedHingeId: string,
  _options: { consume?: boolean } = {},
): Promise<AnonymizedHingeDataJSON> {
  const rawBlob = await fetchBlobJson<unknown>(blobUrl);
  const hingeJson = parseAnonymizedHingeBlob(rawBlob);
  await assertHingeProfileIdMatchesExport(expectedHingeId, hingeJson);
  // The owner-bound transient-upload ledger performs best-effort deletion only
  // after the provider transaction records COMMITTED.
  return hingeJson;
}

/** Admin reprocessing uses stored public IDs rather than client export IDs. */
export async function fetchVerifiedHingeProfileBlob(
  blobUrl: string,
  params: {
    hingeId: string;
    userId: string;
    existingProfile: Parameters<
      typeof resolveHingeUploadTarget
    >[0]["existingProfile"];
  },
): Promise<AnonymizedHingeDataJSON> {
  const hingeJson = parseAnonymizedHingeBlob(
    await fetchBlobJson<unknown>(blobUrl),
  );
  const target = await resolveHingeUploadTarget({
    ...params,
    signupTime: hingeJson.User.account.signup_time,
  });
  // Existing rows must match their recorded signup and owner, including v1
  // rows and v3 rows transferred from a guest. Missing rows may use v2 or v3.
  const matches = params.existingProfile
    ? target.isSameAccount && params.existingProfile.hingeId === params.hingeId
    : target.hingeId === params.hingeId ||
      (await deriveHingeProfileIdFromExport(hingeJson)) === params.hingeId;
  if (!matches) {
    throw new Error(
      "Uploaded Hinge data does not match the requested profile.",
    );
  }
  return hingeJson;
}
