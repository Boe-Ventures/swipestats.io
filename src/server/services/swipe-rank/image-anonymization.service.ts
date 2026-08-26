import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { generateStructured } from "@/lib/ai/generate-structured";
import { AI_MODELS } from "@/lib/ai/models";
import { db, withTransaction } from "@/server/db";
import { mediaTable } from "@/server/db/schema";
import { deleteBlob, uploadBlob } from "@/server/services/blob.service";
import { anonymizeImageBuffer } from "@/server/services/image-anonymization.service";

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

interface SourceMediaRow extends Record<string, unknown> {
  id: string;
  url: string;
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
          AND media.swipe_rank_anonymized_url IS NULL
      )
    ORDER BY
      tinder.created_at DESC,
      tinder.tinder_id DESC
    LIMIT ${limit}
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
  for (const row of rows) {
    const source = await downloadImage(row.url);
    const anonymized = await anonymizeImageBuffer(source);
    prepared.push({
      mediaId: row.id,
      buffer: anonymized.buffer,
      faceCount: anonymized.faces.length,
    });
  }
  return prepared;
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
          })
          .where(eq(mediaTable.id, image.mediaId));
      }
    });
  } catch (error) {
    await Promise.allSettled(uploaded.map((image) => deleteBlob(image.url)));
    throw error;
  }
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
    throw new Error("Sonnet returned an incomplete or misordered image audit.");
  }
  const approved =
    audit.verdict === "PASS" && audit.images.every((image) => image.safe);
  if (!approved) {
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
