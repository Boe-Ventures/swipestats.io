export type SwipeRankRecomputeScope = "FULL" | "PROFILE";

/** Undefined is intentionally distinct from []: only undefined means FULL. */
export function normalizeRecomputeProfileIds(
  profileIds: readonly string[] | undefined,
): string[] | undefined {
  if (profileIds === undefined) return undefined;

  const result = [...new Set(profileIds.map((id) => id.trim()))].filter(
    Boolean,
  );
  if (result.length === 0) {
    throw new Error("profileIds must contain at least one non-empty ID.");
  }
  return result;
}

export function getRecomputeScope(
  profileIds: readonly string[] | undefined,
): SwipeRankRecomputeScope {
  return profileIds === undefined ? "FULL" : "PROFILE";
}
