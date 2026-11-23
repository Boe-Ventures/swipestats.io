import { z } from "zod";

const text = z.string().max(1000);
const prose = z.string().max(30000);
const optionalText = text.nullable().optional();
const rating = z.number().int().min(1).max(10).nullable().optional();
const age = z.number().int().min(0).max(130).nullable().optional();
const strings = z.array(text).max(100).nullable().optional();
const country = z
  .string()
  .regex(/^[A-Z]{2}$/)
  .nullable()
  .optional();
export const recordId = z.string().min(1).max(100);
export const mapUrl = z
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, "Use an HTTP or HTTPS map link")
  .nullable()
  .optional();
export const placeSchema = z.strictObject({
  countryCode: country,
  subdivisionCode: optionalText,
  city: optionalText,
  venueName: optionalText,
  placeId: optionalText,
  placeProvider: optionalText,
  mapUrl,
});
export const timeContextSchema = z.strictObject({
  precision: z
    .enum([
      "exact",
      "day",
      "month",
      "year",
      "approximate",
      "relative",
      "unknown",
    ])
    .optional(),
  timezone: z
    .string()
    .max(100)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid timezone")
    .optional(),
  label: text.optional(),
  relativeToEncounterId: recordId.optional(),
  offsetDays: z.number().int().min(-36500).max(36500).optional(),
  plannedFor: z.iso.datetime({ offset: true }).optional(),
});
export const personFields = z.strictObject({
  displayName: z.string().trim().min(1).max(200),
  aliases: strings,
  tagline: optionalText,
  summary: prose.nullable().optional(),
  labels: strings,
  originCountryCode: country,
  originSubdivisionCode: optionalText,
  originCity: optionalText,
  originPlaceId: optionalText,
  originLabel: optionalText,
  nationalityCodes: z
    .array(z.string().regex(/^[A-Z]{2}$/))
    .max(20)
    .nullable()
    .optional(),
  currentResidenceCountryCode: country,
  currentResidenceSubdivisionCode: optionalText,
  currentResidenceCity: optionalText,
  currentResidencePlaceId: optionalText,
  currentResidenceLabel: optionalText,
  residenceHistory: z
    .array(
      placeSchema.extend({
        label: optionalText,
        from: optionalText,
        to: optionalText,
      }),
    )
    .max(100)
    .nullable()
    .optional(),
  ageAtFirstMeeting: age,
  myAgeAtFirstMeeting: age,
  ageIsEstimated: z.boolean().nullable().optional(),
  myAgeIsEstimated: z.boolean().nullable().optional(),
  ageEstimate: optionalText,
  myAgeEstimate: optionalText,
  firstMetYear: z.number().int().min(1900).max(2200).nullable().optional(),
  occupation: optionalText,
  industry: optionalText,
  sideOccupations: strings,
  workArrangement: z
    .enum(["in_office", "hybrid", "remote"])
    .nullable()
    .optional(),
  remoteRegion: z
    .enum(["americas", "europe_africa", "asia_pacific", "worldwide"])
    .nullable()
    .optional(),
  interests: strings,
  heightCm: z.number().int().min(1).max(300).nullable().optional(),
  appearance: prose.nullable().optional(),
  firstContactMethod: optionalText,
  firstContactInitiator: z
    .enum(["me", "them", "mutual", "unknown"])
    .nullable()
    .optional(),
  firstContactPlatform: optionalText,
  firstContactPlace: placeSchema.nullable().optional(),
  firstContactAt: z.date().nullable().optional(),
  firstContactTimeContext: timeContextSchema
    .omit({ relativeToEncounterId: true, offsetDays: true, plannedFor: true })
    .nullable()
    .optional(),
  lookingFor: optionalText,
  compatibility: rating,
  chemistry: rating,
  overall: rating,
  looks: rating,
  personality: rating,
  humor: rating,
  contactContext: prose.nullable().optional(),
});
export const encounterFields = placeSchema.extend({
  kind: z
    .enum([
      "approach",
      "match",
      "message",
      "call",
      "date",
      "intimate_encounter",
      "other",
    ])
    .nullable()
    .optional(),
  medium: z
    .enum(["in_person", "messaging", "phone", "video"])
    .nullable()
    .optional(),
  platform: optionalText,
  initiator: z.enum(["me", "them", "mutual", "unknown"]).nullable().optional(),
  status: z
    .enum(["planned", "completed", "canceled", "no_show"])
    .nullable()
    .optional(),
  occurredAt: z.date().nullable().optional(),
  timeContext: timeContextSchema.nullable().optional(),
  description: prose.nullable().optional(),
  reflection: prose.nullable().optional(),
  experienceRating: rating,
  chemistry: rating,
  compatibility: rating,
  activities: strings,
  stops: z
    .array(placeSchema.extend({ id: recordId, activities: strings }))
    .max(100)
    .nullable()
    .optional(),
});
export const entryFields = z.strictObject({
  title: optionalText,
  body: z.string().min(1).max(100000),
  sourceKind: z.enum(["typed", "transcript", "import", "summary"]),
  occurrenceContext: timeContextSchema
    .omit({ relativeToEncounterId: true, offsetDays: true, plannedFor: true })
    .nullable()
    .optional(),
});
export const entryLinks = z.strictObject({
  personIds: z.array(recordId).max(100).optional(),
  encounterIds: z.array(recordId).max(100).optional(),
});
export const createKey = z.strictObject({ requestId: z.uuid() });
export const versionedId = z.strictObject({
  id: recordId,
  version: z.number().int().min(1),
});
export const pageInput = z.strictObject({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
export type PersonFields = z.infer<typeof personFields>;
export type EncounterFields = z.infer<typeof encounterFields>;
export type EntryFields = z.infer<typeof entryFields>;
export type TimeContext = z.infer<typeof timeContextSchema>;
export type Place = z.infer<typeof placeSchema>;
