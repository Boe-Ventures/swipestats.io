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

export const CATALOG_PLACE_KINDS = [
  "CITY",
  "ADMIN_AREA",
  "COUNTRY",
  "REGION",
] as const;
export type CatalogPlaceKind = (typeof CATALOG_PLACE_KINDS)[number];

export const CATALOG_ENTRY_PLACE_ROLES = ["SERVICE_AREA", "MARKET"] as const;
export type CatalogEntryPlaceRole = (typeof CATALOG_ENTRY_PLACE_ROLES)[number];

export const CATALOG_MARKET_STRENGTHS = [
  "leader",
  "strong",
  "notable",
  "available",
] as const;
export type CatalogMarketStrength = (typeof CATALOG_MARKET_STRENGTHS)[number];

export interface CatalogPlaceSeed {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  kind: CatalogPlaceKind;
  countryCode?: string;
  adminAreaCode?: string;
  latitude?: number;
  longitude?: number;
  isCapital?: boolean;
  isFeatured?: boolean;
  sortOrder: number;
  primaryParentId?: string;
}

/**
 * Curated launch vocabulary. City IDs intentionally match Homi's MajorCityId
 * convention; containment and aggregation are stored in the database.
 */
export const CATALOG_PLACE_SEEDS = [
  {
    id: "region:north-america",
    slug: "north-america",
    name: "North America",
    shortName: "North America",
    kind: "REGION",
    sortOrder: 300,
  },
  {
    id: "region:scandinavia",
    slug: "scandinavia",
    name: "Scandinavia",
    shortName: "Scandinavia",
    kind: "REGION",
    sortOrder: 301,
  },
  {
    id: "region:europe",
    slug: "europe",
    name: "Europe",
    shortName: "Europe",
    kind: "REGION",
    sortOrder: 302,
  },
  {
    id: "US",
    slug: "united-states",
    name: "United States",
    shortName: "United States",
    kind: "COUNTRY",
    countryCode: "US",
    sortOrder: 200,
  },
  {
    id: "NO",
    slug: "norway",
    name: "Norway",
    shortName: "Norway",
    kind: "COUNTRY",
    countryCode: "NO",
    sortOrder: 201,
  },
  {
    id: "DE",
    slug: "germany",
    name: "Germany",
    shortName: "Germany",
    kind: "COUNTRY",
    countryCode: "DE",
    sortOrder: 202,
  },
  {
    id: "US-NY",
    slug: "new-york-state",
    name: "New York State",
    shortName: "New York State",
    kind: "ADMIN_AREA",
    countryCode: "US",
    adminAreaCode: "NY",
    sortOrder: 100,
    primaryParentId: "US",
  },
  {
    id: "US-CA",
    slug: "california",
    name: "California",
    shortName: "California",
    kind: "ADMIN_AREA",
    countryCode: "US",
    adminAreaCode: "CA",
    sortOrder: 101,
    primaryParentId: "US",
  },
  {
    id: "US-FL",
    slug: "florida",
    name: "Florida",
    shortName: "Florida",
    kind: "ADMIN_AREA",
    countryCode: "US",
    adminAreaCode: "FL",
    sortOrder: 102,
    primaryParentId: "US",
  },
  {
    id: "new-york-us",
    slug: "new-york",
    name: "New York, NY",
    shortName: "New York",
    kind: "CITY",
    countryCode: "US",
    adminAreaCode: "NY",
    latitude: 40.7128,
    longitude: -74.006,
    isFeatured: true,
    sortOrder: 0,
    primaryParentId: "US-NY",
  },
  {
    id: "los-angeles-us",
    slug: "los-angeles",
    name: "Los Angeles, CA",
    shortName: "Los Angeles",
    kind: "CITY",
    countryCode: "US",
    adminAreaCode: "CA",
    latitude: 34.0522,
    longitude: -118.2437,
    isFeatured: true,
    sortOrder: 1,
    primaryParentId: "US-CA",
  },
  {
    id: "san-francisco-us",
    slug: "san-francisco",
    name: "San Francisco, CA",
    shortName: "San Francisco",
    kind: "CITY",
    countryCode: "US",
    adminAreaCode: "CA",
    latitude: 37.7749,
    longitude: -122.4194,
    isFeatured: true,
    sortOrder: 2,
    primaryParentId: "US-CA",
  },
  {
    id: "miami-us",
    slug: "miami",
    name: "Miami, FL",
    shortName: "Miami",
    kind: "CITY",
    countryCode: "US",
    adminAreaCode: "FL",
    latitude: 25.7617,
    longitude: -80.1918,
    isFeatured: true,
    sortOrder: 3,
    primaryParentId: "US-FL",
  },
  {
    id: "oslo-no",
    slug: "oslo",
    name: "Oslo, Norway",
    shortName: "Oslo",
    kind: "CITY",
    countryCode: "NO",
    latitude: 59.9139,
    longitude: 10.7522,
    isCapital: true,
    isFeatured: true,
    sortOrder: 4,
    primaryParentId: "NO",
  },
  {
    id: "berlin-de",
    slug: "berlin",
    name: "Berlin, Germany",
    shortName: "Berlin",
    kind: "CITY",
    countryCode: "DE",
    latitude: 52.52,
    longitude: 13.405,
    isCapital: true,
    isFeatured: true,
    sortOrder: 5,
    primaryParentId: "DE",
  },
] as const satisfies readonly CatalogPlaceSeed[];

export const CATALOG_PLACE_RELATIONS = [
  ["region:north-america", "US"],
  ["region:europe", "NO"],
  ["region:europe", "DE"],
  ["region:scandinavia", "NO"],
  ["US", "US-NY"],
  ["US", "US-CA"],
  ["US", "US-FL"],
  ["US-NY", "new-york-us"],
  ["US-CA", "los-angeles-us"],
  ["US-CA", "san-francisco-us"],
  ["US-FL", "miami-us"],
  ["NO", "oslo-no"],
  ["DE", "berlin-de"],
] as const satisfies readonly (readonly [string, string])[];

export const CATALOG_LOCATION_SLUGS = CATALOG_PLACE_SEEDS.map(
  (place) => place.slug,
);

export interface CatalogPlaceClosureRow {
  ancestorId: string;
  descendantId: string;
  depth: number;
}

export function buildCatalogPlaceClosure(): CatalogPlaceClosureRow[] {
  const children = new Map<string, string[]>();
  for (const [ancestorId, descendantId] of CATALOG_PLACE_RELATIONS) {
    children.set(ancestorId, [
      ...(children.get(ancestorId) ?? []),
      descendantId,
    ]);
  }

  return CATALOG_PLACE_SEEDS.flatMap((place) => {
    const distances = new Map<string, number>([[place.id, 0]]);
    const queue: string[] = [place.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const depth = distances.get(current)!;
      for (const child of children.get(current) ?? []) {
        const nextDepth = depth + 1;
        const knownDepth = distances.get(child);
        if (knownDepth === undefined || nextDepth < knownDepth) {
          distances.set(child, nextDepth);
          queue.push(child);
        }
      }
    }
    return [...distances].map(([descendantId, depth]) => ({
      ancestorId: place.id,
      descendantId,
      depth,
    }));
  });
}

export interface CatalogPlaceOption {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  kind: CatalogPlaceKind;
  countryCode: string | null;
  adminAreaCode: string | null;
  isCapital: boolean;
  isFeatured: boolean;
  primaryParentId: string | null;
  breadcrumb: Array<{ id: string; slug: string; shortName: string }>;
}

export interface CatalogEntryPlaceData {
  strength?: CatalogMarketStrength;
  note?: string;
  asOf?: string;
  sourceUrls?: string[];
  attributes?: Record<string, unknown>;
}

export interface CatalogEntryPlaceView {
  role: CatalogEntryPlaceRole;
  data: CatalogEntryPlaceData;
  place: Omit<CatalogPlaceOption, "breadcrumb">;
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
  locationKey?: string;
  remote?: boolean;
  timeline?: string;
  budget?: string;
  broadcastConsent?: boolean;
}

export interface CatalogSubmissionData {
  website?: string;
  description: string;
  locationKey?: string;
  remote?: boolean;
}

export function formatCatalogTag(tag: string) {
  return tag.replaceAll("_", " ");
}
