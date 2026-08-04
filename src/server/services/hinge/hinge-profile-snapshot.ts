export function shouldApplyHingeProfileSnapshot(
  existingLastSeenAt: Date | null,
  incomingLastSeenAt: Date,
): boolean {
  if (!Number.isFinite(incomingLastSeenAt.getTime())) {
    throw new Error("Incoming Hinge last-seen timestamp must be valid");
  }
  if (existingLastSeenAt === null) return true;
  if (!Number.isFinite(existingLastSeenAt.getTime())) {
    throw new Error("Existing Hinge last-seen timestamp must be valid");
  }

  // REVIEW(provider assumption): account.last_seen is the provider watermark
  // for profile/preferences state. Older exports may add historical activity,
  // but must not roll the current demographic snapshot backward.
  return incomingLastSeenAt >= existingLastSeenAt;
}
