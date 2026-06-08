import { z } from "zod";

/**
 * Canonical zod schemas + inferred types for the roast `ai_output` payloads.
 *
 * This is a LEAF module — it imports only `zod`, so `schema.ts` (the Drizzle
 * schema) can re-export the inferred types without creating an import cycle
 * (services import FROM schema.ts, never the other way). The persisted TS shape
 * and the runtime schema now derive from one definition, so a field added on
 * the write side can't silently diverge from the `row.output as ...` read side.
 */

// ---- STATS ROAST (kind="tinder_roast" | "hinge_roast") --------------
//
// The model's output IS the persisted shape here (no remap), so the service's
// generation schema and the stored payload are the same object.
export const statsRoastSchema = z.object({
  tagline: z
    .string()
    .describe(
      "A short verdict badge, 2-5 words, capturing the overall read — e.g. 'Elite stats, zero follow-through' or 'Casanova in volume only'.",
    ),
  headline: z
    .string()
    .describe(
      "The single best one-liner from the roast — punchy, shareable, under 100 characters",
    ),
  verdict: z
    .string()
    .describe(
      "The overall take in 1-2 sentences MAX (~240 chars). Punchy, no rambling. This is the summary under the headline.",
    ),
  roastLines: z
    .array(z.string())
    .describe(
      "Exactly 5 (4-6 is fine) witty, data-driven roast lines about the user's dating app performance. Each a single punchy sentence under 140 characters. No two should make the same point.",
    ),
  realTalkInsights: z
    .array(z.string())
    .describe(
      "Exactly 3 genuine, actionable insights to actually improve their dating app game, most impactful first",
    ),
});

/** Stats-roast payload — output for the *_roast stats kinds. */
export type StatsRoastResult = z.infer<typeof statsRoastSchema>;

// ---- PROFILE (VISION) ROAST (kind="profile_roast") -----------------
//
// The PERSISTED shape, keyed by content id. The model returns a sibling schema
// keyed by 1-based `index` (see `profileRoastSchema` in profile-roast.service.ts);
// the router remaps index -> contentId before persisting. Photos/prompts store
// only the verdict text — image URLs are resolved live on read so the roast
// always renders against the current profile.
export const persistedProfileRoastSchema = z.object({
  overall: z.object({
    tagline: z.string(),
    headline: z.string(),
    verdict: z.string(),
  }),
  photos: z.array(
    z.object({
      contentId: z.string().nullable(),
      keepOrCut: z.enum(["keep", "maybe", "cut"]),
      caption: z.string(),
      title: z.string(),
      body: z.string(),
    }),
  ),
  prompts: z.array(
    z.object({
      contentId: z.string().nullable(),
      roast: z.string(),
      rewrite: z.string(),
    }),
  ),
  bio: z
    .object({
      roast: z.string(),
      rewrites: z.array(z.object({ label: z.string(), text: z.string() })),
    })
    .nullable(),
  realTalk: z.array(
    z.object({
      title: z.string(),
      detail: z.string().optional(),
      action: z.enum(["reorder", "editBio", "addPrompt"]).optional(),
    }),
  ),
});

/** Profile-roast `output` payload — shape stored for kind="profile_roast" rows. */
export type ProfileRoastResult = z.infer<typeof persistedProfileRoastSchema>;
