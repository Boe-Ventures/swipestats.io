import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import { assertHingeProfileIdMatchesExport } from "@/lib/upload/hinge-profile-id";
import { parseAnonymizedHingeBlob } from "@/lib/upload/hinge-runtime-schema";
import { fetchBlobJson } from "@/server/services/blob.service";

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
