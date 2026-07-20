import { z } from "zod";

import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import { isPlausibleHingeAge } from "@/lib/hinge/age";
import {
  compareHingeTimestamps,
  tryParseHingeTimestampToDate,
} from "@/lib/hinge/timestamp";
import {
  isJsonEncodedStringArray,
  isProviderTimestamp,
} from "./provider-boundary-validation";

// REVIEW(provider assumption): current and historical Hinge exports include a
// timezone-less SQL-style activity grammar. Persisted lineage proves that
// SwipeStats has consistently treated that wall clock as UTC; opt in here while
// keeping Tinder and the generic provider boundary strict.
const validTimestamp = z
  .string()
  .refine(
    (value) => isProviderTimestamp(value, { allowNaiveUtc: true }),
    "Expected a valid, non-future ISO timestamp",
  );

const maybeString = z.string().nullable().optional();
const maybeBoolean = z.boolean().nullable().optional();
const providerInteger = z.number().int().nonnegative().max(2_147_483_647);
const maybeProviderInteger = providerInteger.nullable().optional();
const maybeAgePreference = z
  .number()
  .int()
  .min(18)
  .max(120)
  .nullable()
  .optional();
const maybeJsonEncodedStringArray = z
  .string()
  .refine(
    isJsonEncodedStringArray,
    "Expected a JSON-encoded array containing only strings",
  )
  .nullable()
  .optional();

type ObjectMode = "strict" | "strip";

function createAnonymizedHingeBlobSchema(mode: ObjectMode) {
  const object = <Shape extends z.ZodRawShape>(shape: Shape) => {
    const schema = z.object(shape);
    return mode === "strict" ? schema.strict() : schema.strip();
  };

  // REVIEW(provider assumption): Hinge's distance, age, and height filters are
  // whole nonnegative units and persist into integer columns. Fractional values
  // are rejected rather than rounded, which would manufacture a preference the
  // provider did not export.
  const preferences = object({
    distance_miles_max: maybeProviderInteger,
    age_min: maybeAgePreference,
    age_max: maybeAgePreference,
    age_dealbreaker: maybeBoolean,
    height_min: maybeProviderInteger,
    height_max: maybeProviderInteger,
    height_dealbreaker: maybeBoolean,
    gender_preference: maybeString,
    ethnicity_preference: maybeJsonEncodedStringArray,
    ethnicity_dealbreaker: maybeBoolean,
    religion_preference: maybeJsonEncodedStringArray,
    religion_dealbreaker: maybeBoolean,
  }).superRefine((value, ctx) => {
    if (
      value.age_min !== null &&
      value.age_min !== undefined &&
      value.age_max !== null &&
      value.age_max !== undefined &&
      value.age_min > value.age_max
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["age_max"],
        message: "must be greater than or equal to age_min",
      });
    }
    if (
      value.height_min !== null &&
      value.height_min !== undefined &&
      value.height_max !== null &&
      value.height_max !== undefined &&
      value.height_min > value.height_max
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["height_max"],
        message: "must be greater than or equal to height_min",
      });
    }
  });

  const identity = object({
    phone_country_code: maybeString,
    phone_country_calling_code: maybeString,
    instagram_authorized: maybeBoolean,
    has_email: z.boolean().optional(),
    has_phone: z.boolean().optional(),
    has_phone_carrier: z.boolean().optional(),
  });

  const account = object({
    signup_time: validTimestamp,
    last_seen: validTimestamp,
  }).superRefine((value, ctx) => {
    const signupIsValid = tryParseHingeTimestampToDate(value.signup_time);
    const lastSeenIsValid = tryParseHingeTimestampToDate(value.last_seen);
    if (
      signupIsValid &&
      lastSeenIsValid &&
      compareHingeTimestamps(value.last_seen, value.signup_time) < 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["last_seen"],
        message: "must not precede signup_time",
      });
    }
  });

  const install = object({
    install_time: validTimestamp.optional(),
  });

  const device = object({
    device_platform: maybeString,
    device_os_versions: maybeString,
    app_version: maybeString,
  });

  const location = object({
    country: maybeString,
  });

  const profile = object({
    age: z.number().int().refine(isPlausibleHingeAge),
    height_centimeters: maybeProviderInteger,
    gender: maybeString,
    gender_identity: maybeString,
    gender_identity_displayed: maybeBoolean,
    ethnicities: maybeJsonEncodedStringArray,
    ethnicities_displayed: maybeBoolean,
    religions: maybeJsonEncodedStringArray,
    religions_displayed: maybeBoolean,
    workplaces: maybeJsonEncodedStringArray,
    workplaces_displayed: maybeBoolean,
    job_title: maybeString,
    job_title_displayed: maybeBoolean,
    schools: maybeJsonEncodedStringArray,
    schools_displayed: maybeBoolean,
    hometowns: maybeJsonEncodedStringArray,
    hometowns_displayed: maybeBoolean,
    smoking: maybeString,
    smoking_displayed: maybeBoolean,
    drinking: maybeString,
    drinking_displayed: maybeBoolean,
    marijuana: maybeString,
    marijuana_displayed: maybeBoolean,
    drugs: maybeString,
    drugs_displayed: maybeBoolean,
    children: maybeString,
    children_displayed: maybeBoolean,
    family_plans: maybeString,
    family_plans_displayed: maybeBoolean,
    education_attained: maybeString,
    politics: maybeString,
    politics_displayed: maybeBoolean,
    instagram_displayed: maybeBoolean,
    dating_intention: maybeString,
    dating_intention_displayed: maybeBoolean,
    relationship_types: maybeString,
    relationship_type_displayed: maybeBoolean,
    languages_spoken: maybeString,
    languages_spoken_displayed: maybeBoolean,
    selfie_verified: maybeBoolean,
    has_first_name: z.boolean().optional(),
    has_last_name: z.boolean().optional(),
  });

  const chat = object({
    body: z.string(),
    timestamp: validTimestamp,
  });
  const likeReaction = object({
    timestamp: validTimestamp,
    comment: z.string().nullable().optional(),
  });
  const like = object({
    timestamp: validTimestamp,
    like: z.array(likeReaction),
  });
  const match = object({ timestamp: validTimestamp });
  const block = object({
    block_type: z.string(),
    timestamp: validTimestamp,
  });
  const weMet = object({
    timestamp: validTimestamp,
    did_meet_subject: z.string(),
    was_my_type: maybeString,
  });
  const voiceNote = object({
    url: z.string().min(1),
    timestamp: validTimestamp,
  });
  const conversation = object({
    chats: z.array(chat).optional(),
    like: z.array(like).optional(),
    // REVIEW(provider assumption): Hinge currently exports at most one mutual
    // match event per conversation thread. Downstream storage has one match row
    // per thread, so a second event is ambiguous and must be quarantined.
    match: z.array(match).max(1).optional(),
    block: z.array(block).optional(),
    we_met: z.array(weMet).optional(),
    voice_notes: z.array(voiceNote).optional(),
  }).refine(
    (thread) =>
      thread.chats?.length ||
      thread.like?.length ||
      thread.match?.length ||
      thread.block?.length ||
      thread.we_met?.length ||
      thread.voice_notes?.length,
    "Expected at least one recognized Hinge activity entry",
  );

  const prompt = object({
    id: providerInteger,
    prompt: maybeString,
    type: z.string().min(1),
    text: maybeString,
    options: z.array(z.string()).nullable().optional(),
    user_updated: validTimestamp,
    created: validTimestamp,
  }).superRefine((value, ctx) => {
    const createdIsValid = tryParseHingeTimestampToDate(value.created);
    const updatedIsValid = tryParseHingeTimestampToDate(value.user_updated);
    if (
      createdIsValid &&
      updatedIsValid &&
      compareHingeTimestamps(value.user_updated, value.created) < 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["user_updated"],
        message: "must not precede created",
      });
    }
  });
  const prompts = z.array(prompt).superRefine((entries, ctx) => {
    const seenIds = new Set<number>();
    entries.forEach((entry, index) => {
      if (seenIds.has(entry.id)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "duplicate provider prompt id",
        });
      }
      seenIds.add(entry.id);
    });
  });

  const media = object({
    url: z.string().min(1),
    type: maybeString,
    prompt: maybeString,
    from_social_media: maybeBoolean,
  });

  return object({
    User: object({
      preferences,
      identity,
      account,
      installs: z.array(install),
      devices: z.array(device).optional(),
      location: location.optional(),
      profile,
    }),
    Matches: z.array(conversation),
    Prompts: prompts.optional(),
    Media: z.array(media).optional(),
  });
}

const sanitizingHingeBlobSchema = createAnonymizedHingeBlobSchema("strip");
const strictHingeBlobSchema = createAnonymizedHingeBlobSchema("strict");

/** Deeply strip everything outside the documented anonymized upload contract. */
export function sanitizeAnonymizedHingeBlob(
  value: unknown,
): AnonymizedHingeDataJSON {
  return sanitizingHingeBlobSchema.parse(
    value,
  ) as unknown as AnonymizedHingeDataJSON;
}

/** Runtime boundary: uploaded blobs must already satisfy the strict contract. */
export function parseAnonymizedHingeBlob(
  value: unknown,
): AnonymizedHingeDataJSON {
  return strictHingeBlobSchema.parse(
    value,
  ) as unknown as AnonymizedHingeDataJSON;
}
