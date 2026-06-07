/**
 * Default name for a new profile comparison, e.g. "Spring 2026".
 *
 * Uses the northern-hemisphere season for the given date plus the calendar
 * year, so a comparison created today gets a sensible, human title without the
 * user having to type one. Shared by the create dialog and the /try gateway so
 * both seed the same default.
 */

/** Northern-hemisphere season for the given month (0-indexed). */
function getSeason(month: number): string {
  if (month <= 1 || month === 11) return "Winter";
  if (month <= 4) return "Spring";
  if (month <= 7) return "Summer";
  return "Fall";
}

/** Returns the default comparison name for the given date, e.g. "Spring 2026". */
export function getDefaultComparisonName(date = new Date()): string {
  return `${getSeason(date.getMonth())} ${date.getFullYear()}`;
}
