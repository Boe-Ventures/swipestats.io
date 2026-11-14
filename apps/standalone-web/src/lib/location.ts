import { allCountries } from "country-region-data";

import {
  canonicalCountryCode,
  normalizeCountryComparisonKey,
} from "@/lib/swipe-rank/country";
import { getContinentFromCountry } from "@/lib/utils/continent";

export interface LocationValues {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  timeZone?: string | null;
  continent?: string | null;
}

export function locationText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || /^(unknown|n\/a|null|undefined)$/i.test(text)) return undefined;
  return text;
}

export function validTimezone(value: unknown): string | undefined {
  const text = locationText(value);
  if (!text) return undefined;
  try {
    return new Intl.DateTimeFormat("en", { timeZone: text }).resolvedOptions()
      .timeZone;
  } catch {
    return undefined;
  }
}

export function normalizeLocation(value: LocationValues): LocationValues {
  const country =
    canonicalCountryCode(locationText(value.country) ?? "") ?? undefined;
  return {
    city: locationText(value.city),
    region: locationText(value.region),
    country,
    timeZone: validTimezone(value.timeZone),
    continent: country
      ? (getContinentFromCountry(country) ?? undefined)
      : undefined,
  };
}

function samePlace(left: string, right: string) {
  return (
    normalizeCountryComparisonKey(left) === normalizeCountryComparisonKey(right)
  );
}

function regionKey(region: string, country?: string | null): string {
  const code = canonicalCountryCode(country ?? "");
  if (code === "GB") {
    const uk: Record<string, string> = {
      england: "eng",
      scotland: "sct",
      wales: "wls",
      northernireland: "nir",
    };
    const key = normalizeCountryComparisonKey(region);
    return uk[key] ?? key;
  }
  const data = allCountries.find((country) => country[1] === code);
  const found = data?.[2].find(
    ([name, short]) =>
      (name && samePlace(name, region)) || (short && samePlace(short, region)),
  );
  return normalizeCountryComparisonKey(found?.[1] ?? region);
}

/** A missing field is never permission to combine two different places. */
export function missingLocationPatch(
  existing: LocationValues,
  candidate: LocationValues,
): LocationValues {
  const normalized = normalizeLocation(candidate);
  const patch: LocationValues = {};
  const existingCountry = canonicalCountryCode(existing.country ?? "");
  const countryConflict =
    locationText(existing.country) &&
    normalized.country &&
    existingCountry !== normalized.country;
  const cityConflict =
    locationText(existing.city) &&
    normalized.city &&
    !samePlace(existing.city!, normalized.city);
  const regionConflict =
    locationText(existing.region) &&
    normalized.region &&
    regionKey(existing.region!, existing.country ?? normalized.country) !==
      regionKey(normalized.region, normalized.country ?? existing.country);
  if (!countryConflict && !cityConflict && !regionConflict) {
    for (const field of ["country", "city", "region"] as const) {
      if (field !== "country" && existingCountry && !normalized.country)
        continue;
      if (!locationText(existing[field]) && normalized[field])
        patch[field] = normalized[field];
    }
  }
  if (!locationText(existing.timeZone) && normalized.timeZone)
    patch.timeZone = normalized.timeZone;
  const country = existingCountry ?? patch.country;
  if (!locationText(existing.continent) && country) {
    patch.continent = getContinentFromCountry(country) ?? undefined;
  }
  return patch;
}

/** Only an unambiguous subdivision can supply a country without model inference. */
export function countryFromRegion(
  region: string | null | undefined,
): string | undefined {
  if (!locationText(region)) return undefined;
  const directCountry = canonicalCountryCode(region!);
  // Two-letter labels such as CA can also mean California. Never treat them as countries here.
  const matches = allCountries.filter((data) =>
    data[2].some(
      ([name, short]) =>
        (name && samePlace(name, region!)) ||
        (short && samePlace(short, region!)),
    ),
  );
  const countries = new Set(matches.map((country) => country[1] as string));
  if (directCountry && region!.trim().length > 3) countries.add(directCountry);
  if (
    [
      "england",
      "eng",
      "scotland",
      "sct",
      "wales",
      "wls",
      "northernireland",
      "nir",
    ].includes(normalizeCountryComparisonKey(region!))
  )
    countries.add("GB");
  return countries.size === 1 ? [...countries][0] : undefined;
}
