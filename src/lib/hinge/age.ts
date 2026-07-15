import { tryParseHingeTimestampToDate } from "./timestamp";

const MIN_HINGE_AGE = 18;
const MAX_PLAUSIBLE_HINGE_AGE = 120;

export function isPlausibleHingeAge(age: unknown): age is number {
  return (
    typeof age === "number" &&
    Number.isInteger(age) &&
    age >= MIN_HINGE_AGE &&
    age <= MAX_PLAUSIBLE_HINGE_AGE
  );
}

function validReferenceDate(value: string | Date | undefined): Date | null {
  if (value === undefined) return null;
  const date =
    value instanceof Date
      ? new Date(value)
      : tryParseHingeTimestampToDate(value);
  if (!date) return null;
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Hinge supplies an integer age, not a birth date. Anchor the approximate birth
 * year to the export's last-seen timestamp when available, with processing time
 * as a fallback, and use January 1 because month/day are unknowable.
 */
export function deriveApproximateHingeBirthDate(
  age: number,
  lastSeen: string | Date | undefined,
  processedAt = new Date(),
): Date {
  if (!isPlausibleHingeAge(age)) {
    throw new Error(`Invalid Hinge profile age: ${String(age)}`);
  }

  const reference =
    validReferenceDate(lastSeen) ?? validReferenceDate(processedAt);
  if (!reference) {
    throw new Error("Cannot derive Hinge birth year without a valid reference");
  }

  // REVIEW(provider assumption): profile.age is treated as age at export, not
  // age at account signup. The exact birthday remains unknown, so birthDate is
  // only a January 1 approximation and must not be used for identity matching.
  return new Date(Date.UTC(reference.getUTCFullYear() - age, 0, 1));
}
