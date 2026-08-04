import { relations, sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createId } from "./utils";
// Roast payload types are inferred from canonical zod schemas in this leaf
// module (zod-only — no import cycle, since services import FROM schema.ts).
import type {
  StatsRoastResult,
  ProfileRoastResult,
} from "@/lib/ai/roast-schemas";
import type { ConsentRecord } from "@/lib/analytics/consent";
import type {
  HingeThreadOrigin,
  HingeThreadState,
} from "@/lib/interfaces/HingeDataJSON";
import type { ProfileRoastLensKey } from "@/lib/ai/profile-roast-lenses";
import type {
  CatalogCategoryKey,
  CatalogClaimEvidence,
  CatalogEntryData,
  CatalogRequestData,
  CatalogSubmissionData,
} from "@/lib/catalog";
import type { InquiryData, InquiryKind } from "@/lib/inquiries";

// ---- ENUMS --------------------------------------------------------

export const dataProviderEnum = pgEnum("DataProvider", [
  "TINDER",
  "HINGE",
  "BUMBLE",
  "GRINDR",
  "BADOO",
  "BOO",
  "OK_CUPID",
  "FEELD",
  "RAYA",
]);

export const eventTypeEnum = pgEnum("EventType", [
  "RELATIONSHIP",
  "FRIENDS_WITH_BENEFITS",
  "TRIP",
  "SUBSCRIPTION",
  "NEW_LOCATION",
  "NEW_PHOTOS",
  "NEW_FIRST_PHOTO",
  "NEW_JOB",
  "GRADUATION",
  "JOINED_SWIPESTATS",
  "JOINED_TINDER",
  "JOINED_HINGE",
  "NEW_BIO",
  "CUSTOM",
]);

export const genderEnum = pgEnum("Gender", [
  "MALE",
  "FEMALE",
  "OTHER",
  "MORE",
  "UNKNOWN",
]);

export const messageTypeEnum = pgEnum("MessageType", [
  "TEXT",
  "GIF",
  "VOICE_NOTE",
  "GESTURE",
  "ACTIVITY",
  "CONTACT_CARD",
  "OTHER",
]);

export const swipestatsTierEnum = pgEnum("SwipestatsTier", [
  "FREE",
  "PLUS",
  "ELITE",
]);

export const swipestatsVersionEnum = pgEnum("SwipestatsVersion", [
  "SWIPESTATS_1",
  "SWIPESTATS_2",
  "SWIPESTATS_3",
  "SWIPESTATS_4",
]);

export const educationLevelEnum = pgEnum("EducationLevel", [
  "HIGH_SCHOOL",
  "BACHELORS",
  "IN_COLLEGE",
  "IN_GRAD_SCHOOL",
  "MASTERS",
  "TRADE_SCHOOL",
  "PHD",
]);

export const hingeInteractionTypeEnum = pgEnum("HingeInteractionType", [
  "LIKE_SENT",
  "REJECT",
  "UNMATCH",
  "MATCH",
  "MESSAGE_SENT",
]);

export const datasetTierEnum = pgEnum("DatasetTier", [
  "STARTER",
  "STANDARD",
  "FRESH",
  "PREMIUM",
  "ACADEMIC",
]);

export const datasetExportStatusEnum = pgEnum("DatasetExportStatus", [
  "PENDING",
  "GENERATING",
  "READY",
  "FAILED",
]);

export const appTokenPurposeEnum = pgEnum("app_token_purpose", [
  "email_preferences",
  "unsubscribe",
]);

export const catalogEntryStatusEnum = pgEnum("catalog_entry_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const swipeRankPeriodKindEnum = pgEnum("SwipeRankPeriodKind", [
  "MONTH",
  "QUARTER",
  "YEAR",
  "ALL_TIME",
]);

export const swipeRankBuildStatusEnum = pgEnum("SwipeRankBuildStatus", [
  "RUNNING",
  "COMPLETE",
  "FAILED",
]);

export const swipeRankBuildScopeEnum = pgEnum("SwipeRankBuildScope", [
  "FULL",
  "PROFILE",
]);

export const swipeRankSnapshotStatusEnum = pgEnum("SwipeRankSnapshotStatus", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const catalogVerificationStatusEnum = pgEnum(
  "catalog_verification_status",
  ["UNVERIFIED", "VERIFIED"],
);

export const catalogMemberRoleEnum = pgEnum("catalog_member_role", [
  "OWNER",
  "EDITOR",
]);

export const catalogClaimStatusEnum = pgEnum("catalog_claim_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
]);

export const catalogRequestStatusEnum = pgEnum("catalog_request_status", [
  "OPEN",
  "MATCHED",
  "CLOSED",
  "WITHDRAWN",
]);

export const catalogRequestVisibilityEnum = pgEnum(
  "catalog_request_visibility",
  ["PRIVATE", "INVITED", "BROADCAST"],
);

export const catalogSubmissionStatusEnum = pgEnum("catalog_submission_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
]);

export const transientUploadStatusEnum = pgEnum("TransientUploadStatus", [
  "ISSUED",
  "UPLOADED",
  "PROCESSING",
  "COMMITTED",
  "CLEANED",
  "ABANDONED",
]);
// Export TypeScript types
export type DataProvider = (typeof dataProviderEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type MessageType = (typeof messageTypeEnum.enumValues)[number];
export type SwipestatsTier = (typeof swipestatsTierEnum.enumValues)[number];
export type SwipestatsVersion =
  (typeof swipestatsVersionEnum.enumValues)[number];
export type EducationLevel = (typeof educationLevelEnum.enumValues)[number];
export type HingeInteractionType =
  (typeof hingeInteractionTypeEnum.enumValues)[number];
export type DatasetTier = (typeof datasetTierEnum.enumValues)[number];
export type DatasetExportStatus =
  (typeof datasetExportStatusEnum.enumValues)[number];
export type AppTokenPurpose = (typeof appTokenPurposeEnum.enumValues)[number];
export type CatalogEntryStatus =
  (typeof catalogEntryStatusEnum.enumValues)[number];
export type CatalogVerificationStatus =
  (typeof catalogVerificationStatusEnum.enumValues)[number];
export type CatalogMemberRole =
  (typeof catalogMemberRoleEnum.enumValues)[number];
export type CatalogClaimStatus =
  (typeof catalogClaimStatusEnum.enumValues)[number];
export type CatalogRequestStatus =
  (typeof catalogRequestStatusEnum.enumValues)[number];
export type CatalogRequestVisibility =
  (typeof catalogRequestVisibilityEnum.enumValues)[number];
export type CatalogSubmissionStatus =
  (typeof catalogSubmissionStatusEnum.enumValues)[number];
export type SwipeRankPeriodKind =
  (typeof swipeRankPeriodKindEnum.enumValues)[number];
export type SwipeRankBuildStatus =
  (typeof swipeRankBuildStatusEnum.enumValues)[number];
export type SwipeRankBuildScope =
  (typeof swipeRankBuildScopeEnum.enumValues)[number];
export type SwipeRankSnapshotStatus =
  (typeof swipeRankSnapshotStatusEnum.enumValues)[number];
export type TransientUploadStatus =
  (typeof transientUploadStatusEnum.enumValues)[number];

/** ISO 639-1 two-letter language code, e.g. "en", "no", "es" */
export type LanguageCode = string;

// ---- RESOURCE TYPES (for attachments) ----------------------------

export const RESOURCE_TYPES = [
  "profile_comparison",
  "comparison_column",
  "user_photo",
  "tinder_data",
  "hinge_data",
  "raya_data",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

// ---- BETTER AUTH TABLES -------------------------------------------

export const userTable = pgTable("user", (t) => ({
  id: t.text().primaryKey(),
  name: t.text(),
  email: t.text(),
  emailVerified: t.boolean().default(false).notNull(),
  image: t.text(),
  // Username plugin fields
  username: t.text().unique(),
  displayUsername: t.text(),
  // Anonymous plugin field
  isAnonymous: t.boolean().default(false),
  // Admin plugin fields
  role: t.text().default("user"),
  banned: t.boolean().default(false),
  banReason: t.text(),
  banExpires: t.timestamp(),
  // SwipeStats-specific fields
  activeOnTinder: t.boolean().default(false).notNull(),
  activeOnHinge: t.boolean().default(false).notNull(),
  activeOnBumble: t.boolean().default(false).notNull(),
  activeOnHappn: t.boolean().default(false).notNull(),
  activeOnOther: t.boolean().default(false).notNull(),
  otherDatingApps: t.text().array(),
  currentHotness: t.integer(),
  currentHappiness: t.integer(),
  timeZone: t.text(),
  city: t.text(),
  country: t.text(),
  region: t.text(), // state/province (e.g., "California", "Bavaria")
  continent: t.text(), // "North America", "Europe", "Asia", etc.
  // Granular analytics consent — durable, server-readable mirror of the
  // localStorage decision (synced on login). Null = no decision made yet.
  analyticsConsent: t.jsonb().$type<ConsentRecord>(),
  languages: t.jsonb().$type<LanguageCode[]>().default([]).notNull(), // aggregated from match-level analysis
  firstStartedWithDatingApps: t.timestamp(),
  happinessHistory: t.jsonb().default([]).notNull(),
  hotnessHistory: t.jsonb().default([]).notNull(),
  locationHistory: t.jsonb().default([]).notNull(),
  pastDatingApps: t.jsonb().default([]).notNull(),
  relationshipHistory: t.jsonb().default([]).notNull(),
  swipestatsTier: swipestatsTierEnum().default("FREE").notNull(),
  // Billing fields - LemonSqueezy is source of truth, we store minimal data
  subscriptionProviderId: t.text(), // e.g. "sub_abc123" from LS
  subscriptionCurrentPeriodEnd: t.timestamp(), // webhook updates this
  isLifetime: t.boolean().default(false).notNull(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
}));

export type User = typeof userTable.$inferSelect;
export type UserInsert = typeof userTable.$inferInsert;

export const sessionTable = pgTable(
  "session",
  (t) => ({
    id: t.text().primaryKey(),
    expiresAt: t.timestamp().notNull(),
    token: t.text().notNull().unique(),
    createdAt: t.timestamp().notNull(),
    updatedAt: t.timestamp().notNull(),
    ipAddress: t.text(),
    userAgent: t.text(),
    userId: t
      .text()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // Admin plugin field for impersonation tracking
    impersonatedBy: t.text(),
  }),
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export type Session = typeof sessionTable.$inferSelect;
export type SessionInsert = typeof sessionTable.$inferInsert;

export const appTokenTable = pgTable(
  "app_token",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("tok")),
    purpose: appTokenPurposeEnum("purpose").notNull(),
    subject: t.text().notNull(),
    tokenHash: t.text("token_hash").notNull(),
    expiresAt: t.timestamp("expires_at").notNull(),
    usedAt: t.timestamp("used_at"),
    createdBy: t
      .text("created_by")
      .references(() => userTable.id, { onDelete: "set null" }),
    metadata: t.jsonb().default({}).notNull(),
    createdAt: t
      .timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("app_token_token_hash_idx").on(table.tokenHash),
    index("app_token_purpose_subject_idx").on(table.purpose, table.subject),
    index("app_token_expires_at_idx").on(table.expiresAt),
  ],
);

export type AppToken = typeof appTokenTable.$inferSelect;
export type AppTokenInsert = typeof appTokenTable.$inferInsert;

export const accountTable = pgTable(
  "account",
  (t) => ({
    id: t.text().primaryKey(),
    accountId: t.text().notNull(),
    providerId: t.text().notNull(),
    userId: t
      .text()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    accessToken: t.text(),
    refreshToken: t.text(),
    idToken: t.text(),
    accessTokenExpiresAt: t.timestamp(),
    refreshTokenExpiresAt: t.timestamp(),
    scope: t.text(),
    password: t.text(),
    createdAt: t.timestamp().notNull(),
    updatedAt: t.timestamp().notNull(),
  }),
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export type Account = typeof accountTable.$inferSelect;
export type AccountInsert = typeof accountTable.$inferInsert;

export const verificationTable = pgTable(
  "verification",
  (t) => ({
    id: t.text().primaryKey(),
    identifier: t.text().notNull(),
    value: t.text().notNull(),
    expiresAt: t.timestamp().notNull(),
    createdAt: t.timestamp().$defaultFn(() => new Date()),
    updatedAt: t.timestamp().$defaultFn(() => new Date()),
  }),
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export type Verification = typeof verificationTable.$inferSelect;
export type VerificationInsert = typeof verificationTable.$inferInsert;

// ---- LOCATION TABLE -----------------------------------------------

export const locationTable = pgTable("location", (t) => ({
  id: t.text().primaryKey(),
  latitude: t.doublePrecision().notNull(),
  longitude: t.doublePrecision().notNull(),
  country: t.text().notNull(),
  countryShort: t.text().notNull(),
  adminArea1: t.text().notNull(),
  adminArea1Short: t.text().notNull(),
  adminArea2: t.text().notNull(),
  cbsa: t.text().notNull(),
  locality: t.text().notNull(),
  sublocality: t.text().notNull(),
  neighborhood: t.text().notNull(),
  postalCode: t.text().notNull(),
  postalSuffix: t.text().notNull(),
  locationSource: t.text().notNull(),
}));

export type Location = typeof locationTable.$inferSelect;
export type LocationInsert = typeof locationTable.$inferInsert;

// ---- TINDER TABLES ------------------------------------------------

export const tinderProfileTable = pgTable(
  "tinder_profile",
  (t) => ({
    computed: t.boolean().default(false).notNull(),
    tinderId: t.text().primaryKey(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    birthDate: t.timestamp().notNull(),
    ageAtUpload: t.integer().notNull(),
    ageAtLastUsage: t.integer().notNull(),
    createDate: t.timestamp().notNull(),
    createDateSource: t
      .text("create_date_source")
      .$type<"PROVIDER" | "INFERRED_FROM_USAGE">(),
    activeTime: t.timestamp(),
    gender: genderEnum().notNull(),
    genderStr: t.text().notNull(),
    bio: t.text(),
    bioOriginal: t.text(),
    llmAnalyzedAt: t.timestamp(),
    city: t.text(),
    country: t.text(),
    region: t.text(),
    userInterests: t.jsonb(),
    interests: t.jsonb(),
    sexualOrientations: t.jsonb(),
    descriptors: t.jsonb(),
    instagramConnected: t.boolean().notNull(),
    spotifyConnected: t.boolean().notNull(),
    jobTitle: t.text(),
    jobTitleDisplayed: t.boolean(),
    company: t.text(),
    companyDisplayed: t.boolean(),
    school: t.text(),
    schoolDisplayed: t.boolean(),
    college: t.jsonb(),
    jobsRaw: t.jsonb(),
    schoolsRaw: t.jsonb(),
    educationLevel: t.text(),
    ageFilterMin: t.integer(),
    ageFilterMax: t.integer(),
    interestedIn: genderEnum().notNull(),
    interestedInStr: t.text().notNull(),
    genderFilter: genderEnum().notNull(),
    genderFilterStr: t.text().notNull(),
    swipestatsVersion: swipestatsVersionEnum().notNull(),
    userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
    firstDayOnApp: t.timestamp().notNull(),
    lastDayOnApp: t.timestamp().notNull(),
    daysInProfilePeriod: t.integer().notNull(),
  }),
  (table) => [
    uniqueIndex("tinder_profile_user_id_unique").on(table.userId),
    check(
      "tinder_profile_create_date_source",
      sql`${table.createDateSource} IS NULL OR ${table.createDateSource} IN ('PROVIDER', 'INFERRED_FROM_USAGE')`,
    ),
  ],
);

export type TinderProfile = typeof tinderProfileTable.$inferSelect;
export type TinderProfileInsert = typeof tinderProfileTable.$inferInsert;

export const tinderUsageTable = pgTable(
  "tinder_usage",
  (t) => ({
    dateStamp: t.timestamp().notNull(),
    dateStampRaw: t.text().notNull(),
    tinderProfileId: t
      .text()
      .notNull()
      .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
    appOpens: t.integer().notNull(),
    matches: t.integer().notNull(),
    swipeLikes: t.integer().notNull(),
    swipeSuperLikes: t.integer().notNull(),
    swipePasses: t.integer().notNull(),
    swipesCombined: t.integer().notNull(),
    messagesReceived: t.integer().notNull(),
    messagesSent: t.integer().notNull(),
    matchRate: t.doublePrecision().notNull(),
    likeRate: t.doublePrecision().notNull(),
    messagesSentRate: t.doublePrecision().notNull(),
    responseRate: t.doublePrecision().notNull(),
    engagementRate: t.doublePrecision().notNull(),
    userAgeThisDay: t.integer().notNull(),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.dateStampRaw, t.tinderProfileId] }),
    tinderProfileIdx: index("tinder_usage_tinder_profile_id_idx").on(
      t.tinderProfileId,
    ),
  }),
);

export type TinderUsage = typeof tinderUsageTable.$inferSelect;
export type TinderUsageInsert = typeof tinderUsageTable.$inferInsert;

export const jobTable = pgTable("job", (t) => ({
  jobId: t.text().primaryKey(),
  title: t.text().notNull(),
  titleDisplayed: t.boolean().notNull(),
  company: t.text(),
  companyDisplayed: t.boolean(),
  tinderProfileId: t
    .text()
    .notNull()
    .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
}));

export type Job = typeof jobTable.$inferSelect;
export type JobInsert = typeof jobTable.$inferInsert;

export const schoolTable = pgTable("school", (t) => ({
  schoolId: t.text().primaryKey(),
  id: t.text(),
  displayed: t.boolean().notNull(),
  name: t.text().notNull(),
  type: t.text(),
  year: t.text(),
  metadataId: t.text(),
  tinderProfileId: t
    .text()
    .notNull()
    .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
}));

export type School = typeof schoolTable.$inferSelect;
export type SchoolInsert = typeof schoolTable.$inferInsert;

// ---- HINGE TABLES -------------------------------------------------

export const hingeProfileTable = pgTable(
  "hinge_profile",
  (t) => ({
    hingeId: t.text().primaryKey(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    birthDate: t.timestamp().notNull(),
    ageAtUpload: t.integer().notNull(),
    // Signup of the currently represented Hinge account. Cross-account merge
    // ordering must compare against this value, not the earliest history.
    createDate: t.timestamp().notNull(),
    // Earliest known signup across accounts absorbed into this profile. Null
    // is retained temporarily for legacy rows and read as createDate.
    firstAccountCreateDate: t.timestamp(),
    // Most recent provider-observed account activity from account.last_seen.
    // Nullable for rows created before this field was retained.
    lastSeenAt: t.timestamp(),
    heightCentimeters: t.integer().notNull(),
    gender: genderEnum().notNull(),
    genderStr: t.text().notNull(),
    genderIdentity: t.text().notNull(),
    genderIdentityDisplayed: t.boolean().notNull(),
    ethnicities: t.text().array(),
    ethnicitiesDisplayed: t.boolean().notNull(),
    religions: t.text().array(),
    religionsDisplayed: t.boolean().notNull(),
    workplaces: t.text().array(),
    workplacesDisplayed: t.boolean().notNull(),
    jobTitle: t.text().notNull(),
    jobTitleDisplayed: t.boolean().notNull(),
    schools: t.text().array(),
    schoolsDisplayed: t.boolean().notNull(),
    hometowns: t.text().array(),
    hometownsDisplayed: t.boolean().notNull(),
    smoking: t.boolean().notNull(),
    smokingDisplayed: t.boolean().notNull(),
    drinking: t.boolean().notNull(),
    drinkingDisplayed: t.boolean().notNull(),
    marijuana: t.boolean().notNull(),
    marijuanaDisplayed: t.boolean().notNull(),
    drugs: t.boolean().notNull(),
    drugsDisplayed: t.boolean().notNull(),
    children: t.text().notNull(),
    childrenDisplayed: t.boolean().notNull(),
    familyPlans: t.text().notNull(),
    familyPlansDisplayed: t.boolean().notNull(),
    educationAttained: t.text().notNull(),
    politics: t.text().notNull(),
    politicsDisplayed: t.boolean().notNull(),
    instagramDisplayed: t.boolean().notNull(),
    datingIntention: t.text().notNull(),
    datingIntentionDisplayed: t.boolean().notNull(),
    languagesSpoken: t.text().notNull(),
    languagesSpokenDisplayed: t.boolean().notNull(),
    relationshipType: t.text().notNull(),
    relationshipTypeDisplayed: t.boolean().notNull(),
    selfieVerified: t.boolean().notNull(),
    distanceMilesMax: t.integer().notNull(),
    ageMin: t.integer().notNull(),
    ageMax: t.integer().notNull(),
    ageDealbreaker: t.boolean().notNull(),
    heightMin: t.integer().notNull(),
    heightMax: t.integer().notNull(),
    heightDealbreaker: t.boolean().notNull(),
    genderPreference: t.text().notNull(),
    ethnicityPreference: t.text().array(),
    ethnicityDealbreaker: t.boolean().notNull(),
    religionPreference: t.text().array(),
    religionDealbreaker: t.boolean().notNull(),
    deviceCount: t.integer(),
    devicePlatforms: t.text().array(),
    deviceOsVersions: t.text().array(),
    appVersions: t.text().array(),
    country: t.text(),
    userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
  }),
  (table) => [
    uniqueIndex("hinge_profile_user_id_unique").on(table.userId),
    check(
      "hinge_profile_account_signup_order",
      sql`${table.firstAccountCreateDate} IS NULL OR ${table.firstAccountCreateDate} <= ${table.createDate}`,
    ),
  ],
);

export type HingeProfile = typeof hingeProfileTable.$inferSelect;
export type HingeProfileInsert = typeof hingeProfileTable.$inferInsert;

export const hingeInteractionTable = pgTable("hinge_interaction", (t) => ({
  id: t.text().primaryKey(),
  type: hingeInteractionTypeEnum().notNull(),
  threadOrigin: t.text().$type<HingeThreadOrigin>(),
  threadState: t.text().$type<HingeThreadState>(),
  timestamp: t.timestamp().notNull(),
  timestampRaw: t.text().notNull(),
  comment: t.text(), // Only for LIKE_SENT
  hasComment: t.boolean().notNull(),
  matchId: t.text().references(() => matchTable.id, { onDelete: "set null" }),
  hingeProfileId: t
    .text()
    .notNull()
    .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),
}));

export type HingeInteraction = typeof hingeInteractionTable.$inferSelect;
export type HingeInteractionInsert = typeof hingeInteractionTable.$inferInsert;

export const hingePromptTable = pgTable("hinge_prompt", (t) => ({
  id: t.text().primaryKey(),
  type: t.text().notNull(),
  providerPromptId: t.integer("provider_prompt_id"),
  prompt: t.text(),
  answerText: t.text(), // For text-type prompts (now optional)
  answerOptions: t.text(), // Comma-separated options for poll prompts
  createdPromptAt: t.timestamp().notNull(),
  updatedPromptAt: t.timestamp().notNull(),
  hingeProfileId: t
    .text()
    .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),
}));

export type HingePrompt = typeof hingePromptTable.$inferSelect;
export type HingePromptInsert = typeof hingePromptTable.$inferInsert;

// ---- RAYA TABLES --------------------------------------------------

export const rayaProfileTable = pgTable(
  "raya_profile",
  (t) => ({
    rayaId: t.text().primaryKey(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
    birthDate: t.timestamp().notNull(),
    ageAtUpload: t.integer().notNull(),
    gender: genderEnum().notNull(),
    genderStr: t.text().notNull(),
    occupation: t.text(),
    company: t.text(),
    residenceLocation: t.text(),
    status: t.text(),
    instagramConnected: t.boolean().notNull(),
    websiteConnected: t.boolean().notNull(),
    photoUrls: t.jsonb().$type<string[]>().default([]).notNull(),
    firstDayOnApp: t.timestamp().notNull(),
    lastDayOnApp: t.timestamp().notNull(),
    daysInProfilePeriod: t.integer().notNull(),
    userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
  }),
  (table) => [uniqueIndex("raya_profile_user_id_unique").on(table.userId)],
);

export type RayaProfile = typeof rayaProfileTable.$inferSelect;
export type RayaProfileInsert = typeof rayaProfileTable.$inferInsert;

export const rayaUsageTable = pgTable(
  "raya_usage",
  (t) => ({
    dateStamp: t.timestamp().notNull(),
    dateStampRaw: t.text().notNull(),
    rayaProfileId: t
      .text()
      .notNull()
      .references(() => rayaProfileTable.rayaId, { onDelete: "cascade" }),
    swipeLikes: t.integer().notNull(),
    swipePasses: t.integer().notNull(),
    swipesCombined: t.integer().notNull(),
    matches: t.integer().notNull(),
    messagesSent: t.integer().notNull(),
    matchRate: t.doublePrecision().notNull(),
    likeRate: t.doublePrecision().notNull(),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.dateStampRaw, t.rayaProfileId] }),
    rayaProfileIdx: index("raya_usage_raya_profile_id_idx").on(t.rayaProfileId),
  }),
);

export type RayaUsage = typeof rayaUsageTable.$inferSelect;
export type RayaUsageInsert = typeof rayaUsageTable.$inferInsert;

// ---- SHARED TABLES (Match, Message, Media, ProfileMeta) ----------

export const matchTable = pgTable(
  "match",
  (t) => ({
    id: t.text().primaryKey(),
    order: t.integer().notNull(),
    totalMessageCount: t.integer().notNull(),
    textCount: t.integer().notNull(),
    gifCount: t.integer().notNull(),
    gestureCount: t.integer().notNull(),
    otherMessageTypeCount: t.integer().notNull(),
    primaryLanguage: t.text().$type<LanguageCode>(),
    languages: t.jsonb().$type<LanguageCode[]>().default([]).notNull(),
    llmAnalyzedAt: t.timestamp(),
    initialMessageAt: t.timestamp(),
    lastMessageAt: t.timestamp(),
    engagementScore: t.integer(),
    // Server-computed metrics for cohort comparisons
    responseTimeMedianSeconds: t.integer(),
    conversationDurationDays: t.integer(),
    messageImbalanceRatio: t.doublePrecision(),
    longestGapHours: t.integer(),
    didMatchReply: t.boolean(),
    lastMessageFrom: t.text(), // 'USER' or 'MATCH'
    tinderMatchId: t.text(),
    tinderProfileId: t
      .text()
      .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
    weMet: t.jsonb(),
    like: t.jsonb(),
    match: t.jsonb(),
    likedAt: t.timestamp(),
    matchedAt: t.timestamp(),
    hingeProfileId: t
      .text()
      .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),
  }),
  (table) => [
    index("match_tinder_profile_id_idx").on(table.tinderProfileId),
    index("match_hinge_profile_id_idx").on(table.hingeProfileId),
  ],
);

export type Match = typeof matchTable.$inferSelect;
export type MatchInsert = typeof matchTable.$inferInsert;

export const messageTable = pgTable(
  "message",
  (t) => ({
    id: t.text().primaryKey(),
    to: t.integer().notNull(),
    sentDate: t.timestamp().notNull(),
    sentDateRaw: t.text().notNull(),
    contentRaw: t.text().notNull(),
    content: t.text().notNull(),
    charCount: t.integer().notNull(),
    messageType: messageTypeEnum().notNull(),
    type: t.text(),
    gifUrl: t.text(),
    order: t.integer().notNull(),
    language: t.text().$type<LanguageCode>(),
    timeSinceLastMessageRelative: t.text(),
    emotionScore: t.integer(),
    matchId: t
      .text()
      .notNull()
      .references(() => matchTable.id, { onDelete: "restrict" }),
    tinderProfileId: t
      .text()
      .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
    hingeProfileId: t
      .text()
      .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),
    contentSanitized: t.text(),
    timeSinceLastMessage: t.integer(),
  }),
  (table) => [
    index("message_match_id_idx").on(table.matchId),
    index("message_tinder_profile_id_idx").on(table.tinderProfileId),
    index("message_hinge_profile_id_idx").on(table.hingeProfileId),
  ],
);

export type Message = typeof messageTable.$inferSelect;
export type MessageInsert = typeof messageTable.$inferInsert;

export const mediaTable = pgTable(
  "media",
  (t) => ({
    id: t.text().primaryKey(),
    type: t.text().notNull(),
    prompt: t.text(),
    caption: t.text(),
    url: t.text().notNull(),
    originalUrl: t.text(),
    fromSoMe: t.boolean(),
    hingeProfileId: t
      .text()
      .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),
    tinderProfileId: t
      .text()
      .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
  }),
  (table) => [
    index("media_tinder_profile_id_idx").on(table.tinderProfileId),
    index("media_hinge_profile_id_idx").on(table.hingeProfileId),
  ],
);

export type Media = typeof mediaTable.$inferSelect;
export type MediaInsert = typeof mediaTable.$inferInsert;

// ProfileMeta - one current, all-time aggregate row per provider profile.
// Tinder rows are computed by computeProfileMeta() in meta.service.ts; Hinge
// rows use createHingeProfileMeta() because the provider exports different
// activity capabilities. Periodized analytics live in swipe_rank_period_fact.
export const profileMetaTable = pgTable(
  "profile_meta",
  (t) => ({
    id: t.text().primaryKey(),
    tinderProfileId: t
      .text()
      .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
    hingeProfileId: t
      .text()
      .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),

    // Time range
    from: t.timestamp().notNull(),
    to: t.timestamp().notNull(),
    daysInPeriod: t.integer().notNull(),
    // Tinder: days with any swipe. Hinge: UTC days with a sent-like event.
    daysActive: t.integer().notNull(),

    // Core totals
    swipeLikesTotal: t.integer().notNull(),
    swipePassesTotal: t.integer().notNull(),
    matchesTotal: t.integer().notNull(),
    messagesSentTotal: t.integer().notNull(),
    messagesReceivedTotal: t.integer().notNull(),
    appOpensTotal: t.integer().notNull(),

    // Core rates (pre-computed for faster queries)
    // Tinder: likes / tracked swipes. Hinge: 1 when any likes exist because
    // passes are absent from the export; consumers must keep provider context.
    likeRate: t.doublePrecision().notNull(),
    // Tinder: observed matches / right swipes. Hinge: outbound-like-linked
    // matches / sent likes.
    matchRate: t.doublePrecision().notNull(),
    // Provider-tracked swipe-direction events / provider-specific active days.
    swipesPerDay: t.doublePrecision().notNull(),

    // Conversation stats (essential for "Your Chats" section)
    conversationCount: t.integer().notNull(),
    conversationsWithMessages: t.integer().notNull(),
    // Legacy column name: provider conversation rows with no retained outgoing
    // message. It does not establish that either person ghosted the other.
    ghostedCount: t.integer().notNull(),

    // Aggregate message metrics (computed from match-level data)
    averageResponseTimeSeconds: t.integer(), // Median of per-conversation medians (robust to outliers)
    meanResponseTimeSeconds: t.integer(), // True average (affected by outliers)
    medianConversationDurationDays: t.integer(),
    longestConversationDays: t.integer(),
    averageMessagesPerConversation: t.doublePrecision(),
    medianMessagesPerConversation: t.integer(), // Robust to outlier conversations

    computedAt: t.timestamp().notNull(),
  }),
  (table) => [
    uniqueIndex("profile_meta_tinder_profile_id_unique").on(
      table.tinderProfileId,
    ),
    uniqueIndex("profile_meta_hinge_profile_id_unique").on(
      table.hingeProfileId,
    ),
    check(
      "profile_meta_exactly_one_provider",
      sql`num_nonnulls(${table.tinderProfileId}, ${table.hingeProfileId}) = 1`,
    ),
    check(
      "profile_meta_period_bounds",
      sql`${table.from} <= ${table.to} AND ${table.daysInPeriod} >= 1 AND ${table.daysActive} >= 0 AND ${table.daysActive} <= ${table.daysInPeriod}`,
    ),
    check(
      "profile_meta_nonnegative_core_metrics",
      sql`${table.swipeLikesTotal} >= 0 AND ${table.swipePassesTotal} >= 0 AND ${table.matchesTotal} >= 0 AND ${table.messagesSentTotal} >= 0 AND ${table.messagesReceivedTotal} >= 0 AND ${table.appOpensTotal} >= 0 AND ${table.likeRate} >= 0 AND ${table.likeRate} <= 1 AND ${table.matchRate} >= 0 AND ${table.swipesPerDay} >= 0`,
    ),
    check(
      "profile_meta_conversation_counts",
      sql`${table.conversationCount} >= 0 AND ${table.conversationsWithMessages} >= 0 AND ${table.conversationsWithMessages} <= ${table.conversationCount} AND ${table.ghostedCount} = ${table.conversationCount} - ${table.conversationsWithMessages}`,
    ),
    // Historical imports can contain negative response intervals. Add a check
    // only after those rows and the source calculation have been normalized.
  ],
);

export type ProfileMeta = typeof profileMetaTable.$inferSelect;
export type ProfileMetaInsert = typeof profileMetaTable.$inferInsert;

// ---- SWIPE RANK ANALYTICS ----------------------------------------

/**
 * Provider-neutral subject registry for versioned period analytics.
 *
 * Provider-native source tables remain authoritative. This registry gives the
 * analytical layer one stable FK without pretending that every provider has
 * the same raw capabilities.
 */
export const swipeRankProfileTable = pgTable(
  "swipe_rank_profile",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("srp")),
    dataProvider: dataProviderEnum().notNull(),
    providerProfileId: t.text().notNull(),
    userId: t.text().references(() => userTable.id, { onDelete: "set null" }),
    gender: genderEnum(),
    interestedIn: genderEnum(),
    // Current comparison dimensions, not historical period location. Tinder
    // sync prefers the user record and falls back field-by-field to profile.
    city: t.text(),
    region: t.text(),
    country: t.text(),
    locationSource: t.text(),
    isSynthetic: t.boolean().default(false).notNull(),
    /**
     * Manual moderation gate for live SwipeRank fields. Facts stay intact so
     * admins can review and restore a profile without recomputing history.
     */
    isSwipeRankExcluded: t.boolean().default(false).notNull(),
    swipeRankExclusionReason: t.text(),
    swipeRankExcludedAt: t.timestamp(),
    swipeRankExcludedBy: t.text(),
    capabilities: t
      .jsonb()
      .$type<Record<string, boolean>>()
      .default({})
      .notNull(),
    sourceProfileUpdatedAt: t.timestamp().notNull(),
    sourceFileCreatedAt: t.timestamp(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("swipe_rank_profile_provider_profile_idx").on(
      table.dataProvider,
      table.providerProfileId,
    ),
    uniqueIndex("swipe_rank_profile_provider_user_idx").on(
      table.dataProvider,
      table.userId,
    ),
    index("swipe_rank_profile_dimensions_idx").on(
      table.dataProvider,
      table.gender,
      table.interestedIn,
    ),
    index("swipe_rank_profile_country_idx").on(
      table.dataProvider,
      table.country,
    ),
    index("swipe_rank_profile_exclusion_idx").on(
      table.dataProvider,
      table.isSwipeRankExcluded,
    ),
    check(
      "swipe_rank_profile_exclusion_state",
      sql`(
        ${table.isSwipeRankExcluded} = false
        AND ${table.swipeRankExclusionReason} IS NULL
        AND ${table.swipeRankExcludedAt} IS NULL
        AND ${table.swipeRankExcludedBy} IS NULL
      ) OR (
        ${table.isSwipeRankExcluded} = true
        AND nullif(btrim(${table.swipeRankExclusionReason}), '') IS NOT NULL
        AND ${table.swipeRankExcludedAt} IS NOT NULL
        AND nullif(btrim(${table.swipeRankExcludedBy}), '') IS NOT NULL
      )`,
    ),
  ],
);

export type SwipeRankProfile = typeof swipeRankProfileTable.$inferSelect;
export type SwipeRankProfileInsert = typeof swipeRankProfileTable.$inferInsert;

/**
 * Privacy-safe source mutation journal used to prove snapshot lineage.
 *
 * Rows contain no user or provider identifier. The monotonically increasing
 * ID changes whenever an application transaction mutates Tinder source or
 * ownership state; a FULL fact build records the latest visible ID.
 */
export const swipeRankSourceMutationTable = pgTable(
  "swipe_rank_source_mutation",
  (t) => ({
    id: t.bigserial({ mode: "number" }).primaryKey(),
    dataProvider: dataProviderEnum().notNull(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("swipe_rank_source_mutation_provider_idx").on(
      table.dataProvider,
      table.id,
    ),
  ],
);

/** One auditable invocation of a fact recomputation. */
export const swipeRankBuildTable = pgTable(
  "swipe_rank_build",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("srb")),
    dataProvider: dataProviderEnum().notNull(),
    metricVersion: t.text().notNull(),
    scope: swipeRankBuildScopeEnum().notNull(),
    status: swipeRankBuildStatusEnum().default("RUNNING").notNull(),
    sourceWatermark: t
      .jsonb()
      .$type<Record<string, string | number | null>>()
      .default({})
      .notNull(),
    startedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    completedAt: t.timestamp(),
    /** Set only after an independent full-build validation succeeds. */
    activatedAt: t.timestamp(),
    /** Privacy-safe failure category; never persist query text, params, or IDs. */
    failureCode: t.text(),
  }),
  (table) => [
    index("swipe_rank_build_provider_version_idx").on(
      table.dataProvider,
      table.metricVersion,
      table.startedAt,
    ),
    index("swipe_rank_build_status_idx").on(table.status, table.startedAt),
    check(
      "swipe_rank_build_completion_state",
      sql`(${table.status} = 'RUNNING' AND ${table.completedAt} IS NULL) OR (${table.status} <> 'RUNNING' AND ${table.completedAt} IS NOT NULL)`,
    ),
    check(
      "swipe_rank_build_activation_state",
      sql`${table.activatedAt} IS NULL OR (${table.scope} = 'FULL' AND ${table.status} = 'COMPLETE' AND ${table.completedAt} IS NOT NULL)`,
    ),
  ],
);

export type SwipeRankBuild = typeof swipeRankBuildTable.$inferSelect;
export type SwipeRankBuildInsert = typeof swipeRankBuildTable.$inferInsert;

/**
 * Versioned period facts. Periods are half-open [periodStart, periodEnd).
 * MONTH is the canonical stored grain; broader grains are sums of month facts.
 * ALL_TIME uses the fixed [0001-01-01, 9999-01-01) sentinel interval.
 */
export const swipeRankPeriodFactTable = pgTable(
  "swipe_rank_period_fact",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("srf")),
    profileId: t
      .text()
      .notNull()
      .references(() => swipeRankProfileTable.id, { onDelete: "cascade" }),
    buildId: t
      .text()
      .notNull()
      .references(() => swipeRankBuildTable.id, { onDelete: "restrict" }),
    metricVersion: t.text().notNull(),
    periodKind: swipeRankPeriodKindEnum().notNull(),
    periodStart: t.date().notNull(),
    periodEnd: t.date().notNull(),
    observedFirstDate: t.date().notNull(),
    observedLastDate: t.date().notNull(),
    sourceRowCount: t.bigint({ mode: "number" }).notNull(),
    observedDays: t.integer().notNull(),
    activeDays: t.integer().notNull(),
    ageInPeriod: t.integer(),
    swipeLikes: t.bigint({ mode: "number" }),
    swipePasses: t.bigint({ mode: "number" }),
    swipeSuperLikes: t.bigint({ mode: "number" }),
    matches: t.bigint({ mode: "number" }),
    messagesSent: t.bigint({ mode: "number" }),
    messagesReceived: t.bigint({ mode: "number" }),
    appOpens: t.bigint({ mode: "number" }),
    matchRateNumerator: t.bigint({ mode: "number" }),
    matchRateDenominator: t.bigint({ mode: "number" }),
    likeRateNumerator: t.bigint({ mode: "number" }),
    likeRateDenominator: t.bigint({ mode: "number" }),
    matchRate: t
      .doublePrecision()
      .generatedAlwaysAs(
        sql`CASE WHEN match_rate_denominator > 0 THEN match_rate_numerator::double precision / match_rate_denominator END`,
      ),
    likeRate: t
      .doublePrecision()
      .generatedAlwaysAs(
        sql`CASE WHEN like_rate_denominator > 0 THEN like_rate_numerator::double precision / like_rate_denominator END`,
      ),
    swipesPerActiveDay: t
      .doublePrecision()
      .generatedAlwaysAs(
        sql`CASE WHEN active_days > 0 AND swipe_likes IS NOT NULL AND swipe_passes IS NOT NULL THEN (swipe_likes + swipe_passes)::double precision / active_days END`,
      ),
    qualityFlags: t.jsonb().$type<string[]>().default([]).notNull(),
    hasQualityAnomaly: t.boolean().default(false).notNull(),
    sourceProfileUpdatedAt: t.timestamp().notNull(),
    sourceFileCreatedAt: t.timestamp(),
    sourceFingerprint: t.text().notNull(),
    computedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("swipe_rank_fact_profile_period_version_idx").on(
      table.profileId,
      table.periodKind,
      table.periodStart,
      table.metricVersion,
    ),
    index("swipe_rank_fact_period_rank_idx").on(
      table.periodKind,
      table.periodStart,
      table.metricVersion,
      table.matchRate,
    ),
    index("swipe_rank_fact_profile_version_idx").on(
      table.profileId,
      table.metricVersion,
      table.periodKind,
      table.periodStart,
    ),
    index("swipe_rank_fact_build_idx").on(table.buildId),
    index("swipe_rank_fact_anomaly_idx").on(
      table.hasQualityAnomaly,
      table.periodKind,
      table.periodStart,
    ),
    check(
      "swipe_rank_fact_period_bounds",
      sql`${table.periodStart} < ${table.periodEnd}`,
    ),
    check(
      "swipe_rank_fact_period_alignment",
      sql`(${table.periodKind} = 'MONTH' AND ${table.periodStart} = date_trunc('month', ${table.periodStart})::date AND ${table.periodEnd} = (${table.periodStart} + interval '1 month')::date) OR (${table.periodKind} = 'QUARTER' AND extract(month from ${table.periodStart}) IN (1, 4, 7, 10) AND extract(day from ${table.periodStart}) = 1 AND ${table.periodEnd} = (${table.periodStart} + interval '3 months')::date) OR (${table.periodKind} = 'YEAR' AND extract(month from ${table.periodStart}) = 1 AND extract(day from ${table.periodStart}) = 1 AND ${table.periodEnd} = (${table.periodStart} + interval '1 year')::date) OR (${table.periodKind} = 'ALL_TIME' AND ${table.periodStart} = date '0001-01-01' AND ${table.periodEnd} = date '9999-01-01')`,
    ),
    check(
      "swipe_rank_fact_observed_bounds",
      sql`${table.observedFirstDate} <= ${table.observedLastDate} AND ${table.observedFirstDate} >= ${table.periodStart} AND ${table.observedLastDate} < ${table.periodEnd}`,
    ),
    check(
      "swipe_rank_fact_day_counts",
      sql`${table.sourceRowCount} > 0 AND ${table.observedDays} > 0 AND ${table.activeDays} >= 0 AND ${table.activeDays} <= ${table.observedDays}`,
    ),
    check(
      "swipe_rank_fact_nonnegative_metrics",
      sql`coalesce(${table.swipeLikes}, 0) >= 0 AND coalesce(${table.swipePasses}, 0) >= 0 AND coalesce(${table.swipeSuperLikes}, 0) >= 0 AND coalesce(${table.matches}, 0) >= 0 AND coalesce(${table.messagesSent}, 0) >= 0 AND coalesce(${table.messagesReceived}, 0) >= 0 AND coalesce(${table.appOpens}, 0) >= 0 AND coalesce(${table.matchRateNumerator}, 0) >= 0 AND coalesce(${table.matchRateDenominator}, 0) >= 0 AND coalesce(${table.likeRateNumerator}, 0) >= 0 AND coalesce(${table.likeRateDenominator}, 0) >= 0`,
    ),
    check(
      "swipe_rank_fact_rate_inputs",
      sql`(${table.matchRateNumerator} IS NULL) = (${table.matchRateDenominator} IS NULL) AND (${table.likeRateNumerator} IS NULL) = (${table.likeRateDenominator} IS NULL)`,
    ),
    check(
      "swipe_rank_fact_quality_state",
      sql`${table.hasQualityAnomaly} = (jsonb_array_length(${table.qualityFlags}) > 0)`,
    ),
  ],
);

export type SwipeRankPeriodFact = typeof swipeRankPeriodFactTable.$inferSelect;
export type SwipeRankPeriodFactInsert =
  typeof swipeRankPeriodFactTable.$inferInsert;

/** An immutable leaderboard edition built from one completed fact build. */
export const swipeRankSnapshotTable = pgTable(
  "swipe_rank_snapshot",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("srs")),
    dataProvider: dataProviderEnum().notNull(),
    buildId: t
      .text()
      .notNull()
      .references(() => swipeRankBuildTable.id, { onDelete: "restrict" }),
    metricKey: t.text().notNull(),
    metricVersion: t.text().notNull(),
    eligibilityVersion: t.text().notNull(),
    periodKind: swipeRankPeriodKindEnum().notNull(),
    periodStart: t.date().notNull(),
    periodEnd: t.date().notNull(),
    cohortSpec: t
      .jsonb()
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    cohortHash: t.text().notNull(),
    minimumRateDenominator: t.integer().default(0).notNull(),
    minimumActiveDays: t.integer().default(0).notNull(),
    fieldSize: t.integer().notNull(),
    status: swipeRankSnapshotStatusEnum().default("DRAFT").notNull(),
    sourceCutoff: t.timestamp().notNull(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    publishedAt: t.timestamp(),
  }),
  (table) => [
    uniqueIndex("swipe_rank_snapshot_edition_idx").on(
      table.dataProvider,
      table.metricKey,
      table.metricVersion,
      table.eligibilityVersion,
      table.periodKind,
      table.periodStart,
      table.cohortHash,
      table.buildId,
    ),
    index("swipe_rank_snapshot_status_idx").on(
      table.status,
      table.periodKind,
      table.periodStart,
    ),
    check(
      "swipe_rank_snapshot_period_bounds",
      sql`${table.periodStart} < ${table.periodEnd}`,
    ),
    check(
      "swipe_rank_snapshot_period_alignment",
      sql`(${table.periodKind} = 'MONTH' AND ${table.periodStart} = date_trunc('month', ${table.periodStart})::date AND ${table.periodEnd} = (${table.periodStart} + interval '1 month')::date) OR (${table.periodKind} = 'QUARTER' AND extract(month from ${table.periodStart}) IN (1, 4, 7, 10) AND extract(day from ${table.periodStart}) = 1 AND ${table.periodEnd} = (${table.periodStart} + interval '3 months')::date) OR (${table.periodKind} = 'YEAR' AND extract(month from ${table.periodStart}) = 1 AND extract(day from ${table.periodStart}) = 1 AND ${table.periodEnd} = (${table.periodStart} + interval '1 year')::date) OR (${table.periodKind} = 'ALL_TIME' AND ${table.periodStart} = date '0001-01-01' AND ${table.periodEnd} = date '9999-01-01')`,
    ),
    check(
      "swipe_rank_snapshot_nonnegative_thresholds",
      sql`${table.minimumRateDenominator} >= 0 AND ${table.minimumActiveDays} >= 0 AND ${table.fieldSize} >= 0`,
    ),
    check(
      "swipe_rank_snapshot_publication_state",
      sql`(${table.status} = 'PUBLISHED' AND ${table.publishedAt} IS NOT NULL) OR (${table.status} <> 'PUBLISHED')`,
    ),
  ],
);

export type SwipeRankSnapshot = typeof swipeRankSnapshotTable.$inferSelect;
export type SwipeRankSnapshotInsert =
  typeof swipeRankSnapshotTable.$inferInsert;

/**
 * Frozen ranks for a snapshot; no public identity fields are copied here.
 *
 * Deleting the source profile removes its per-person frozen row. Other ranks
 * and the aggregate edition field size remain historical; no exact numerator,
 * denominator, or quality record survives for the erased person.
 */
export const swipeRankEntryTable = pgTable(
  "swipe_rank_entry",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("sre")),
    snapshotId: t
      .text()
      .notNull()
      .references(() => swipeRankSnapshotTable.id, { onDelete: "cascade" }),
    profileId: t
      .text()
      .notNull()
      .references(() => swipeRankProfileTable.id, { onDelete: "cascade" }),
    rank: t.integer().notNull(),
    tieCount: t.integer().notNull(),
    fieldSize: t.integer().notNull(),
    percentile: t.doublePrecision().notNull(),
    topShare: t.doublePrecision().notNull(),
    metricNumerator: t.bigint({ mode: "number" }).notNull(),
    metricDenominator: t.bigint({ mode: "number" }).notNull(),
    metricValue: t.doublePrecision().notNull(),
    qualityFlags: t.jsonb().$type<string[]>().default([]).notNull(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("swipe_rank_entry_snapshot_profile_idx").on(
      table.snapshotId,
      table.profileId,
    ),
    index("swipe_rank_entry_snapshot_rank_idx").on(
      table.snapshotId,
      table.rank,
    ),
    check(
      "swipe_rank_entry_rank_bounds",
      sql`${table.rank} > 0 AND ${table.tieCount} > 0 AND ${table.fieldSize} > 0 AND ${table.rank} <= ${table.fieldSize} AND ${table.tieCount} <= ${table.fieldSize}`,
    ),
    check(
      "swipe_rank_entry_rate_bounds",
      sql`${table.metricNumerator} >= 0 AND ${table.metricDenominator} > 0 AND ${table.metricValue} >= 0 AND ${table.percentile} >= 0 AND ${table.percentile} <= 100 AND ${table.topShare} >= 0 AND ${table.topShare} <= 100`,
    ),
  ],
);

export type SwipeRankEntry = typeof swipeRankEntryTable.$inferSelect;
export type SwipeRankEntryInsert = typeof swipeRankEntryTable.$inferInsert;

// ---- SUPPORT TABLES -----------------------------------------------

export const eventTable = pgTable("event", (t) => ({
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  type: eventTypeEnum().notNull(),
  startDate: t.timestamp().notNull(),
  endDate: t.timestamp(),
  locationId: t
    .text()
    .references(() => locationTable.id, { onDelete: "set null" }),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  userId: t
    .text()
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
}));

export type Event = typeof eventTable.$inferSelect;
export type EventInsert = typeof eventTable.$inferInsert;

export const customDataTable = pgTable("custom_data", (t) => ({
  id: t.text().primaryKey(),
  messaged: t.integer(),
  goodConversation: t.integer(),
  movedToADifferentApp: t.integer(),
  phoneNumbersExchanged: t.integer(),
  dateArranged: t.integer(),
  dateAttended: t.integer(),
  dateNoShow: t.integer(),
  dateCreepy: t.integer(),
  dateNoSpark: t.integer(),
  onlyOneDate: t.integer(),
  oneNightStands: t.integer(),
  multipleDates: t.integer(),
  sleptWithOnFirstDate: t.integer(),
  sleptWithEventually: t.integer(),
  friendsWithBenefits: t.integer(),
  justFriends: t.integer(),
  relationshipsStarted: t.integer(),
  cohabitation: t.integer(),
  married: t.integer(),
  divorce: t.integer(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  tinderProfileId: t
    .text()
    .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
  hingeProfileId: t
    .text()
    .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),
  userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
}));

export type CustomData = typeof customDataTable.$inferSelect;
export type CustomDataInsert = typeof customDataTable.$inferInsert;

// ---- MARKETING TABLES ---------------------------------------------

export const newsletterTable = pgTable("newsletter", (t) => ({
  id: t.text().primaryKey(),
  email: t.varchar({ length: 255 }).notNull(),
  emailHash: t.text().notNull(),
  threeDayReminder: t.boolean().notNull(),
  doubleOptInConfirmation: t.boolean().default(false).notNull(),
  globalUnsubscribe: t.boolean().default(false).notNull(),
  receiveDatingTips: t.boolean().default(true).notNull(),
  receiveProductUpdates: t.boolean().default(true).notNull(),
  receiveResearchNews: t.boolean().default(true).notNull(),
  sequence: t.integer().default(0).notNull(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
}));

export type Newsletter = typeof newsletterTable.$inferSelect;
export type NewsletterInsert = typeof newsletterTable.$inferInsert;

export const sequenceTable = pgTable("sequence", (t) => ({
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  opened: t.timestamp(),
  clicked: t.timestamp(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  newsletterId: t
    .text()
    .notNull()
    .references(() => newsletterTable.id, { onDelete: "restrict" }),
}));

export type Sequence = typeof sequenceTable.$inferSelect;
export type SequenceInsert = typeof sequenceTable.$inferInsert;

export const emailReminderTable = pgTable("email_reminder", (t) => ({
  id: t.text().primaryKey(),
  email: t.text().notNull(),
  dataProvider: dataProviderEnum().notNull(),
  remindOn: t.timestamp().notNull(),
  doubleOptedIn: t.boolean().default(false).notNull(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
}));

export type EmailReminder = typeof emailReminderTable.$inferSelect;
export type EmailReminderInsert = typeof emailReminderTable.$inferInsert;

export const waitlistTable = pgTable("waitlist", (t) => ({
  id: t.text().primaryKey(),
  email: t.text().notNull(),
  dataProvider: dataProviderEnum().notNull(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
}));

export type Waitlist = typeof waitlistTable.$inferSelect;
export type WaitlistInsert = typeof waitlistTable.$inferInsert;

// ---- DATING SERVICES CATALOG -------------------------------------

export const catalogEntryTable = pgTable(
  "catalog_entry",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("cat")),
    slug: t.text().notNull().unique(),
    name: t.text().notNull(),
    primaryCategory: t.text().$type<CatalogCategoryKey>().notNull(),
    status: catalogEntryStatusEnum().default("DRAFT").notNull(),
    verificationStatus: catalogVerificationStatusEnum()
      .default("UNVERIFIED")
      .notNull(),
    claimedAt: t.timestamp({ withTimezone: true }),
    featured: t.boolean().default(false).notNull(),
    editorialPick: t.boolean().default(false).notNull(),
    remote: t.boolean().default(false).notNull(),
    data: t.jsonb().$type<CatalogEntryData>().notNull(),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("catalog_entry_status_category_idx").on(t.status, t.primaryCategory),
    index("catalog_entry_presentation_idx").on(
      t.featured,
      t.editorialPick,
      t.name,
    ),
  ],
);

export type CatalogEntry = typeof catalogEntryTable.$inferSelect;
export type CatalogEntryInsert = typeof catalogEntryTable.$inferInsert;

export const catalogEntryMemberTable = pgTable(
  "catalog_entry_member",
  (t) => ({
    entryId: t
      .text()
      .notNull()
      .references(() => catalogEntryTable.id, { onDelete: "cascade" }),
    userId: t
      .text()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: catalogMemberRoleEnum().default("EDITOR").notNull(),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    primaryKey({ columns: [t.entryId, t.userId] }),
    index("catalog_entry_member_user_idx").on(t.userId),
  ],
);

export type CatalogEntryMember = typeof catalogEntryMemberTable.$inferSelect;
export type CatalogEntryMemberInsert =
  typeof catalogEntryMemberTable.$inferInsert;

export const catalogEntryClaimTable = pgTable(
  "catalog_entry_claim",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("clm")),
    entryId: t
      .text()
      .notNull()
      .references(() => catalogEntryTable.id, { onDelete: "cascade" }),
    claimantUserId: t
      .text()
      .references(() => userTable.id, { onDelete: "set null" }),
    claimantEmail: t.text(),
    status: catalogClaimStatusEnum().default("PENDING").notNull(),
    evidence: t.jsonb().$type<CatalogClaimEvidence>().notNull(),
    reviewedBy: t
      .text()
      .references(() => userTable.id, { onDelete: "set null" }),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    reviewedAt: t.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("catalog_entry_claim_entry_status_idx").on(t.entryId, t.status),
    index("catalog_entry_claim_claimant_idx").on(
      t.claimantUserId,
      t.claimantEmail,
    ),
    check(
      "catalog_entry_claim_has_identity",
      sql`${t.claimantUserId} is not null or ${t.claimantEmail} is not null`,
    ),
  ],
);

export type CatalogEntryClaim = typeof catalogEntryClaimTable.$inferSelect;
export type CatalogEntryClaimInsert =
  typeof catalogEntryClaimTable.$inferInsert;

export const catalogRequestTable = pgTable(
  "catalog_request",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("req")),
    requesterUserId: t
      .text()
      .references(() => userTable.id, { onDelete: "set null" }),
    anonymousSessionId: t.text(),
    contactEmail: t.text(),
    targetEntryId: t
      .text()
      .references(() => catalogEntryTable.id, { onDelete: "set null" }),
    category: t.text().$type<CatalogCategoryKey>().notNull(),
    status: catalogRequestStatusEnum().default("OPEN").notNull(),
    visibility: catalogRequestVisibilityEnum().default("PRIVATE").notNull(),
    data: t.jsonb().$type<CatalogRequestData>().notNull(),
    expiresAt: t.timestamp({ withTimezone: true }),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("catalog_request_status_category_idx").on(t.status, t.category),
    index("catalog_request_target_entry_idx").on(t.targetEntryId),
    check(
      "catalog_request_has_identity",
      sql`${t.requesterUserId} is not null or ${t.contactEmail} is not null`,
    ),
  ],
);

export type CatalogRequest = typeof catalogRequestTable.$inferSelect;
export type CatalogRequestInsert = typeof catalogRequestTable.$inferInsert;

export const catalogSubmissionTable = pgTable(
  "catalog_submission",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("sub")),
    submitterUserId: t
      .text()
      .references(() => userTable.id, { onDelete: "set null" }),
    contactEmail: t.text().notNull(),
    name: t.text().notNull(),
    category: t.text().$type<CatalogCategoryKey>().notNull(),
    status: catalogSubmissionStatusEnum().default("PENDING").notNull(),
    data: t.jsonb().$type<CatalogSubmissionData>().notNull(),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("catalog_submission_status_category_idx").on(t.status, t.category),
    index("catalog_submission_contact_idx").on(t.contactEmail),
  ],
);

export type CatalogSubmission = typeof catalogSubmissionTable.$inferSelect;
export type CatalogSubmissionInsert =
  typeof catalogSubmissionTable.$inferInsert;

export const inquiryTable = pgTable(
  "inquiry",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("inq")),
    kind: t.text().$type<InquiryKind>().notNull(),
    name: t.text().notNull(),
    contactEmail: t.text().notNull(),
    data: t.jsonb().$type<InquiryData>().notNull(),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("inquiry_kind_created_idx").on(t.kind, t.createdAt),
    index("inquiry_contact_idx").on(t.contactEmail),
  ],
);

export type Inquiry = typeof inquiryTable.$inferSelect;
export type InquiryInsert = typeof inquiryTable.$inferInsert;

// ---- STORAGE TABLES -----------------------------------------------

/**
 * Short-lived ownership proof and cleanup ledger for sensitive provider
 * exports uploaded directly from the browser. The provider payload itself
 * never belongs in Postgres; this row binds its public transport URL to the
 * authenticated session that requested the narrowly scoped upload token.
 */
export const transientUploadTable = pgTable(
  "transient_upload",
  (t) => ({
    id: t.text().primaryKey(),
    userId: t
      .text()
      // SET NULL preserves the only cleanup pointer when an account is deleted;
      // expired/orphan cleanup does not depend on the user row still existing.
      .references(() => userTable.id, { onDelete: "set null" }),
    sessionId: t.text().notNull(),
    dataProvider: dataProviderEnum().notNull(),
    profileId: t.text().notNull(),
    expectedPathname: t.text().notNull(),
    blobUrl: t.text().unique(),
    blobPathname: t.text(),
    status: transientUploadStatusEnum().default("ISSUED").notNull(),
    resultProfileId: t.text(),
    expiresAt: t.timestamp({ withTimezone: true }).notNull(),
    uploadedAt: t.timestamp({ withTimezone: true }),
    processingStartedAt: t.timestamp({ withTimezone: true }),
    committedAt: t.timestamp({ withTimezone: true }),
    cleanedAt: t.timestamp({ withTimezone: true }),
    cleanupAttemptedAt: t.timestamp({ withTimezone: true }),
    cleanupAttempts: t.integer().default(0).notNull(),
    lastCleanupError: t.text(),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("transient_upload_owner_idx").on(t.userId, t.sessionId),
    index("transient_upload_expiry_idx").on(t.status, t.expiresAt),
    uniqueIndex("transient_upload_binding_idx").on(
      t.userId,
      t.sessionId,
      t.dataProvider,
      t.profileId,
      t.expectedPathname,
    ),
    check(
      "transient_upload_provider",
      sql`${t.dataProvider} IN ('TINDER', 'HINGE')`,
    ),
    check("transient_upload_cleanup_attempts", sql`${t.cleanupAttempts} >= 0`),
    check(
      "transient_upload_blob_state",
      sql`${t.status} IN ('ISSUED', 'ABANDONED') OR (${t.blobUrl} IS NOT NULL AND ${t.blobPathname} IS NOT NULL AND ${t.uploadedAt} IS NOT NULL)`,
    ),
    check(
      "transient_upload_processing_state",
      sql`${t.status} <> 'PROCESSING' OR ${t.processingStartedAt} IS NOT NULL`,
    ),
    check(
      "transient_upload_commit_state",
      sql`${t.status} NOT IN ('COMMITTED', 'CLEANED') OR (${t.resultProfileId} IS NOT NULL AND ${t.committedAt} IS NOT NULL)`,
    ),
    check(
      "transient_upload_cleaned_state",
      sql`${t.status} <> 'CLEANED' OR ${t.cleanedAt} IS NOT NULL`,
    ),
    check(
      "transient_upload_abandoned_state",
      sql`${t.status} <> 'ABANDONED' OR (${t.resultProfileId} IS NULL AND ${t.committedAt} IS NULL)`,
    ),
    check(
      "transient_upload_lease_bounds",
      sql`${t.expiresAt} > ${t.createdAt}`,
    ),
  ],
);

export type TransientUpload = typeof transientUploadTable.$inferSelect;
export type TransientUploadInsert = typeof transientUploadTable.$inferInsert;

export const originalAnonymizedFileTable = pgTable(
  "original_anonymized_file",
  (t) => ({
    id: t.text().primaryKey(),
    dataProvider: dataProviderEnum().notNull(),
    swipestatsVersion: swipestatsVersionEnum().notNull(),
    file: t.jsonb(), // Nullable - deprecated for new uploads (use blobUrl instead)
    blobUrl: t.text(), // Vercel Blob URL for external storage
    userId: t
      .text()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
  }),
);

export type OriginalAnonymizedFile =
  typeof originalAnonymizedFileTable.$inferSelect;
export type OriginalAnonymizedFileInsert =
  typeof originalAnonymizedFileTable.$inferInsert;

export const purchaseTable = pgTable("purchase", (t) => ({
  id: t.text().primaryKey(),
  userId: t
    .text()
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  tinderProfileId: t
    .text()
    .notNull()
    .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
}));

export type Purchase = typeof purchaseTable.$inferSelect;
export type PurchaseInsert = typeof purchaseTable.$inferInsert;

export const datasetExportTable = pgTable("dataset_export", (t) => ({
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => createId("dex")),
  licenseKey: t.text().notNull().unique(),
  licenseKeyId: t.text(),
  orderId: t.text(),
  tier: datasetTierEnum().notNull(),
  status: datasetExportStatusEnum().default("PENDING").notNull(),
  profileCount: t.integer().notNull(),
  recency: t.text().$type<"MIXED" | "RECENT">().notNull(),
  profileIds: t.jsonb().default([]),
  blobUrl: t.text(),
  blobSize: t.integer(),
  downloadCount: t.integer().default(0).notNull(),
  maxDownloads: t.integer().default(3).notNull(),
  customerEmail: t.text(),
  expiresAt: t.timestamp(),
  generatedAt: t.timestamp(),
  errorMessage: t.text(),
  firstDownloadedAt: t.timestamp(),
  lastDownloadedAt: t.timestamp(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
}));

export type DatasetExport = typeof datasetExportTable.$inferSelect;
export type DatasetExportInsert = typeof datasetExportTable.$inferInsert;

// ---- APP TABLES ---------------------------------------------------

export const postTable = pgTable(
  "post",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("pst")),
    name: t.varchar({ length: 256 }),
    createdById: t
      .text()
      .notNull()
      .references(() => userTable.id),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("post_created_by_idx").on(t.createdById),
    index("post_name_idx").on(t.name),
  ],
);

export type Post = typeof postTable.$inferSelect;
export type PostInsert = typeof postTable.$inferInsert;

// ---- ATTACHMENT TABLE (for photo/media uploads) ------------------

export const attachmentTable = pgTable(
  "attachment",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("att")),
    resourceType: t.text("resource_type", { enum: RESOURCE_TYPES }).notNull(),
    resourceId: t.text().notNull(),
    uploadedBy: t
      .text()
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    filename: t.text().notNull(),
    originalFilename: t.text().notNull(),
    mimeType: t.text().notNull(),
    size: t.integer().notNull(), // bytes
    url: t.text().notNull(), // blob storage URL
    metadata: t.jsonb().default({}), // width, height for images, duration for video/audio
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: t.timestamp("deleted_at"),
  }),
  (table) => [
    index("attachment_resource_idx").on(table.resourceType, table.resourceId),
    index("attachment_uploaded_by_idx").on(table.uploadedBy),
    index("attachment_mime_type_idx").on(table.mimeType),
    // Blob URLs are globally unique, so this both prevents duplicate rows for
    // the same upload and lets createAttachmentFromBlob upsert idempotently
    // (client-side creation + the webhook backstop can't double-insert).
    uniqueIndex("attachment_url_key").on(table.url),
  ],
);

export type Attachment = typeof attachmentTable.$inferSelect;
export type AttachmentInsert = typeof attachmentTable.$inferInsert;

// ---- PROFILE COMPARISON TABLES ------------------------------------

// Profile comparison - the main container
export const profileComparisonTable = pgTable(
  "profile_comparison",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("prc")),
    userId: t
      .text()
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    name: t.text(),
    profileName: t.text(),
    defaultBio: t.text(),
    age: t.integer(),
    city: t.text(),
    state: t.text(),
    country: t.text(),
    hometown: t.text(),
    nationality: t.text(),
    heightCm: t.integer(),
    educationLevel: educationLevelEnum(),
    isPublic: t.boolean().default(false).notNull(),
    shareKey: t.text().unique(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("profile_comparison_user_id_idx").on(table.userId),
    index("profile_comparison_share_key_idx").on(table.shareKey),
  ],
);

export type ProfileComparison = typeof profileComparisonTable.$inferSelect;
export type ProfileComparisonInsert =
  typeof profileComparisonTable.$inferInsert;

// Comparison column - one per dating app (Tinder, Hinge, Bumble, etc.)
export const comparisonColumnTable = pgTable(
  "comparison_column",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("ccl")),
    comparisonId: t
      .text()
      .references(() => profileComparisonTable.id, { onDelete: "cascade" })
      .notNull(),
    dataProvider: dataProviderEnum().notNull(),
    order: t.integer().notNull(),
    bio: t.text(),
    title: t.text(),
    // Internal "mark as done" flag for the user. Nullable timestamp instead of
    // a boolean so we also capture *when* the column was marked complete.
    // null = not done, a timestamp = done.
    completedAt: t.timestamp(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("comparison_column_comparison_id_idx").on(table.comparisonId),
  ],
);

export type ComparisonColumn = typeof comparisonColumnTable.$inferSelect;
export type ComparisonColumnInsert = typeof comparisonColumnTable.$inferInsert;

// Content table supporting both photos (with captions) and prompts
export const comparisonColumnContentTable = pgTable(
  "comparison_column_content",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("ccc")),
    columnId: t
      .text()
      .references(() => comparisonColumnTable.id, { onDelete: "cascade" })
      .notNull(),

    // Content type discriminator
    type: t.text().$type<"photo" | "prompt">().notNull(),

    // For photos: required attachmentId, optional caption
    attachmentId: t
      .text()
      .references(() => attachmentTable.id, { onDelete: "cascade" }),
    caption: t.text(),

    // For prompts: required prompt + answer, optional photo attachment
    prompt: t.text(), // "My ideal Sunday is..."
    answer: t.text(), // "Brunch with friends, then..."

    order: t.integer().notNull(),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("comparison_column_content_column_id_idx").on(table.columnId),
    index("comparison_column_content_attachment_id_idx").on(table.attachmentId),
    index("comparison_column_content_type_idx").on(table.type),
  ],
);

export type ComparisonColumnContent =
  typeof comparisonColumnContentTable.$inferSelect;
export type ComparisonColumnContentInsert =
  typeof comparisonColumnContentTable.$inferInsert;

// Profile comparison feedback - ratings and comments on content items or columns
export const profileComparisonFeedbackTable = pgTable(
  "profile_comparison_feedback",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("pcf")),
    // Polymorphic target - exactly one must be set
    contentId: t.text(),
    columnId: t.text(),
    // Author - always required (anonymous users get userId via Better Auth)
    authorId: t
      .text()
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    actorType: t.text().$type<"user" | "system">().default("user").notNull(),
    // Feedback content
    rating: t.integer(), // flexible: -1, 0, 1, 2, 3, 4, 5, etc.
    body: t.text(), // comment text
    // Metadata
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: t.timestamp("deleted_at"),
  }),
  (table) => [
    index("pcf_content_id_idx").on(table.contentId),
    index("pcf_column_id_idx").on(table.columnId),
    index("pcf_author_id_idx").on(table.authorId),
    index("pcf_created_at_idx").on(table.createdAt),
    // Custom FK names to avoid PostgreSQL 63-char identifier limit
    foreignKey({
      name: "pcf_content_fk",
      columns: [table.contentId],
      foreignColumns: [comparisonColumnContentTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pcf_column_fk",
      columns: [table.columnId],
      foreignColumns: [comparisonColumnTable.id],
    }).onDelete("cascade"),
  ],
);

export type ProfileComparisonFeedback =
  typeof profileComparisonFeedbackTable.$inferSelect;
export type ProfileComparisonFeedbackInsert =
  typeof profileComparisonFeedbackTable.$inferInsert;

// ---- ROAST TABLE --------------------------------------------------

// ---- AI OUTPUT ----------------------------------------------------
//
// One table for every PERSISTED, regenerable, shareable AI artifact about a
// subject the user owns — profile roasts today, "your year"/Wrapped-style
// recaps later. Ephemeral AI (prompt suggestions, on-the-fly analysis) does NOT
// belong here; it's returned to the client and never stored.
//
// Shape:
//  - `kind` (plain text, validated at the edge — adding a kind needs no
//    migration) + the subject + `scope` identify the artifact. One row per
//    (kind, subject, scope); regenerating OVERWRITES it (a user expects one
//    current version, not a history).
//  - The subject is an EXCLUSIVE ARC of typed FKs: exactly one of
//    `tinderProfileId` / `hingeProfileId` / `columnId` is set (enforced by the
//    `ai_output_one_subject` CHECK). Each FK is `onDelete: cascade`, so deleting
//    the subject deletes its artifacts — no app-layer prune to forget. `kind`
//    is still the discriminant and is NOT derivable from which FK is set (a
//    subject table can host several kinds — e.g. a future `tinder_wrapped` would
//    also point at `tinderProfileId`).
//  - `input` records what we fed the model (reproducibility/debugging);
//    `output` is the rendered result. Both jsonb. Each generator owns its
//    `output` shape and validates it with a zod schema at write time.
//  - `version` is the output-format version. Readers compare it to the current
//    per-kind version and offer a manual "refresh" (regenerate) for rows left
//    behind — so the payload can evolve without DB migrations or backfills.
//  - `shareKey`/`isPublic` are the share primitive, built once for all kinds.

export type AiOutputKind = "tinder_roast" | "hinge_roast" | "profile_roast";

// Re-exported so existing importers keep `import { StatsRoastResult } from
// "@/server/db/schema"`. Definitions live in the zod leaf (imported above).
export type { StatsRoastResult, ProfileRoastResult };

/** `output` payload — shape depends on `kind`, narrowed at the edge by zod. */
export type AiOutputPayload = StatsRoastResult | ProfileRoastResult;

/** What was fed to the model, stored for reproducibility. Shape depends on kind. */
export type AiOutputInput =
  | {
      dataProvider: string;
      gender: string | null;
      benchmarks: {
        label: string;
        valueLabel: string;
        bucket: string;
        cohortLabel: string;
      }[];
    }
  | {
      providerKey: string;
      steer: string | null;
      lens?: ProfileRoastLensKey;
    };

export const aiOutputTable = pgTable(
  "ai_output",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("aio")),
    userId: t
      .text()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // `kind` is the artifact discriminant (plain text — a new kind needs no
    // migration). NOT derivable from the FKs: a subject table can host several
    // kinds (e.g. tinder_roast and a future tinder_wrapped both → tinderProfileId).
    kind: t.text().$type<AiOutputKind>().notNull(),
    // Exclusive-arc subject: exactly one of these is set (CHECK below), each
    // cascading on delete so artifacts can't outlive their subject.
    tinderProfileId: t
      .text()
      .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
    hingeProfileId: t
      .text()
      .references(() => hingeProfileTable.hingeId, { onDelete: "cascade" }),
    columnId: t
      .text()
      .references(() => comparisonColumnTable.id, { onDelete: "cascade" }),
    // "" = the whole subject; a period like "2024" / "2024-01" for recaps. Part
    // of the uniqueness key. NOT NULL (empty string, never NULL) so the unique
    // index treats it as one slot — NULLs would be distinct and break overwrite.
    scope: t.text().notNull().default(""),
    // Voice knob, promoted out of `input` because it's read back often. Nullable
    // (not every kind has a tone).
    tone: t.text(),
    model: t.text().notNull(),
    version: t.smallint().notNull().default(1),
    input: t.jsonb().$type<AiOutputInput>().notNull(),
    output: t.jsonb().$type<AiOutputPayload>().notNull(),
    // Always generated app-side, so it's NOT NULL: a row always has a share key
    // (publishing just flips isPublic). Enforces the "a roast is shareable" invariant.
    shareKey: t
      .text()
      .notNull()
      .unique()
      .$defaultFn(() => createId("share")),
    isPublic: t.boolean().notNull().default(false),
    createdAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    // Exactly one subject FK is set — the exclusive arc.
    check(
      "ai_output_one_subject",
      sql`num_nonnulls(${table.tinderProfileId}, ${table.hingeProfileId}, ${table.columnId}) = 1`,
    ),
    // One artifact per (kind, subject, scope) — the upsert overwrites in place.
    // NULLS NOT DISTINCT so the two unused arc columns (always NULL for a given
    // kind) collapse to one slot; otherwise NULL <> NULL would let duplicates in.
    unique("ai_output_subject_key")
      .on(
        table.kind,
        table.scope,
        table.tinderProfileId,
        table.hingeProfileId,
        table.columnId,
      )
      .nullsNotDistinct(),
    index("ai_output_user_id_idx").on(table.userId),
    index("ai_output_share_key_idx").on(table.shareKey),
    index("ai_output_column_id_idx").on(table.columnId),
  ],
);

export type AiOutputRow = typeof aiOutputTable.$inferSelect;
export type AiOutputRowInsert = typeof aiOutputTable.$inferInsert;

// The `output` shape for kind="profile_roast" rows (`ProfileRoastResult`) lives
// in `@/lib/ai/roast-schemas` and is re-exported above. Photos/prompts are keyed
// by content id; image URLs are resolved live on read (not frozen), so the roast
// always renders against the current profile.

// ---- LEGACY COHORT TABLES ----------------------------------------
//
// SwipeRank supersedes these tables for product reads. Keep their schema in the
// first SwipeRank release so the previous production build remains rollback-safe;
// a later cleanup migration can remove them after the new reads are established.

export const cohortDefinitionTable = pgTable("cohort_definition", (t) => ({
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  description: t.text(),
  dataProvider: dataProviderEnum(),
  gender: genderEnum(),
  ageMin: t.integer(),
  ageMax: t.integer(),
  country: t.text(),
  region: t.text(),
  type: t.text().$type<"SYSTEM" | "USER_CUSTOM">().default("SYSTEM").notNull(),
  createdByUserId: t
    .text()
    .references(() => userTable.id, { onDelete: "cascade" }),
  profileCount: t.integer().default(0).notNull(),
  lastComputedAt: t.timestamp(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
}));

export type CohortDefinition = typeof cohortDefinitionTable.$inferSelect;
export type CohortDefinitionInsert = typeof cohortDefinitionTable.$inferInsert;

export const cohortStatsTable = pgTable(
  "cohort_stats",
  (t) => ({
    id: t
      .text()
      .primaryKey()
      .$defaultFn(() => createId("cst")),
    cohortId: t
      .text()
      .notNull()
      .references(() => cohortDefinitionTable.id, { onDelete: "cascade" }),
    period: t.text().notNull().default("all-time"),
    periodStart: t.timestamp(),
    periodEnd: t.timestamp(),
    profileCount: t.integer().notNull(),
    likeRateP10: t.doublePrecision(),
    likeRateP25: t.doublePrecision(),
    likeRateP50: t.doublePrecision(),
    likeRateP75: t.doublePrecision(),
    likeRateP90: t.doublePrecision(),
    likeRateMean: t.doublePrecision(),
    matchRateP10: t.doublePrecision(),
    matchRateP25: t.doublePrecision(),
    matchRateP50: t.doublePrecision(),
    matchRateP75: t.doublePrecision(),
    matchRateP90: t.doublePrecision(),
    matchRateMean: t.doublePrecision(),
    swipesPerDayP10: t.doublePrecision(),
    swipesPerDayP25: t.doublePrecision(),
    swipesPerDayP50: t.doublePrecision(),
    swipesPerDayP75: t.doublePrecision(),
    swipesPerDayP90: t.doublePrecision(),
    swipesPerDayMean: t.doublePrecision(),
    computedAt: t.timestamp().notNull(),
  }),
  (t) => ({
    cohortPeriodIdx: uniqueIndex("cohort_period_idx").on(t.cohortId, t.period),
  }),
);

export type CohortStats = typeof cohortStatsTable.$inferSelect;
export type CohortStatsInsert = typeof cohortStatsTable.$inferInsert;

// ---- RELATIONS ----------------------------------------------------

export const userRelations = relations(userTable, ({ one, many }) => ({
  accounts: many(accountTable),
  sessions: many(sessionTable),
  posts: many(postTable),
  // 1:1 relationships (enforced by unique constraint on userId)
  tinderProfile: one(tinderProfileTable, {
    fields: [userTable.id],
    references: [tinderProfileTable.userId],
  }),
  hingeProfile: one(hingeProfileTable, {
    fields: [userTable.id],
    references: [hingeProfileTable.userId],
  }),
  rayaProfile: one(rayaProfileTable, {
    fields: [userTable.id],
    references: [rayaProfileTable.userId],
  }),
  events: many(eventTable),
  customData: many(customDataTable),
  originalAnonymizedFiles: many(originalAnonymizedFileTable),
  purchases: many(purchaseTable),
  profileComparisons: many(profileComparisonTable),
  uploadedAttachments: many(attachmentTable),
  cohortDefinitions: many(cohortDefinitionTable),
  aiOutputs: many(aiOutputTable),
  catalogMemberships: many(catalogEntryMemberTable),
  submittedCatalogClaims: many(catalogEntryClaimTable, {
    relationName: "catalogClaimant",
  }),
  reviewedCatalogClaims: many(catalogEntryClaimTable, {
    relationName: "catalogClaimReviewer",
  }),
  catalogRequests: many(catalogRequestTable),
  swipeRankProfiles: many(swipeRankProfileTable),
}));

export const accountRelations = relations(accountTable, ({ one }) => ({
  user: one(userTable, {
    fields: [accountTable.userId],
    references: [userTable.id],
  }),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));

export const tinderProfileRelations = relations(
  tinderProfileTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [tinderProfileTable.userId],
      references: [userTable.id],
    }),
    matches: many(matchTable),
    messages: many(messageTable),
    media: many(mediaTable),
    profileMeta: many(profileMetaTable),
    usage: many(tinderUsageTable),
    jobs: many(jobTable),
    schools: many(schoolTable),
    customData: one(customDataTable, {
      fields: [tinderProfileTable.tinderId],
      references: [customDataTable.tinderProfileId],
    }),
    purchases: many(purchaseTable),
  }),
);

export const hingeProfileRelations = relations(
  hingeProfileTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [hingeProfileTable.userId],
      references: [userTable.id],
    }),
    matches: many(matchTable),
    messages: many(messageTable),
    media: many(mediaTable),
    profileMeta: many(profileMetaTable),
    interactions: many(hingeInteractionTable),
    prompts: many(hingePromptTable),
    customData: one(customDataTable, {
      fields: [hingeProfileTable.hingeId],
      references: [customDataTable.hingeProfileId],
    }),
  }),
);

export const rayaProfileRelations = relations(
  rayaProfileTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [rayaProfileTable.userId],
      references: [userTable.id],
    }),
    usage: many(rayaUsageTable),
  }),
);

export const rayaUsageRelations = relations(rayaUsageTable, ({ one }) => ({
  rayaProfile: one(rayaProfileTable, {
    fields: [rayaUsageTable.rayaProfileId],
    references: [rayaProfileTable.rayaId],
  }),
}));

export const matchRelations = relations(matchTable, ({ one, many }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [matchTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
  hingeProfile: one(hingeProfileTable, {
    fields: [matchTable.hingeProfileId],
    references: [hingeProfileTable.hingeId],
  }),
  messages: many(messageTable),
}));

export const messageRelations = relations(messageTable, ({ one }) => ({
  match: one(matchTable, {
    fields: [messageTable.matchId],
    references: [matchTable.id],
  }),
  tinderProfile: one(tinderProfileTable, {
    fields: [messageTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
  hingeProfile: one(hingeProfileTable, {
    fields: [messageTable.hingeProfileId],
    references: [hingeProfileTable.hingeId],
  }),
}));

export const mediaRelations = relations(mediaTable, ({ one }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [mediaTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
  hingeProfile: one(hingeProfileTable, {
    fields: [mediaTable.hingeProfileId],
    references: [hingeProfileTable.hingeId],
  }),
}));

export const profileMetaRelations = relations(profileMetaTable, ({ one }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [profileMetaTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
  hingeProfile: one(hingeProfileTable, {
    fields: [profileMetaTable.hingeProfileId],
    references: [hingeProfileTable.hingeId],
  }),
}));

export const swipeRankProfileRelations = relations(
  swipeRankProfileTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [swipeRankProfileTable.userId],
      references: [userTable.id],
    }),
    periodFacts: many(swipeRankPeriodFactTable),
    leaderboardEntries: many(swipeRankEntryTable),
  }),
);

export const swipeRankBuildRelations = relations(
  swipeRankBuildTable,
  ({ many }) => ({
    periodFacts: many(swipeRankPeriodFactTable),
    snapshots: many(swipeRankSnapshotTable),
  }),
);

export const swipeRankPeriodFactRelations = relations(
  swipeRankPeriodFactTable,
  ({ one }) => ({
    profile: one(swipeRankProfileTable, {
      fields: [swipeRankPeriodFactTable.profileId],
      references: [swipeRankProfileTable.id],
    }),
    build: one(swipeRankBuildTable, {
      fields: [swipeRankPeriodFactTable.buildId],
      references: [swipeRankBuildTable.id],
    }),
  }),
);

export const swipeRankSnapshotRelations = relations(
  swipeRankSnapshotTable,
  ({ one, many }) => ({
    build: one(swipeRankBuildTable, {
      fields: [swipeRankSnapshotTable.buildId],
      references: [swipeRankBuildTable.id],
    }),
    entries: many(swipeRankEntryTable),
  }),
);

export const swipeRankEntryRelations = relations(
  swipeRankEntryTable,
  ({ one }) => ({
    snapshot: one(swipeRankSnapshotTable, {
      fields: [swipeRankEntryTable.snapshotId],
      references: [swipeRankSnapshotTable.id],
    }),
    profile: one(swipeRankProfileTable, {
      fields: [swipeRankEntryTable.profileId],
      references: [swipeRankProfileTable.id],
    }),
  }),
);

export const jobRelations = relations(jobTable, ({ one }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [jobTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
}));

export const schoolRelations = relations(schoolTable, ({ one }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [schoolTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
}));

export const hingeInteractionRelations = relations(
  hingeInteractionTable,
  ({ one }) => ({
    hingeProfile: one(hingeProfileTable, {
      fields: [hingeInteractionTable.hingeProfileId],
      references: [hingeProfileTable.hingeId],
    }),
    match: one(matchTable, {
      fields: [hingeInteractionTable.matchId],
      references: [matchTable.id],
    }),
  }),
);

export const hingePromptRelations = relations(hingePromptTable, ({ one }) => ({
  hingeProfile: one(hingeProfileTable, {
    fields: [hingePromptTable.hingeProfileId],
    references: [hingeProfileTable.hingeId],
  }),
}));

export const eventRelations = relations(eventTable, ({ one }) => ({
  user: one(userTable, {
    fields: [eventTable.userId],
    references: [userTable.id],
  }),
  location: one(locationTable, {
    fields: [eventTable.locationId],
    references: [locationTable.id],
  }),
}));

export const customDataRelations = relations(customDataTable, ({ one }) => ({
  user: one(userTable, {
    fields: [customDataTable.userId],
    references: [userTable.id],
  }),
  tinderProfile: one(tinderProfileTable, {
    fields: [customDataTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
  hingeProfile: one(hingeProfileTable, {
    fields: [customDataTable.hingeProfileId],
    references: [hingeProfileTable.hingeId],
  }),
}));

export const newsletterRelations = relations(newsletterTable, ({ many }) => ({
  sequences: many(sequenceTable),
}));

export const sequenceRelations = relations(sequenceTable, ({ one }) => ({
  newsletter: one(newsletterTable, {
    fields: [sequenceTable.newsletterId],
    references: [newsletterTable.id],
  }),
}));

export const originalAnonymizedFileRelations = relations(
  originalAnonymizedFileTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [originalAnonymizedFileTable.userId],
      references: [userTable.id],
    }),
  }),
);

export const purchaseRelations = relations(purchaseTable, ({ one }) => ({
  user: one(userTable, {
    fields: [purchaseTable.userId],
    references: [userTable.id],
  }),
  tinderProfile: one(tinderProfileTable, {
    fields: [purchaseTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
}));

export const tinderUsageRelations = relations(tinderUsageTable, ({ one }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [tinderUsageTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
}));

export const postRelations = relations(postTable, ({ one }) => ({
  createdBy: one(userTable, {
    fields: [postTable.createdById],
    references: [userTable.id],
  }),
}));

// Profile comparison relations
export const profileComparisonRelations = relations(
  profileComparisonTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [profileComparisonTable.userId],
      references: [userTable.id],
    }),
    columns: many(comparisonColumnTable),
  }),
);

export const comparisonColumnRelations = relations(
  comparisonColumnTable,
  ({ one, many }) => ({
    comparison: one(profileComparisonTable, {
      fields: [comparisonColumnTable.comparisonId],
      references: [profileComparisonTable.id],
    }),
    content: many(comparisonColumnContentTable),
    feedback: many(profileComparisonFeedbackTable),
    // Roast state (roasted? + tone + when) lives in `ai_output` keyed by
    // (kind="profile_roast", subjectId=column.id) — no FK relation, queried
    // explicitly where the comparison is read.
  }),
);

export const comparisonColumnContentRelations = relations(
  comparisonColumnContentTable,
  ({ one, many }) => ({
    column: one(comparisonColumnTable, {
      fields: [comparisonColumnContentTable.columnId],
      references: [comparisonColumnTable.id],
    }),
    attachment: one(attachmentTable, {
      fields: [comparisonColumnContentTable.attachmentId],
      references: [attachmentTable.id],
    }),
    feedback: many(profileComparisonFeedbackTable),
  }),
);

export const attachmentRelations = relations(attachmentTable, ({ one }) => ({
  uploadedBy: one(userTable, {
    fields: [attachmentTable.uploadedBy],
    references: [userTable.id],
  }),
}));

export const profileComparisonFeedbackRelations = relations(
  profileComparisonFeedbackTable,
  ({ one }) => ({
    content: one(comparisonColumnContentTable, {
      fields: [profileComparisonFeedbackTable.contentId],
      references: [comparisonColumnContentTable.id],
    }),
    column: one(comparisonColumnTable, {
      fields: [profileComparisonFeedbackTable.columnId],
      references: [comparisonColumnTable.id],
    }),
    author: one(userTable, {
      fields: [profileComparisonFeedbackTable.authorId],
      references: [userTable.id],
    }),
  }),
);

export const cohortDefinitionRelations = relations(
  cohortDefinitionTable,
  ({ one, many }) => ({
    createdBy: one(userTable, {
      fields: [cohortDefinitionTable.createdByUserId],
      references: [userTable.id],
    }),
    stats: many(cohortStatsTable),
  }),
);

export const cohortStatsRelations = relations(cohortStatsTable, ({ one }) => ({
  cohort: one(cohortDefinitionTable, {
    fields: [cohortStatsTable.cohortId],
    references: [cohortDefinitionTable.id],
  }),
}));

export const aiOutputRelations = relations(aiOutputTable, ({ one }) => ({
  user: one(userTable, {
    fields: [aiOutputTable.userId],
    references: [userTable.id],
  }),
  tinderProfile: one(tinderProfileTable, {
    fields: [aiOutputTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
  hingeProfile: one(hingeProfileTable, {
    fields: [aiOutputTable.hingeProfileId],
    references: [hingeProfileTable.hingeId],
  }),
  column: one(comparisonColumnTable, {
    fields: [aiOutputTable.columnId],
    references: [comparisonColumnTable.id],
  }),
}));

export const catalogEntryRelations = relations(
  catalogEntryTable,
  ({ many }) => ({
    members: many(catalogEntryMemberTable),
    claims: many(catalogEntryClaimTable),
    requests: many(catalogRequestTable),
  }),
);

export const catalogEntryMemberRelations = relations(
  catalogEntryMemberTable,
  ({ one }) => ({
    entry: one(catalogEntryTable, {
      fields: [catalogEntryMemberTable.entryId],
      references: [catalogEntryTable.id],
    }),
    user: one(userTable, {
      fields: [catalogEntryMemberTable.userId],
      references: [userTable.id],
    }),
  }),
);

export const catalogEntryClaimRelations = relations(
  catalogEntryClaimTable,
  ({ one }) => ({
    entry: one(catalogEntryTable, {
      fields: [catalogEntryClaimTable.entryId],
      references: [catalogEntryTable.id],
    }),
    claimant: one(userTable, {
      fields: [catalogEntryClaimTable.claimantUserId],
      references: [userTable.id],
      relationName: "catalogClaimant",
    }),
    reviewer: one(userTable, {
      fields: [catalogEntryClaimTable.reviewedBy],
      references: [userTable.id],
      relationName: "catalogClaimReviewer",
    }),
  }),
);

export const catalogRequestRelations = relations(
  catalogRequestTable,
  ({ one }) => ({
    requester: one(userTable, {
      fields: [catalogRequestTable.requesterUserId],
      references: [userTable.id],
    }),
    targetEntry: one(catalogEntryTable, {
      fields: [catalogRequestTable.targetEntryId],
      references: [catalogEntryTable.id],
    }),
  }),
);

export const catalogSubmissionRelations = relations(
  catalogSubmissionTable,
  ({ one }) => ({
    submitter: one(userTable, {
      fields: [catalogSubmissionTable.submitterUserId],
      references: [userTable.id],
    }),
  }),
);
