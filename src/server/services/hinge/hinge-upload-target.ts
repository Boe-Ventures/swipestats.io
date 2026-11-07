import { isSameHingeAccountSignup } from "@/lib/hinge/account-period";
import { parseHingeTimestampToDate } from "@/lib/hinge/timestamp";
import { createSHA256Hash } from "@/lib/utils/hash";

/**
 * A Hinge signup timestamp can collide across people and guest sessions. Use
 * it only within the authenticated owner's namespace, never to claim a row.
 * The caller must verify the export and load the existing profile by userId.
 */
export async function resolveHingeUploadTarget(params: {
  userId: string;
  signupTime: string;
  existingProfile?: {
    hingeId: string;
    userId: string | null;
    createDate: Date;
  } | null;
}): Promise<{ hingeId: string; isSameAccount: boolean }> {
  if (!params.userId) throw new Error("A Hinge upload requires an owner.");
  const signup = parseHingeTimestampToDate(params.signupTime);
  const existing = params.existingProfile;
  if (existing && existing.userId !== params.userId) {
    throw new Error("Cannot import into another user's Hinge profile.");
  }
  if (existing && isSameHingeAccountSignup(existing.createDate, signup)) {
    // Keep public links stable, including after a guest signs in and the row
    // changes owners. Never rederive the ID of an already-owned profile.
    return { hingeId: existing.hingeId, isSameAccount: true };
  }
  return {
    hingeId: await createSHA256Hash(
      JSON.stringify(["hinge-profile:v3", params.userId, signup.toISOString()]),
    ),
    isSameAccount: false,
  };
}
