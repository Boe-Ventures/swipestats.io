import { and, eq, sql } from "drizzle-orm";
import { geolocation } from "@vercel/functions";

import { db, withTransaction, type TransactionClient } from "@/server/db";
import { userTable } from "@/server/db/schema";
import {
  locationText,
  missingLocationPatch,
  normalizeLocation,
  validTimezone,
  type LocationValues,
} from "@/lib/location";
import { getCountryFromTimezone } from "@/lib/utils/timezone";
import { lockTinderSwipeRankPolicyInTx } from "@/server/services/swipe-rank/lifecycle.service";
import { locationRegistrySyncCte } from "./location-registry";

async function syncLocationRegistry(tx: TransactionClient, userId: string) {
  await tx.execute(sql`WITH updated AS (SELECT * FROM "user" WHERE id = ${userId}),
    ${sql.raw(locationRegistrySyncCte)} SELECT id FROM updated`);
}

export function uploadLocation(
  headers: Headers,
  input: { timezone?: string; country?: string },
): LocationValues {
  const geo = geolocation(new Request("https://swipestats.io", { headers }));
  const timeZone =
    validTimezone(input.timezone) ??
    validTimezone(headers.get("x-vercel-ip-timezone"));
  return normalizeLocation({
    city: geo.country ? geo.city : undefined,
    region: geo.country ? geo.countryRegion : undefined,
    country:
      geo.country ||
      input.country ||
      (timeZone ? getCountryFromTimezone(timeZone) : undefined),
    timeZone,
  });
}

export async function fillMissingUserLocation(
  userId: string,
  candidate: LocationValues,
) {
  const existing = await db.query.userTable.findFirst({
    where: eq(userTable.id, userId),
    columns: {
      city: true,
      region: true,
      country: true,
      timeZone: true,
      continent: true,
    },
  });
  if (!existing) return false;
  const patch = missingLocationPatch(existing, candidate);
  if (!Object.values(patch).some(Boolean)) return false;
  // Guard the read/plan/write boundary, including changes made by a concurrent manual edit.
  return withTransaction(async (tx) => {
    await lockTinderSwipeRankPolicyInTx(tx);
    const updated = await tx
      .update(userTable)
      .set(patch)
      .where(
        and(
          eq(userTable.id, userId),
          ...(
            ["city", "region", "country", "timeZone", "continent"] as const
          ).map(
            (field) =>
              sql`${userTable[field]} IS NOT DISTINCT FROM ${existing[field]}`,
          ),
        ),
      )
      .returning({ id: userTable.id });
    if (updated.length) await syncLocationRegistry(tx, userId);
    return updated.length > 0;
  });
}

/** Location enrichment must not turn a committed upload into a failed upload. */
export async function captureUploadLocation(
  userId: string,
  detected: LocationValues,
  profile: LocationValues,
) {
  try {
    // Provider geography is primary. Add request geography only when the places agree.
    const primary = normalizeLocation(profile);
    const candidate = {
      ...primary,
      ...missingLocationPatch(primary, detected),
    };
    if (!locationText(candidate.timeZone))
      candidate.timeZone = detected.timeZone;
    await fillMissingUserLocation(userId, candidate);
  } catch (error) {
    console.warn(
      "Upload succeeded, but location enrichment failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

export async function updateUserLocation(input: {
  userId: string;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  timeZone?: string | null;
  continent?: string | null;
}) {
  const { userId, ...values } = input;
  return withTransaction(async (tx) => {
    await lockTinderSwipeRankPolicyInTx(tx);
    const updated = await tx
      .update(userTable)
      .set(values)
      .where(eq(userTable.id, userId))
      .returning();
    if (!updated[0]) {
      throw new Error(`User ${userId} was not found for location update.`);
    }
    await syncLocationRegistry(tx, userId);
    return updated[0];
  });
}
