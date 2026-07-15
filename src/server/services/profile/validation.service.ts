import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { anonymizedTinderDataSchema } from "@/lib/interfaces/TinderDataJSON.schema";
import { assertTinderProfileIdMatchesExport } from "@/lib/upload/tinder-profile-id";

const MAX_REPORTED_ISSUES = 6;

export interface TinderUploadDataConsent {
  photos: boolean;
  work: boolean;
}

export function tinderBirthDatesMatch(
  existingBirthDate: Date,
  incomingBirthDate: string,
): boolean {
  const incoming = new Date(incomingBirthDate);
  if (
    !Number.isFinite(existingBirthDate.getTime()) ||
    !Number.isFinite(incoming.getTime())
  ) {
    return false;
  }

  // REVIEW(provider assumption): a birth date is calendar identity data, not
  // an account-event instant. Treat equivalent timestamp spellings on the
  // same UTC calendar day as the same value while still rejecting a day-level
  // mismatch before any account merge.
  return (
    existingBirthDate.toISOString().slice(0, 10) ===
    incoming.toISOString().slice(0, 10)
  );
}

export function tinderCreateDatesMatch(
  existingCreateDate: Date,
  incomingCreateDate: string,
): boolean {
  const incoming = new Date(incomingCreateDate);
  return (
    Number.isFinite(existingCreateDate.getTime()) &&
    Number.isFinite(incoming.getTime()) &&
    existingCreateDate.getTime() === incoming.getTime()
  );
}

export function assertTinderDataMatchesConsent(
  tinderJson: AnonymizedTinderDataJSON,
  consent: TinderUploadDataConsent,
): void {
  if (!consent.photos && tinderJson.Photos.length > 0) {
    throw new Error(
      "Tinder data validation failed: Photos were included without photo consent",
    );
  }
  if (!consent.work && (tinderJson.User.jobs?.length ?? 0) > 0) {
    throw new Error(
      "Tinder data validation failed: User.jobs was included without work consent",
    );
  }
}

/** Validate and normalize the anonymized blob before database work begins. */
export function parseAnonymizedTinderData(
  input: unknown,
  consent?: TinderUploadDataConsent,
): AnonymizedTinderDataJSON {
  const result = anonymizedTinderDataSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, MAX_REPORTED_ISSUES)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Tinder data validation failed: ${issues}`);
  }

  const tinderJson = result.data as AnonymizedTinderDataJSON;
  if (consent) {
    assertTinderDataMatchesConsent(tinderJson, consent);
  }
  return tinderJson;
}

/** Fetch, validate, and bind an anonymized export to its requested profile. */
export async function loadVerifiedAnonymizedTinderData(
  blobUrl: string,
  tinderId: string,
  consent?: TinderUploadDataConsent,
  _options: { consume?: boolean } = {},
): Promise<AnonymizedTinderDataJSON> {
  const { fetchBlobJson } = await import("../blob.service");
  const blobJson = await fetchBlobJson<unknown>(blobUrl);
  const tinderJson = parseAnonymizedTinderData(blobJson, consent);
  await assertTinderProfileIdMatchesExport(tinderId, tinderJson);
  // Transport deletion is deliberately owned by transient-upload.service and
  // runs only after the provider transaction's COMMITTED marker is durable.
  return tinderJson;
}
