/**
 * Preview-only catalog seed for the isolated dating-services database branch.
 * Names from the design references are fixtures, not production endorsements.
 * Replace or verify every editorial entry before using this seed in production.
 */
import { db } from "@/server/db";
import { catalogEntryTable, type CatalogEntryInsert } from "@/server/db/schema";

const claimedAt = new Date("2026-07-01T12:00:00.000Z");

const entries: CatalogEntryInsert[] = [
  {
    slug: "dating-by-blaine",
    name: "Dating by Blaine",
    primaryCategory: "dating_coach",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    editorialPick: true,
    remote: true,
    locationKeys: [],
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
    slug: "elena-marks-coaching",
    name: "Elena Marks",
    primaryCategory: "dating_coach",
    status: "PUBLISHED",
    verificationStatus: "VERIFIED",
    claimedAt,
    featured: true,
    remote: true,
    locationKeys: [],
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
    locationKeys: ["new-york"],
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
    locationKeys: ["new-york"],
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
    locationKeys: ["new-york"],
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
    locationKeys: ["oslo"],
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
    locationKeys: ["berlin"],
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
    locationKeys: ["new-york", "miami"],
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
    locationKeys: ["oslo"],
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
    locationKeys: [],
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
    ["hinge", "Hinge", "https://hinge.co", "Designed to be deleted"],
    [
      "tinder",
      "Tinder",
      "https://tinder.com",
      "The largest general dating app",
    ],
    [
      "bumble",
      "Bumble",
      "https://bumble.com",
      "Dating, friends, and networking",
    ],
  ].map(
    ([slug, name, url, descriptor]): CatalogEntryInsert => ({
      slug: `${slug}-dating-app`,
      name: name!,
      primaryCategory: "dating_app",
      status: "PUBLISHED",
      verificationStatus: "UNVERIFIED",
      remote: true,
      locationKeys: [],
      data: {
        entityTypes: ["organization", "website", "app"],
        displayStyle: "product",
        descriptor,
        editorialSummary: `${name} is included as a directory entry so SwipeStats app reviews, comparisons, official links, and future affiliate relationships can share one catalog identity.`,
        tags: ["dating_app"],
        links: [{ type: "official", url: url!, label: `Visit ${name}` }],
        primaryCtaLabel: `Visit ${name}`,
        sourceRefs: [{ namespace: "editorial", key: `${slug}-app` }],
      },
    }),
  ),
];

for (const entry of entries) {
  await db
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
        locationKeys: entry.locationKeys,
        data: entry.data,
        updatedAt: new Date(),
      },
    });
}

console.log(`Seeded ${entries.length} dating-services preview listings.`);
