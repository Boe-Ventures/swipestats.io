/**
 * Seed Cohorts Step
 *
 * Creates the initial set of system cohorts for demographic comparisons.
 *
 * Usage (standalone):
 *   bun run src/scripts/migration/steps/seed-cohorts.ts
 *
 * Usage (as module):
 *   import { seedCohorts } from "./steps/seed-cohorts";
 *   await seedCohorts();
 */

import { db } from "@/server/db";
import {
  cohortDefinitionTable,
  type CohortDefinitionInsert,
} from "@/server/db/schema";
import { printHeader, printSuccess } from "../utils/cli";

const systemCohorts: CohortDefinitionInsert[] = [
  // === BASIC COHORTS ===
  {
    id: "tinder_all",
    name: "Everyone",
    description: "All Tinder users",
    dataProvider: "TINDER",
    gender: null,
    ageMin: null,
    ageMax: null,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_male",
    name: "Men",
    description: "All Tinder men",
    dataProvider: "TINDER",
    gender: "MALE",
    ageMin: null,
    ageMax: null,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_female",
    name: "Women",
    description: "All Tinder women",
    dataProvider: "TINDER",
    gender: "FEMALE",
    ageMin: null,
    ageMax: null,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },

  // === AGE BRACKET COHORTS ===
  {
    id: "tinder_male_18-24",
    name: "Men 18-24",
    description: "Tinder men aged 18-24",
    dataProvider: "TINDER",
    gender: "MALE",
    ageMin: 18,
    ageMax: 24,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_male_25-34",
    name: "Men 25-34",
    description: "Tinder men aged 25-34",
    dataProvider: "TINDER",
    gender: "MALE",
    ageMin: 25,
    ageMax: 34,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_female_18-24",
    name: "Women 18-24",
    description: "Tinder women aged 18-24",
    dataProvider: "TINDER",
    gender: "FEMALE",
    ageMin: 18,
    ageMax: 24,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_female_25-34",
    name: "Women 25-34",
    description: "Tinder women aged 25-34",
    dataProvider: "TINDER",
    gender: "FEMALE",
    ageMin: 25,
    ageMax: 34,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_male_35-44",
    name: "Men 35-44",
    description: "Tinder men aged 35-44",
    dataProvider: "TINDER",
    gender: "MALE",
    ageMin: 35,
    ageMax: 44,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_female_35-44",
    name: "Women 35-44",
    description: "Tinder women aged 35-44",
    dataProvider: "TINDER",
    gender: "FEMALE",
    ageMin: 35,
    ageMax: 44,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_male_45plus",
    name: "Men 45+",
    description: "Tinder men aged 45 and above",
    dataProvider: "TINDER",
    gender: "MALE",
    ageMin: 45,
    ageMax: null,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_female_45plus",
    name: "Women 45+",
    description: "Tinder women aged 45 and above",
    dataProvider: "TINDER",
    gender: "FEMALE",
    ageMin: 45,
    ageMax: null,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
  {
    id: "tinder_35plus",
    name: "35+",
    description: "Tinder users aged 35 and above",
    dataProvider: "TINDER",
    gender: null,
    ageMin: 35,
    ageMax: null,
    country: null,
    region: null,
    type: "SYSTEM",
    createdByUserId: null,
  },
];

export async function seedCohorts(): Promise<void> {
  printHeader("Seeding System Cohorts");

  console.log(
    `Preparing to insert ${systemCohorts.length} system cohorts...\n`,
  );

  try {
    // Insert all cohorts
    await db
      .insert(cohortDefinitionTable)
      .values(systemCohorts)
      .onConflictDoNothing();

    console.log(`Successfully seeded ${systemCohorts.length} cohorts!\n`);

    // Print summary
    console.log("Summary:");
    console.log("  - 3 basic cohorts (All, Men, Women)");
    console.log("  - 9 age bracket cohorts:");
    console.log("    - 18-24 (Men & Women)");
    console.log("    - 25-34 (Men & Women)");
    console.log("    - 35-44 (Men & Women)");
    console.log("    - 45+ (Men & Women)");
    console.log("    - 35+ (All genders)");
    console.log(`  Total: ${systemCohorts.length} cohorts\n`);

    printSuccess("Cohort seeding complete!");
  } catch (error) {
    console.error("Error seeding cohorts:", error);
    throw error;
  }
}

// ---- STANDALONE EXECUTION -----------------------------------------

if (import.meta.main) {
  seedCohorts()
    .then(() => {
      console.log("\nScript completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nFatal error:", error);
      process.exit(1);
    });
}
