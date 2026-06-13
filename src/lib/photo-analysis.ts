/**
 * Shared, dependency-free types and helpers for AI photo analysis.
 *
 * Lives in `lib/` (not the service) so the client can import the tag list,
 * labels, and the metadata reader without pulling the AI SDK into the browser
 * bundle. The server service builds its Zod schema from `PHOTO_TAGS`; the
 * gallery UI uses the labels + `readPhotoAnalysis` to render persisted results.
 */

/**
 * Fixed tag vocabulary. A closed set (not free text) so tags stay consistent
 * and countable — that's what lets us later flag "3× sunglasses, no group
 * photo" style advice. Keep in sync with `PHOTO_TAG_LABELS`.
 */
export const PHOTO_TAGS = [
  "selfie",
  "mirror-selfie",
  "headshot",
  "full-body",
  "group",
  "outdoor",
  "sunset",
  "travel",
  "activity",
  "pet",
  "food-drink",
  "sunglasses",
  "thirst-trap",
  "formal",
  "hobby",
  "car",
  "gym",
  "fish",
  "crossed-arms",
  "duo",
  "hat",
  "filter",
  "alcohol",
  "blurred",
] as const;

export type PhotoTag = (typeof PHOTO_TAGS)[number];

/** Human-friendly display labels for each tag. */
export const PHOTO_TAG_LABELS: Record<PhotoTag, string> = {
  selfie: "Selfie",
  "mirror-selfie": "Mirror selfie",
  headshot: "Headshot",
  "full-body": "Full body",
  group: "Group",
  outdoor: "Outdoor",
  sunset: "Sunset",
  travel: "Travel",
  activity: "Activity",
  pet: "Pet",
  "food-drink": "Food & drink",
  sunglasses: "Sunglasses",
  "thirst-trap": "Thirst trap",
  formal: "Formal",
  hobby: "Hobby",
  car: "Car",
  gym: "Gym",
  fish: "Fish",
  "crossed-arms": "Crossed arms",
  duo: "Duo",
  hat: "Hat / cap",
  filter: "Filter",
  alcohol: "Alcohol",
  blurred: "Blurred",
};

/**
 * Bump when the analysis prompt/rubric or model changes in a way that makes
 * results (especially `score`) non-comparable across runs. Persisted with each
 * analysis so aggregate research can group or filter by version.
 *
 * v2: added the 1-10 research score.
 * v3: expanded the "pile-up feature" vocabulary — added "crossed-arms", "duo",
 *     "hat", "filter", "alcohol", and "blurred", and split two-person shots
 *     ("duo") out of "group" (which now means 3+ people total).
 */
export const PHOTO_ANALYSIS_VERSION = 3;

/** The persisted analysis shape, stored under `attachment.metadata.aiAnalysis`. */
export interface PhotoAnalysis {
  /** Short, friendly name, e.g. "Sunset beach selfie". */
  name: string;
  /** One factual sentence describing what's visible. */
  description: string;
  /** Every applicable tag from `PHOTO_TAGS`. */
  tags: PhotoTag[];
  /**
   * 1-10 strength as a dating-app photo. Research-only — collected for
   * aggregate analysis (e.g. avg photo score vs match rate), deliberately
   * never shown in the UI. Optional: analyses from before v2 don't have it.
   */
  score?: number;
  /** `PHOTO_ANALYSIS_VERSION` at analysis time. Absent on v1 rows. */
  version?: number;
  /** ISO timestamp of when this analysis was produced. */
  analyzedAt: string;
  /** The user's steering note, if this was a corrected re-analysis. */
  steer?: string;
}

/** The metadata key the analysis is persisted under. */
export const METADATA_ANALYSIS_KEY = "aiAnalysis" as const;

const TAG_SET = new Set<string>(PHOTO_TAGS);

/**
 * Safely read a persisted `PhotoAnalysis` out of an attachment's loosely-typed
 * (`jsonb`) metadata. Returns null when there's no valid analysis, and silently
 * drops any tag that's no longer in the vocabulary so an old row can't crash the
 * UI after the tag list changes.
 */
export function readPhotoAnalysis(metadata: unknown): PhotoAnalysis | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>)[METADATA_ANALYSIS_KEY];
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || typeof obj.description !== "string") {
    return null;
  }

  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter(
        (t): t is PhotoTag => typeof t === "string" && TAG_SET.has(t),
      )
    : [];

  return {
    name: obj.name,
    description: obj.description,
    tags,
    score: typeof obj.score === "number" ? obj.score : undefined,
    version: typeof obj.version === "number" ? obj.version : undefined,
    analyzedAt: typeof obj.analyzedAt === "string" ? obj.analyzedAt : "",
    steer: typeof obj.steer === "string" ? obj.steer : undefined,
  };
}
