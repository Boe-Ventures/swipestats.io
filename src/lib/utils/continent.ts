import { countries, continents } from "countries-list";

/**
 * Get continent name from ISO-2 country code
 * Uses countries-list package for accurate mapping
 */
export function getContinentFromCountry(
  countryCode: string | undefined | null,
): string | null {
  if (!countryCode) return null;

  const upperCode = countryCode.toUpperCase();
  const country = countries[upperCode as keyof typeof countries];

  if (!country?.continent) return null;

  // continents object maps codes to names: { EU: 'Europe', AS: 'Asia', ... }
  return continents[country.continent] || null;
}

/**
 * Get all continents for dropdown
 */
export function getAllContinents(): Array<{ value: string; label: string }> {
  return Object.values(continents)
    .sort()
    .map((name) => ({ value: name, label: name }));
}
