/**
 * Query Service
 *
 * Profile filtering for cohort membership
 */

import { and, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import {
  tinderProfileTable,
  hingeProfileTable,
  userTable,
  profileMetaTable,
  type CohortDefinition,
  type TinderProfile,
  type HingeProfile,
} from "@/server/db/schema";

/**
 * Query profiles that match a cohort's filters
 * Returns profiles with their global profile meta
 */
export async function queryProfilesForCohort(cohort: CohortDefinition): Promise<
  Array<{
    profile: TinderProfile | HingeProfile;
    userId: string;
    userCountry: string | null;
    userRegion: string | null;
    userContinent: string | null;
    profileMeta: typeof profileMetaTable.$inferSelect;
  }>
> {
  // Data provider filter
  if (cohort.dataProvider === "TINDER") {
    return queryTinderProfilesForCohort(cohort);
  } else if (cohort.dataProvider === "HINGE") {
    return queryHingeProfilesForCohort(cohort);
  }

  throw new Error(`Unsupported data provider: ${cohort.dataProvider}`);
}

/**
 * Query Tinder profiles for a cohort
 */
async function queryTinderProfilesForCohort(cohort: CohortDefinition): Promise<
  Array<{
    profile: TinderProfile;
    userId: string;
    userCountry: string | null;
    userRegion: string | null;
    userContinent: string | null;
    profileMeta: typeof profileMetaTable.$inferSelect;
  }>
> {
  const conditions: SQL[] = [eq(tinderProfileTable.computed, false)];

  // Gender filter
  if (cohort.gender) {
    conditions.push(eq(tinderProfileTable.gender, cohort.gender));
  }

  // Age filter (using ageAtLastUsage)
  if (cohort.ageMin !== null) {
    conditions.push(gte(tinderProfileTable.ageAtLastUsage, cohort.ageMin));
  }
  if (cohort.ageMax !== null) {
    conditions.push(lte(tinderProfileTable.ageAtLastUsage, cohort.ageMax));
  }

  // Query profiles with user data
  const profiles = await db
    .select({
      profile: tinderProfileTable,
      user: userTable,
    })
    .from(tinderProfileTable)
    .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
    .where(and(...conditions));

  // Apply geography filters in memory (user table)
  let filteredProfiles = profiles;

  if (cohort.country) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.user.country === cohort.country,
    );
  }

  if (cohort.region) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.user.region === cohort.region,
    );
  }

  // Fetch profile meta for each profile (simplified: 1 per profile)
  const tinderIds = filteredProfiles.map((p) => p.profile.tinderId);

  if (tinderIds.length === 0) {
    return [];
  }

  const metaMap = new Map<string, typeof profileMetaTable.$inferSelect>();

  for (const tinderId of tinderIds) {
    const meta = await db.query.profileMetaTable.findFirst({
      where: eq(profileMetaTable.tinderProfileId, tinderId),
    });
    if (meta) {
      metaMap.set(tinderId, meta);
    }
  }

  // Combine results
  return filteredProfiles
    .map((p) => {
      const meta = metaMap.get(p.profile.tinderId);
      if (!meta) return null;

      return {
        profile: p.profile,
        userId: p.user.id,
        userCountry: p.user.country,
        userRegion: p.user.region,
        userContinent: p.user.continent,
        profileMeta: meta,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

/**
 * Query Hinge profiles for a cohort
 */
async function queryHingeProfilesForCohort(cohort: CohortDefinition): Promise<
  Array<{
    profile: HingeProfile;
    userId: string;
    userCountry: string | null;
    userRegion: string | null;
    userContinent: string | null;
    profileMeta: typeof profileMetaTable.$inferSelect;
  }>
> {
  const conditions: SQL[] = [];

  // Gender filter
  if (cohort.gender) {
    conditions.push(eq(hingeProfileTable.gender, cohort.gender));
  }

  // Age filter (using ageAtUpload)
  if (cohort.ageMin !== null) {
    conditions.push(gte(hingeProfileTable.ageAtUpload, cohort.ageMin));
  }
  if (cohort.ageMax !== null) {
    conditions.push(lte(hingeProfileTable.ageAtUpload, cohort.ageMax));
  }

  // Query profiles with user data
  const profiles = await db
    .select({
      profile: hingeProfileTable,
      user: userTable,
    })
    .from(hingeProfileTable)
    .innerJoin(userTable, eq(hingeProfileTable.userId, userTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Apply geography filters
  let filteredProfiles = profiles;

  if (cohort.country) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.user.country === cohort.country,
    );
  }

  if (cohort.region) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.user.region === cohort.region,
    );
  }

  // Fetch profile meta for each profile
  const hingeIds = filteredProfiles.map((p) => p.profile.hingeId);

  if (hingeIds.length === 0) {
    return [];
  }

  const metaMap = new Map<string, typeof profileMetaTable.$inferSelect>();

  for (const hingeId of hingeIds) {
    const meta = await db.query.profileMetaTable.findFirst({
      where: eq(profileMetaTable.hingeProfileId, hingeId),
    });
    if (meta) {
      metaMap.set(hingeId, meta);
    }
  }

  // Combine results
  return filteredProfiles
    .map((p) => {
      const meta = metaMap.get(p.profile.hingeId);
      if (!meta) return null;

      return {
        profile: p.profile,
        userId: p.user.id,
        userCountry: p.user.country,
        userRegion: p.user.region,
        userContinent: p.user.continent,
        profileMeta: meta,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}
