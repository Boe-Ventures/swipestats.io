import { differenceInDays, differenceInYears } from "date-fns";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { mapHingeGender } from "@/lib/utils/gender";
import { withTransaction, db } from "@/server/db";
import {
  originalAnonymizedFileTable,
  rayaProfileTable,
  rayaUsageTable,
  type RayaProfile,
  type RayaProfileInsert,
  type RayaUsageInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { fetchBlobJson } from "@/server/services/blob.service";

const rayaUsageSchema = z.object({
  date: z.iso.date(),
  likes: z.number().int().nonnegative(),
  passes: z.number().int().nonnegative(),
  matches: z.number().int().nonnegative(),
  messagesSent: z.number().int().nonnegative(),
});

const anonymizedRayaDataSchema = z.object({
  User: z.object({
    birth_date: z.string().refine((date) => !Number.isNaN(Date.parse(date))),
    gender: z.string().min(1).max(100),
    occupation: z.string().max(500).optional(),
    residence_location: z.string().max(500).optional(),
    company: z.string().max(500).optional(),
    status: z.string().max(100).optional(),
    instagram_connected: z.boolean(),
    website_connected: z.boolean(),
    photos: z.array(z.url()).max(20),
  }),
  Usage: z.array(rayaUsageSchema).min(1).max(5000),
  Summary: z.object({
    likes: z.number().int().nonnegative(),
    passes: z.number().int().nonnegative(),
    matches: z.number().int().nonnegative(),
    messagesSent: z.number().int().nonnegative(),
    firstActivityAt: z.iso.date(),
    lastActivityAt: z.iso.date(),
  }),
});

type AnonymizedRayaData = z.infer<typeof anonymizedRayaDataSchema>;

function summarizeUsage(json: AnonymizedRayaData) {
  const totals = json.Usage.reduce(
    (total, day) => ({
      likes: total.likes + day.likes,
      passes: total.passes + day.passes,
      matches: total.matches + day.matches,
      messagesSent: total.messagesSent + day.messagesSent,
    }),
    { likes: 0, passes: 0, matches: 0, messagesSent: 0 },
  );
  const dates = json.Usage.map((day) => day.date).sort();

  return {
    ...totals,
    firstActivityAt: dates[0]!,
    lastActivityAt: dates.at(-1)!,
  };
}

function buildProfileInsert(
  json: AnonymizedRayaData,
  activityRange: { firstActivityAt: string; lastActivityAt: string },
  rayaId: string,
  userId: string,
): Omit<RayaProfileInsert, "createdAt" | "updatedAt"> {
  const firstDayOnApp = new Date(activityRange.firstActivityAt);
  const lastDayOnApp = new Date(activityRange.lastActivityAt);
  const birthDate = new Date(json.User.birth_date);

  return {
    rayaId,
    userId,
    birthDate,
    ageAtUpload: differenceInYears(new Date(), birthDate),
    gender: mapHingeGender(json.User.gender.toLowerCase()),
    genderStr: json.User.gender,
    occupation: json.User.occupation ?? null,
    company: json.User.company ?? null,
    residenceLocation: json.User.residence_location ?? null,
    status: json.User.status ?? null,
    instagramConnected: json.User.instagram_connected,
    websiteConnected: json.User.website_connected,
    photoUrls: json.User.photos,
    firstDayOnApp,
    lastDayOnApp,
    daysInProfilePeriod: differenceInDays(lastDayOnApp, firstDayOnApp) + 1,
  };
}

function buildUsageInserts(
  json: AnonymizedRayaData,
  rayaId: string,
): RayaUsageInsert[] {
  return json.Usage.map((day) => {
    const totalSwipes = day.likes + day.passes;
    return {
      dateStamp: new Date(day.date),
      dateStampRaw: day.date,
      rayaProfileId: rayaId,
      swipeLikes: day.likes,
      swipePasses: day.passes,
      swipesCombined: totalSwipes,
      matches: day.matches,
      messagesSent: day.messagesSent,
      matchRate: day.likes > 0 ? day.matches / day.likes : 0,
      likeRate: totalSwipes > 0 ? day.likes / totalSwipes : 0,
    };
  });
}

export async function getRayaProfile(
  rayaId: string,
): Promise<RayaProfile | null> {
  return (
    (await db.query.rayaProfileTable.findFirst({
      where: eq(rayaProfileTable.rayaId, rayaId),
    })) ?? null
  );
}

export async function getRayaProfileForUser(
  userId: string,
): Promise<RayaProfile | null> {
  return (
    (await db.query.rayaProfileTable.findFirst({
      where: eq(rayaProfileTable.userId, userId),
    })) ?? null
  );
}

export async function saveRayaProfile(data: {
  rayaId: string;
  blobUrl: string;
  userId: string;
}): Promise<{
  profile: RayaProfile;
  created: boolean;
  metrics: {
    usageDays: number;
    likes: number;
    passes: number;
    matches: number;
    messagesSent: number;
  };
}> {
  const rawJson = await fetchBlobJson<unknown>(data.blobUrl);
  const json = anonymizedRayaDataSchema.parse(rawJson);
  const summary = summarizeUsage(json);
  const profileInput = buildProfileInsert(
    json,
    summary,
    data.rayaId,
    data.userId,
  );
  const usageInput = buildUsageInserts(json, data.rayaId);
  const existing = await getRayaProfile(data.rayaId);

  const profile = await withTransaction(async (tx) => {
    await tx.insert(originalAnonymizedFileTable).values({
      id: createId("oaf"),
      dataProvider: "RAYA",
      swipestatsVersion: "SWIPESTATS_4",
      file: null,
      blobUrl: data.blobUrl,
      userId: data.userId,
    });

    if (existing) {
      await tx
        .delete(rayaUsageTable)
        .where(eq(rayaUsageTable.rayaProfileId, data.rayaId));
    }

    const [savedProfile] = await tx
      .insert(rayaProfileTable)
      .values(profileInput)
      .onConflictDoUpdate({
        target: rayaProfileTable.rayaId,
        set: {
          ...profileInput,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!savedProfile) throw new Error("Failed to save Raya profile");

    if (usageInput.length > 0) {
      await tx.insert(rayaUsageTable).values(usageInput);
    }

    return savedProfile;
  });

  return {
    profile,
    created: !existing,
    metrics: {
      usageDays: usageInput.length,
      likes: summary.likes,
      passes: summary.passes,
      matches: summary.matches,
      messagesSent: summary.messagesSent,
    },
  };
}
