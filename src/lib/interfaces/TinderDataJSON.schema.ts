import { z } from "zod";
import { TinderJsonGenderValues } from "./TinderDataJSON";
import { normalizeTinderUsageDateKey } from "../profile.utils";
import {
  isProviderTimestamp,
  parseProviderTimestamp,
} from "../upload/provider-boundary-validation";

// ── Primitives ──────────────────────────────────────────────────────────────

const POSTGRES_INTEGER_MAX = 2_147_483_647;
const usageCountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(POSTGRES_INTEGER_MAX);

const dateValueMapSchema = z
  .record(z.string(), usageCountSchema)
  .transform((value, ctx) => {
    const normalized: Record<string, number> = {};

    for (const [rawDate, count] of Object.entries(value)) {
      let date: string;
      try {
        date = normalizeTinderUsageDateKey(rawDate);
      } catch {
        ctx.addIssue({
          code: "custom",
          path: [rawDate],
          message: "usage keys must be YYYY-MM-DD or ISO timestamps",
        });
        continue;
      }

      if (Object.hasOwn(normalized, date)) {
        ctx.addIssue({
          code: "custom",
          path: [rawDate],
          message: `multiple usage keys resolve to ${date}`,
        });
        continue;
      }

      if (
        !isProviderTimestamp(`${date}T00:00:00.000Z`, {
          allowDateOnly: false,
        })
      ) {
        ctx.addIssue({
          code: "custom",
          path: [rawDate],
          message: "usage date is unreasonably far in the future",
        });
        continue;
      }

      normalized[date] = count;
    }

    return normalized;
  });

function isValidDateString(value: string): boolean {
  // REVIEW(provider assumption): Tinder has historically emitted either ISO
  // timestamps or RFC 1123 message dates. Unknown date grammars are rejected
  // instead of delegated to environment-dependent Date.parse heuristics.
  return isProviderTimestamp(value, {
    allowDateOnly: true,
    allowRfc1123: true,
  });
}

const parseableDateStringSchema = z
  .string()
  .refine(isValidDateString, "must be a valid date");

const tinderJsonGenderSchema = z.enum(TinderJsonGenderValues);

// REVIEW(provider assumption): Tinder's discovery age filters are whole adult
// ages. `age_filter_max = 1000` is a historical provider sentinel meaning no
// practical upper limit (and is present in existing uploads); it is not an age.
const tinderMinimumAgePreferenceSchema = z.number().int().min(18).max(120);
const tinderMaximumAgePreferenceSchema = z.union([
  z.number().int().min(18).max(120),
  z.literal(1000),
]);

// REVIEW(provider assumption): Tinder's exported `to` field is a zero-based,
// provider-local match reference, not a message-direction flag. Historical
// rows reach well beyond 1 and are constant within a thread. The surrounding
// Messages collection contains uploader-authored messages (`from: "You"`).
const tinderMatchReferenceSchema = z
  .number()
  .int()
  .min(0)
  .max(POSTGRES_INTEGER_MAX);

// ── Messages & Matches ──────────────────────────────────────────────────────

export const messageSchema = z
  .object({
    to: tinderMatchReferenceSchema,
    from: z.string(),
    message: z.string().optional(),
    sent_date: parseableDateStringSchema,
    // Tinder adds message types without notice (for example song, sticker,
    // and tombstone). Unknown values are intentionally mapped to OTHER.
    type: z.union([z.string(), z.number()]).optional(),
    fixed_height: z.string().optional(),
  })
  .passthrough();

const anonymizedMessageSchema = z
  .object({
    to: tinderMatchReferenceSchema,
    message: z.string().optional(),
    sent_date: parseableDateStringSchema,
    type: z.union([z.string(), z.number()]).optional(),
    fixed_height: z.string().optional(),
  })
  .strict();

const providerMatchIdSchema = z.string().trim().min(1);

export const tinderJsonMatchSchema = z
  .object({
    match_id: providerMatchIdSchema,
    messages: z.array(messageSchema),
  })
  .passthrough();

const anonymizedTinderJsonMatchSchema = z
  .object({
    match_id: providerMatchIdSchema,
    messages: z.array(anonymizedMessageSchema),
  })
  .strict();

function addDuplicateMatchIdIssues(
  matches: Array<{ match_id: string }>,
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  matches.forEach((match, index) => {
    if (seen.has(match.match_id)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "match_id"],
        message: `duplicate match_id: ${match.match_id}`,
      });
    }
    seen.add(match.match_id);
  });
}

const tinderJsonMatchesSchema = z
  .array(tinderJsonMatchSchema)
  .superRefine(addDuplicateMatchIdIssues);

const anonymizedTinderJsonMatchesSchema = z
  .array(anonymizedTinderJsonMatchSchema)
  .superRefine(addDuplicateMatchIdIssues);

// ── Photos ──────────────────────────────────────────────────────────────────

export const tinderPhotoSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
    type: z.string(),
    url: z.string(),
    updated_at: z.string(),
    selfie_verified: z.boolean().optional(),
    prompt_id: z.string().nullable(),
    prompt_text: z.string().nullable().optional(),
    filename: z.string(),
    fb_id: z.string().optional(),
  })
  .passthrough();

export const photosSchema = z.union([
  z.array(z.string()),
  z.array(tinderPhotoSchema),
]);

const anonymizedTinderPhotoSchema = z
  .object({
    type: z.string().optional(),
    url: z.string().min(1),
    prompt_text: z.string().nullable().optional(),
  })
  .strict();

const anonymizedPhotosSchema = z.union([
  z.array(z.string().min(1)),
  z.array(anonymizedTinderPhotoSchema),
]);

// ── Usage ───────────────────────────────────────────────────────────────────

type TinderUsageCounts = {
  swipes_likes?: Record<string, number>;
  swipes_passes?: Record<string, number>;
};

function addTinderUsageDerivedCountIssues(
  usage: TinderUsageCounts,
  ctx: z.RefinementCtx,
): void {
  const dates = new Set([
    ...Object.keys(usage.swipes_likes ?? {}),
    ...Object.keys(usage.swipes_passes ?? {}),
  ]);

  for (const date of dates) {
    const combined =
      (usage.swipes_likes?.[date] ?? 0) + (usage.swipes_passes?.[date] ?? 0);
    if (combined > POSTGRES_INTEGER_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["swipes_likes", date],
        message: "likes plus passes exceed the database integer range",
      });
    }
  }
}

export const usageSchema = z
  .object({
    app_opens: dateValueMapSchema.refine((obj) => Object.keys(obj).length > 0, {
      message: "app_opens must not be empty",
    }),
    swipes_likes: dateValueMapSchema.optional(),
    swipes_passes: dateValueMapSchema.optional(),
    superlikes: dateValueMapSchema.optional(),
    matches: dateValueMapSchema.optional(),
    messages_sent: dateValueMapSchema.optional(),
    messages_received: dateValueMapSchema.optional(),
    advertising_id: z.record(z.string(), z.string()).optional().default({}),
    idfa: z.record(z.string(), z.string()).optional().default({}),
  })
  .passthrough()
  .superRefine(addTinderUsageDerivedCountIssues);

const anonymizedUsageSchema = z
  .object({
    app_opens: dateValueMapSchema.refine((obj) => Object.keys(obj).length > 0, {
      message: "app_opens must not be empty",
    }),
    swipes_likes: dateValueMapSchema.optional(),
    swipes_passes: dateValueMapSchema.optional(),
    superlikes: dateValueMapSchema.optional(),
    matches: dateValueMapSchema.optional(),
    messages_sent: dateValueMapSchema.optional(),
    messages_received: dateValueMapSchema.optional(),
  })
  .strict()
  .superRefine(addTinderUsageDerivedCountIssues);

// ── User sub-objects ────────────────────────────────────────────────────────

const coordsSchema = z
  .object({
    lat: z.number(),
    lon: z.number(),
  })
  .passthrough();

const citySchema = z
  .object({
    name: z.string(),
    region: z.string().optional(),
    coords: coordsSchema.optional(),
  })
  .passthrough();

const jobSchema = z
  .object({
    company: z
      .object({ displayed: z.boolean(), name: z.string() })
      .passthrough()
      .optional(),
    title: z
      .object({ displayed: z.boolean(), name: z.string() })
      .passthrough()
      .optional(),
  })
  .passthrough();

const schoolSchema = z
  .object({
    displayed: z.boolean(),
    name: z.string(),
  })
  .passthrough();

const posSchema = z
  .object({
    at: z.string().optional(),
    lat: z.number(),
    lon: z.number(),
  })
  .passthrough();

const descriptorSchema = z
  .object({
    name: z.string(),
    choices: z.array(z.string()),
    visibility: z.string(),
  })
  .passthrough();

const anonymizedCitySchema = z
  .object({
    name: z.string(),
    region: z.string().optional(),
  })
  .strict();

const anonymizedJobSchema = z
  .object({
    company: z
      .object({ displayed: z.boolean(), name: z.string() })
      .strict()
      .optional(),
    title: z
      .object({ displayed: z.boolean(), name: z.string() })
      .strict()
      .optional(),
  })
  .strict();

const anonymizedSchoolSchema = z
  .object({ displayed: z.boolean(), name: z.string() })
  .strict();

const anonymizedDescriptorSchema = z
  .object({
    name: z.string(),
    choices: z.array(z.string()),
    visibility: z.string(),
  })
  .strict();

type TinderUserChronology = {
  active_time?: unknown;
  age_filter_min?: number;
  age_filter_max?: number;
  birth_date: string;
  create_date?: string;
};

function addTinderUserChronologyIssues(
  user: TinderUserChronology,
  ctx: z.RefinementCtx,
): void {
  if (
    user.age_filter_min !== undefined &&
    user.age_filter_max !== undefined &&
    user.age_filter_min > user.age_filter_max
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["age_filter_max"],
      message: "must be greater than or equal to age_filter_min",
    });
  }

  if (!user.create_date) return;
  const birthTimestamp = parseProviderTimestamp(user.birth_date, {
    allowDateOnly: true,
    allowRfc1123: true,
  });
  const createTimestamp = parseProviderTimestamp(user.create_date, {
    allowDateOnly: true,
    allowRfc1123: true,
  });
  if (birthTimestamp === null || createTimestamp === null) return;

  if (birthTimestamp > createTimestamp) {
    ctx.addIssue({
      code: "custom",
      path: ["create_date"],
      message: "must not precede birth_date",
    });
  }

  if (typeof user.active_time === "string") {
    const activeTimestamp = parseProviderTimestamp(user.active_time, {
      allowDateOnly: true,
      allowRfc1123: true,
    });
    if (activeTimestamp !== null && activeTimestamp < createTimestamp) {
      ctx.addIssue({
        code: "custom",
        path: ["active_time"],
        message: "must not precede create_date",
      });
    }
  }
}

// ── User schemas ────────────────────────────────────────────────────────────

const tinderUserBaseSchema = z
  .object({
    // Critical required fields
    birth_date: parseableDateStringSchema,
    gender: tinderJsonGenderSchema,
    gender_filter: tinderJsonGenderSchema,
    interested_in: tinderJsonGenderSchema,
    // Discovery preferences are absent from some otherwise usable exports.
    age_filter_min: tinderMinimumAgePreferenceSchema.optional(),
    age_filter_max: tinderMaximumAgePreferenceSchema.optional(),

    // Optional - inferred post-parse from app_opens if missing
    create_date: parseableDateStringSchema.optional(),

    // Optional fields with lenient defaults
    active_time: z.unknown().optional(),
    genders: z.string().optional(),
    gender_extended: z.string().optional(),
    // Tinder emits this unused display label in unstable formats, including
    // "Unknown, Unknown, and Unknown". Discard it while keeping the canonical
    // interested_in and gender_filter fields strict above.
    interested_in_genders: z
      .unknown()
      .optional()
      .transform(() => undefined),
    bio: z.string().optional(),
    city: z.union([citySchema, z.string()]).optional(),
    connection_count: z.number().optional(),
    education: z.string().optional().default(""),
    interests: z.array(z.unknown()).optional(),
    ip_address: z.string().optional().default(""),
    is_traveling: z.boolean().optional().default(false),
    jobs: z.array(jobSchema).optional(),
    pos: posSchema.optional().default({ lat: 0, lon: 0 }),
    schools: z.array(schoolSchema).optional(),
    travel_location_info: z.array(z.unknown()).optional().default([]),
    client_registration_info: z
      .object({
        platform: z.string(),
        app_version: z.number(),
      })
      .passthrough()
      .optional(),
    travel_pos: z
      .object({ lat: z.number(), lon: z.number() })
      .passthrough()
      .optional()
      .default({ lat: 0, lon: 0 }),
    college: z.array(z.unknown()).optional().default([]),
    user_interests: z.array(z.string()).optional(),
    sexual_orientations: z.union([z.array(z.string()), z.string()]).optional(),
    descriptors: z.array(descriptorSchema).optional(),

    // New fields in 2025+ exports
    account_source: z.string().optional(),
    distance_filter: z.number().optional(),
    selfie_verification: z.string().optional(),
    onboarded_at: z.string().optional(),
    show_gender_on_profile: z.boolean().optional(),
    // Empty strings and null are common when these display-only fields are
    // unset. They are not used for profile computation.
    display_genders: z
      .union([z.array(z.string()), z.string(), z.null()])
      .optional(),
    display_sexual_orientations: z
      .union([z.array(z.string()), z.string(), z.null()])
      .optional(),
    pos_major: z.unknown().optional(),
    signup_pos: z.unknown().optional(),
    client_metadata: z.unknown().optional(),
    events: z.array(z.unknown()).optional(),
    excluded_tags: z.array(z.unknown()).optional(),
    image_tags: z.array(z.unknown()).optional(),
    user_contents: z.array(z.unknown()).optional(),
    user_message_consents: z.array(z.unknown()).optional(),
    // Observed as both an object and an array across Tinder export versions.
    // Authentication identifiers are removed during anonymization and are not
    // consumed by the profile pipeline.
    authIds: z.unknown().optional(),
  })
  .passthrough();

const fullTinderUserSchema = tinderUserBaseSchema
  .extend({
    // These PII fields are stripped and are absent from some export vintages;
    // they are not inputs to any profile or metric calculation.
    email: z.string().optional().default(""),
    full_name: z.string().optional().default(""),
    name: z.string().optional().default(""),
    username: z.string().optional().default(""),
    phone_id: z.string().optional().default(""),
    instagram: z.unknown().optional(),
    spotify: z.unknown().optional(),
  })
  .passthrough()
  .superRefine(addTinderUserChronologyIssues);

const anonymizedTinderUserSchema = z
  .object({
    active_time: parseableDateStringSchema.optional(),
    age_filter_max: tinderMaximumAgePreferenceSchema.optional(),
    age_filter_min: tinderMinimumAgePreferenceSchema.optional(),
    birth_date: parseableDateStringSchema,
    create_date: parseableDateStringSchema,
    create_date_inferred: z.boolean().optional(),
    gender: tinderJsonGenderSchema,
    gender_filter: tinderJsonGenderSchema,
    interested_in: tinderJsonGenderSchema,
    bio: z.string().optional(),
    city: z.union([anonymizedCitySchema, z.string()]).optional(),
    education: z.string().optional(),
    jobs: z.array(anonymizedJobSchema).optional(),
    schools: z.array(anonymizedSchoolSchema).optional(),
    user_interests: z.array(z.string()).optional(),
    sexual_orientations: z.union([z.array(z.string()), z.string()]).optional(),
    descriptors: z.array(anonymizedDescriptorSchema).optional(),
    instagram: z.boolean().optional().default(false),
    spotify: z.boolean().optional().default(false),
    country: z
      .union([z.object({ code: z.string() }).strict(), z.string()])
      .optional(),
  })
  .strict()
  .superRefine(addTinderUserChronologyIssues);

// ── Top-level schema ────────────────────────────────────────────────────────

export const fullTinderDataSchema = z
  .object({
    Usage: usageSchema,
    User: fullTinderUserSchema,
    Messages: tinderJsonMatchesSchema,
    Photos: photosSchema.optional().default([]),

    // Non-extraction types — pass through without validation
    Campaigns: z.unknown().optional(),
    Experiences: z.unknown().optional(),
    Purchases: z.unknown().optional(),
    Spotify: z.unknown().optional(),
    RoomsAndInteractions: z.unknown().optional(),
    SwipeNotes: z.unknown().optional(),
    SwipeParty: z.unknown().optional(),
    StudentVerifications: z.unknown().optional(),
    SocialGraph: z.unknown().optional(),
    ReportContent: z.unknown().optional(),
    Tailor: z.unknown().optional(),
    ShareMyDate: z.unknown().optional(),
  })
  .passthrough();

/**
 * Server-side contract for the anonymized blob consumed by profile services.
 * It keeps the fields needed for insights strict while normalizing optional
 * collections that are absent from some Tinder exports.
 */
export const anonymizedTinderDataSchema = z
  .object({
    Usage: anonymizedUsageSchema,
    User: anonymizedTinderUserSchema,
    Messages: anonymizedTinderJsonMatchesSchema,
    Photos: anonymizedPhotosSchema.optional().default([]),
  })
  .strict();

// ── Inferred types ──────────────────────────────────────────────────────────

export type FullTinderDataParsed = z.infer<typeof fullTinderDataSchema>;

export { tinderJsonGenderSchema };
