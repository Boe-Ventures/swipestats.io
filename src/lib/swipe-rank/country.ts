import { getCountryDataList } from "countries-list";

interface CountryIdentity {
  code: string;
  aliases: readonly string[];
}

/**
 * Common product inputs which are not themselves ISO-3166 alpha-2 codes.
 * Keep this list deliberately small: aliases should be unambiguous countries,
 * not colloquial regions such as "America".
 */
const COUNTRY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  AE: ["UAE", "U.A.E."],
  CZ: ["Czechia"],
  GB: ["UK", "U.K.", "Great Britain", "Britain"],
  TR: ["Turkiye", "Türkiye"],
  US: ["USA", "U.S.", "U.S.A.", "United States of America"],
};

export function normalizeCountryComparisonKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const countryIdentities: readonly CountryIdentity[] = getCountryDataList().map(
  (country) => ({
    code: country.iso2,
    aliases: [
      country.iso2,
      country.iso3,
      country.name,
      country.native,
      ...(COUNTRY_ALIASES[country.iso2] ?? []),
    ],
  }),
);

const countryCodeByKey = new Map<string, string>();

// Codes win over names/native names if an upstream dataset contains an
// ambiguous label. The later passes fill only keys which are still absent.
for (const country of countryIdentities) {
  const [iso2, iso3] = country.aliases;
  for (const value of [iso2, iso3]) {
    if (!value) continue;
    countryCodeByKey.set(normalizeCountryComparisonKey(value), country.code);
  }
}
for (const country of countryIdentities) {
  for (const value of country.aliases.slice(2)) {
    const key = normalizeCountryComparisonKey(value);
    if (key && !countryCodeByKey.has(key)) {
      countryCodeByKey.set(key, country.code);
    }
  }
}

const countryIdentityByCode = new Map(
  countryIdentities.map((country) => [country.code, country] as const),
);

/** Return a canonical ISO-3166 alpha-2 code when the label is recognized. */
export function canonicalCountryCode(value: string): string | null {
  const key = normalizeCountryComparisonKey(value);
  return key ? (countryCodeByKey.get(key) ?? null) : null;
}

/**
 * Raw labels and normalized keys accepted for a country comparison. Unknown
 * labels retain literal, case/punctuation-insensitive matching semantics.
 */
export function countryComparisonValues(value: string): {
  aliases: string[];
  keys: string[];
} {
  const trimmed = value.trim();
  const code = canonicalCountryCode(trimmed);
  const aliases = code
    ? [...(countryIdentityByCode.get(code)?.aliases ?? [trimmed])]
    : [trimmed];

  return {
    aliases: [...new Set(aliases.map((alias) => alias.trim().toLowerCase()))],
    keys: [
      ...new Set(
        aliases
          .map(normalizeCountryComparisonKey)
          .filter((key) => key.length > 0),
      ),
    ],
  };
}

export function areCountriesEquivalent(left: string, right: string): boolean {
  const leftCode = canonicalCountryCode(left);
  const rightCode = canonicalCountryCode(right);

  if (leftCode !== null || rightCode !== null) {
    return leftCode !== null && leftCode === rightCode;
  }

  return (
    normalizeCountryComparisonKey(left) === normalizeCountryComparisonKey(right)
  );
}
