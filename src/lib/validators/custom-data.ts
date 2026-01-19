import { z } from "zod";

/**
 * Custom data validators
 *
 * Zod schemas for custom dating funnel data tracking.
 */

// Reusable integer field validator for dating funnel metrics
const optionalIntField = z.number().int().min(0).optional();

// Custom data upsert schema (dating funnel metrics)
export const customDataUpsertSchema = z.object({
  tinderProfileId: z.string().optional(),
  hingeProfileId: z.string().optional(),
  // Dating funnel metrics (all optional integers)
  messaged: optionalIntField,
  goodConversation: optionalIntField,
  movedToADifferentApp: optionalIntField,
  phoneNumbersExchanged: optionalIntField,
  dateArranged: optionalIntField,
  dateAttended: optionalIntField,
  dateNoShow: optionalIntField,
  dateCreepy: optionalIntField,
  dateNoSpark: optionalIntField,
  onlyOneDate: optionalIntField,
  oneNightStands: optionalIntField,
  multipleDates: optionalIntField,
  sleptWithOnFirstDate: optionalIntField,
  sleptWithEventually: optionalIntField,
  friendsWithBenefits: optionalIntField,
  justFriends: optionalIntField,
  relationshipsStarted: optionalIntField,
  cohabitation: optionalIntField,
  married: optionalIntField,
  divorce: optionalIntField,
});

// Custom data get schema
export const customDataGetSchema = z.object({
  tinderProfileId: z.string().optional(),
  hingeProfileId: z.string().optional(),
});

// Type exports
export type CustomDataUpsert = z.infer<typeof customDataUpsertSchema>;
export type CustomDataGet = z.infer<typeof customDataGetSchema>;
