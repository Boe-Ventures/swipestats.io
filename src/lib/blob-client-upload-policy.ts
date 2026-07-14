import { z } from "zod";

import type { ResourceType } from "@/server/db/schema";

const PROFILE_ID_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CLIENT_PAYLOAD_LENGTH = 2_048;

const DATA_CONTENT_TYPES = ["application/json"] as const;
const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const CLIENT_UPLOAD_LIMITS = {
  dataExportBytes: 200 * 1024 * 1024,
  imageBytes: 10 * 1024 * 1024,
  tokenTtlMs: 5 * 60 * 1000,
} as const;

const profileIdSchema = z.string().regex(PROFILE_ID_PATTERN);
const clientUploadContextSchema = z.discriminatedUnion("resourceType", [
  z
    .object({
      resourceType: z.literal("tinder_data"),
      tinderId: profileIdSchema,
    })
    .strict(),
  z
    .object({
      resourceType: z.literal("hinge_data"),
      hingeId: profileIdSchema,
    })
    .strict(),
  z
    .object({
      resourceType: z.literal("raya_data"),
      rayaId: profileIdSchema,
    })
    .strict(),
  z
    .object({
      resourceType: z.literal("user_photo"),
      resourceId: z.literal("gallery"),
      alt: z.string().trim().max(500).optional(),
    })
    .strict(),
]);

export type ClientUploadContext = z.infer<typeof clientUploadContextSchema>;

export interface ClientUploadPolicy {
  resourceType: ResourceType;
  resourceId?: string;
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
  validUntil: number;
  addRandomSuffix: true;
  tokenPayload: string;
}

function parseContext(clientPayload: string | null): ClientUploadContext {
  if (!clientPayload) {
    throw new Error("Upload resource context is required");
  }
  if (clientPayload.length > MAX_CLIENT_PAYLOAD_LENGTH) {
    throw new Error("Upload resource context is invalid");
  }

  let value: unknown;
  try {
    value = JSON.parse(clientPayload);
  } catch {
    throw new Error("Upload resource context is invalid");
  }

  const result = clientUploadContextSchema.safeParse(value);
  if (!result.success) {
    throw new Error("Upload resource context is invalid");
  }

  return result.data;
}

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

function assertSafeFilename(value: string): void {
  if (!SAFE_FILENAME_PATTERN.test(value) || value.includes("..")) {
    throw new Error("Upload pathname is invalid");
  }
}

function assertDataPathname(
  pathname: string,
  prefix: string,
  profileId: string,
): void {
  const parts = pathname.split("/");
  if (
    parts.length !== 4 ||
    parts[0] !== prefix ||
    parts[1] !== profileId ||
    !parts[2] ||
    !isRealIsoDate(parts[2]) ||
    parts[3] !== "data.json"
  ) {
    throw new Error("Upload pathname is invalid");
  }
}

function assertMediaPathname(
  pathname: string,
  prefix: string,
  resourceId: string,
): void {
  const parts = pathname.split("/");
  if (
    parts.length !== 3 ||
    parts[0] !== prefix ||
    parts[1] !== resourceId ||
    !parts[2]
  ) {
    throw new Error("Upload pathname is invalid");
  }
  assertSafeFilename(parts[2]);
}

/**
 * Resolve the complete Vercel Blob client-token policy from server-owned rules.
 * The client chooses only a recognized resource context; it cannot widen MIME
 * types, file sizes, token lifetime, or its authenticated storage namespace.
 */
export function resolveClientUploadPolicy(input: {
  pathname: string;
  clientPayload: string | null;
  userId: string;
  now?: number;
}): ClientUploadPolicy {
  const context = parseContext(input.clientPayload);
  const validUntil =
    (input.now ?? Date.now()) + CLIENT_UPLOAD_LIMITS.tokenTtlMs;

  let allowedContentTypes: string[];
  let maximumSizeInBytes: number;
  let resourceId: string | undefined;

  switch (context.resourceType) {
    case "tinder_data":
      assertDataPathname(input.pathname, "tinder-data", context.tinderId);
      allowedContentTypes = [...DATA_CONTENT_TYPES];
      maximumSizeInBytes = CLIENT_UPLOAD_LIMITS.dataExportBytes;
      break;
    case "hinge_data":
      assertDataPathname(input.pathname, "hinge-data", context.hingeId);
      allowedContentTypes = [...DATA_CONTENT_TYPES];
      maximumSizeInBytes = CLIENT_UPLOAD_LIMITS.dataExportBytes;
      break;
    case "raya_data":
      assertDataPathname(input.pathname, "raya-data", context.rayaId);
      allowedContentTypes = [...DATA_CONTENT_TYPES];
      maximumSizeInBytes = CLIENT_UPLOAD_LIMITS.dataExportBytes;
      break;
    case "user_photo":
      assertMediaPathname(input.pathname, "user-photos", input.userId);
      allowedContentTypes = [...IMAGE_CONTENT_TYPES];
      maximumSizeInBytes = CLIENT_UPLOAD_LIMITS.imageBytes;
      resourceId = context.resourceId;
      break;
  }

  return {
    resourceType: context.resourceType,
    resourceId,
    allowedContentTypes,
    maximumSizeInBytes,
    validUntil,
    addRandomSuffix: true,
    tokenPayload: JSON.stringify({
      userId: input.userId,
      resourceType: context.resourceType,
      ...(resourceId ? { resourceId } : {}),
    }),
  };
}

export const CLIENT_UPLOAD_PUBLIC_CONFIG = {
  tinder_data: {
    allowedContentTypes: [...DATA_CONTENT_TYPES],
    maximumSizeInBytes: CLIENT_UPLOAD_LIMITS.dataExportBytes,
  },
  hinge_data: {
    allowedContentTypes: [...DATA_CONTENT_TYPES],
    maximumSizeInBytes: CLIENT_UPLOAD_LIMITS.dataExportBytes,
  },
  raya_data: {
    allowedContentTypes: [...DATA_CONTENT_TYPES],
    maximumSizeInBytes: CLIENT_UPLOAD_LIMITS.dataExportBytes,
  },
  user_photo: {
    allowedContentTypes: [...IMAGE_CONTENT_TYPES],
    maximumSizeInBytes: CLIENT_UPLOAD_LIMITS.imageBytes,
  },
} satisfies Partial<
  Record<
    ResourceType,
    { allowedContentTypes: string[]; maximumSizeInBytes: number }
  >
>;
