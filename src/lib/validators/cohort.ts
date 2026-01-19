import { z } from "zod";
import { dataProviderEnum, genderEnum } from "@/server/db/schema";

/**
 * Cohort validators
 *
 * Zod schemas for cohort filtering and custom cohort creation.
 */

// Schema for custom cohort filters
export const cohortFilterSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  dataProvider: z.enum(dataProviderEnum.enumValues).optional(),
  gender: z.enum(genderEnum.enumValues).optional(),
  ageMin: z.number().int().min(18).max(99).optional(),
  ageMax: z.number().int().min(18).max(99).optional(),
  country: z.string().length(2).optional(),
  region: z.string().optional(),
});

export type CohortFilter = z.infer<typeof cohortFilterSchema>;
