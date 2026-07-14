import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { anonymizedTinderDataSchema } from "@/lib/interfaces/TinderDataJSON.schema";
import { assertTinderProfileIdMatchesExport } from "@/lib/upload/tinder-profile-id";

const MAX_REPORTED_ISSUES = 6;

/** Validate and normalize the anonymized blob before database work begins. */
export function parseAnonymizedTinderData(
  input: unknown,
): AnonymizedTinderDataJSON {
  const result = anonymizedTinderDataSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, MAX_REPORTED_ISSUES)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Tinder data validation failed: ${issues}`);
  }

  return result.data as AnonymizedTinderDataJSON;
}

/** Fetch, validate, and bind an anonymized export to its requested profile. */
export async function loadVerifiedAnonymizedTinderData(
  blobUrl: string,
  tinderId: string,
): Promise<AnonymizedTinderDataJSON> {
  const { fetchBlobJson } = await import("../blob.service");
  const blobJson = await fetchBlobJson<unknown>(blobUrl);
  const tinderJson = parseAnonymizedTinderData(blobJson);
  await assertTinderProfileIdMatchesExport(tinderId, tinderJson);
  return tinderJson;
}
