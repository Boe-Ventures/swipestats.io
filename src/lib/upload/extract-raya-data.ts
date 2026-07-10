import type {
  AnonymizedRayaDataJSON,
  RayaArchiveFiles,
  RayaDailyUsage,
  RayaMatchExport,
  RayaMessageExport,
  RayaSwipeExport,
  RayaUserExport,
  SwipestatsRayaProfilePayload,
} from "@/lib/interfaces/RayaDataJSON";
import { createSHA256Hash } from "@/lib/utils/hash";

const REQUIRED_FILES = [
  "user.json",
  "matches.json",
  "messages.json",
  "social_likes_dislikes.json",
] as const;

function findFile(files: RayaArchiveFiles, baseName: string): string | null {
  const entry = Object.entries(files).find(
    ([name]) => name.split("/").pop()?.toLowerCase() === baseName,
  );
  return entry?.[1] ?? null;
}

function parseFile<T>(files: RayaArchiveFiles, baseName: string): T {
  const content = findFile(files, baseName);
  if (!content) throw new Error(`Missing required Raya file: ${baseName}`);

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Could not parse Raya file: ${baseName}`);
  }
}

function assertDate(value: string, field: string): void {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid Raya date in ${field}`);
  }
}

function incrementDaily(
  daily: Map<string, RayaDailyUsage>,
  timestamp: string,
  field: keyof Omit<RayaDailyUsage, "date">,
): void {
  assertDate(timestamp, field);
  const date = timestamp.slice(0, 10);
  const row = daily.get(date) ?? {
    date,
    likes: 0,
    passes: 0,
    matches: 0,
    messagesSent: 0,
  };
  row[field] += 1;
  daily.set(date, row);
}

function validateUser(user: RayaUserExport): void {
  if (!user || typeof user !== "object") {
    throw new Error("Raya user.json is invalid");
  }
  if (!user.email_address) {
    throw new Error("Raya user.json is missing email_address");
  }
  assertDate(user.birth_date, "birth_date");
  if (!user.gender) throw new Error("Raya user.json is missing gender");
}

function validateArray(
  value: unknown,
  fileName: string,
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Raya ${fileName} must contain an array`);
  }
}

function collectPhotos(user: RayaUserExport): string[] {
  const urls = [
    user.profile_image,
    ...(user.slideshow_images?.map((image) => image.url) ?? []),
  ];
  return [...new Set(urls.filter((url): url is string => !!url))];
}

/**
 * Parse a Raya GDPR archive and remove direct identifiers in the browser.
 *
 * Raya currently exports messages without a recipient or conversation ID, so
 * we retain only daily sent-message counts. Message bodies, names, email,
 * Instagram username, contact identifiers, coordinates, and swipe-user IDs
 * never enter the anonymized payload.
 */
export async function extractRayaData(
  files: RayaArchiveFiles,
): Promise<SwipestatsRayaProfilePayload> {
  for (const fileName of REQUIRED_FILES) {
    if (!findFile(files, fileName)) {
      throw new Error(`Missing required Raya file: ${fileName}`);
    }
  }

  const user = parseFile<RayaUserExport>(files, "user.json");
  const matches = parseFile<RayaMatchExport[]>(files, "matches.json");
  const messages = parseFile<RayaMessageExport[]>(files, "messages.json");
  const swipes = parseFile<RayaSwipeExport[]>(
    files,
    "social_likes_dislikes.json",
  );

  validateUser(user);
  validateArray(matches, "matches.json");
  validateArray(messages, "messages.json");
  validateArray(swipes, "social_likes_dislikes.json");

  const daily = new Map<string, RayaDailyUsage>();

  for (const swipe of swipes) {
    if (typeof swipe?.liked !== "boolean" || !swipe.swiped_at) {
      throw new Error("Raya social_likes_dislikes.json has an invalid record");
    }
    incrementDaily(daily, swipe.swiped_at, swipe.liked ? "likes" : "passes");
  }

  for (const match of matches) {
    if (!match?.created_at || typeof match.match_type !== "string") {
      throw new Error("Raya matches.json has an invalid record");
    }
    if (match.match_type === "MATCHED") {
      incrementDaily(daily, match.created_at, "matches");
    }
  }

  const selfUserIds = new Set(
    swipes.map((swipe) => swipe.user).filter((userId) => !!userId),
  );
  for (const message of messages) {
    if (!message?.created_at) {
      throw new Error("Raya messages.json has an invalid record");
    }
    // Current Raya exports identify the uploader as the same opaque user ID in
    // swipe and message records. Ignore any other senders rather than guessing
    // that a received message was sent by the uploader.
    if (selfUserIds.has(message.sender)) {
      incrementDaily(daily, message.created_at, "messagesSent");
    }
  }

  const usage = [...daily.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  if (usage.length === 0) {
    throw new Error("Raya archive contains no activity");
  }

  const summary = usage.reduce(
    (total, day) => ({
      likes: total.likes + day.likes,
      passes: total.passes + day.passes,
      matches: total.matches + day.matches,
      messagesSent: total.messagesSent + day.messagesSent,
    }),
    { likes: 0, passes: 0, matches: 0, messagesSent: 0 },
  );

  const normalizedEmail = user.email_address.trim().toLowerCase();
  const rayaId = await createSHA256Hash(`raya-profile:v1:${normalizedEmail}`);
  const anonymizedRayaJson: AnonymizedRayaDataJSON = {
    User: {
      birth_date: user.birth_date,
      gender: user.gender,
      occupation: user.occupation || undefined,
      residence_location: user.residence_location || undefined,
      company: user.company_name || user.company || undefined,
      status: user.status || undefined,
      instagram_connected: !!user.instagram_username,
      website_connected: !!user.website,
      photos: collectPhotos(user),
    },
    Usage: usage,
    Summary: {
      ...summary,
      firstActivityAt: usage[0]!.date,
      lastActivityAt: usage.at(-1)!.date,
    },
  };

  return { rayaId, anonymizedRayaJson };
}
