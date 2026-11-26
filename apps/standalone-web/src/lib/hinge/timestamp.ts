import { parseProviderTimestamp } from "@/lib/upload/provider-boundary-validation";

const NAIVE_HINGE_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?)$/;
const FRACTIONAL_SECONDS = /\.(\d{1,9})(?:Z|[+-]\d{2}:\d{2})?$/i;

/**
 * Parse one Hinge provider timestamp without depending on the host timezone.
 *
 * REVIEW(provider assumption): historical Hinge activity exports omit the
 * timezone and use a SQL-style wall clock with up to microsecond precision.
 * Existing persisted data consistently treats that grammar as UTC, so the
 * Hinge path keeps that interpretation explicit. The generic provider parser
 * remains strict unless callers opt in to this Hinge-specific grammar.
 */
export function tryParseHingeTimestampToDate(value: string): Date | null {
  const milliseconds = parseProviderTimestamp(value, {
    allowNaiveUtc: true,
    // Boundary validation rejects implausibly future provider data. This
    // conversion helper only gives an already-validated value one meaning.
    allowFuture: true,
  });
  return milliseconds === null ? null : new Date(milliseconds);
}

export function parseHingeTimestampToDate(
  value: string,
  label = "Hinge timestamp",
): Date {
  const parsed = tryParseHingeTimestampToDate(value);
  if (!parsed) throw new Error(`${label} is invalid.`);
  return parsed;
}

/**
 * Normalize only spelling that would otherwise depend on the host runtime;
 * retain all provider fractional digits for occurrence identity.
 */
export function getCanonicalHingeTimestampIdentity(
  value: string,
): string | null {
  if (!tryParseHingeTimestampToDate(value)) return null;
  const naiveMatch = NAIVE_HINGE_TIMESTAMP.exec(value);
  return naiveMatch ? `${naiveMatch[1]}T${naiveMatch[2]}Z` : value;
}

function subMillisecondNanoseconds(value: string): number {
  const fraction = FRACTIONAL_SECONDS.exec(value)?.[1] ?? "";
  return Number(fraction.padEnd(9, "0").slice(3));
}

/** Compare Hinge instants without discarding provider microsecond precision. */
export function compareHingeTimestamps(left: string, right: string): number {
  const leftDate = parseHingeTimestampToDate(left);
  const rightDate = parseHingeTimestampToDate(right);
  const millisecondDifference = leftDate.getTime() - rightDate.getTime();
  if (millisecondDifference !== 0) return millisecondDifference;
  return subMillisecondNanoseconds(left) - subMillisecondNanoseconds(right);
}
