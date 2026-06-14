import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import {
  aiOutputTable,
  profileMetaTable,
  tinderProfileTable,
  hingeProfileTable,
  comparisonColumnTable,
  type AiOutputKind,
  type AiOutputRow,
  type StatsRoastResult,
  type ProfileRoastResult,
} from "@/server/db/schema";
import { aiProcedure, protectedProcedure, publicProcedure } from "../trpc";
import {
  generateRoast,
  buildRoastBenchmarks,
  STATS_ROAST_MODEL,
  type RoastBenchmark,
} from "@/server/services/roast.service";
import {
  roastProfile,
  roastSinglePhoto,
  ROAST_MODEL,
  ROAST_TONES,
  type RoastTone,
} from "@/server/services/profile-roast.service";
import { getProviderMeta } from "@/server/services/providers";
import { trackServerEvent } from "@/server/services/analytics.service";
import {
  upsertAiOutput,
  AI_OUTPUT_VERSION,
  aiOutputSubjectEq,
} from "@/server/services/ai-output.service";
import {
  loadOwnedColumnWithContent,
  loadOwnedColumnLight,
} from "@/server/services/comparison-column.service";
import { readPhotoAnalysis } from "@/lib/photo-analysis";
import { getCohortStats } from "@/server/services/cohort/cohort.service";
import { ProfileComparisonService } from "@/server/services/profile-comparison.service";
import { env } from "@/env";

/** A stored row is outdated when its format predates the current version. The
 * version lives in `ai-output.service` (shared with the upsert writer). */
function isOutdated(row: AiOutputRow): boolean {
  return (row.version ?? 1) < AI_OUTPUT_VERSION;
}

/**
 * System cohort id + human label for a profile's gender on a provider, used to
 * pull percentile benchmarks for the stats roast. Falls back to the all-gender
 * cohort when gender is unknown/non-binary (no dedicated cohort exists).
 */
function resolveCohort(
  providerKey: string,
  gender: string | undefined,
): { cohortId: string; cohortLabel: string } {
  const p = providerKey.toLowerCase(); // "tinder" | "hinge"
  const providerName = getProviderMeta(providerKey).name;
  if (gender === "MALE")
    return { cohortId: `${p}_male`, cohortLabel: `men on ${providerName}` };
  if (gender === "FEMALE")
    return { cohortId: `${p}_female`, cohortLabel: `women on ${providerName}` };
  return { cohortId: `${p}_all`, cohortLabel: `everyone on ${providerName}` };
}

/** Stats roast lives in ai_output keyed by (kind, subjectId, scope=""). */
function statsTarget(input: {
  tinderProfileId?: string;
  hingeProfileId?: string;
}): { kind: AiOutputKind; subjectId: string } {
  return input.tinderProfileId
    ? { kind: "tinder_roast", subjectId: input.tinderProfileId }
    : { kind: "hinge_roast", subjectId: input.hingeProfileId! };
}

/** Map a stats ai_output row to the flat shape the insights UI consumes. */
function mapStatsRoast(row: AiOutputRow) {
  const output = row.output as StatsRoastResult;
  return {
    id: row.id,
    shareKey: row.shareKey,
    isPublic: row.isPublic,
    tone: row.tone,
    createdAt: row.createdAt,
    isOutdated: isOutdated(row),
    ...output,
  };
}

/** Photo sort priority when applying a roast: keep first, cut last. */
const RANK: Record<"keep" | "maybe" | "cut", number> = {
  keep: 0,
  maybe: 1,
  cut: 2,
};

type RoastContentItem = {
  id: string;
  type: string;
  attachmentId: string | null;
  caption: string | null;
  prompt: string | null;
  answer: string | null;
  attachment: { url: string } | null;
};

/**
 * Resolve a stored (id-keyed) roast against live content — adds photo URLs +
 * prompt text, and threads the live bio text in for cliché highlighting.
 * URLs/text are resolved live (never frozen), same philosophy as photos.
 */
function hydrateRoast(
  result: ProfileRoastResult,
  content: RoastContentItem[],
  bioText: string | null,
) {
  const byId = new Map(content.map((c) => [c.id, c]));
  return {
    overall: result.overall,
    photos: result.photos.map((p) => ({
      contentId: p.contentId,
      keepOrCut: p.keepOrCut,
      caption: p.caption,
      title: p.title,
      body: p.body,
      url: p.contentId
        ? (byId.get(p.contentId)?.attachment?.url ?? null)
        : null,
    })),
    prompts: result.prompts.map((p) => ({
      contentId: p.contentId,
      roast: p.roast,
      rewrite: p.rewrite,
      prompt: p.contentId ? (byId.get(p.contentId)?.prompt ?? null) : null,
      answer: p.contentId ? (byId.get(p.contentId)?.answer ?? null) : null,
    })),
    bio: result.bio ? { ...result.bio, text: bioText } : null,
    realTalk: result.realTalk,
  };
}

export const roastRouter = {
  /**
   * Generate a stats roast for a profile. Upserts one row per profile in
   * ai_output (overwrite on regenerate) so we don't re-call AI every request.
   * Requires PLUS or ELITE tier.
   */
  generate: aiProcedure
    .input(
      z.object({
        tinderProfileId: z.string().optional(),
        hingeProfileId: z.string().optional(),
        tone: z.enum(ROAST_TONES).default("mild"),
        /** Force a fresh roast even if a cached one exists (e.g. tone change). */
        regenerate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tinderProfileId, hingeProfileId, tone, regenerate } = input;
      const userId = ctx.session.user.id;

      if (!tinderProfileId && !hingeProfileId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide tinderProfileId or hingeProfileId",
        });
      }

      // Verify ownership and gather gender/provider in one pass.
      let gender: string | undefined;
      let providerKey = "TINDER";
      if (tinderProfileId) {
        const tp = await ctx.db.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.tinderId, tinderProfileId),
        });
        if (tp?.userId !== userId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        gender = tp.gender;
        providerKey = "TINDER";
      } else {
        const hp = await ctx.db.query.hingeProfileTable.findFirst({
          where: eq(hingeProfileTable.hingeId, hingeProfileId!),
        });
        if (hp?.userId !== userId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        gender = hp.gender;
        providerKey = "HINGE";
      }

      const { kind, subjectId } = statsTarget(input);

      // Reuse the cached roast unless the caller wants a fresh one or switched
      // tone. The share key / public flag are preserved across regenerations.
      const existing = await ctx.db.query.aiOutputTable.findFirst({
        where: and(
          eq(aiOutputTable.kind, kind),
          aiOutputSubjectEq(kind, subjectId),
          eq(aiOutputTable.scope, ""),
        ),
      });
      const existingTone = existing?.tone ?? "spicy"; // legacy rows = old default
      if (existing && !regenerate && existingTone === tone) {
        return mapStatsRoast(existing);
      }

      // Fetch ProfileMeta
      const profileMeta = await ctx.db.query.profileMetaTable.findFirst({
        where: tinderProfileId
          ? eq(profileMetaTable.tinderProfileId, tinderProfileId)
          : eq(profileMetaTable.hingeProfileId, hingeProfileId!),
      });
      if (!profileMeta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile stats not found. Try re-uploading your data.",
        });
      }

      // Pull cohort percentiles so the roast knows what's actually good vs bad
      // (otherwise it dunks on elite numbers). Best-effort.
      let benchmarks: RoastBenchmark[] = [];
      const { cohortId, cohortLabel } = resolveCohort(providerKey, gender);
      const cohortStats = await getCohortStats(cohortId);
      if (cohortStats) {
        benchmarks = buildRoastBenchmarks(
          profileMeta,
          cohortStats,
          cohortLabel,
        );
      }

      const output = await generateRoast({
        profileMeta,
        tone,
        gender,
        dataProvider: providerKey,
        benchmarks,
      });

      const inputSnapshot = {
        dataProvider: providerKey,
        gender: gender ?? null,
        benchmarks,
      };

      // One stats roast per profile — upsert overwrites in place, preserving the
      // existing id / shareKey / isPublic.
      const row = await upsertAiOutput({
        db: ctx.db,
        userId,
        kind,
        subjectId,
        tone,
        model: STATS_ROAST_MODEL,
        input: inputSnapshot,
        output,
      });

      trackServerEvent(userId, "stats_roast_generated", {
        provider: providerKey === "TINDER" ? "tinder" : "hinge",
        tone,
        regenerate,
      });

      return mapStatsRoast(row);
    }),

  /**
   * Get the cached stats roast for a profile (if any).
   */
  getByProfile: protectedProcedure
    .input(
      z.object({
        tinderProfileId: z.string().optional(),
        hingeProfileId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tinderProfileId, hingeProfileId } = input;
      const userId = ctx.session.user.id;

      if (!tinderProfileId && !hingeProfileId) {
        return null;
      }

      const { kind, subjectId } = statsTarget(input);
      const row = await ctx.db.query.aiOutputTable.findFirst({
        where: and(
          eq(aiOutputTable.kind, kind),
          aiOutputSubjectEq(kind, subjectId),
          eq(aiOutputTable.scope, ""),
          eq(aiOutputTable.userId, userId),
        ),
      });

      return row ? mapStatsRoast(row) : null;
    }),

  /**
   * Public endpoint for share page. Returns first 3 roast lines only (paywall hook).
   */
  getPublic: publicProcedure
    .input(z.object({ shareKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.aiOutputTable.findFirst({
        where: eq(aiOutputTable.shareKey, input.shareKey),
      });

      if (
        !row?.isPublic ||
        (row.kind !== "tinder_roast" && row.kind !== "hinge_roast")
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Roast not found or not shared",
        });
      }

      const output = row.output as StatsRoastResult;
      // Return only first 3 lines publicly (the hook)
      return {
        id: row.id,
        shareKey: row.shareKey,
        roastLines: output.roastLines.slice(0, 3),
        headline: output.headline,
        createdAt: row.createdAt,
      };
    }),

  /**
   * Make a roast publicly shareable.
   */
  makePublic: protectedProcedure
    .input(z.object({ roastId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const row = await ctx.db.query.aiOutputTable.findFirst({
        where: and(
          eq(aiOutputTable.id, input.roastId),
          eq(aiOutputTable.userId, userId),
        ),
      });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await ctx.db
        .update(aiOutputTable)
        .set({ isPublic: true })
        .where(eq(aiOutputTable.id, input.roastId))
        .returning();

      // Fire only on the transition to public (row was fetched pre-update).
      if (!row.isPublic && updated?.shareKey) {
        trackServerEvent(userId, "stats_roast_shared", {
          roastId: input.roastId,
          shareKey: updated.shareKey,
        });
      }

      return { shareKey: updated?.shareKey };
    }),

  /**
   * Publish a profile roast (by column) so it can be opened on the public
   * /share/profile-roast/[shareKey] page. Idempotent; returns the share key.
   *
   * Sharing a roast shares the roasted PROFILE: verdicts, photos, and the
   * single column's preview (name/age/bio). It never touches the parent
   * comparison's isPublic flag — the multi-column compare view is an internal
   * tool for the owner and has its own share flow.
   */
  publishProfileRoast: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const row = await ctx.db.query.aiOutputTable.findFirst({
        where: and(
          eq(aiOutputTable.kind, "profile_roast"),
          eq(aiOutputTable.columnId, input.columnId),
          eq(aiOutputTable.scope, ""),
          eq(aiOutputTable.userId, userId),
        ),
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Roast this profile before sharing it.",
        });
      }
      if (!row.isPublic) {
        await ctx.db
          .update(aiOutputTable)
          .set({ isPublic: true })
          .where(eq(aiOutputTable.id, row.id));

        if (row.shareKey) {
          trackServerEvent(userId, "roast_published", {
            columnId: input.columnId,
            shareKey: row.shareKey,
          });
        }
      }
      return { shareKey: row.shareKey };
    }),

  /**
   * Public endpoint for the profile-roast share page: resolves a shared roast by
   * shareKey and returns the hydrated verdicts plus the column's profile preview
   * (so the page can toggle between the profile and the roast). Gracefully
   * handles an orphaned roast whose column was since deleted (no preview).
   */
  getPublicProfileRoast: publicProcedure
    .input(z.object({ shareKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.aiOutputTable.findFirst({
        where: eq(aiOutputTable.shareKey, input.shareKey),
      });
      if (!row?.isPublic || row.kind !== "profile_roast") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Roast not found or not shared",
        });
      }

      const result = row.output as ProfileRoastResult;

      // profile_roast rows always carry columnId (exclusive-arc CHECK), but it's
      // typed nullable — guard so the orphan branch below handles a missing one.
      const column = row.columnId
        ? await ctx.db.query.comparisonColumnTable.findFirst({
            where: eq(comparisonColumnTable.id, row.columnId),
            with: {
              comparison: true,
              content: {
                orderBy: (content, { asc }) => [asc(content.order)],
                with: { attachment: true },
              },
            },
          })
        : null;

      // Sharing a roast shares the roasted PROFILE — verdicts, photos, and the
      // single column's preview (name/age/bio). What is NOT exposed is the
      // parent comparison itself (the multi-column compare view stays private
      // with its own share flow); we surface only this column's display fields,
      // never the comparison row's userId/shareKey/flags. An orphaned roast
      // (column since deleted) renders verdicts with text-only photo cards.
      if (!column) {
        return {
          tone: row.tone,
          updatedAt: row.updatedAt,
          providerKey: null,
          profileName: null,
          comparisonName: null,
          age: null,
          defaultBio: null,
          column: null,
          ...hydrateRoast(result, [], null),
        };
      }

      const { comparison, ...columnForView } = column;
      const effectiveBio = column.bio ?? comparison.defaultBio ?? null;

      return {
        tone: row.tone,
        updatedAt: row.updatedAt,
        providerKey: column.dataProvider,
        profileName: comparison.profileName,
        comparisonName: comparison.name,
        age: comparison.age,
        defaultBio: comparison.defaultBio,
        column: columnForView,
        ...hydrateRoast(result, column.content, effectiveBio),
      };
    }),

  /**
   * Vision roast of a single profile-compare profile (one column): its photos,
   * prompts and bio. Persisted as one roast per profile (upsert) — regenerating
   * overwrites it. Tone adjusts the voice; `steer` is optional free-text nudge.
   */
  roastProfile: aiProcedure
    .input(
      z.object({
        columnId: z.string(),
        tone: z.enum(ROAST_TONES),
        steer: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Fetch the owned column with its ordered content + attachments + parent
      // comparison (for the fallback bio).
      const column = await loadOwnedColumnWithContent(
        ctx.db,
        input.columnId,
        userId,
      );

      // Ordered photo/prompt items — index in these arrays is what the model
      // references, so we map the roast back to real content/attachment IDs.
      const photoItems = column.content.flatMap((c) => {
        if (c.type !== "photo") return [];
        const url = c.attachment?.url;
        if (!url) return [];
        // The tagger's output rides on the attachment we already loaded.
        const analysis = readPhotoAnalysis(c.attachment?.metadata);
        return [
          {
            id: c.id,
            attachmentId: c.attachmentId,
            url,
            caption: c.caption ?? undefined,
            tags: analysis?.tags ?? [],
          },
        ];
      });

      const promptItems = column.content.flatMap((c) =>
        c.type === "prompt"
          ? [{ id: c.id, prompt: c.prompt ?? "", answer: c.answer ?? "" }]
          : [],
      );

      if (photoItems.length === 0 && promptItems.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add some photos or prompts before roasting this profile.",
        });
      }

      const effectiveBio = column.bio ?? column.comparison.defaultBio ?? null;

      const roast = await roastProfile({
        providerKey: column.dataProvider,
        tone: input.tone,
        steer: input.steer,
        photos: photoItems.map((p) => ({
          url: p.url,
          caption: p.caption,
          tags: p.tags,
        })),
        prompts: promptItems.map((p) => ({
          prompt: p.prompt,
          answer: p.answer,
        })),
        bio: effectiveBio ?? undefined,
      });

      // Persisted result is id-keyed (URLs resolved live on read, never frozen),
      // mapping the model's 1-based indices back to real content IDs.
      const result: ProfileRoastResult = {
        overall: roast.overall,
        photos: roast.photos.map((p) => ({
          contentId: photoItems[p.index - 1]?.id ?? null,
          keepOrCut: p.keepOrCut,
          caption: p.caption,
          title: p.title,
          body: p.body,
        })),
        prompts: roast.prompts.map((p) => ({
          contentId: promptItems[p.index - 1]?.id ?? null,
          roast: p.roast,
          rewrite: p.rewrite,
        })),
        bio: roast.bio,
        realTalk: roast.realTalk,
      };

      const inputSnapshot = {
        providerKey: column.dataProvider,
        steer: input.steer ?? null,
      };

      // One roast per profile — overwrite on regeneration.
      const row = await upsertAiOutput({
        db: ctx.db,
        userId,
        kind: "profile_roast",
        subjectId: input.columnId,
        tone: input.tone,
        model: ROAST_MODEL,
        input: inputSnapshot,
        output: result,
      });

      trackServerEvent(userId, "roast_generated", {
        columnId: input.columnId,
        comparisonId: column.comparison.id,
        provider: column.dataProvider.toLowerCase(),
        tone: input.tone,
        photoCount: photoItems.length,
        promptCount: promptItems.length,
      });

      return {
        tone: input.tone,
        updatedAt: row.updatedAt,
        // A freshly generated roast is always the current format.
        isOutdated: false,
        ...hydrateRoast(result, column.content, effectiveBio),
      };
    }),

  /**
   * Re-roast a SINGLE photo with a user correction (e.g. "there's no wine glass
   * — look again"). Re-uses the saved roast's tone, patches just that photo's
   * verdict in the stored result, and returns the refreshed (hydrated) photo.
   */
  reroastPhoto: aiProcedure
    .input(
      z.object({
        columnId: z.string(),
        contentId: z.string(),
        steer: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const column = await loadOwnedColumnWithContent(
        ctx.db,
        input.columnId,
        userId,
      );

      // A single-photo correction only makes sense against an existing roast.
      const row = await ctx.db.query.aiOutputTable.findFirst({
        where: and(
          eq(aiOutputTable.kind, "profile_roast"),
          eq(aiOutputTable.columnId, input.columnId),
          eq(aiOutputTable.scope, ""),
        ),
      });
      if (!row) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Roast this profile before correcting a photo.",
        });
      }
      const result = row.output as ProfileRoastResult;

      const photoContent = column.content.find(
        (c) => c.id === input.contentId && c.type === "photo",
      );
      const photoUrl = photoContent?.attachment?.url;
      if (!photoContent || !photoUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Photo not found on this profile.",
        });
      }

      // The verdict must already exist in the stored roast; if not, the roast
      // predates this photo — a full re-roast is the right move.
      const targetIndex = result.photos.findIndex(
        (p) => p.contentId === input.contentId,
      );
      if (targetIndex === -1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This photo isn't in the current roast — re-roast to include it.",
        });
      }

      const tone: RoastTone =
        row.tone && (ROAST_TONES as readonly string[]).includes(row.tone)
          ? (row.tone as RoastTone)
          : "mild";

      const verdict = await roastSinglePhoto({
        providerKey: column.dataProvider,
        tone,
        photo: { url: photoUrl, caption: photoContent.caption ?? undefined },
        steer: input.steer,
      });

      // Patch just this photo's verdict; everything else stays put.
      const updatedPhotos = result.photos.map((p, i) =>
        i === targetIndex
          ? {
              contentId: p.contentId,
              keepOrCut: verdict.keepOrCut,
              caption: verdict.caption,
              title: verdict.title,
              body: verdict.body,
            }
          : p,
      );
      const updatedResult: ProfileRoastResult = {
        ...result,
        photos: updatedPhotos,
      };

      await ctx.db
        .update(aiOutputTable)
        .set({ output: updatedResult, updatedAt: new Date() })
        .where(eq(aiOutputTable.id, row.id));

      // Return the refreshed photo (hydrated with its live URL) so the client
      // can swap just this card in place.
      return {
        contentId: input.contentId,
        keepOrCut: verdict.keepOrCut,
        caption: verdict.caption,
        title: verdict.title,
        body: verdict.body,
        url: photoUrl,
      };
    }),

  /**
   * Load the (single) saved roast for a profile, if any. Resolves photo URLs
   * live. Re-roast on demand to refresh after profile changes.
   */
  getProfileRoast: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const column = await loadOwnedColumnWithContent(
        ctx.db,
        input.columnId,
        userId,
      );

      const row = await ctx.db.query.aiOutputTable.findFirst({
        where: and(
          eq(aiOutputTable.kind, "profile_roast"),
          eq(aiOutputTable.columnId, input.columnId),
          eq(aiOutputTable.scope, ""),
        ),
      });
      if (!row) return null;

      const result = row.output as ProfileRoastResult;
      const effectiveBio = column.bio ?? column.comparison.defaultBio ?? null;

      return {
        tone: row.tone,
        updatedAt: row.updatedAt,
        // Older-format roast → UI can nudge a re-roast instead of rendering stale.
        isOutdated: isOutdated(row),
        ...hydrateRoast(result, column.content, effectiveBio),
      };
    }),

  /**
   * Apply a saved roast's deterministic fixes to a profile — either in place or
   * onto a fresh duplicate ("Create improved version"). Non-destructive:
   * photos are REORDERED (keep → maybe → cut), never deleted; the bio is set to
   * the chosen rewrite. Non-mechanical fixes (e.g. "add a prompt") are left to
   * the user. Reuses ProfileComparisonService (which re-checks ownership).
   */
  applyRoast: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        mode: z.enum(["inPlace", "newVersion"]),
        rewriteIndex: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Source column (ordered content) + ownership + saved roast.
      const source = await loadOwnedColumnWithContent(
        ctx.db,
        input.columnId,
        userId,
      );

      const roastRow = await ctx.db.query.aiOutputTable.findFirst({
        where: and(
          eq(aiOutputTable.kind, "profile_roast"),
          eq(aiOutputTable.columnId, input.columnId),
          eq(aiOutputTable.scope, ""),
        ),
      });
      if (!roastRow) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Roast this profile before applying changes.",
        });
      }
      const roastResult = roastRow.output as ProfileRoastResult;

      // keep/maybe/cut keyed by the ORDER of the source photo it was given for —
      // order survives duplication, so the same map drives both modes. Stale-safe:
      // verdicts for since-deleted photos simply won't match any live content.
      const verdictByOrder = new Map<number, "keep" | "maybe" | "cut">();
      const verdictByContentId = new Map<string, "keep" | "maybe" | "cut">();
      for (const p of roastResult.photos) {
        if (p.contentId) verdictByContentId.set(p.contentId, p.keepOrCut);
      }
      for (const c of source.content) {
        const v = verdictByContentId.get(c.id);
        if (c.type === "photo" && v) verdictByOrder.set(c.order, v);
      }

      // Target column: the source itself, or a fresh duplicate.
      let targetColumnId = source.id;
      let targetContent = source.content;
      if (input.mode === "newVersion") {
        const copy = await ProfileComparisonService.duplicateColumn({
          columnId: source.id,
          userId,
        });
        targetColumnId = copy.id;
        const copyWithContent =
          await ctx.db.query.comparisonColumnTable.findFirst({
            where: eq(comparisonColumnTable.id, copy.id),
            with: {
              content: {
                orderBy: (content, { asc }) => [asc(content.order)],
                with: { attachment: true },
              },
            },
          });
        targetContent = copyWithContent?.content ?? [];
      }

      // Reorder: photos sorted keep(0) → maybe(1) → cut(2) (stable within bucket,
      // cuts land at the end — never deleted), then non-photo content trailing.
      const rank = (c: (typeof targetContent)[number]) =>
        c.type === "photo" ? RANK[verdictByOrder.get(c.order) ?? "maybe"] : 99;
      const reordered = [...targetContent].sort(
        (a, b) => rank(a) - rank(b) || a.order - b.order,
      );
      if (reordered.length > 0) {
        await ProfileComparisonService.reorderContent({
          columnId: targetColumnId,
          userId,
          contentOrders: reordered.map((c, i) => ({ id: c.id, order: i })),
        });
      }

      // Bio: apply the chosen rewrite.
      const rewrite =
        input.rewriteIndex !== undefined
          ? roastResult.bio?.rewrites[input.rewriteIndex]
          : undefined;
      if (rewrite) {
        await ProfileComparisonService.updateColumn({
          columnId: targetColumnId,
          userId,
          bio: rewrite.text,
        });
      }

      return { columnId: targetColumnId };
    }),

  /**
   * Dev-only: hard-delete the saved roast for a profile (column) so the
   * idle/empty states can be re-tested without re-roasting. Guarded to
   * non-production and to the owning user.
   */
  deleteProfileRoast: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Deleting roasts is only available outside production",
        });
      }

      const userId = ctx.session.user.id;

      // Ownership check via the column's parent comparison.
      await loadOwnedColumnLight(ctx.db, input.columnId, userId);

      await ctx.db
        .delete(aiOutputTable)
        .where(
          and(
            eq(aiOutputTable.kind, "profile_roast"),
            eq(aiOutputTable.columnId, input.columnId),
          ),
        );

      return { success: true };
    }),
};
