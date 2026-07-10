export type UploadErrorDetails = {
  errorType: "auth" | "ownership" | "database" | "unknown";
  errorMessage: string;
  errorCode?: string;
  errorConstraint?: string;
  errorTable?: string;
  errorColumn?: string;
  errorDetail?: string;
};

function getErrorRecord(error: unknown): Record<string, unknown> {
  return typeof error === "object" && error !== null
    ? (error as Record<string, unknown>)
    : {};
}

function truncateUploadError(
  value: unknown,
  maxLength = 700,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function classifyUploadError(
  code: string | undefined,
  cause: Record<string, unknown>,
): UploadErrorDetails["errorType"] {
  if (code === "UNAUTHORIZED") return "auth";
  if (code === "FORBIDDEN" || code === "CONFLICT") return "ownership";

  if (
    (code && /^\d{5}$/.test(code)) ||
    cause.constraint ||
    cause.table ||
    cause.column
  ) {
    return "database";
  }

  return "unknown";
}

/**
 * Preserve the actionable nested database cause instead of reporting only a
 * long ORM query. Shared by Tinder and Hinge upload alerts.
 */
export function summarizeUploadError(error: unknown): UploadErrorDetails {
  const errorRecord = getErrorRecord(error);
  const causeRecord = getErrorRecord(errorRecord.cause ?? error);
  const code = truncateUploadError(causeRecord.code ?? errorRecord.code);
  const causeMessage = truncateUploadError(causeRecord.message);
  const fallbackMessage =
    error instanceof Error ? truncateUploadError(error.message) : undefined;

  return {
    errorType: classifyUploadError(code, causeRecord),
    errorMessage: causeMessage ?? fallbackMessage ?? "Unknown error",
    errorCode: code,
    errorConstraint: truncateUploadError(causeRecord.constraint),
    errorTable: truncateUploadError(causeRecord.table),
    errorColumn: truncateUploadError(causeRecord.column),
    errorDetail: truncateUploadError(causeRecord.detail),
  };
}
