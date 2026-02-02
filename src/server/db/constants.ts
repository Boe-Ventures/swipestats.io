/**
 * Client-safe constants derived from database enums
 *
 * This file exports const arrays and types that can be safely imported
 * in client code and validators without pulling in database dependencies.
 */

// Import types for compile-time validation
import type { DataProvider, Gender, MessageType } from "./schema";

// Data provider constants
export const DATA_PROVIDERS: DataProvider[] = [
  "TINDER",
  "HINGE",
  "BUMBLE",
  "GRINDER",
  "BADOO",
  "BOO",
  "OK_CUPID",
  "FEELD",
] as const;

// Gender constants
export const GENDERS: Gender[] = [
  "MALE",
  "FEMALE",
  "OTHER",
  "MORE",
  "UNKNOWN",
] as const;

// Message type constants
export const MESSAGE_TYPES: MessageType[] = [
  "TEXT",
  "GIF",
  "GESTURE",
  "ACTIVITY",
  "CONTACT_CARD",
  "OTHER",
] as const;

// Tinder JSON format uses different gender values that map to Gender enum
export const TINDER_JSON_GENDERS = [
  "M",
  "F",
  "Other",
  "More",
  "Unknown",
] as const;

export type TinderJsonGender = (typeof TINDER_JSON_GENDERS)[number];
