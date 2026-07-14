export const CATALOG_CATEGORY_KEYS = [
  "dating_coach",
  "dating_photographer",
  "matchmaker",
  "ai_photo_generation",
  "dating_app",
] as const;

export type CatalogCategoryKey = (typeof CATALOG_CATEGORY_KEYS)[number];

export const CATALOG_ENTITY_TYPES = [
  "person",
  "organization",
  "website",
  "app",
] as const;

export type CatalogEntityType = (typeof CATALOG_ENTITY_TYPES)[number];

export const CATALOG_DISPLAY_STYLES = [
  "person",
  "organization",
  "product",
] as const;

export type CatalogDisplayStyle = (typeof CATALOG_DISPLAY_STYLES)[number];

export const CATALOG_LINK_TYPES = [
  "official",
  "booking",
  "affiliate",
  "instagram",
  "ios",
  "android",
] as const;

export type CatalogLinkType = (typeof CATALOG_LINK_TYPES)[number];

export const CATALOG_CATEGORIES: Record<
  CatalogCategoryKey,
  {
    slug: string;
    label: string;
    shortLabel: string;
    description: string;
    headline: string;
  }
> = {
  dating_coach: {
    slug: "dating-coaches",
    label: "Dating coaches",
    shortLabel: "Coaches",
    description: "Profile reviews, messaging help, and dating strategy.",
    headline: "Advice that turns your stats into a plan",
  },
  dating_photographer: {
    slug: "dating-photographers",
    label: "Dating photographers",
    shortLabel: "Photographers",
    description: "Natural photos made to work on dating apps.",
    headline: "Photos shot to perform on the apps",
  },
  matchmaker: {
    slug: "matchmakers",
    label: "Matchmakers",
    shortLabel: "Matchmakers",
    description: "Human introductions and search beyond the apps.",
    headline: "A human route to meeting the right person",
  },
  ai_photo_generation: {
    slug: "ai-photo-generation",
    label: "AI photo generation",
    shortLabel: "AI photos",
    description: "Create dating-profile images from your own photos.",
    headline: "Generate stronger profile photos from home",
  },
  dating_app: {
    slug: "dating-apps",
    label: "Dating apps & tools",
    shortLabel: "Apps & tools",
    description: "Where to swipe and what to improve with.",
    headline: "Choose the right app and the right tools",
  },
};

export function getCatalogCategoryBySlug(slug: string) {
  return CATALOG_CATEGORY_KEYS.find(
    (key) => CATALOG_CATEGORIES[key].slug === slug,
  );
}

export const CATALOG_CITY_KEYS = [
  "new-york",
  "los-angeles",
  "san-francisco",
  "miami",
  "oslo",
  "berlin",
] as const;

export type CatalogCityKey = (typeof CATALOG_CITY_KEYS)[number];

export const CATALOG_STATE_KEYS = [
  "new-york-state",
  "california",
  "florida",
] as const;
export type CatalogStateKey = (typeof CATALOG_STATE_KEYS)[number];

export const CATALOG_COUNTRY_KEYS = [
  "united-states",
  "norway",
  "germany",
] as const;
export type CatalogCountryKey = (typeof CATALOG_COUNTRY_KEYS)[number];

export const CATALOG_REGION_KEYS = [
  "north-america",
  "scandinavia",
  "europe",
] as const;
export type CatalogRegionKey = (typeof CATALOG_REGION_KEYS)[number];
export const CATALOG_LOCATION_FILTER_KEYS = [
  ...CATALOG_CITY_KEYS,
  ...CATALOG_STATE_KEYS,
  ...CATALOG_COUNTRY_KEYS,
  ...CATALOG_REGION_KEYS,
] as const;
export type CatalogLocationFilterKey =
  | CatalogCityKey
  | CatalogStateKey
  | CatalogCountryKey
  | CatalogRegionKey;

export const CATALOG_BROAD_LOCATION_KEYS = [
  ...CATALOG_COUNTRY_KEYS,
  ...CATALOG_REGION_KEYS,
] as const satisfies readonly CatalogLocationFilterKey[];

export const CATALOG_MARKET_STRENGTHS = [
  "leader",
  "strong",
  "notable",
  "available",
] as const;
export type CatalogMarketStrength = (typeof CATALOG_MARKET_STRENGTHS)[number];

export const CATALOG_CITIES: Record<
  CatalogCityKey,
  {
    label: string;
    shortLabel: string;
    countryKey: CatalogCountryKey;
    stateKey?: CatalogStateKey;
  }
> = {
  "new-york": {
    label: "New York, NY",
    shortLabel: "New York",
    countryKey: "united-states",
    stateKey: "new-york-state",
  },
  "los-angeles": {
    label: "Los Angeles, CA",
    shortLabel: "Los Angeles",
    countryKey: "united-states",
    stateKey: "california",
  },
  "san-francisco": {
    label: "San Francisco, CA",
    shortLabel: "San Francisco",
    countryKey: "united-states",
    stateKey: "california",
  },
  miami: {
    label: "Miami, FL",
    shortLabel: "Miami",
    countryKey: "united-states",
    stateKey: "florida",
  },
  oslo: {
    label: "Oslo, Norway",
    shortLabel: "Oslo",
    countryKey: "norway",
  },
  berlin: {
    label: "Berlin, Germany",
    shortLabel: "Berlin",
    countryKey: "germany",
  },
};

export const CATALOG_STATES: Record<
  CatalogStateKey,
  {
    label: string;
    shortLabel: string;
    countryKey: CatalogCountryKey;
    cityKeys: CatalogCityKey[];
  }
> = {
  "new-york-state": {
    label: "New York State",
    shortLabel: "New York State",
    countryKey: "united-states",
    cityKeys: ["new-york"],
  },
  california: {
    label: "California",
    shortLabel: "California",
    countryKey: "united-states",
    cityKeys: ["los-angeles", "san-francisco"],
  },
  florida: {
    label: "Florida",
    shortLabel: "Florida",
    countryKey: "united-states",
    cityKeys: ["miami"],
  },
};

export const CATALOG_COUNTRIES: Record<
  CatalogCountryKey,
  {
    label: string;
    shortLabel: string;
    cityKeys: CatalogCityKey[];
    regionKeys: CatalogRegionKey[];
  }
> = {
  "united-states": {
    label: "United States",
    shortLabel: "United States",
    cityKeys: ["new-york", "los-angeles", "san-francisco", "miami"],
    regionKeys: ["north-america"],
  },
  norway: {
    label: "Norway",
    shortLabel: "Norway",
    cityKeys: ["oslo"],
    regionKeys: ["scandinavia", "europe"],
  },
  germany: {
    label: "Germany",
    shortLabel: "Germany",
    cityKeys: ["berlin"],
    regionKeys: ["europe"],
  },
};

export const CATALOG_REGIONS: Record<
  CatalogRegionKey,
  {
    label: string;
    shortLabel: string;
    countryKeys: CatalogCountryKey[];
  }
> = {
  "north-america": {
    label: "North America",
    shortLabel: "North America",
    countryKeys: ["united-states"],
  },
  scandinavia: {
    label: "Scandinavia",
    shortLabel: "Scandinavia",
    countryKeys: ["norway"],
  },
  europe: {
    label: "Europe",
    shortLabel: "Europe",
    countryKeys: ["norway", "germany"],
  },
};

export function expandCatalogLocation(
  location: CatalogLocationFilterKey,
): CatalogLocationFilterKey[] {
  let cityKeys: CatalogCityKey[];

  if (location in CATALOG_CITIES) {
    cityKeys = [location as CatalogCityKey];
  } else if (location in CATALOG_STATES) {
    cityKeys = CATALOG_STATES[location as CatalogStateKey].cityKeys;
  } else if (location in CATALOG_COUNTRIES) {
    cityKeys = CATALOG_COUNTRIES[location as CatalogCountryKey].cityKeys;
  } else {
    cityKeys = CATALOG_REGIONS[
      location as CatalogRegionKey
    ].countryKeys.flatMap(
      (countryKey) => CATALOG_COUNTRIES[countryKey].cityKeys,
    );
  }

  const relatedKeys = new Set<CatalogLocationFilterKey>([location]);
  for (const cityKey of cityKeys) {
    const city = CATALOG_CITIES[cityKey];
    relatedKeys.add(cityKey);
    if (city.stateKey) relatedKeys.add(city.stateKey);
    relatedKeys.add(city.countryKey);
    for (const regionKey of CATALOG_COUNTRIES[city.countryKey].regionKeys) {
      relatedKeys.add(regionKey);
    }
  }

  return [...relatedKeys];
}

export function getCatalogLocationLabel(location: CatalogLocationFilterKey) {
  if (location in CATALOG_CITIES) {
    return CATALOG_CITIES[location as CatalogCityKey].label;
  }
  if (location in CATALOG_STATES) {
    return CATALOG_STATES[location as CatalogStateKey].label;
  }
  if (location in CATALOG_COUNTRIES) {
    return CATALOG_COUNTRIES[location as CatalogCountryKey].label;
  }
  return CATALOG_REGIONS[location as CatalogRegionKey].label;
}

export function getCatalogLocationShortLabel(
  location: CatalogLocationFilterKey,
) {
  if (location in CATALOG_CITIES) {
    return CATALOG_CITIES[location as CatalogCityKey].shortLabel;
  }
  if (location in CATALOG_STATES) {
    return CATALOG_STATES[location as CatalogStateKey].shortLabel;
  }
  if (location in CATALOG_COUNTRIES) {
    return CATALOG_COUNTRIES[location as CatalogCountryKey].shortLabel;
  }
  return CATALOG_REGIONS[location as CatalogRegionKey].shortLabel;
}

export function getCatalogLocationBreadcrumb(
  location: CatalogLocationFilterKey,
): CatalogLocationFilterKey[] {
  if (location in CATALOG_CITIES) {
    const city = CATALOG_CITIES[location as CatalogCityKey];
    return [
      city.countryKey,
      ...(city.stateKey ? [city.stateKey] : []),
      location,
    ];
  }
  if (location in CATALOG_STATES) {
    const state = CATALOG_STATES[location as CatalogStateKey];
    return [state.countryKey, location];
  }
  return [location];
}

export function isCatalogCityKey(
  location: CatalogLocationFilterKey,
): location is CatalogCityKey {
  return location in CATALOG_CITIES;
}

export function getCatalogLocationCityKeys(
  location: CatalogLocationFilterKey,
): CatalogCityKey[] {
  if (location in CATALOG_CITIES) return [location as CatalogCityKey];
  if (location in CATALOG_STATES) {
    return CATALOG_STATES[location as CatalogStateKey].cityKeys;
  }
  if (location in CATALOG_COUNTRIES) {
    return CATALOG_COUNTRIES[location as CatalogCountryKey].cityKeys;
  }
  if (location in CATALOG_REGIONS) {
    return CATALOG_REGIONS[location as CatalogRegionKey].countryKeys.flatMap(
      (countryKey) => CATALOG_COUNTRIES[countryKey].cityKeys,
    );
  }
  return [];
}

export interface CatalogLink {
  type: CatalogLinkType;
  url: string;
  label?: string;
  network?: string;
  disclosure?: string;
}

export interface CatalogSourceRef {
  namespace: string;
  key: string;
}

export interface CatalogMarketSignal {
  locationKey: CatalogLocationFilterKey;
  strength: CatalogMarketStrength;
  note?: string;
  asOf?: string;
  sourceUrls?: string[];
}

export interface CatalogEntryData {
  entityTypes: CatalogEntityType[];
  displayStyle: CatalogDisplayStyle;
  categories?: CatalogCategoryKey[];
  tags?: string[];
  links?: CatalogLink[];
  sourceRefs?: CatalogSourceRef[];
  marketSignals?: CatalogMarketSignal[];
  imageUrl?: string;
  descriptor?: string;
  organizationName?: string;
  editorialSummary: string;
  providerSummary?: string;
  services?: string[];
  priceLabel?: string;
  priceDetail?: string;
  primaryCtaLabel?: string;
  attributes?: Record<string, unknown>;
}

export interface CatalogClaimEvidence {
  relationship: string;
  note?: string;
  officialUrl?: string;
}

export interface CatalogRequestData {
  brief: string;
  locationKey?: CatalogLocationFilterKey;
  remote?: boolean;
  timeline?: string;
  budget?: string;
  broadcastConsent?: boolean;
}

export interface CatalogSubmissionData {
  website?: string;
  description: string;
  locationKey?: CatalogLocationFilterKey;
  remote?: boolean;
}

export function formatCatalogTag(tag: string) {
  return tag.replaceAll("_", " ");
}

export function getCatalogMarketSignal(
  data: CatalogEntryData,
  location: CatalogLocationFilterKey,
) {
  const cityKeys = expandCatalogLocation(location);
  return data.marketSignals?.find((signal) =>
    cityKeys.includes(signal.locationKey),
  );
}
