import { createSHA256Hash } from "@/lib/utils/hash";
import {
  tinderBirthDatesMatch,
  tinderCreateDatesMatch,
} from "./validation.service";

/** Resolve account identity only inside the authenticated owner's namespace. */
export async function resolveTinderUploadTarget(params: {
  userId: string;
  birthDate: string;
  createDate: string;
  existingProfile?: {
    tinderId: string;
    userId: string | null;
    birthDate: Date;
    createDate: Date;
  } | null;
}): Promise<{ tinderId: string; isSameAccount: boolean }> {
  if (!params.userId) throw new Error("A Tinder upload requires an owner.");
  const birthDate = new Date(params.birthDate);
  const createDate = new Date(params.createDate);
  if (
    !Number.isFinite(birthDate.getTime()) ||
    !Number.isFinite(createDate.getTime())
  ) {
    throw new Error("Invalid Tinder account identity dates.");
  }
  const existing = params.existingProfile;
  if (existing && existing.userId !== params.userId) {
    throw new Error("Cannot import into another user's Tinder profile.");
  }
  if (
    existing &&
    tinderBirthDatesMatch(existing.birthDate, params.birthDate) &&
    tinderCreateDatesMatch(existing.createDate, params.createDate)
  ) {
    // Preserve public links, including after guest conversion and equivalent
    // timestamp spellings. An export alone never grants another row's ownership.
    return { tinderId: existing.tinderId, isSameAccount: true };
  }
  return {
    tinderId: await createSHA256Hash(
      JSON.stringify([
        "tinder-profile:v2",
        params.userId,
        birthDate.toISOString().slice(0, 10),
        createDate.toISOString(),
      ]),
    ),
    isSameAccount: false,
  };
}
