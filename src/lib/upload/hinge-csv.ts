import type {
  HingeCsvTable,
  HingeCsvActivity,
  HingeCsvKind,
} from "@/lib/hinge/csv-activity";
import {
  HINGE_CSV_TABLES,
  HINGE_CSV_ACTIVITY_TABLES,
  mergeHingeSubscriptions,
  hingeSubscriptionPeriodSchema,
} from "@/lib/hinge/csv-activity";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { createSHA256Hash } from "@/lib/utils/hash";
import {
  compareHingeTimestamps,
  parseHingeTimestampToDate,
} from "@/lib/hinge/timestamp";
import { isProviderTimestamp } from "./provider-boundary-validation";
import { deriveHingeProfileId } from "./hinge-profile-id";
import { sanitizeAnonymizedHingeBlob } from "./hinge-runtime-schema";

export type HingeCsvFiles = Partial<Record<HingeCsvTable, string>>;
export function getHingeCsvTable(path: string): HingeCsvTable | undefined {
  // macOS ZIP metadata can contain a second copy of every basename.
  if (
    path
      .split(/[\\/]/)
      .some((part) => part === "__MACOSX" || part.startsWith("._"))
  )
    return undefined;
  const name = path.split(/[\\/]/).pop()?.toLowerCase();
  return HINGE_CSV_TABLES.find((table) => name === `${table}.csv`);
}

/** RFC 4180 records, including quoted commas/newlines and escaped quotes.
 * Reject damaged records rather than silently shifting personal data columns. */
export function parseHingeCsv(
  content: string,
  required: readonly string[] = [],
): Record<string, string>[] {
  const source = content.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const endField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const endRow = () => {
    endField();
    if (row.some((value) => value !== "")) records.push(row);
    row = [];
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === ",") endField();
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      endRow();
    } else if (char === '"' && !field && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error("Invalid CSV quoting.");
      field += char;
    }
  }
  if (quoted) throw new Error("Incomplete CSV quoted field.");
  if (field || row.length || closed) endRow();
  const headers = records.shift()?.map((h) => h.trim()) ?? [];
  if (
    !headers.length ||
    headers.some((h) => !h) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("Invalid CSV column names.");
  if (required.some((key) => !headers.includes(key)))
    throw new Error("CSV is missing required columns.");
  return records.map((values) => {
    if (values.length !== headers.length)
      throw new Error("CSV row has an unexpected column count.");
    return Object.fromEntries(headers.map((header, i) => [header, values[i]!]));
  });
}

const requiredColumns: Partial<Record<HingeCsvTable, string[]>> = {
  user: ["timestamp", "signup_timestamp", "age"],
  registration: ["timestamp"],
  chat_message: ["message", "action", "timestamp", "match_id"],
  chat_voice_note: ["timestamp", "action", "match_id"],
  match_likes: ["timestamp", "comment"],
  match_roses: ["timestamp", "comment"],
  match_skips: ["timestamp", "comment"],
  match_blocks: ["timestamp", "comment"],
  profile_prompt_answers: ["active", "timestamp", "prompt", "answer"],
  profile_prompt_polls: ["active", "timestamp", "prompt", "options"],
  store_subscription_purchases: [
    "timestamp",
    "start_timestamp",
    "end_timestamp",
  ],
  user_media: ["active", "timestamp", "photo_url", "video_url"],
};
export function readHingeCsvTable(table: HingeCsvTable, content: string) {
  return parseHingeCsv(content, requiredColumns[table] ?? []);
}
function timestamp(value: string | undefined, table: string) {
  if (!value || !isProviderTimestamp(value))
    throw new Error(`${table}.csv contains an invalid timestamp.`);
  return value;
}
function number(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("Invalid numeric profile value.");
  return n;
}
function boolean(value: string | undefined) {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Invalid profile boolean.");
}
function list(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string"))
      return JSON.stringify(parsed);
  } catch {
    /* Provider also emits unquoted bracket lists, e.g. [Agnostic]. */
  }
  return JSON.stringify(
    value
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
}

export async function extractHingeCsvData(
  files: HingeCsvFiles,
): Promise<SwipestatsHingeProfilePayload> {
  if (
    !files.user ||
    !HINGE_CSV_ACTIVITY_TABLES.some((table) => files[table] !== undefined)
  )
    throw new Error(
      "Add user.csv and at least one activity CSV, or the original ZIP.",
    );
  const tables = new Map<HingeCsvTable, Record<string, string>[]>();
  for (const table of HINGE_CSV_TABLES)
    if (files[table] !== undefined)
      tables.set(table, readHingeCsvTable(table, files[table]));
  const users = tables.get("user")!;
  if (!users.length) throw new Error("user.csv has no profile history.");
  // These are sparse field updates, NOT complete snapshots. Blank cells mean
  // no update. Fold nonempty cells in provider chronological order.
  const user: Record<string, string> = {};
  for (const row of [...users].sort((a, b) =>
    compareHingeTimestamps(
      timestamp(a.timestamp, "user"),
      timestamp(b.timestamp, "user"),
    ),
  )) {
    for (const [key, value] of Object.entries(row))
      if (value !== "") user[key] = value;
  }
  const signups = new Set(
    users
      .map((row) => row.signup_timestamp)
      .filter((value): value is string => !!value)
      .map((v) => parseHingeTimestampToDate(v).toISOString()),
  );
  if (signups.size > 1)
    throw new Error("user.csv contains more than one account signup.");
  const signup = user.signup_timestamp;
  timestamp(signup, "user");
  // registration.timestamp is an authentication event, not signup_timestamp.
  const hingeId = await deriveHingeProfileId(signup!);
  const activity: HingeCsvActivity = {
    version: 1,
    tables: [...tables.keys()],
    events: [],
  };
  const occurrences = new Map<string, number>();
  const hashes = new Map<string, Promise<string>>();
  const hash = (value: string) => {
    let p = hashes.get(value);
    if (!p) {
      p = createSHA256Hash(value);
      hashes.set(value, p);
    }
    return p;
  };
  let lastObserved = user.timestamp!;
  const kinds: Partial<Record<HingeCsvTable, HingeCsvKind>> = {
    match_likes: "LIKE",
    match_roses: "ROSE",
    match_skips: "SKIP",
    match_blocks: "BLOCK",
  };
  for (const table of HINGE_CSV_ACTIVITY_TABLES) {
    const rows = tables.get(table) ?? [];
    // Hash in batches to avoid a serial WebCrypto roundtrip per record.
    for (let start = 0; start < rows.length; start += 500) {
      const batch = await Promise.all(
        rows.slice(start, start + 500).map(async (row) => {
          const at = timestamp(row.timestamp, table);
          if (compareHingeTimestamps(at, signup!) < 0)
            throw new Error(
              "Activity predates this Hinge account. Use files from one export.",
            );
          if (compareHingeTimestamps(at, lastObserved) > 0) lastObserved = at;
          let kind = kinds[table];
          const isMessage =
            table === "chat_message" || table === "chat_voice_note";
          if (isMessage) {
            if (!row.match_id || !["sent", "received"].includes(row.action!))
              throw new Error(
                `${table}.csv has an unsupported message direction or missing match ID.`,
              );
            kind =
              `${table === "chat_message" ? "MESSAGE" : "VOICE_NOTE"}_${row.action === "sent" ? "SENT" : "RECEIVED"}` as HingeCsvKind;
          }
          const fingerprint = await hash(
            JSON.stringify([
              hingeId,
              kind,
              at,
              row.match_id ?? "",
              row.message ?? row.file_url ?? row.comment ?? "",
            ]),
          );
          return {
            fingerprint,
            kind: kind!,
            timestamp: at,
            ...(isMessage
              ? {
                  conversationId: await hash(
                    `${hingeId}:conversation:${row.match_id}`,
                  ),
                }
              : {}),
            ...(table === "chat_message"
              ? { charCount: [...(row.message ?? "")].length }
              : {}),
            ...(table === "match_likes" || table === "match_roses"
              ? { hasComment: !!row.comment }
              : {}),
          };
        }),
      );
      for (const { fingerprint, ...event } of batch) {
        const occurrence = occurrences.get(fingerprint) ?? 0;
        occurrences.set(fingerprint, occurrence + 1);
        activity.events.push({ ...event, id: `${fingerprint}:${occurrence}` });
      }
    }
  }
  if (tables.has("store_subscription_purchases")) {
    const periods = await Promise.all(
      tables.get("store_subscription_purchases")!.map(async (row) => {
        const startAt = timestamp(
          row.start_timestamp,
          "store_subscription_purchases",
        );
        const endAt = row.end_timestamp;
        const observedAt = timestamp(
          row.timestamp,
          "store_subscription_purchases",
        );
        if (compareHingeTimestamps(startAt, signup!) < 0)
          throw new Error("Subscription predates this account.");
        return hingeSubscriptionPeriodSchema.parse({
          id: await hash(
            `${hingeId}:subscription:${parseHingeTimestampToDate(startAt).toISOString()}`,
          ),
          startAt: parseHingeTimestampToDate(startAt).toISOString(),
          endAt: endAt && parseHingeTimestampToDate(endAt).toISOString(),
          observedAt: parseHingeTimestampToDate(observedAt).toISOString(),
        });
      }),
    );
    // Sort before union so row ordering never chooses which correction wins.
    activity.subscriptions = mergeHingeSubscriptions(
      [],
      periods.sort((a, b) => a.observedAt.localeCompare(b.observedAt)),
    );
  }
  // Profile edits and active prompt/media timestamps are observations too;
  // neither is described to users as a complete last-login history.
  for (const [table, rows] of tables) {
    for (const row of rows) {
      if (row.timestamp) {
        const at = timestamp(row.timestamp, table);
        if (compareHingeTimestamps(at, lastObserved) > 0) lastObserved = at;
      }
    }
  }
  let age = number(user.age);
  if (user.birthday) {
    const birth = parseHingeTimestampToDate(
      user.birthday.length === 10
        ? `${user.birthday}T00:00:00Z`
        : user.birthday,
    );
    const at = parseHingeTimestampToDate(lastObserved);
    age =
      at.getUTCFullYear() -
      birth.getUTCFullYear() -
      (at.getUTCMonth() < birth.getUTCMonth() ||
      (at.getUTCMonth() === birth.getUTCMonth() &&
        at.getUTCDate() < birth.getUTCDate())
        ? 1
        : 0);
  }
  const prompts = ["profile_prompt_answers", "profile_prompt_polls"] as const;
  const activePrompts = prompts
    .flatMap((table) =>
      (tables.get(table) ?? [])
        .filter((row) => boolean(row.active))
        .map((row) => ({
          type:
            table === "profile_prompt_answers"
              ? row.audio_url
                ? "audio"
                : "text"
              : "prompt_poll",
          prompt: row.prompt,
          text: row.answer,
          ...(row.options
            ? { options: JSON.parse(list(row.options)!) as string[] }
            : {}),
          created: timestamp(row.timestamp, table),
          user_updated: row.timestamp,
        })),
    )
    .map((prompt, id) => ({ ...prompt, id }));
  const media = (tables.get("user_media") ?? [])
    .filter((row) => boolean(row.active))
    .flatMap((row) => {
      const url = row.video_url || row.photo_url;
      if (!url) return [];
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        !["media.hingenexus.com", "cdn.hinge.co"].includes(parsed.hostname)
      )
        throw new Error("Unsupported Hinge media URL.");
      return [
        {
          url,
          type: row.video_url ? "video" : "photo",
          prompt: row.prompt || row.caption || undefined,
        },
      ];
    });
  const anonymizedHingeJson = sanitizeAnonymizedHingeBlob({
    User: {
      account: { signup_time: signup, last_seen: lastObserved },
      identity: { has_email: !!user.email, has_phone: !!user.phone_number },
      installs: [],
      location: user.location_country_short
        ? { country: user.location_country_short }
        : undefined,
      preferences: {
        // max_distance has no exported unit, so do not label it as miles.
        age_min: number(user.age_pref_min),
        age_max: number(user.age_pref_max),
        age_dealbreaker: boolean(user.age_dealbreaker),
        height_min: number(user.height_pref_min),
        height_max: number(user.height_pref_max),
        height_dealbreaker: boolean(user.height_dealbreaker),
        gender_preference: user.gender_preference,
        ethnicity_preference: list(user.ethnicity_preference),
        ethnicity_dealbreaker: boolean(user.ethnicity_dealbreaker),
        religion_preference: list(user.religion_preference),
        religion_dealbreaker: boolean(user.religion_dealbreaker),
      },
      profile: {
        age,
        height_centimeters: number(user.height),
        gender: user.gender,
        gender_identity: user.gender_identity,
        gender_identity_displayed: boolean(
          user.gender_identity_displayed_on_profile,
        ),
        ethnicities: list(user.ethnicities),
        ethnicities_displayed: boolean(user.ethnicity_displayed_on_profile),
        religions: list(user.religions),
        religions_displayed: boolean(user.religion_displayed_on_profile),
        workplaces: list(user.workplaces),
        workplaces_displayed: boolean(user.workplaces_displayed_on_profile),
        job_title: user.job_title,
        job_title_displayed: boolean(user.job_title_displayed_on_profile),
        schools: list(user.schools),
        schools_displayed: boolean(user.schools_displayed_on_profile),
        dating_intention: user.dating_intention,
        dating_intention_displayed: boolean(
          user.dating_intention_displayed_on_profile,
        ),
        children: user.children,
        family_plans: user.family_plans,
        education_attained: user.education_attained,
        smoking: user.smoking,
        drinking: user.drinking,
        marijuana: user.marijuana,
        drugs: user.drugs,
        politics: user.politics,
      },
    },
    Matches: [],
    CsvActivity: activity,
    ...(prompts.every((table) => tables.has(table))
      ? { Prompts: activePrompts }
      : {}),
    ...(tables.has("user_media") ? { Media: media } : {}),
  });
  return { hingeId, anonymizedHingeJson };
}
