import { z } from "zod";
import { TinderJsonGenderValues } from "./TinderDataJSON";

// ── Primitives ──────────────────────────────────────────────────────────────

const dateValueMapSchema = z.record(z.string(), z.number());

const tinderJsonGenderSchema = z.enum(TinderJsonGenderValues);

// ── Messages & Matches ──────────────────────────────────────────────────────

export const messageSchema = z
  .object({
    to: z.number(),
    from: z.string(),
    message: z.string().optional(),
    sent_date: z.string(),
    type: z
      .union([
        z.literal("gif"),
        z.literal("gesture"),
        z.literal("1"),
        z.literal("activity"),
        z.literal("contact_card"),
        z.literal("swipe_note"),
        z.literal("game_notification"),
        z.literal("contextual"),
        z.literal("vibes"),
      ])
      .optional(),
    fixed_height: z.string().optional(),
  })
  .passthrough();

export const tinderJsonMatchSchema = z
  .object({
    match_id: z.string(),
    messages: z.array(messageSchema),
  })
  .passthrough();

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

// ── Usage ───────────────────────────────────────────────────────────────────

export const usageSchema = z
  .object({
    app_opens: dateValueMapSchema.refine((obj) => Object.keys(obj).length > 0, {
      message: "app_opens must not be empty",
    }),
    swipes_likes: dateValueMapSchema.optional().default({}),
    swipes_passes: dateValueMapSchema.optional().default({}),
    superlikes: dateValueMapSchema.optional(),
    matches: dateValueMapSchema.optional().default({}),
    messages_sent: dateValueMapSchema.optional().default({}),
    messages_received: dateValueMapSchema.optional().default({}),
    advertising_id: z.record(z.string(), z.string()).optional().default({}),
    idfa: z.record(z.string(), z.string()).optional().default({}),
  })
  .passthrough();

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
    region: z.string(),
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

// ── User schemas ────────────────────────────────────────────────────────────

const tinderUserBaseSchema = z
  .object({
    // Critical required fields
    birth_date: z.string(),
    gender: tinderJsonGenderSchema,
    gender_filter: tinderJsonGenderSchema,
    interested_in: tinderJsonGenderSchema,
    age_filter_min: z.number(),
    age_filter_max: z.number(),

    // Optional - inferred post-parse from app_opens if missing
    create_date: z.string().optional(),

    // Optional fields with lenient defaults
    active_time: z.unknown().optional(),
    genders: z.string().optional(),
    gender_extended: z.string().optional(),
    interested_in_genders: tinderJsonGenderSchema.optional(),
    bio: z.string().optional(),
    city: citySchema.optional(),
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
    display_genders: z.array(z.string()).optional(),
    display_sexual_orientations: z.array(z.string()).optional(),
    pos_major: z.unknown().optional(),
    signup_pos: z.unknown().optional(),
    client_metadata: z.unknown().optional(),
    events: z.array(z.unknown()).optional(),
    excluded_tags: z.array(z.unknown()).optional(),
    image_tags: z.array(z.unknown()).optional(),
    user_contents: z.array(z.unknown()).optional(),
    user_message_consents: z.array(z.unknown()).optional(),
    authIds: z.array(z.unknown()).optional(),
  })
  .passthrough();

const fullTinderUserSchema = tinderUserBaseSchema
  .extend({
    email: z.string(),
    full_name: z.string(),
    name: z.string().optional().default(""),
    username: z.string().optional().default(""),
    phone_id: z.string().optional().default(""),
    instagram: z.unknown().optional(),
    spotify: z.unknown().optional(),
  })
  .passthrough();

// ── Top-level schema ────────────────────────────────────────────────────────

export const fullTinderDataSchema = z
  .object({
    Usage: usageSchema,
    User: fullTinderUserSchema,
    Messages: z.array(tinderJsonMatchSchema),
    Photos: photosSchema,

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

// ── Inferred types ──────────────────────────────────────────────────────────

export type FullTinderDataParsed = z.infer<typeof fullTinderDataSchema>;

export { tinderJsonGenderSchema };
