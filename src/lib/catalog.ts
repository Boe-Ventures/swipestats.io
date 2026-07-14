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

export const CATALOG_REGION_KEYS = ["scandinavia", "europe"] as const;
export type CatalogRegionKey = (typeof CATALOG_REGION_KEYS)[number];
export const CATALOG_LOCATION_FILTER_KEYS = [
  ...CATALOG_CITY_KEYS,
  ...CATALOG_REGION_KEYS,
] as const;
export type CatalogLocationFilterKey = CatalogCityKey | CatalogRegionKey;

export const CATALOG_CITIES: Record<
  CatalogCityKey,
  {
    label: string;
    shortLabel: string;
    country: string;
    regionKeys: CatalogRegionKey[];
  }
> = {
  "new-york": {
    label: "New York, NY",
    shortLabel: "New York",
    country: "United States",
    regionKeys: [],
  },
  "los-angeles": {
    label: "Los Angeles, CA",
    shortLabel: "Los Angeles",
    country: "United States",
    regionKeys: [],
  },
  "san-francisco": {
    label: "San Francisco, CA",
    shortLabel: "San Francisco",
    country: "United States",
    regionKeys: [],
  },
  miami: {
    label: "Miami, FL",
    shortLabel: "Miami",
    country: "United States",
    regionKeys: [],
  },
  oslo: {
    label: "Oslo, Norway",
    shortLabel: "Oslo",
    country: "Norway",
    regionKeys: ["scandinavia", "europe"],
  },
  berlin: {
    label: "Berlin, Germany",
    shortLabel: "Berlin",
    country: "Germany",
    regionKeys: ["europe"],
  },
};

export const CATALOG_REGIONS: Record<
  CatalogRegionKey,
  { label: string; cityKeys: CatalogCityKey[] }
> = {
  scandinavia: { label: "Scandinavia", cityKeys: ["oslo"] },
  europe: { label: "Europe", cityKeys: ["oslo", "berlin"] },
};

export function expandCatalogLocation(
  location: CatalogLocationFilterKey,
): CatalogCityKey[] {
  if (location in CATALOG_REGIONS) {
    return CATALOG_REGIONS[location as CatalogRegionKey].cityKeys;
  }
  return [location as CatalogCityKey];
}

export function getCatalogLocationLabel(location: CatalogLocationFilterKey) {
  if (location in CATALOG_REGIONS) {
    return CATALOG_REGIONS[location as CatalogRegionKey].label;
  }
  return CATALOG_CITIES[location as CatalogCityKey].label;
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

export interface CatalogEntryData {
  entityTypes: CatalogEntityType[];
  displayStyle: CatalogDisplayStyle;
  categories?: CatalogCategoryKey[];
  tags?: string[];
  links?: CatalogLink[];
  sourceRefs?: CatalogSourceRef[];
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
