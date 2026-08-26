import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { generateStructured } from "@/lib/ai/generate-structured";
import { AI_MODELS } from "@/lib/ai/models";
import { db, withTransaction } from "@/server/db";
import { mediaTable } from "@/server/db/schema";
import { deleteBlob, uploadBlob } from "@/server/services/blob.service";
import { anonymizeImageBuffer } from "@/server/services/image-anonymization.service";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import type { ClosedSwipeRankPeriodBounds } from "./periods";

const MAX_PROFILE_IMAGES = 9;
const MAX_DOWNLOAD_BYTES = 20_000_000;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const AUDIT_MODEL = AI_MODELS.sonnet5;

const imagePrivacyAuditSchema = z.object({
  verdict: z.enum(["PASS", "NEEDS_REVIEW"]),
  summary: z.string().trim().min(1).max(500),
  images: z.array(
    z.object({
      imageNumber: z.number().int().positive(),
      safe: z.boolean(),
      issues: z.array(
        z.enum([
          "RECOGNIZABLE_FACE",
          "NAME_OR_HANDLE",
          "CONTACT_DETAILS",
          "LICENSE_PLATE",
          "QR_OR_BARCODE",
          "OTHER_IDENTIFIER",
        ]),
      ),
      note: z.string().trim().max(300),
    }),
  ),
});

interface TargetRow extends Record<string, unknown> {
  profile_id: string;
  provider_profile_id: string;
}

interface PeriodTargetRow extends TargetRow {
  rank: number;
  source_image_count: number;
  pending_image_count: number;
  approved_image_count: number;
  needs_review_image_count: number;
  source_unavailable_image_count: number;
}

interface SourceMediaRow extends Record<string, unknown> {
  id: string;
  url: string;
}

class SourceImagePreparationError extends Error {
  constructor(
    message: string,
    readonly mediaId: string,
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SourceImagePreparationError";
  }
}

class NoAccessibleSourceImagesError extends Error {
  constructor() {
    super("Every pending source image is unavailable.");
    this.name = "NoAccessibleSourceImagesError";
  }
}

function isUnavailableSourceReason(reason: string) {
  return /HTTP (400|401|403|404|410)\b/.test(reason);
}

export interface PreparedSwipeRankImage {
  mediaId: string;
  buffer: Buffer;
  faceCount: number;
}

export interface SwipeRankImageAnonymizationResult {
  profileId: string;
  providerProfileId: string;
  verdict: "PASS" | "NEEDS_REVIEW";
  sourceImageCount: number;
  savedImageCount: number;
  summary: string;
}

export type SwipeRankPeriodImageBatchResult =
  | {
      status: "PROCESSED";
      rank: number;
      result: SwipeRankImageAnonymizationResult;
    }
  | {
      status:
        | "NO_SOURCE_IMAGES"
        | "ALREADY_APPROVED"
        | "PRIVACY_HOLD"
        | "SOURCE_UNAVAILABLE";
      rank: number;
      profileId: string;
      providerProfileId: string;
      sourceImageCount: number;
      savedImageCount: number;
      summary: string;
    };

export async function listLatestSwipeRankImageTargets(limit: number) {
  const result = await db.execute<TargetRow>(sql`
    SELECT profile.id AS profile_id, profile.provider_profile_id
    FROM swipe_rank_profile profile
    JOIN tinder_profile tinder
      ON tinder.tinder_id = profile.provider_profile_id
    WHERE profile.data_provider = 'TINDER'
      AND profile.is_synthetic = false
      AND EXISTS (
        SELECT 1
        FROM swipe_rank_entry entry
        JOIN swipe_rank_snapshot snapshot ON snapshot.id = entry.snapshot_id
        WHERE entry.profile_id = profile.id
          AND snapshot.status = 'PUBLISHED'
      )
      AND EXISTS (
        SELECT 1
        FROM media
        WHERE media.tinder_profile_id = profile.provider_profile_id
          AND media.type IN ('image', 'photo')
          AND media.swipe_rank_image_review_status IS NULL
          AND media.swipe_rank_anonymized_url IS NULL
      )
    ORDER BY
      tinder.created_at DESC,
      tinder.tinder_id DESC
    LIMIT ${limit}
  `);
  return result.rows;
}

/**
 * Selects the visible rows from one published leaderboard edition. The window
 * rank mirrors the admin leaderboard after currently excluded profiles have
 * been removed.
 */
export async function listSwipeRankPeriodImageTargets(
  period: ClosedSwipeRankPeriodBounds,
  limit: number,
  offset = 0,
) {
  const result = await db.execute<PeriodTargetRow>(sql`
    WITH selected_snapshot AS (
      SELECT snapshot.id
      FROM swipe_rank_snapshot snapshot
      WHERE snapshot.data_provider = 'TINDER'
        AND snapshot.metric_version = ${SWIPE_RANK_METRIC_VERSION}
        AND snapshot.period_kind = ${period.kind}
        AND snapshot.period_start = ${period.start}::date
        AND snapshot.period_end = ${period.end}::date
        AND snapshot.status = 'PUBLISHED'
      ORDER BY snapshot.published_at DESC, snapshot.id DESC
      LIMIT 1
    ), field AS (
      SELECT
        profile.id AS profile_id,
        profile.provider_profile_id,
        entry.metric_value,
        coalesce(profile_media.source_image_count, 0)::integer
          AS source_image_count,
        coalesce(profile_media.pending_image_count, 0)::integer
          AS pending_image_count,
        coalesce(profile_media.approved_image_count, 0)::integer
          AS approved_image_count,
        coalesce(profile_media.needs_review_image_count, 0)::integer
          AS needs_review_image_count,
        coalesce(profile_media.source_unavailable_image_count, 0)::integer
          AS source_unavailable_image_count
      FROM selected_snapshot snapshot
      JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
      JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
      LEFT JOIN LATERAL (
        SELECT
          count(*)::integer AS source_image_count,
          count(*) FILTER (
            WHERE media.swipe_rank_image_review_status IS NULL
              AND media.swipe_rank_anonymized_url IS NULL
          )::integer AS pending_image_count,
          count(media.swipe_rank_anonymized_url)::integer
            AS approved_image_count,
          count(*) FILTER (
            WHERE media.swipe_rank_image_review_status = 'NEEDS_REVIEW'
          )::integer AS needs_review_image_count,
          count(*) FILTER (
            WHERE media.swipe_rank_image_review_status = 'SOURCE_UNAVAILABLE'
          )::integer AS source_unavailable_image_count
        FROM media
        WHERE media.tinder_profile_id = profile.provider_profile_id
          AND media.type IN ('image', 'photo')
      ) profile_media ON true
      WHERE profile.is_synthetic = false
        AND profile.is_swipe_rank_excluded = false
    ), ranked AS (
      SELECT
        field.*,
        rank() OVER (ORDER BY metric_value DESC)::integer AS rank
      FROM field
    )
    SELECT
      profile_id,
      provider_profile_id,
      rank,
      source_image_count,
      pending_image_count,
      approved_image_count,
      needs_review_image_count,
      source_unavailable_image_count
    FROM ranked
    ORDER BY rank, provider_profile_id
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  return result.rows;
}

export async function listUnfinishedSwipeRankSourceMedia(
  providerProfileId: string,
) {
  const result = await db.execute<SourceMediaRow>(sql`
    SELECT id, url
    FROM media
    WHERE tinder_profile_id = ${providerProfileId}
      AND type IN ('image', 'photo')
      AND swipe_rank_image_review_status IS NULL
      AND swipe_rank_anonymized_url IS NULL
    ORDER BY id
    LIMIT ${MAX_PROFILE_IMAGES}
  `);
  return result.rows;
}

async function downloadImage(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsupported media URL protocol: ${parsed.protocol}`);
  }
  const response = await fetch(parsed, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}.`);
  }
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Image exceeds ${MAX_DOWNLOAD_BYTES} bytes.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Image exceeds ${MAX_DOWNLOAD_BYTES} bytes.`);
  }
  return buffer;
}

async function prepareImages(rows: SourceMediaRow[]) {
  const prepared: PreparedSwipeRankImage[] = [];
  for (const [index, row] of rows.entries()) {
    try {
      const source = await downloadImage(row.url);
      const anonymized = await anonymizeImageBuffer(source);
      prepared.push({
        mediaId: row.id,
        buffer: anonymized.buffer,
        faceCount: anonymized.faces.length,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown preparation error.";
      if (isUnavailableSourceReason(reason)) {
        await saveSourceUnavailable(row.id, reason);
        continue;
      }
      throw new SourceImagePreparationError(
        `Could not prepare source image ${index + 1} (${row.id}).`,
        row.id,
        reason,
        { cause: error },
      );
    }
  }
  return prepared;
}

async function saveSourceUnavailable(mediaId: string, reason: string) {
  await db
    .update(mediaTable)
    .set({
      swipeRankImageReviewStatus: "SOURCE_UNAVAILABLE",
      swipeRankImageReviewNote: reason.slice(0, 1_000),
      swipeRankAnonymizedAt: new Date(),
    })
    .where(eq(mediaTable.id, mediaId));
}

async function auditImages(images: PreparedSwipeRankImage[]) {
  return generateStructured({
    schema: imagePrivacyAuditSchema,
    name: "SwipeRankImagePrivacyAudit",
    description: "A strict privacy review of anonymized dating profile images.",
    model: AUDIT_MODEL,
    maxOutputTokens: 2_048,
    validationRetries: 0,
    logTag: "[swipe-rank-image-privacy]",
    providerOptions: {
      anthropic: {
        structuredOutputMode: "outputFormat",
        thinking: { type: "disabled" },
      },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Review these machine-anonymized profile images for an internal admin interface.",
              "Return PASS only when every visible face is blurred beyond recognition and no direct identifier remains legible.",
              "Direct identifiers include names, social handles, email addresses, phone numbers, license plates, and QR or barcodes.",
              "Ordinary scenery, clothing, tattoos, and broad location cues are acceptable unless they directly identify a person.",
              "Use NEEDS_REVIEW if uncertain. Include exactly one result for each image, in the supplied order.",
            ].join("\n"),
          },
          ...images.map((image) => ({
            type: "file" as const,
            data: image.buffer,
            mediaType: "image/jpeg" as const,
          })),
        ],
      },
    ],
  });
}

async function saveApprovedImages(
  profileId: string,
  images: PreparedSwipeRankImage[],
) {
  const uploaded: Array<PreparedSwipeRankImage & { url: string }> = [];
  try {
    for (const image of images) {
      const result = await uploadBlob(
        `swipe-rank/anonymized/${profileId}/${image.mediaId}.jpg`,
        image.buffer,
        {
          access: "public",
          addRandomSuffix: false,
          contentType: "image/jpeg",
        },
      );
      uploaded.push({ ...image, url: result.url });
    }
    const completedAt = new Date();
    await withTransaction(async (tx) => {
      for (const image of uploaded) {
        await tx
          .update(mediaTable)
          .set({
            swipeRankAnonymizedUrl: image.url,
            swipeRankAnonymizedAt: completedAt,
            swipeRankAnonymizationModel: AUDIT_MODEL,
            swipeRankAnonymizedFaceCount: image.faceCount,
            swipeRankImageReviewStatus: "APPROVED",
            swipeRankImageReviewNote: null,
          })
          .where(eq(mediaTable.id, image.mediaId));
      }
    });
  } catch (error) {
    await Promise.allSettled(uploaded.map((image) => deleteBlob(image.url)));
    throw error;
  }
}

async function savePrivacyHold(
  images: PreparedSwipeRankImage[],
  audit: z.infer<typeof imagePrivacyAuditSchema>,
) {
  const completedAt = new Date();
  await withTransaction(async (tx) => {
    for (const [index, image] of images.entries()) {
      const imageAudit = audit.images[index]!;
      const note = [
        audit.summary,
        imageAudit.issues.length > 0
          ? `Issues: ${imageAudit.issues.join(", ")}.`
          : null,
        imageAudit.note || null,
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 1_000);
      await tx
        .update(mediaTable)
        .set({
          swipeRankAnonymizedAt: completedAt,
          swipeRankAnonymizationModel: AUDIT_MODEL,
          swipeRankAnonymizedFaceCount: image.faceCount,
          swipeRankImageReviewStatus: "NEEDS_REVIEW",
          swipeRankImageReviewNote: note,
        })
        .where(eq(mediaTable.id, image.mediaId));
    }
  });
}

export async function anonymizeSwipeRankProfileImages(input: {
  profileId: string;
  providerProfileId: string;
}): Promise<SwipeRankImageAnonymizationResult> {
  const rows = await listUnfinishedSwipeRankSourceMedia(
    input.providerProfileId,
  );
  if (rows.length === 0) {
    throw new Error(`Profile ${input.profileId} has no unfinished images.`);
  }
  const images = await prepareImages(rows);
  if (images.length === 0) {
    throw new NoAccessibleSourceImagesError();
  }
  return reviewAndSavePreparedSwipeRankImages({ ...input, images });
}

export async function reviewAndSavePreparedSwipeRankImages(input: {
  profileId: string;
  providerProfileId: string;
  images: PreparedSwipeRankImage[];
}): Promise<SwipeRankImageAnonymizationResult> {
  if (input.images.length === 0) {
    throw new Error(`Profile ${input.profileId} has no prepared images.`);
  }
  const { images } = input;
  const audit = await auditImages(images);
  if (
    audit.images.length !== images.length ||
    audit.images.some((image, index) => image.imageNumber !== index + 1)
  ) {
    throw new Error(
      `Sonnet returned image numbers [${audit.images.map((image) => image.imageNumber).join(", ")}]; expected 1 through ${images.length}.`,
    );
  }
  const approved =
    audit.verdict === "PASS" && audit.images.every((image) => image.safe);
  if (!approved) {
    await savePrivacyHold(images, audit);
    return {
      profileId: input.profileId,
      providerProfileId: input.providerProfileId,
      verdict: "NEEDS_REVIEW",
      sourceImageCount: images.length,
      savedImageCount: 0,
      summary: audit.summary,
    };
  }
  await saveApprovedImages(input.profileId, images);
  return {
    profileId: input.profileId,
    providerProfileId: input.providerProfileId,
    verdict: "PASS",
    sourceImageCount: images.length,
    savedImageCount: images.length,
    summary: audit.summary,
  };
}

/** Fail-fast operator batch; privacy holds are completed review outcomes. */
export async function anonymizeLatestSwipeRankProfileImages(limit = 10) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("limit must be an integer between 1 and 50.");
  }
  const targets = await listLatestSwipeRankImageTargets(limit);
  const results: SwipeRankImageAnonymizationResult[] = [];
  for (const target of targets) {
    results.push(
      await anonymizeSwipeRankProfileImages({
        profileId: target.profile_id,
        providerProfileId: target.provider_profile_id,
      }),
    );
  }
  return results;
}

/**
 * Fail-fast period batch. Rows without source media and rows already complete
 * are reported as skips; operational and privacy-review errors stop the run.
 */
export async function anonymizeSwipeRankPeriodProfileImages(input: {
  period: ClosedSwipeRankPeriodBounds;
  limit?: number;
  offset?: number;
  onResult?: (result: SwipeRankPeriodImageBatchResult) => void | Promise<void>;
}): Promise<SwipeRankPeriodImageBatchResult[]> {
  const limit = input.limit ?? 10;
  const offset = input.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new Error("limit must be an integer between 1 and 1000.");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("offset must be a nonnegative integer.");
  }
  const targets = await listSwipeRankPeriodImageTargets(
    input.period,
    limit,
    offset,
  );
  if (targets.length === 0) {
    throw new Error(
      `No published SwipeRank field exists for ${input.period.kind} ${input.period.start}.`,
    );
  }

  const results: SwipeRankPeriodImageBatchResult[] = [];
  const record = async (result: SwipeRankPeriodImageBatchResult) => {
    results.push(result);
    await input.onResult?.(result);
  };
  for (const target of targets) {
    if (target.source_image_count === 0) {
      await record({
        status: "NO_SOURCE_IMAGES",
        rank: target.rank,
        profileId: target.profile_id,
        providerProfileId: target.provider_profile_id,
        sourceImageCount: 0,
        savedImageCount: 0,
        summary: "The stored Tinder export has no source images.",
      });
      continue;
    }
    if (target.needs_review_image_count > 0) {
      await record({
        status: "PRIVACY_HOLD",
        rank: target.rank,
        profileId: target.profile_id,
        providerProfileId: target.provider_profile_id,
        sourceImageCount: target.source_image_count,
        savedImageCount: target.approved_image_count,
        summary: `${target.needs_review_image_count} images are held for privacy review.`,
      });
      continue;
    }
    if (target.pending_image_count === 0) {
      const sourceUnavailable = target.source_unavailable_image_count > 0;
      await record({
        status: sourceUnavailable ? "SOURCE_UNAVAILABLE" : "ALREADY_APPROVED",
        rank: target.rank,
        profileId: target.profile_id,
        providerProfileId: target.provider_profile_id,
        sourceImageCount: target.source_image_count,
        savedImageCount: target.approved_image_count,
        summary: sourceUnavailable
          ? `${target.source_unavailable_image_count} source images are unavailable.`
          : "Every stored source image already has an approved derivative.",
      });
      continue;
    }

    try {
      await record({
        status: "PROCESSED",
        rank: target.rank,
        result: await anonymizeSwipeRankProfileImages({
          profileId: target.profile_id,
          providerProfileId: target.provider_profile_id,
        }),
      });
    } catch (error) {
      if (error instanceof NoAccessibleSourceImagesError) {
        await record({
          status: "SOURCE_UNAVAILABLE",
          rank: target.rank,
          profileId: target.profile_id,
          providerProfileId: target.provider_profile_id,
          sourceImageCount: target.source_image_count,
          savedImageCount: target.approved_image_count,
          summary: "A stored source image is no longer accessible.",
        });
        continue;
      }
      throw new Error(
        `SwipeRank rank ${target.rank} profile ${target.provider_profile_id.slice(0, 10)} failed.`,
        { cause: error },
      );
    }
  }
  return results;
}
