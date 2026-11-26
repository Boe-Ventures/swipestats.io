/**
 * Catalog seed for editor-discovered and first-party listings.
 *
 * The default is production-safe: it excludes invented golden-design fixtures
 * while keeping real, unclaimed providers and products. Pass
 * `--include-preview-fixtures` only for isolated visual-development databases.
 */
import { db } from "@/server/db";
import { catalogEntryTable, type CatalogEntryInsert } from "@/server/db/schema";
import {
  type CatalogMarketSignal,
  type CatalogMarketStrength,
  type CatalogPlaceId,
} from "@/lib/catalog";

const claimedAt = new Date("2026-07-01T12:00:00.000Z");
const marketAsOf = "2026-07-14";
const germanRankingSource =
  "https://www.similarweb.com/top-apps/google/germany/dating/top-free/";
const norwayMarketSource =
  "https://www.aftenposten.no/kultur/i/7pdwzo/eksperter-advarer-derfor-boer-du-utfordre-datingappens-algoritme";
const matchGroupMarketSource =
  "https://s203.q4cdn.com/993464185/files/doc_financials/2025/q1/1Q-2025-Prepared-Remarks-vFinal.pdf";
const usCityIds: CatalogPlaceId[] = [
  "new-york-us",
  "los-angeles-us",
  "san-francisco-us",
  "miami-us",
];

function marketSignals(
  placeIds: CatalogPlaceId[],
  strength: CatalogMarketStrength,
  note: string,
  sourceUrls: string[],
): CatalogMarketSignal[] {
  return placeIds.map((placeId) => ({
    placeId,
    strength,
    note,
    asOf: marketAsOf,
    sourceUrls,
  }));
}

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
      serviceAreaIds: ["oslo-no"],
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
      serviceAreaIds: ["new-york-us"],
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
      serviceAreaIds: ["new-york-us"],
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
      serviceAreaIds: ["new-york-us"],
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
      serviceAreaIds: ["oslo-no"],
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
      serviceAreaIds: ["berlin-de"],
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
      serviceAreaIds: ["new-york-us", "miami-us"],
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
      serviceAreaIds: ["oslo-no"],
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
    remote: false,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      descriptor: "AI dating photo generation",
      editorialSummary:
        "An AI photo product already referenced in SwipeStats editorial content. Review realism and likeness carefully before replacing an entire profile set.",
      tags: ["ai_portraits", "dating_photos"],
      links: [
        { type: "official", url: "https://getdates.ai", label: "getdates.ai" },
      ],
      primaryCtaLabel: "Visit Get Dates",
      sourceRefs: [{ namespace: "editorial", key: "getdates-ai" }],
    },
  },
  {
    slug: "roast-profile-review",
    name: "ROAST",
    primaryCategory: "profile_feedback",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      categories: [
        "profile_feedback",
        "ai_photo_generation",
        "messaging_assistant",
      ],
      descriptor: "AI profile review and optimization suite",
      editorialSummary:
        "ROAST combines profile analysis, photo feedback, bio writing, AI photos, and conversation coaching. Its broad bundle fits best under profile feedback, with the other functions treated as capabilities rather than duplicate listings.",
      services: [
        "Profile analysis",
        "Photo feedback",
        "Bio writing",
        "Conversation coaching",
      ],
      tags: ["ai_profile_review", "photo_rating", "bio_writing"],
      links: [
        {
          type: "official",
          url: "https://roast.dating",
          label: "roast.dating",
        },
      ],
      primaryCtaLabel: "Visit ROAST",
      sourceRefs: [{ namespace: "editorial", key: "roast-dating-review" }],
    },
  },
  {
    slug: "photofeeler",
    name: "Photofeeler",
    primaryCategory: "profile_feedback",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["organization", "website"],
      displayStyle: "product",
      descriptor: "Human feedback for profile photos",
      editorialSummary:
        "Photofeeler helps people compare individual dating photos using ratings and feedback from other users. It is useful for photo selection, but it does not review the complete story told by a full dating profile.",
      services: ["Photo testing", "Trait ratings", "Written feedback"],
      tags: ["photo_rating", "human_feedback", "photo_selection"],
      links: [
        {
          type: "official",
          url: "https://www.photofeeler.com",
          label: "photofeeler.com",
        },
      ],
      primaryCtaLabel: "Visit Photofeeler",
      sourceRefs: [{ namespace: "editorial", key: "rate-my-photo" }],
    },
  },
  {
    slug: "swipestats-data-insights",
    name: "SwipeStats Data Insights",
    primaryCategory: "profile_feedback",
    status: "PUBLISHED",
    verificationStatus: "VERIFIED",
    claimedAt,
    featured: true,
    remote: false,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      descriptor: "Dating-app analytics from your own export",
      editorialSummary:
        "Upload your Tinder, Hinge, or Raya data to understand match rates, swipe behavior, activity, and cohort benchmarks using the evidence in your own export.",
      providerSummary:
        "Built by SwipeStats. The first insights are free, with deeper comparisons available in paid plans.",
      services: ["Match-rate analysis", "Cohort benchmarks", "Stats roast"],
      tags: ["dating_analytics", "benchmarks", "data_export"],
      links: [{ type: "official", url: "/upload", label: "Upload your data" }],
      priceLabel: "Free to start",
      primaryCtaLabel: "Upload your data",
      sourceRefs: [{ namespace: "swipestats_product", key: "data-insights" }],
    },
  },
  {
    slug: "swipestats-profile-compare-roast",
    name: "SwipeStats Profile Compare & Roast",
    primaryCategory: "profile_feedback",
    status: "PUBLISHED",
    verificationStatus: "VERIFIED",
    claimedAt,
    featured: true,
    remote: false,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      descriptor: "Visual profile comparison and AI feedback",
      editorialSummary:
        "Build and compare dating-profile versions, review photo order and prompts, and generate an AI profile roast without reducing the whole profile to one attractiveness score.",
      providerSummary:
        "Built by SwipeStats as a workspace for testing how the complete profile reads before changing it on a dating app.",
      services: ["Profile comparison", "AI profile roast", "Prompt feedback"],
      tags: ["profile_audit", "photo_order", "prompt_feedback"],
      links: [
        {
          type: "official",
          url: "/app/dashboard",
          label: "Open SwipeStats",
        },
      ],
      primaryCtaLabel: "Open Profile Compare",
      sourceRefs: [{ namespace: "swipestats_product", key: "profile-compare" }],
    },
  },
  {
    slug: "rizz-ai-dating-assistant",
    name: "RIZZ",
    primaryCategory: "messaging_assistant",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      descriptor: "AI dating and texting assistant",
      editorialSummary:
        "RIZZ turns conversation screenshots into suggested openers and replies. Treat the output as inspiration and edit it into your own voice before sending.",
      services: ["Reply suggestions", "Openers", "Conversation guidance"],
      tags: ["reply_generator", "openers", "conversation_coaching"],
      links: [{ type: "official", url: "https://rizz.app", label: "rizz.app" }],
      primaryCtaLabel: "Visit RIZZ",
      sourceRefs: [{ namespace: "editorial", key: "rizz-app-review" }],
    },
  },
  {
    slug: "firetexts",
    name: "FireTexts",
    primaryCategory: "messaging_assistant",
    status: "PUBLISHED",
    verificationStatus: "UNVERIFIED",
    remote: false,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      descriptor: "AI reply assistant for dating apps",
      editorialSummary:
        "FireTexts generates reply options for Tinder, Bumble, and Hinge conversations, with guidance intended to help users improve rather than paste every suggestion verbatim.",
      services: ["Reply suggestions", "Text feedback", "Dating-app messaging"],
      tags: ["reply_generator", "text_feedback", "dating_coach_trained"],
      links: [
        {
          type: "official",
          url: "https://firetexts.com",
          label: "firetexts.com",
        },
      ],
      primaryCtaLabel: "Visit FireTexts",
      sourceRefs: [{ namespace: "editorial", key: "firetexts-review" }],
    },
  },
  {
    slug: "swipestats-conversation-replay",
    name: "SwipeStats Conversation Replay",
    primaryCategory: "messaging_assistant",
    status: "PUBLISHED",
    verificationStatus: "VERIFIED",
    claimedAt,
    remote: false,
    data: {
      entityTypes: ["organization", "website", "app"],
      displayStyle: "product",
      categories: ["messaging_assistant", "profile_feedback"],
      descriptor: "Private feedback on your sent-message history",
      editorialSummary:
        "Replay your own outgoing dating-app messages and inspect transparent patterns around activity, message length, and opener habits. SwipeStats does not invent replies, ghosting, or outcomes that the export does not contain.",
      providerSummary:
        "Built by SwipeStats. Conversation Replay stays private to the profile owner and starts from deterministic evidence before adding interpretation.",
      services: ["Conversation replay", "Opener feedback", "Message patterns"],
      tags: ["conversation_analysis", "outgoing_messages", "private"],
      links: [{ type: "official", url: "/upload", label: "Upload your data" }],
      priceLabel: "Included with your data",
      primaryCtaLabel: "Upload your data",
      sourceRefs: [
        { namespace: "swipestats_product", key: "conversation-replay" },
      ],
    },
  },
  ...[
    {
      slug: "hinge",
      name: "Hinge",
      url: "https://hinge.co",
      descriptor: "Designed to be deleted",
      marketSignals: [
        ...marketSignals(
          usCityIds,
          "strong",
          "A leading intentional-dating option in major US markets.",
          [matchGroupMarketSource],
        ),
        ...marketSignals(
          ["oslo-no"],
          "strong",
          "One of the dominant swipe-based dating apps in Norway.",
          [norwayMarketSource],
        ),
        ...marketSignals(
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
      marketSignals: [
        ...marketSignals(
          usCityIds,
          "leader",
          "The broadest general-dating pool and the most-downloaded dating app worldwide.",
          [matchGroupMarketSource],
        ),
        ...marketSignals(
          ["oslo-no"],
          "leader",
          "The broadest general-dating pool among Norway's dominant apps.",
          [norwayMarketSource],
        ),
        ...marketSignals(
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
      marketSignals: [
        ...marketSignals(
          usCityIds,
          "notable",
          "A meaningful alternative to Tinder and Hinge in major US markets.",
          [],
        ),
        ...marketSignals(
          ["oslo-no"],
          "strong",
          "One of the dominant swipe-based dating apps in Norway.",
          [norwayMarketSource],
        ),
        ...marketSignals(
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
      marketSignals: appMarketSignals,
    }): CatalogEntryInsert => ({
      slug: `${slug}-dating-app`,
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
        marketSignals: appMarketSignals,
        sourceRefs: [{ namespace: "editorial", key: `${slug}-app` }],
      },
    }),
  ),
];

const includePreviewFixtures = process.argv.includes(
  "--include-preview-fixtures",
);
const entriesToSeed = includePreviewFixtures
  ? entries
  : entries.filter(
      (entry) =>
        !entry.data.sourceRefs?.some((source) =>
          source.key.startsWith("golden-fixture-"),
        ),
    );

for (const entry of entriesToSeed) {
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
        data: entry.data,
        updatedAt: new Date(),
      },
    });
}

console.log(
  `Seeded ${entriesToSeed.length} dating-services listings${
    includePreviewFixtures ? " including preview fixtures" : ""
  }.`,
);
