/**
 * Cohort Service
 *
 * CRUD operations for cohort definitions and stats
 */

import { eq, and, asc } from "drizzle-orm";
import { db } from "@/server/db";
import {
  cohortDefinitionTable,
  cohortStatsTable,
  type CohortDefinition,
  type CohortDefinitionInsert,
  type CohortStats,
  type CohortStatsInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";

// ---- COHORT DEFINITION OPERATIONS --------------------------------

/**
 * Get a cohort definition by ID
 */
export async function getCohortDefinition(
  cohortId: string,
): Promise<CohortDefinition | null> {
  const cohort = await db.query.cohortDefinitionTable.findFirst({
    where: eq(cohortDefinitionTable.id, cohortId),
  });
  return cohort ?? null;
}

/**
 * Get all system cohorts
 */
export async function getSystemCohorts(): Promise<CohortDefinition[]> {
  return db.query.cohortDefinitionTable.findMany({
    where: eq(cohortDefinitionTable.type, "SYSTEM"),
    orderBy: (cohorts, { asc }) => [asc(cohorts.name)],
  });
}

/**
 * Get all cohorts created by a user
 */
export async function getUserCohorts(
  userId: string,
): Promise<CohortDefinition[]> {
  return db.query.cohortDefinitionTable.findMany({
    where: and(
      eq(cohortDefinitionTable.type, "USER_CUSTOM"),
      eq(cohortDefinitionTable.createdByUserId, userId),
    ),
    orderBy: (cohorts, { desc }) => [desc(cohorts.createdAt)],
  });
}

/**
 * Create a new custom cohort
 */
export async function createCustomCohort(
  userId: string,
  data: Omit<
    CohortDefinitionInsert,
    | "id"
    | "type"
    | "createdByUserId"
    | "profileCount"
    | "lastComputedAt"
    | "createdAt"
    | "updatedAt"
  >,
): Promise<CohortDefinition> {
  const cohortId = createId("cohort");

  const [cohort] = await db
    .insert(cohortDefinitionTable)
    .values({
      ...data,
      id: cohortId,
      type: "USER_CUSTOM",
      createdByUserId: userId,
      profileCount: 0,
    })
    .returning();

  if (!cohort) {
    throw new Error("Failed to create custom cohort");
  }

  return cohort;
}

/**
 * Update cohort metadata (profile count, last computed time)
 */
export async function updateCohortMetadata(
  cohortId: string,
  data: { profileCount?: number; lastComputedAt?: Date },
): Promise<void> {
  await db
    .update(cohortDefinitionTable)
    .set(data)
    .where(eq(cohortDefinitionTable.id, cohortId));
}

/**
 * Delete a custom cohort (only the owner can delete)
 */
export async function deleteCustomCohort(
  cohortId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(cohortDefinitionTable)
    .where(
      and(
        eq(cohortDefinitionTable.id, cohortId),
        eq(cohortDefinitionTable.type, "USER_CUSTOM"),
        eq(cohortDefinitionTable.createdByUserId, userId),
      ),
    );

  return result.rowCount ? result.rowCount > 0 : false;
}

// ---- COHORT STATS OPERATIONS -------------------------------------

/**
 * Get stats for a cohort
 */
export async function getCohortStats(
  cohortId: string,
  period = "all-time",
): Promise<CohortStats | null> {
  const stats = await db.query.cohortStatsTable.findFirst({
    where: and(
      eq(cohortStatsTable.cohortId, cohortId),
      eq(cohortStatsTable.period, period),
    ),
    orderBy: (stats, { desc }) => [desc(stats.computedAt)],
  });
  return stats ?? null;
}

/**
 * Get available periods for a cohort
 */
export async function getAvailablePeriodsForCohort(
  cohortId: string,
): Promise<string[]> {
  const stats = await db
    .select({ period: cohortStatsTable.period })
    .from(cohortStatsTable)
    .where(eq(cohortStatsTable.cohortId, cohortId))
    .orderBy(asc(cohortStatsTable.periodStart));

  return stats.map((s) => s.period);
}

/**
 * Upsert cohort stats
 */
export async function upsertCohortStats(
  cohortId: string,
  stats: Omit<
    CohortStatsInsert,
    "id" | "cohortId" | "computedAt" | "computeVersion"
  >,
): Promise<CohortStats> {
  // Check if stats already exist
  const existing = await db.query.cohortStatsTable.findFirst({
    where: eq(cohortStatsTable.cohortId, cohortId),
  });

  if (existing) {
    // Update existing stats
    const [updated] = await db
      .update(cohortStatsTable)
      .set({
        ...stats,
        computedAt: new Date(),
      })
      .where(eq(cohortStatsTable.id, existing.id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to update stats for cohort ${cohortId}`);
    }

    return updated;
  } else {
    // Insert new stats
    const [inserted] = await db
      .insert(cohortStatsTable)
      .values({
        ...stats,
        cohortId,
        computedAt: new Date(),
      })
      .returning();

    if (!inserted) {
      throw new Error(`Failed to insert stats for cohort ${cohortId}`);
    }

    return inserted;
  }
}

/**
 * Get relevant cohorts for a profile
 * Returns cohorts that match the profile's characteristics
 */
export async function getRelevantCohortsForProfile(params: {
  dataProvider: "TINDER" | "HINGE";
  gender: "MALE" | "FEMALE" | "OTHER";
  age: number;
  country?: string | null;
}): Promise<CohortDefinition[]> {
  const cohorts: CohortDefinition[] = [];

  // Always include global gender cohort (no "_global" suffix in new system)
  const globalCohortId = `${params.dataProvider.toLowerCase()}_${params.gender.toLowerCase()}`;
  const globalCohort = await getCohortDefinition(globalCohortId);
  if (globalCohort) {
    cohorts.push(globalCohort);
  }

  // Add age bracket cohort if applicable
  let ageBracketId: string | null = null;
  if (params.age >= 18 && params.age <= 24) {
    ageBracketId = `${params.dataProvider.toLowerCase()}_${params.gender.toLowerCase()}_18-24`;
  } else if (params.age >= 25 && params.age <= 34) {
    ageBracketId = `${params.dataProvider.toLowerCase()}_${params.gender.toLowerCase()}_25-34`;
  } else if (params.age >= 35) {
    // New system: 35+ cohort has no gender suffix
    ageBracketId = `${params.dataProvider.toLowerCase()}_35plus`;
  }

  if (ageBracketId) {
    const ageCohort = await getCohortDefinition(ageBracketId);
    if (ageCohort) {
      cohorts.push(ageCohort);
    }
  }

  // Add country cohort if available (country cohorts not in simplified v1)
  if (params.country) {
    const countryCohortId = `${params.dataProvider.toLowerCase()}_${params.gender.toLowerCase()}_${params.country.toLowerCase()}`;
    const countryCohort = await getCohortDefinition(countryCohortId);
    if (countryCohort) {
      cohorts.push(countryCohort);
    }
  }

  return cohorts;
}
