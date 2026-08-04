export const RETRYABLE_UPLOAD_CLEANUP_PREFIX =
  "Temporary upload cleanup failed";

export function transientUploadCleanupPrefix(expectedPathname: string): string {
  return expectedPathname.slice(0, expectedPathname.lastIndexOf("/") + 1);
}

/** Accept only Vercel's randomized JSON filename inside one lease directory. */
export function isBlobPathForTransientLease(
  expectedPathname: string,
  actualPathname: string,
): boolean {
  const prefix = transientUploadCleanupPrefix(expectedPathname);
  if (!actualPathname.startsWith(prefix)) return false;
  const filename = actualPathname.slice(prefix.length);
  return (
    !filename.includes("/") &&
    (filename === "data.json" || /^data-[A-Za-z0-9_-]+\.json$/.test(filename))
  );
}

export function shouldCleanupTransientUpload(input: {
  status: string;
  expiresAt: Date;
  now: Date;
  cleanedAt?: Date | null;
}): boolean {
  if (input.status === "CLEANED") return false;
  if (input.status === "ABANDONED" && input.cleanedAt) return false;
  return input.status === "COMMITTED" || input.expiresAt <= input.now;
}

export function shouldReuseTransientUpload(error: {
  message?: string;
  data?: { code?: string } | null;
}): boolean {
  if (error.message?.includes(RETRYABLE_UPLOAD_CLEANUP_PREFIX)) return true;
  const message = error.message?.toLowerCase() ?? "";
  if (
    message.includes("lease has expired") ||
    message.includes("does not belong to this session") ||
    message.includes("lease was not found") ||
    message.includes("lease cannot be reused")
  ) {
    return false;
  }

  // This function is called only after Blob upload succeeded and the provider
  // processing mutation failed. Preserve the exact owner-bound lease for
  // server/network failures and response loss; discard it only when retrying
  // the same payload cannot become valid.
  return !["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN"].includes(
    error.data?.code ?? "",
  );
}
