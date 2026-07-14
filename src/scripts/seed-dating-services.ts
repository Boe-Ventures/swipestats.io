/**
 * Preview-only catalog seed for the isolated dating-services database branch.
 * Names from the design references are fixtures, not production endorsements.
 * Replace or verify every editorial entry before using this seed in production.
 */
import { db } from "@/server/db";
import { inArray, sql } from "drizzle-orm";
import {
  catalogEntryPlaceTable,
  catalogEntryTable,
  catalogPlaceClosureTable,
  catalogPlaceTable,
  type CatalogEntryInsert,
  type CatalogEntryPlaceInsert,
} from "@/server/db/schema";
import {
  buildCatalogPlaceClosure,
  CATALOG_PLACE_SEEDS,
  type CatalogMarketStrength,
  type CatalogPlaceSeed,
} from "@/lib/catalog";

const claimedAt = new Date("2026-07-01T12:00:00.000Z");
const marketAsOf = "2026-07-14";
const germanRankingSource =
  "https://www.similarweb.com/top-apps/google/germany/dating/top-free/";
const norwayMarketSource =
  "https://www.aftenposten.no/kultur/i/7pdwzo/eksperter-advarer-derfor-boer-du-utfordre-datingappens-algoritme";
const matchGroupMarketSource =
  "https://s203.q4cdn.com/993464185/files/doc_financials/2025/q1/1Q-2025-Prepared-Remarks-vFinal.pdf";
const usCityIds = [
  "new-york-us",
  "los-angeles-us",
  "san-francisco-us",
  "miami-us",
];

function marketAssignments(
  placeIds: string[],
  strength: CatalogMarketStrength,
  note: string,
  sourceUrls: string[],
): Array<Omit<CatalogEntryPlaceInsert, "entryId">> {
  return placeIds.map((placeId) => ({
    placeId,
    role: "MARKET",
    data: { strength, note, asOf: marketAsOf, sourceUrls },
  }));
}

const serviceAreasBySlug: Record<string, string[]> = {
  "date-med-pia": ["oslo-no"],
  "lena-okafor-dating-photos": ["new-york-us"],
  "marc-delgado-studio": ["new-york-us"],
  "sasha-lindqvist-portraits": ["new-york-us"],
  "northlight-dating-photos": ["oslo-no"],
  "spree-portraits-berlin": ["berlin-de"],
  "the-introduction-office": ["new-york-us", "miami-us"],
  "nord-match": ["oslo-no"],
};

const marketAreasBySlug = new Map<
  string,
  Array<Omit<CatalogEntryPlaceInsert, "entryId">>
>();

const entries: CatalogEntryInsert[] = [
  {
    slug: "dating-by-blaine",
    name: "Dating by Blaine",
    primaryCategory: "dating_coach",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    editorialPick: true,
    remote: true,
    data: {
      entityTypes: ["person", "organization"],
      displayStyle: "person",
      categories: ["dating_coach", "matchmaker"],
      descriptor: "Dating coach and matchmaker",
      editorialSummary:
        "A serious-dating perspective centered on trust, specificity, and making a profile easier for the right person to understand.",
      tags: ["profile_review", "serious_dating", "hinge"],
      services: ["Profile review", "Dating strategy"],
      links: [
        {
          type: "instagram",
          url: "https://www.instagram.com/datingbyblaine/",
          label: "@datingbyblaine",
        },
      ],
      sourceRefs: [{ namespace: "profile_roast_lens", key: "datingbyblaine" }],
    },
  },
  {
    slug: "date-med-pia",
    name: "Date med Pia",
    primaryCategory: "dating_coach",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["person", "organization"],
      displayStyle: "organization",
      descriptor: "Dating guidance · Oslo",
      editorialSummary:
        "An Oslo-based dating guidance account. This initial listing stays intentionally minimal until its services and availability are confirmed.",
      tags: ["dating_strategy", "norway"],
      links: [
        {
          type: "instagram",
          url: "https://www.instagram.com/datemedpia/",
          label: "@datemedpia",
        },
      ],
      sourceRefs: [{ namespace: "instagram", key: "datemedpia" }],
    },
  },
  {
    slug: "elena-marks-coaching",
    name: "Elena Marks",
    primaryCategory: "dating_coach",
    status: "PUBLISHED",
    verificationStatus: "VERIFIED",
    claimedAt,
    featured: true,
    remote: true,
    data: {
      entityTypes: ["person", "organization"],
      displayStyle: "person",
      descriptor: "Dating coach · one-person practice",
      organizationName: "Marks Coaching",
      editorialSummary:
        "A preview listing for a data-aware coach who starts with the client's actual results and turns them into concrete profile and messaging experiments.",
      providerSummary:
        "Four-week profile and conversation sprints with weekly calls and asynchronous review.",
      services: ["Profile review", "Bio rewrite", "Messaging coaching"],
      tags: ["hinge", "tinder", "photo_selection"],
      priceLabel: "$180",
      priceDetail: "per session · preview pricing",
      sourceRefs: [{ namespace: "editorial", key: "golden-fixture-elena" }],
    },
  },
  {
    slug: "lena-okafor-dating-photos",
    name: "Lena Okafor",
    primaryCategory: "dating_photographer",
    status: "PUBLISHED",
    verificationStatus: "VERIFIED",
    claimedAt,
    featured: true,
    remote: false,
    data: {
      entityTypes: ["person", "organization"],
      displayStyle: "person",
      descriptor: "Dating photographer · solo practice",
      editorialSummary:
        "A preview of candid, activity-led shoots designed around how a complete photo set reads on Hinge and Tinder.",
      services: ["Outdoor shoot", "Photo selection", "Profile-ready edits"],
      tags: ["outdoor", "candid", "hinge"],
      priceLabel: "from $340",
      sourceRefs: [{ namespace: "editorial", key: "golden-fixture-lena" }],
    },
  },
  {
    slug: "marc-delgado-studio",
    name: "Marc Delgado Studio",
    primaryCategory: "dating_photographer",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    claimedAt,
    editorialPick: true,
    remote: false,
    data: {
      entityTypes: ["person", "organization"],
      displayStyle: "organization",
      descriptor: "Portrait studio · indoor and outdoor",
      editorialSummary:
        "A preview studio listing for people who want more direction on camera without ending up with corporate-headshot energy.",
      services: ["Studio shoot", "Outdoor shoot"],
      tags: ["studio", "coaching_lite"],
      priceLabel: "from $520",
      sourceRefs: [{ namespace: "editorial", key: "golden-fixture-marc" }],
    },
  },
  {
    slug: "sasha-lindqvist-portraits",
    name: "Sasha Lindqvist",
    primaryCategory: "dating_photographer",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["person"],
      displayStyle: "person",
      descriptor: "Lifestyle photographer",
      editorialSummary:
        "An editor-created preview listing showing how an unclaimed provider appears before management access is approved.",
      services: ["Natural-light portraits"],
      tags: ["outdoor", "lifestyle"],
      priceLabel: "from $280",
      sourceRefs: [{ namespace: "editorial", key: "golden-fixture-sasha" }],
    },
  },
  {
    slug: "northlight-dating-photos",
    name: "Northlight Dating Photos",
    primaryCategory: "dating_photographer",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["organization"],
      displayStyle: "organization",
      descriptor: "Oslo dating-profile photography",
      editorialSummary:
        "A preview listing for relaxed city and outdoor photo sets built for Nordic light and natural profile variety.",
      tags: ["outdoor", "candid", "scandinavia"],
      sourceRefs: [
        { namespace: "editorial", key: "golden-fixture-northlight" },
      ],
    },
  },
  {
    slug: "spree-portraits-berlin",
    name: "Spree Portraits",
    primaryCategory: "dating_photographer",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["organization"],
      displayStyle: "organization",
      descriptor: "Berlin lifestyle photography",
      editorialSummary:
        "A preview listing for editorial-feeling dating photos across Berlin neighborhoods and everyday settings.",
      tags: ["urban", "lifestyle", "europe"],
      sourceRefs: [{ namespace: "editorial", key: "golden-fixture-spree" }],
    },
  },
  {
    slug: "the-introduction-office",
    name: "The Introduction Office",
    primaryCategory: "matchmaker",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: true,
    data: {
      entityTypes: ["organization"],
      displayStyle: "organization",
      descriptor: "Personal matchmaking · New York and Miami",
      editorialSummary:
        "A preview of a selective, human-led introduction service for people who want to search beyond swiping.",
      tags: ["serious_relationships", "introductions"],
      sourceRefs: [{ namespace: "editorial", key: "golden-fixture-intro" }],
    },
  },
  {
    slug: "nord-match",
    name: "Nord Match",
    primaryCategory: "matchmaker",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: true,
    data: {
      entityTypes: ["organization"],
      displayStyle: "organization",
      descriptor: "Scandinavian matchmaking",
      editorialSummary:
        "A preview regional listing demonstrating how Oslo coverage can also appear under Scandinavia and Europe filters.",
      tags: ["scandinavia", "serious_relationships"],
      sourceRefs: [{ namespace: "editorial", key: "golden-fixture-nord" }],
    },
  },
  {
    slug: "get-dates-ai-photos",
    name: "Get Dates",
    primaryCategory: "ai_photo_generation",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    editorialPick: true,
    remote: true,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      descriptor: "AI dating photo generation",
      editorialSummary:
        "An AI photo product already referenced in SwipeStats editorial content. Review realism and likeness carefully before replacing an entire profile set.",
      tags: ["ai_portraits", "remote"],
      links: [
        { type: "official", url: "https://getdates.ai", label: "getdates.ai" },
      ],
      primaryCtaLabel: "Visit Get Dates",
      sourceRefs: [{ namespace: "editorial", key: "getdates-ai" }],
    },
  },
  ...[
    {
      slug: "hinge",
      name: "Hinge",
      url: "https://hinge.co",
      descriptor: "Designed to be deleted",
      marketAssignments: [
        ...marketAssignments(
          usCityIds,
          "strong",
          "A leading intentional-dating option in major US markets.",
          [matchGroupMarketSource],
        ),
        ...marketAssignments(
          ["oslo-no"],
          "strong",
          "One of the dominant swipe-based dating apps in Norway.",
          [norwayMarketSource],
        ),
        ...marketAssignments(
          ["berlin-de"],
          "leader",
          "Currently ranked first among Android dating apps in Germany.",
          [germanRankingSource],
        ),
      ],
    },
    {
      slug: "tinder",
      name: "Tinder",
      url: "https://tinder.com",
      descriptor: "The largest general dating app",
      marketAssignments: [
        ...marketAssignments(
          usCityIds,
          "leader",
          "The broadest general-dating pool and the most-downloaded dating app worldwide.",
          [matchGroupMarketSource],
        ),
        ...marketAssignments(
          ["oslo-no"],
          "leader",
          "The broadest general-dating pool among Norway's dominant apps.",
          [norwayMarketSource],
        ),
        ...marketAssignments(
          ["berlin-de"],
          "notable",
          "Currently ranked third among Android dating apps in Germany.",
          [germanRankingSource],
        ),
      ],
    },
    {
      slug: "bumble",
      name: "Bumble",
      url: "https://bumble.com",
      descriptor: "Dating, friends, and networking",
      marketAssignments: [
        ...marketAssignments(
          usCityIds,
          "notable",
          "A meaningful alternative to Tinder and Hinge in major US markets.",
          [],
        ),
        ...marketAssignments(
          ["oslo-no"],
          "strong",
          "One of the dominant swipe-based dating apps in Norway.",
          [norwayMarketSource],
        ),
        ...marketAssignments(
          ["berlin-de"],
          "strong",
          "Currently ranked second among Android dating apps in Germany.",
          [germanRankingSource],
        ),
      ],
    },
  ].map(
    ({
      slug,
      name,
      url,
      descriptor,
      marketAssignments: appMarketAssignments,
    }): CatalogEntryInsert => {
      const entrySlug = `${slug}-dating-app`;
      marketAreasBySlug.set(entrySlug, appMarketAssignments);
      return {
        slug: entrySlug,
        name,
        primaryCategory: "dating_app",
        status: "PUBLISHED",
        verificationStatus: "UNVERIFIED",
        remote: false,
        data: {
          entityTypes: ["organization", "website", "app"],
          displayStyle: "product",
          descriptor,
          editorialSummary: `${name} is included as a directory entry so SwipeStats app reviews, comparisons, official links, and future affiliate relationships can share one catalog identity.`,
          tags: ["dating_app"],
          links: [{ type: "official", url, label: `Visit ${name}` }],
          primaryCtaLabel: `Visit ${name}`,
          sourceRefs: [{ namespace: "editorial", key: `${slug}-app` }],
        },
      };
    },
  ),
];

for (const rawPlace of CATALOG_PLACE_SEEDS) {
  const place: CatalogPlaceSeed = rawPlace;
  await db
    .insert(catalogPlaceTable)
    .values({
      ...place,
      isCapital: place.isCapital ?? false,
      isFeatured: place.isFeatured ?? false,
      primaryParentId: place.primaryParentId,
    })
    .onConflictDoUpdate({
      target: catalogPlaceTable.id,
      set: {
        slug: place.slug,
        name: place.name,
        shortName: place.shortName,
        kind: place.kind,
        countryCode: place.countryCode,
        adminAreaCode: place.adminAreaCode,
        latitude: place.latitude,
        longitude: place.longitude,
        isCapital: place.isCapital ?? false,
        isFeatured: place.isFeatured ?? false,
        isActive: true,
        sortOrder: place.sortOrder,
        primaryParentId: place.primaryParentId,
        updatedAt: new Date(),
      },
    });
}

await db.delete(catalogPlaceClosureTable).where(sql`true`);
await db.insert(catalogPlaceClosureTable).values(buildCatalogPlaceClosure());

const seededEntries: Array<{ id: string; slug: string }> = [];

for (const entry of entries) {
  const [savedEntry] = await db
    .insert(catalogEntryTable)
    .values(entry)
    .onConflictDoUpdate({
      target: catalogEntryTable.slug,
      set: {
        name: entry.name,
        primaryCategory: entry.primaryCategory,
        status: entry.status,
        verificationStatus: entry.verificationStatus,
        claimedAt: entry.claimedAt,
        featured: entry.featured,
        editorialPick: entry.editorialPick,
        remote: entry.remote,
        data: entry.data,
        updatedAt: new Date(),
      },
    })
    .returning({ id: catalogEntryTable.id, slug: catalogEntryTable.slug });
  seededEntries.push(savedEntry!);
}

await db.delete(catalogEntryPlaceTable).where(
  inArray(
    catalogEntryPlaceTable.entryId,
    seededEntries.map((entry) => entry.id),
  ),
);

const entryPlaces = seededEntries.flatMap((entry) => [
  ...(serviceAreasBySlug[entry.slug] ?? []).map(
    (placeId): CatalogEntryPlaceInsert => ({
      entryId: entry.id,
      placeId,
      role: "SERVICE_AREA",
      data: {},
    }),
  ),
  ...(marketAreasBySlug.get(entry.slug) ?? []).map(
    (assignment): CatalogEntryPlaceInsert => ({
      ...assignment,
      entryId: entry.id,
    }),
  ),
]);
if (entryPlaces.length > 0) {
  await db.insert(catalogEntryPlaceTable).values(entryPlaces);
}

console.log(
  `Seeded ${entries.length} dating-services preview listings across ${CATALOG_PLACE_SEEDS.length} places.`,
);
