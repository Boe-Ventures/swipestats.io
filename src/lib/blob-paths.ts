/**
 * Centralized Vercel Blob path conventions.
 *
 * Blob is a flat key/value store — a "folder" is just a `/` in the pathname.
 * Keeping these builders in one place stops the convention from drifting across
 * the several upload call sites (which is how user photos previously ended up at
 * the bucket root while data files were namespaced). A consistent prefix gives
 * the dashboard — and `list({ mode: "folded" })` — a browsable folder tree, and
 * makes per-owner cleanup a single prefix operation.
 *
 * Note: in Vercel's client-upload flow the client chooses the pathname, so these
 * are applied client-side. `addRandomSuffix: true` only affects the leaf
 * filename, so navigation at the prefix level is unaffected.
 */

/** Gallery / profile-compare photos, partitioned by their owning user. */
export function userPhotoPath(userId: string, filename: string): string {
  return `user-photos/${userId}/${filename}`;
}

/** Generic fallback: group by resource so uploads never land at the bucket root. */
export function resourceBlobPath(
  resourceType: string,
  resourceId: string,
  filename: string,
): string {
  return `${resourceType}/${resourceId}/${filename}`;
}
