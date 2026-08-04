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
 * The client-upload route independently validates these paths before issuing a
 * token. These builders are only the client-side half of that contract.
 */

const MAX_BLOB_FILENAME_LENGTH = 120;

/** Reduce an arbitrary local filename to one safe Blob pathname segment. */
export function safeBlobFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? "";
  const normalized = basename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/-+\./g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");

  const safe = normalized || "upload";
  if (safe.length <= MAX_BLOB_FILENAME_LENGTH) return safe;

  const extensionIndex = safe.lastIndexOf(".");
  const extension =
    extensionIndex > 0 && safe.length - extensionIndex <= 16
      ? safe.slice(extensionIndex)
      : "";
  const stemLength = MAX_BLOB_FILENAME_LENGTH - extension.length;
  return `${safe.slice(0, stemLength)}${extension}`;
}

/** Gallery / profile-compare photos, partitioned by their owning user. */
export function userPhotoPath(userId: string, filename: string): string {
  return `user-photos/${userId}/${safeBlobFilename(filename)}`;
}

/** Generic fallback: group by resource so uploads never land at the bucket root. */
export function resourceBlobPath(
  resourceType: string,
  resourceId: string,
  filename: string,
): string {
  return `${resourceType}/${resourceId}/${safeBlobFilename(filename)}`;
}

/** One unique, cleanup-addressable namespace per provider-data upload lease. */
export function transientDataBlobPath(
  provider: "tinder" | "hinge",
  profileId: string,
  uploadId: string,
): string {
  return `${provider}-data/${profileId}/${uploadId}/data.json`;
}
