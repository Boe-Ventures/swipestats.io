import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createId } from "./utils";

// ---- ENUMS --------------------------------------------------------

export const dataProviderEnum = pgEnum("DataProvider", [
  "TINDER",
  "HINGE",
  "BUMBLE",
  "GRINDER",
  "BADOO",
  "BOO",
  "OK_CUPID",
  "FEELD",
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

// ---- RESOURCE TYPES (for attachments) ----------------------------

export const RESOURCE_TYPES = [
  "profile_comparison",
  "comparison_column",
  "user_photo",
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

export const tinderProfileTable = pgTable("tinder_profile", (t) => ({
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
  activeTime: t.timestamp(),
  gender: genderEnum().notNull(),
  genderStr: t.text().notNull(),
  bio: t.text(),
  bioOriginal: t.text(),
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
  ageFilterMin: t.integer().notNull(),
  ageFilterMax: t.integer().notNull(),
  interestedIn: genderEnum().notNull(),
  interestedInStr: t.text().notNull(),
  genderFilter: genderEnum().notNull(),
  genderFilterStr: t.text().notNull(),
  swipestatsVersion: swipestatsVersionEnum().notNull(),
  userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
  firstDayOnApp: t.timestamp().notNull(),
  lastDayOnApp: t.timestamp().notNull(),
  daysInProfilePeriod: t.integer().notNull(),
}));

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
    dateIsMissingFromOriginalData: t.boolean().notNull(),
    daysSinceLastActive: t.integer(),
    activeUser: t.boolean().notNull(),
    activeUserInLast7Days: t.boolean().notNull(),
    activeUserInLast14Days: t.boolean().notNull(),
    activeUserInLast30Days: t.boolean().notNull(),
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

export const rawUsageTable = pgTable("raw_usage", (t) => ({
  tinderProfileId: t
    .text()
    .primaryKey()
    .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
  matchesRaw: t.jsonb().notNull(),
  appOpensRaw: t.jsonb().notNull(),
  swipeLikesRaw: t.jsonb().notNull(),
  swipePassesRaw: t.jsonb().notNull(),
  messagesSentRaw: t.jsonb().notNull(),
  messagesReceivedRaw: t.jsonb().notNull(),
}));

export type RawUsage = typeof rawUsageTable.$inferSelect;
export type RawUsageInsert = typeof rawUsageTable.$inferInsert;

export const rawMessagesTable = pgTable("raw_messages", (t) => ({
  tinderProfileId: t
    .text()
    .primaryKey()
    .references(() => tinderProfileTable.tinderId, { onDelete: "cascade" }),
  messages: t.jsonb().notNull(),
}));

export type RawMessages = typeof rawMessagesTable.$inferSelect;
export type RawMessagesInsert = typeof rawMessagesTable.$inferInsert;

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

export const hingeProfileTable = pgTable("hinge_profile", (t) => ({
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
  createDate: t.timestamp().notNull(),
  heightCentimeters: t.integer().notNull(),
  gender: t.text().notNull(),
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
}));

export type HingeProfile = typeof hingeProfileTable.$inferSelect;
export type HingeProfileInsert = typeof hingeProfileTable.$inferInsert;

export const hingeInteractionTable = pgTable("hinge_interaction", (t) => ({
  id: t.text().primaryKey(),
  type: hingeInteractionTypeEnum().notNull(),
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
  prompt: t.text().notNull(),
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
    primaryLanguage: t.text(),
    languages: t.jsonb().default([]).notNull(),
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
    language: t.text(),
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

export const profileMetaTable = pgTable("profile_meta", (t) => ({
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
  daysActive: t.integer().notNull(),

  // Core totals
  swipeLikesTotal: t.integer().notNull(),
  swipePassesTotal: t.integer().notNull(),
  matchesTotal: t.integer().notNull(),
  messagesSentTotal: t.integer().notNull(),
  messagesReceivedTotal: t.integer().notNull(),
  appOpensTotal: t.integer().notNull(),

  // Core rates (pre-computed for faster queries)
  likeRate: t.doublePrecision().notNull(), // swipeLikes / totalSwipes
  matchRate: t.doublePrecision().notNull(), // matches / swipeLikes
  swipesPerDay: t.doublePrecision().notNull(), // totalSwipes / daysInPeriod

  // Conversation stats (essential for "Your Chats" section)
  conversationCount: t.integer().notNull(),
  conversationsWithMessages: t.integer().notNull(),
  ghostedCount: t.integer().notNull(), // matches with 0 messages

  // Aggregate message metrics (computed from match-level data)
  averageResponseTimeSeconds: t.integer(), // Median of per-conversation medians (robust to outliers)
  meanResponseTimeSeconds: t.integer(), // True average (affected by outliers)
  medianConversationDurationDays: t.integer(),
  longestConversationDays: t.integer(),
  averageMessagesPerConversation: t.doublePrecision(),
  medianMessagesPerConversation: t.integer(), // Robust to outlier conversations

  computedAt: t.timestamp().notNull(),
}));

export type ProfileMeta = typeof profileMetaTable.$inferSelect;
export type ProfileMetaInsert = typeof profileMetaTable.$inferInsert;

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

// ---- STORAGE TABLES -----------------------------------------------

export const originalAnonymizedFileTable = pgTable(
  "original_anonymized_file",
  (t) => ({
    id: t.text().primaryKey(),
    dataProvider: dataProviderEnum().notNull(),
    swipestatsVersion: swipestatsVersionEnum().notNull(),
    file: t.jsonb().notNull(),
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
    contentId: t.text().references(() => comparisonColumnContentTable.id, {
      onDelete: "cascade",
    }),
    columnId: t
      .text()
      .references(() => comparisonColumnTable.id, { onDelete: "cascade" }),
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
  ],
);

export type ProfileComparisonFeedback =
  typeof profileComparisonFeedbackTable.$inferSelect;
export type ProfileComparisonFeedbackInsert =
  typeof profileComparisonFeedbackTable.$inferInsert;

// ---- COHORT SYSTEM TABLES -----------------------------------------

// Cohort definition - what filters constitute a cohort
export const cohortDefinitionTable = pgTable("cohort_definition", (t) => ({
  id: t.text().primaryKey(), // e.g., "tinder_male", "user_abc123_custom1"
  name: t.text().notNull(),
  description: t.text(),

  // Filters
  dataProvider: dataProviderEnum(),
  gender: genderEnum(),
  ageMin: t.integer(),
  ageMax: t.integer(),
  country: t.text(),
  region: t.text(),

  // Ownership
  type: t.text().$type<"SYSTEM" | "USER_CUSTOM">().default("SYSTEM").notNull(),
  createdByUserId: t
    .text()
    .references(() => userTable.id, { onDelete: "cascade" }),

  // Metadata
  profileCount: t.integer().default(0).notNull(),
  lastComputedAt: t.timestamp(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
}));

export type CohortDefinition = typeof cohortDefinitionTable.$inferSelect;
export type CohortDefinitionInsert = typeof cohortDefinitionTable.$inferInsert;

// Cohort stats - pre-computed percentile distributions
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

    // Period (e.g., "all-time", "2024", "2023")
    period: t.text().notNull().default("all-time"),
    periodStart: t.timestamp(),
    periodEnd: t.timestamp(),

    // Sample size
    profileCount: t.integer().notNull(),

    // Like Rate (pickiness) - full distribution
    likeRateP10: t.doublePrecision(),
    likeRateP25: t.doublePrecision(),
    likeRateP50: t.doublePrecision(),
    likeRateP75: t.doublePrecision(),
    likeRateP90: t.doublePrecision(),
    likeRateMean: t.doublePrecision(),

    // Match Rate (desirability) - full distribution
    matchRateP10: t.doublePrecision(),
    matchRateP25: t.doublePrecision(),
    matchRateP50: t.doublePrecision(),
    matchRateP75: t.doublePrecision(),
    matchRateP90: t.doublePrecision(),
    matchRateMean: t.doublePrecision(),

    // Swipes Per Day (activity) - full distribution
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

export const userRelations = relations(userTable, ({ many }) => ({
  accounts: many(accountTable),
  sessions: many(sessionTable),
  posts: many(postTable),
  tinderProfiles: many(tinderProfileTable),
  hingeProfiles: many(hingeProfileTable),
  events: many(eventTable),
  customData: many(customDataTable),
  originalAnonymizedFiles: many(originalAnonymizedFileTable),
  purchases: many(purchaseTable),
  profileComparisons: many(profileComparisonTable),
  uploadedAttachments: many(attachmentTable),
  cohortDefinitions: many(cohortDefinitionTable),
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
    rawUsage: one(rawUsageTable, {
      fields: [tinderProfileTable.tinderId],
      references: [rawUsageTable.tinderProfileId],
    }),
    rawMessages: one(rawMessagesTable, {
      fields: [tinderProfileTable.tinderId],
      references: [rawMessagesTable.tinderProfileId],
    }),
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

export const rawUsageRelations = relations(rawUsageTable, ({ one }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [rawUsageTable.tinderProfileId],
    references: [tinderProfileTable.tinderId],
  }),
}));

export const rawMessagesRelations = relations(rawMessagesTable, ({ one }) => ({
  tinderProfile: one(tinderProfileTable, {
    fields: [rawMessagesTable.tinderProfileId],
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

// Cohort system relations
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
