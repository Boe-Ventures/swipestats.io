import { createSHA256Hash } from "@/lib/utils/hash";

interface TinderProfileIdentityFields {
  birthDate: string;
  createDate: string;
}

interface TinderProfileIdentityExport {
  User: {
    birth_date: string;
    create_date: string;
  };
}

/**
 * Tinder profile IDs are deterministic so the browser and server can prove
 * that an uploaded export belongs to the profile named by the request.
 */
export async function deriveTinderProfileId({
  birthDate,
  createDate,
}: TinderProfileIdentityFields): Promise<string> {
  return createSHA256Hash(`${birthDate}-${createDate}`);
}

export async function deriveTinderProfileIdFromExport(
  tinderJson: TinderProfileIdentityExport,
): Promise<string> {
  return deriveTinderProfileId({
    birthDate: tinderJson.User.birth_date,
    createDate: tinderJson.User.create_date,
  });
}

/**
 * Fail before any ownership or profile mutation when the request's public ID
 * is not derived from the uploaded Tinder export.
 */
export async function assertTinderProfileIdMatchesExport(
  expectedTinderId: string,
  tinderJson: TinderProfileIdentityExport,
): Promise<void> {
  const derivedTinderId = await deriveTinderProfileIdFromExport(tinderJson);
  if (derivedTinderId !== expectedTinderId) {
    throw new Error(
      "Uploaded Tinder data does not match the requested profile.",
    );
  }
}
