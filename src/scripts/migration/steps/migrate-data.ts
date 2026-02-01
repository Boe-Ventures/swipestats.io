/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/**
 * Migrate Data Step
 *
 * Migrates Tinder profiles and related data from old database to new.
 *
 * Usage (standalone):
 *   OLD_DATABASE_URL=<old-db-url> DATABASE_URL=<new-db-url> bun run src/scripts/migration/steps/migrate-data.ts
 *
 * Usage (as module):
 *   import { migrateData } from "./steps/migrate-data";
 *   await migrateData();
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/server/db/schema";
import {
  log,
  formatDuration,
  printHeader,
  printSuccess,
  printWarning,
} from "../utils/cli";

// ---- CONFIG -------------------------------------------------------

const BATCH_SIZE = 500;
const MESSAGE_QUERY_BATCH = 500;

// ---- TYPES --------------------------------------------------------

interface SelectedProfile {
  tinderId: string;
  userId: string;
  createdAt: Date;
  lastDayOnApp: Date;
}

interface OldTinderProfile {
  tinderId: string;
  userId: string;
  birthDate: Date;
  ageAtUpload: number;
  ageAtLastUsage: number;
  createDate: Date;
  activeTime: Date | null;
  gender: string;
  genderStr: string;
  bio: string | null;
  bioOriginal: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  user_interests: unknown;
  interests: unknown;
  sexual_orientations: unknown;
  descriptors: unknown;
  instagramConnected: boolean;
  spotifyConnected: boolean;
  jobTitle: string | null;
  jobTitleDisplayed: boolean | null;
  company: string | null;
  companyDisplayed: boolean | null;
  school: string | null;
  schoolDisplayed: boolean | null;
  college: unknown;
  jobsRaw: unknown;
  schoolsRaw: unknown;
  educationLevel: string | null;
  ageFilterMin: number;
  ageFilterMax: number;
  interestedIn: string;
  interestedInStr: string;
  genderFilter: string;
  genderFilterStr: string;
  swipestatsVersion: string;
  firstDayOnApp: Date;
  lastDayOnApp: Date;
  daysInProfilePeriod: number;
  createdAt: Date;
  updatedAt: Date;
  computed: boolean;
}

export interface MigrateDataOptions {
  profileLimit?: number;
  dryRun?: boolean;
}

export interface MigrateDataResult {
  stats: Record<string, number>;
  profiles: SelectedProfile[];
}

// ---- UTILITIES ----------------------------------------------------

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

async function batchInsert<T>(
  tableName: string,
  items: T[],
  insertFn: (batch: T[]) => Promise<void>,
  dryRun = false,
) {
  if (items.length === 0) {
    log(`Skip ${tableName} - no records to migrate`);
    return;
  }

  log(`Migrating ${items.length.toLocaleString()} ${tableName} records...`);

  if (dryRun) {
    log(`   [DRY RUN] Would insert ${items.length.toLocaleString()} records`);
    return;
  }

  const startTime = Date.now();
  const totalBatches = Math.ceil(items.length / BATCH_SIZE);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await insertFn(batch);

    const progress = Math.min(i + BATCH_SIZE, items.length);
    const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
    const elapsed = Date.now() - startTime;
    const avgTimePerBatch = elapsed / currentBatch;
    const remainingBatches = totalBatches - currentBatch;
    const estimatedRemaining = remainingBatches * avgTimePerBatch;

    if (totalBatches > 1) {
      log(
        `   Batch ${currentBatch}/${totalBatches}: ${progress.toLocaleString()}/${items.length.toLocaleString()}${estimatedRemaining > 0 ? ` (est. ${formatDuration(estimatedRemaining)} remaining)` : ""}`,
      );
    } else {
      log(
        `   Progress: ${progress.toLocaleString()}/${items.length.toLocaleString()}`,
      );
    }
  }

  const totalDuration = Date.now() - startTime;
  log(`Completed ${tableName} migration in ${formatDuration(totalDuration)}`);
}

type NeonSql = any;

type DrizzleDb = any;

// ---- MIGRATION FUNCTIONS ------------------------------------------

async function selectProfiles(
  oldSql: NeonSql,
  profileLimit: number,
): Promise<{
  profiles: SelectedProfile[];
  tinderIds: string[];
  userIds: string[];
}> {
  log("Selecting profiles to migrate...");

  const profilesRaw = (await oldSql`
    SELECT "tinderId", "userId", "createdAt", "lastDayOnApp"
    FROM "TinderProfile"
    ORDER BY "createdAt" DESC
    LIMIT ${profileLimit}
  `) as Array<{
    tinderId: string;
    userId: string;
    createdAt: string | Date;
    lastDayOnApp: string | Date;
  }>;

  const profiles: SelectedProfile[] = profilesRaw.map((p) => ({
    tinderId: p.tinderId,
    userId: p.userId,
    createdAt:
      p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
    lastDayOnApp:
      p.lastDayOnApp instanceof Date
        ? p.lastDayOnApp
        : new Date(p.lastDayOnApp),
  }));

  const tinderIds = profiles.map((p) => p.tinderId);
  const userIds = [...new Set(profiles.map((p) => p.userId))];

  if (profiles.length > 0) {
    const oldestDate = profiles[profiles.length - 1]?.createdAt;
    const newestDate = profiles[0]?.createdAt;
    log(`   Selected ${profiles.length} profiles`);
    log(
      `   Date range: ${oldestDate?.toISOString().split("T")[0]} to ${newestDate?.toISOString().split("T")[0]}`,
    );
    log(`   Unique users: ${userIds.length}`);
  } else {
    log("   No profiles found!");
  }

  return { profiles, tinderIds, userIds };
}

async function migrateSyntheticUsers(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  userIds: string[],
  dryRun: boolean,
) {
  log("\n=== Creating Synthetic Users ===");

  if (userIds.length === 0) {
    log("Skip - No users to create");
    return 0;
  }

  const userDataRaw = (await oldSql`
    SELECT DISTINCT "userId", MIN("createdAt") as "createdAt"
    FROM "TinderProfile"
    WHERE "userId" = ANY(${userIds}::text[])
    GROUP BY "userId"
  `) as Array<{ userId: string; createdAt: string | Date }>;

  const userData = userDataRaw.map((u) => ({
    userId: u.userId,
    createdAt: toDate(u.createdAt)!,
  }));

  const syntheticUsers = userData.map((u) => ({
    id: u.userId,
    name: "Anonymous User",
    email: null,
    emailVerified: false,
    image: null,
    username: null,
    displayUsername: null,
    isAnonymous: true,
    role: "user",
    banned: false,
    banReason: null,
    banExpires: null,
    activeOnTinder: true,
    activeOnHinge: false,
    activeOnBumble: false,
    activeOnHappn: false,
    activeOnOther: false,
    otherDatingApps: null,
    currentHotness: null,
    currentHappiness: null,
    timeZone: null,
    country: null,
    firstStartedWithDatingApps: null,
    happinessHistory: [],
    hotnessHistory: [],
    locationHistory: [],
    pastDatingApps: [],
    relationshipHistory: [],
    swipestatsTier: "FREE" as const,
    createdAt: u.createdAt,
    updatedAt: u.createdAt,
  }));

  await batchInsert(
    "User",
    syntheticUsers,
    async (batch) => {
      await newDb.insert(schema.userTable).values(batch).onConflictDoNothing();
    },
    dryRun,
  );

  return syntheticUsers.length;
}

async function migrateTinderProfiles(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  tinderIds: string[],
  dryRun: boolean,
) {
  log("\n=== Migrating Tinder Profiles ===");

  if (tinderIds.length === 0) {
    log("Skip - No profiles to migrate");
    return 0;
  }

  const profiles = (await oldSql`
    SELECT * FROM "TinderProfile"
    WHERE "tinderId" = ANY(${tinderIds}::text[])
    ORDER BY "createdAt"
  `) as OldTinderProfile[];

  const mappedProfiles = profiles.map((p) => ({
    computed: p.computed,
    tinderId: p.tinderId,
    createdAt: toDate(p.createdAt)!,
    updatedAt: toDate(p.updatedAt)!,
    birthDate: toDate(p.birthDate)!,
    ageAtUpload: p.ageAtUpload,
    ageAtLastUsage: p.ageAtLastUsage,
    createDate: toDate(p.createDate)!,
    activeTime: toDate(p.activeTime),
    gender: p.gender as schema.Gender,
    genderStr: p.genderStr,
    bio: p.bio,
    bioOriginal: p.bioOriginal,
    city: p.city,
    country: p.country,
    region: p.region,
    userInterests: p.user_interests,
    interests: p.interests,
    sexualOrientations: p.sexual_orientations,
    descriptors: p.descriptors,
    instagramConnected: p.instagramConnected,
    spotifyConnected: p.spotifyConnected,
    jobTitle: p.jobTitle,
    jobTitleDisplayed: p.jobTitleDisplayed ?? false,
    company: p.company,
    companyDisplayed: p.companyDisplayed ?? false,
    school: p.school,
    schoolDisplayed: p.schoolDisplayed ?? false,
    college: p.college,
    jobsRaw: p.jobsRaw,
    schoolsRaw: p.schoolsRaw,
    educationLevel: p.educationLevel,
    ageFilterMin: p.ageFilterMin,
    ageFilterMax: p.ageFilterMax,
    interestedIn: p.interestedIn as schema.Gender,
    interestedInStr: p.interestedInStr,
    genderFilter: p.genderFilter as schema.Gender,
    genderFilterStr: p.genderFilterStr,
    swipestatsVersion: p.swipestatsVersion as schema.SwipestatsVersion,
    userId: p.userId,
    firstDayOnApp: toDate(p.firstDayOnApp)!,
    lastDayOnApp: toDate(p.lastDayOnApp)!,
    daysInProfilePeriod: p.daysInProfilePeriod,
  }));

  await batchInsert(
    "TinderProfile",
    mappedProfiles,
    async (batch) => {
      await newDb
        .insert(schema.tinderProfileTable)
        .values(batch)
        .onConflictDoNothing();
    },
    dryRun,
  );

  return profiles.length;
}

async function migrateJobs(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  tinderIds: string[],
  dryRun: boolean,
) {
  log("\n=== Migrating Jobs ===");

  if (tinderIds.length === 0) {
    log("Skip - No profiles to migrate jobs for");
    return 0;
  }

  const jobs = (await oldSql`
    SELECT * FROM "Job"
    WHERE "tinderProfileId" = ANY(${tinderIds}::text[])
  `) as any[];

  await batchInsert(
    "Job",
    jobs,
    async (batch) => {
      await newDb.insert(schema.jobTable).values(batch).onConflictDoNothing();
    },
    dryRun,
  );

  return jobs.length;
}

async function migrateSchools(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  tinderIds: string[],
  dryRun: boolean,
) {
  log("\n=== Migrating Schools ===");

  if (tinderIds.length === 0) {
    log("Skip - No profiles to migrate schools for");
    return 0;
  }

  const schools = (await oldSql`
    SELECT * FROM "School"
    WHERE "tinderProfileId" = ANY(${tinderIds}::text[])
  `) as any[];

  const mapped = schools.map((s) => ({
    ...s,
    metadataId: s.metadata_id,
  }));

  await batchInsert(
    "School",
    mapped,
    async (batch) => {
      await newDb
        .insert(schema.schoolTable)
        .values(batch)
        .onConflictDoNothing();
    },
    dryRun,
  );

  return schools.length;
}

async function migrateMatches(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  tinderIds: string[],
  dryRun: boolean,
): Promise<string[]> {
  log("\n=== Migrating Matches ===");

  if (tinderIds.length === 0) {
    log("Skip - No profiles to migrate matches for");
    return [];
  }

  const MATCH_QUERY_BATCH = 100;
  const allMatches: any[] = [];

  log(`   Querying matches in batches of ${MATCH_QUERY_BATCH} profiles...`);

  for (let i = 0; i < tinderIds.length; i += MATCH_QUERY_BATCH) {
    const tinderBatch = tinderIds.slice(i, i + MATCH_QUERY_BATCH);
    const matches = (await oldSql`
      SELECT * FROM "Match"
      WHERE "tinderProfileId" = ANY(${tinderBatch}::text[])
      ORDER BY "tinderProfileId", "order"
    `) as any[];

    allMatches.push(...matches);

    const progress = Math.min(i + MATCH_QUERY_BATCH, tinderIds.length);
    log(
      `   Queried ${progress}/${tinderIds.length} profiles (${matches.length} matches found, ${allMatches.length} total)`,
    );
  }

  log(`   Found ${allMatches.length} total matches to migrate`);

  const mapped = allMatches.map((m) => ({
    ...m,
    initialMessageAt: toDate(m.initialMessageAt),
    lastMessageAt: toDate(m.lastMessageAt),
    likedAt: toDate(m.likedAt),
  }));

  await batchInsert(
    "Match",
    mapped,
    async (batch) => {
      await newDb.insert(schema.matchTable).values(batch).onConflictDoNothing();
    },
    dryRun,
  );

  return allMatches.map((m) => m.id);
}

async function migrateMessages(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  matchIds: string[],
  dryRun: boolean,
) {
  log("\n=== Migrating Messages ===");

  if (matchIds.length === 0) {
    log("Skip - No matches to migrate messages for");
    return 0;
  }

  const allMessages: any[] = [];

  log(`   Querying messages in batches of ${MESSAGE_QUERY_BATCH} matches...`);

  for (let i = 0; i < matchIds.length; i += MESSAGE_QUERY_BATCH) {
    const matchBatch = matchIds.slice(i, i + MESSAGE_QUERY_BATCH);
    const messages = (await oldSql`
      SELECT m.* FROM "Message" m
      WHERE m."matchId" = ANY(${matchBatch}::text[])
        AND m."tinderProfileId" IS NOT NULL
      ORDER BY m."sentDate"
    `) as any[];

    allMessages.push(...messages);

    const progress = Math.min(i + MESSAGE_QUERY_BATCH, matchIds.length);
    log(
      `   Queried ${progress}/${matchIds.length} matches (${messages.length} messages found)`,
    );
  }

  log(`   Found ${allMessages.length} total messages to migrate`);

  const mapped = allMessages.map((m) => ({
    ...m,
    sentDate: toDate(m.sentDate)!,
  }));

  await batchInsert(
    "Message",
    mapped,
    async (batch) => {
      await newDb
        .insert(schema.messageTable)
        .values(batch)
        .onConflictDoNothing();
    },
    dryRun,
  );

  return allMessages.length;
}

async function migrateMedia(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  tinderIds: string[],
  dryRun: boolean,
) {
  log("\n=== Migrating Media ===");

  if (tinderIds.length === 0) {
    log("Skip - No profiles to migrate media for");
    return 0;
  }

  const MEDIA_QUERY_BATCH = 500;
  const allMedia: any[] = [];

  log(`   Querying media in batches of ${MEDIA_QUERY_BATCH} profiles...`);

  for (let i = 0; i < tinderIds.length; i += MEDIA_QUERY_BATCH) {
    const tinderBatch = tinderIds.slice(i, i + MEDIA_QUERY_BATCH);
    const media = (await oldSql`
      SELECT * FROM "Media"
      WHERE "tinderProfileId" = ANY(${tinderBatch}::text[])
    `) as any[];

    allMedia.push(...media);

    const progress = Math.min(i + MEDIA_QUERY_BATCH, tinderIds.length);
    if (i % (MEDIA_QUERY_BATCH * 5) === 0 || progress === tinderIds.length) {
      log(
        `   Queried ${progress}/${tinderIds.length} profiles (${allMedia.length} media items)`,
      );
    }
  }

  log(`   Found ${allMedia.length} total media items to migrate`);

  await batchInsert(
    "Media",
    allMedia,
    async (batch) => {
      await newDb.insert(schema.mediaTable).values(batch).onConflictDoNothing();
    },
    dryRun,
  );

  return allMedia.length;
}

async function migrateTinderUsage(
  oldSql: NeonSql,
  newDb: DrizzleDb,
  tinderIds: string[],
  dryRun: boolean,
) {
  log("\n=== Migrating Tinder Usage ===");

  if (tinderIds.length === 0) {
    log("Skip - No profiles to migrate usage for");
    return 0;
  }

  const USAGE_QUERY_BATCH = 50;
  const allUsage: any[] = [];

  log(`   Querying usage in batches of ${USAGE_QUERY_BATCH} profiles...`);

  for (let i = 0; i < tinderIds.length; i += USAGE_QUERY_BATCH) {
    const tinderBatch = tinderIds.slice(i, i + USAGE_QUERY_BATCH);
    const usage = (await oldSql`
      SELECT * FROM "TinderUsage"
      WHERE "tinderProfileId" = ANY(${tinderBatch}::text[])
      ORDER BY "dateStamp"
    `) as any[];

    allUsage.push(...usage);

    const progress = Math.min(i + USAGE_QUERY_BATCH, tinderIds.length);
    if (i % (USAGE_QUERY_BATCH * 5) === 0 || progress === tinderIds.length) {
      log(
        `   Queried ${progress}/${tinderIds.length} profiles (${allUsage.length} usage records)`,
      );
    }
  }

  log(`   Found ${allUsage.length} total usage records to migrate`);

  const mapped = allUsage.map((u) => ({
    ...u,
    dateStamp: toDate(u.dateStamp)!,
  }));

  await batchInsert(
    "TinderUsage",
    mapped,
    async (batch) => {
      await newDb
        .insert(schema.tinderUsageTable)
        .values(batch)
        .onConflictDoNothing();
    },
    dryRun,
  );

  return allUsage.length;
}

// ---- MAIN EXPORT --------------------------------------------------

export async function migrateData(
  options?: MigrateDataOptions,
): Promise<MigrateDataResult> {
  const profileLimit =
    options?.profileLimit ?? parseInt(process.env.PROFILE_LIMIT || "99999", 10);
  const dryRun = options?.dryRun ?? process.env.DRY_RUN === "true";

  // Validate environment
  if (!process.env.OLD_DATABASE_URL) {
    throw new Error("OLD_DATABASE_URL environment variable is required");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const oldSql = neon(process.env.OLD_DATABASE_URL);
  const newSql = neon(process.env.DATABASE_URL);
  const newDb = drizzle({
    client: newSql,
    schema,
    casing: "snake_case",
  });

  printHeader("SwipeStats V4: Data Migration");

  if (dryRun) {
    printWarning("DRY RUN MODE - No data will be written\n");
  }

  const startTime = Date.now();
  const stats: Record<string, number> = {};

  // Phase 0: Select profiles to migrate
  const { profiles, tinderIds, userIds } = await selectProfiles(
    oldSql,
    profileLimit,
  );

  if (profiles.length === 0) {
    log("No profiles selected. Exiting.");
    return { stats, profiles: [] };
  }

  // Phase 1: Create minimal users (just for FK constraints)
  stats.users = await migrateSyntheticUsers(oldSql, newDb, userIds, dryRun);

  // Phase 2: Core profile data
  stats.tinderProfiles = await migrateTinderProfiles(
    oldSql,
    newDb,
    tinderIds,
    dryRun,
  );

  // Phase 3: Skip original files (HTTP size limit)
  log("\n=== Migrating Original Anonymized Files ===");
  log("Skip: Files can exceed 64MB HTTP limit");
  stats.originalAnonymizedFiles = 0;

  // Phase 4: Profile metadata
  stats.jobs = await migrateJobs(oldSql, newDb, tinderIds, dryRun);
  stats.schools = await migrateSchools(oldSql, newDb, tinderIds, dryRun);

  // Phase 5: Matches (needed before messages)
  const matchIds = await migrateMatches(oldSql, newDb, tinderIds, dryRun);
  stats.matches = matchIds.length;

  // Phase 6: Messages and media
  stats.messages = await migrateMessages(oldSql, newDb, matchIds, dryRun);
  stats.media = await migrateMedia(oldSql, newDb, tinderIds, dryRun);

  // Phase 7: Usage data
  stats.tinderUsage = await migrateTinderUsage(
    oldSql,
    newDb,
    tinderIds,
    dryRun,
  );

  const duration = Date.now() - startTime;
  const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);

  printHeader("Data Migration Complete!");
  console.log(`Total time: ${formatDuration(duration)}\n`);
  console.log("Records migrated:");
  Object.entries(stats).forEach(([table, count]) => {
    console.log(`   ${table.padEnd(30)} ${count.toLocaleString()}`);
  });
  console.log(`\nTotal records: ${totalRecords.toLocaleString()}`);

  if (profiles.length > 0) {
    const oldestProfile = profiles[profiles.length - 1];
    const newestProfile = profiles[0];
    if (oldestProfile && newestProfile) {
      console.log(`\nProfile date range:`);
      console.log(
        `   Oldest: ${oldestProfile.createdAt.toISOString().split("T")[0]}`,
      );
      console.log(
        `   Newest: ${newestProfile.createdAt.toISOString().split("T")[0]}`,
      );
    }
  }

  printSuccess("Data migration complete!");

  return { stats, profiles };
}

// ---- STANDALONE EXECUTION -----------------------------------------

if (import.meta.main) {
  migrateData()
    .then(() => {
      console.log("\nScript completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nMigration failed:", error);
      process.exit(1);
    });
}
