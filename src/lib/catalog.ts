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

export const CATALOG_MARKET_STRENGTHS = [
  "leader",
  "strong",
  "notable",
  "available",
] as const;
export type CatalogMarketStrength = (typeof CATALOG_MARKET_STRENGTHS)[number];

export const CATALOG_PLACE_KINDS = [
  "city",
  "admin_area",
  "country",
  "region",
] as const;
export type CatalogPlaceKind = (typeof CATALOG_PLACE_KINDS)[number];

interface CatalogPlaceInput {
  slug: string;
  name: string;
  shortName: string;
  kind: CatalogPlaceKind;
  ancestorIds: readonly string[];
  primaryParentId?: string;
  countryCode?: string;
  adminAreaCode?: string;
  latitude?: number;
  longitude?: number;
  isCapital?: boolean;
  isFeatured?: boolean;
  sortOrder: number;
}

function defineCatalogPlaces<const T extends Record<string, CatalogPlaceInput>>(
  places: T & {
    [K in keyof T]: {
      ancestorIds: readonly (keyof T & string)[];
      primaryParentId?: keyof T & string;
    };
  },
) {
  return places;
}

/**
 * Small, deploy-time catalog geography. City IDs intentionally follow Homi's
 * MajorCityId convention, while countries and admin areas use ISO codes.
 */
export const CATALOG_PLACES = defineCatalogPlaces({
  "region:north-america": {
    slug: "north-america",
    name: "North America",
    shortName: "North America",
    kind: "region",
    ancestorIds: [],
    sortOrder: 300,
  },
  "region:scandinavia": {
    slug: "scandinavia",
    name: "Scandinavia",
    shortName: "Scandinavia",
    kind: "region",
    ancestorIds: [],
    sortOrder: 301,
  },
  "region:europe": {
    slug: "europe",
    name: "Europe",
    shortName: "Europe",
    kind: "region",
    ancestorIds: [],
    sortOrder: 302,
  },
  US: {
    slug: "united-states",
    name: "United States",
    shortName: "United States",
    kind: "country",
    ancestorIds: ["region:north-america"],
    countryCode: "US",
    sortOrder: 200,
  },
  NO: {
    slug: "norway",
    name: "Norway",
    shortName: "Norway",
    kind: "country",
    ancestorIds: ["region:scandinavia", "region:europe"],
    countryCode: "NO",
    sortOrder: 201,
  },
  DE: {
    slug: "germany",
    name: "Germany",
    shortName: "Germany",
    kind: "country",
    ancestorIds: ["region:europe"],
    countryCode: "DE",
    sortOrder: 202,
  },
  "US-NY": {
    slug: "new-york-state",
    name: "New York State",
    shortName: "New York State",
    kind: "admin_area",
    ancestorIds: ["US", "region:north-america"],
    primaryParentId: "US",
    countryCode: "US",
    adminAreaCode: "NY",
    sortOrder: 100,
  },
  "US-CA": {
    slug: "california",
    name: "California",
    shortName: "California",
    kind: "admin_area",
    ancestorIds: ["US", "region:north-america"],
    primaryParentId: "US",
    countryCode: "US",
    adminAreaCode: "CA",
    sortOrder: 101,
  },
  "US-FL": {
    slug: "florida",
    name: "Florida",
    shortName: "Florida",
    kind: "admin_area",
    ancestorIds: ["US", "region:north-america"],
    primaryParentId: "US",
    countryCode: "US",
    adminAreaCode: "FL",
    sortOrder: 102,
  },
  "new-york-us": {
    slug: "new-york",
    name: "New York, NY",
    shortName: "New York",
    kind: "city",
    ancestorIds: ["US-NY", "US", "region:north-america"],
    primaryParentId: "US-NY",
    countryCode: "US",
    adminAreaCode: "NY",
    latitude: 40.7128,
    longitude: -74.006,
    isFeatured: true,
    sortOrder: 0,
  },
  "los-angeles-us": {
    slug: "los-angeles",
    name: "Los Angeles, CA",
    shortName: "Los Angeles",
    kind: "city",
    ancestorIds: ["US-CA", "US", "region:north-america"],
    primaryParentId: "US-CA",
    countryCode: "US",
    adminAreaCode: "CA",
    latitude: 34.0522,
    longitude: -118.2437,
    isFeatured: true,
    sortOrder: 1,
  },
  "san-francisco-us": {
    slug: "san-francisco",
    name: "San Francisco, CA",
    shortName: "San Francisco",
    kind: "city",
    ancestorIds: ["US-CA", "US", "region:north-america"],
    primaryParentId: "US-CA",
    countryCode: "US",
    adminAreaCode: "CA",
    latitude: 37.7749,
    longitude: -122.4194,
    isFeatured: true,
    sortOrder: 2,
  },
  "miami-us": {
    slug: "miami",
    name: "Miami, FL",
    shortName: "Miami",
    kind: "city",
    ancestorIds: ["US-FL", "US", "region:north-america"],
    primaryParentId: "US-FL",
    countryCode: "US",
    adminAreaCode: "FL",
    latitude: 25.7617,
    longitude: -80.1918,
    isFeatured: true,
    sortOrder: 3,
  },
  "oslo-no": {
    slug: "oslo",
    name: "Oslo, Norway",
    shortName: "Oslo",
    kind: "city",
    ancestorIds: ["NO", "region:scandinavia", "region:europe"],
    primaryParentId: "NO",
    countryCode: "NO",
    latitude: 59.9139,
    longitude: 10.7522,
    isCapital: true,
    isFeatured: true,
    sortOrder: 4,
  },
  "berlin-de": {
    slug: "berlin",
    name: "Berlin, Germany",
    shortName: "Berlin",
    kind: "city",
    ancestorIds: ["DE", "region:europe"],
    primaryParentId: "DE",
    countryCode: "DE",
    latitude: 52.52,
    longitude: 13.405,
    isCapital: true,
    isFeatured: true,
    sortOrder: 5,
  },
});

export type CatalogPlaceId = keyof typeof CATALOG_PLACES;
export type CatalogPlace = {
  [K in CatalogPlaceId]: { id: K } & Omit<
    CatalogPlaceInput,
    "ancestorIds" | "primaryParentId"
  > & {
      ancestorIds: readonly CatalogPlaceId[];
      primaryParentId?: CatalogPlaceId;
    } & (typeof CATALOG_PLACES)[K];
}[CatalogPlaceId];
export type CatalogLocationFilterKey = CatalogPlace["slug"];

export const CATALOG_PLACE_OPTIONS = Object.entries(CATALOG_PLACES)
  .map(([id, place]) => ({ id, ...place }) as CatalogPlace)
  .sort((a, b) => a.sortOrder - b.sortOrder);

const catalogPlaceBySlug = new Map<string, CatalogPlace>(
  CATALOG_PLACE_OPTIONS.map((place) => [place.slug, place]),
);

export const CATALOG_LOCATION_FILTER_KEYS = CATALOG_PLACE_OPTIONS.map(
  (place) => place.slug,
);

export function isCatalogLocationFilterKey(
  value: string | undefined,
): value is CatalogLocationFilterKey {
  return value !== undefined && catalogPlaceBySlug.has(value);
}

export function getCatalogPlaceBySlug(location: CatalogLocationFilterKey) {
  return catalogPlaceBySlug.get(location)!;
}

export function getCatalogRelatedPlaceIds(
  location: CatalogLocationFilterKey,
): CatalogPlaceId[] {
  const selected = getCatalogPlaceBySlug(location);
  return CATALOG_PLACE_OPTIONS.filter(
    (place) =>
      place.id === selected.id ||
      place.ancestorIds.includes(selected.id) ||
      selected.ancestorIds.includes(place.id),
  ).map((place) => place.id);
}

export function getCatalogLocationBreadcrumb(
  location: CatalogLocationFilterKey,
): CatalogPlace[] {
  const breadcrumb: CatalogPlace[] = [];
  const seen = new Set<CatalogPlaceId>();
  let current: CatalogPlace | undefined = getCatalogPlaceBySlug(location);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    breadcrumb.unshift(current);
    current = current.primaryParentId
      ? ({
          id: current.primaryParentId,
          ...CATALOG_PLACES[current.primaryParentId],
        } as CatalogPlace)
      : undefined;
  }
  return breadcrumb;
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
  placeId: CatalogPlaceId;
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
  serviceAreaIds?: CatalogPlaceId[];
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
  const relatedPlaceIds = getCatalogRelatedPlaceIds(location);
  return data.marketSignals?.find((signal) =>
    relatedPlaceIds.includes(signal.placeId),
  );
}
