export type UploadProvider = "Tinder" | "Hinge";

/** Build the bounded prompt attached to production upload-failure alerts. */
export function buildUploadFailureCodexPrompt(
  provider: UploadProvider,
): string {
  return [
    `Investigate this ${provider} upload failure in \`Boe-Ventures/swipestats.io\`.`,
    "Read the error details and blob URL in this alert, then reproduce it safely.",
    "If the fix is low-risk, implement it with regression tests and open a draft PR.",
    "Do not modify production data or merge. Reply in this thread with the root cause and validation.",
  ].join(" ");
}
