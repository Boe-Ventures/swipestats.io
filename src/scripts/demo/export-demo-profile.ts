/**
 * Script to export demo profile data for marketing page showcase
 * Run with: bun run src/scripts/export-demo-profile.ts
 */

import { db } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import {
  tinderProfileTable,
  tinderUsageTable,
  profileMetaTable,
  eventTable,
} from "@/server/db/schema";
import { writeFileSync } from "fs";
import { join } from "path";

const DEMO_PROFILE_ID =
  "96d5e7ba8f42af5f40b1ea25a3deafc035ebd5350521b925a5e6478e2aebfee5";

async function exportDemoProfile() {
  console.log("Fetching demo profile...");

  // Fetch the base profile
  const profile = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, DEMO_PROFILE_ID),
  });

  if (!profile) {
    throw new Error(`Profile ${DEMO_PROFILE_ID} not found`);
  }

  console.log("Found profile:", profile.tinderId);

  // Fetch usage data
  const usage = await db.query.tinderUsageTable.findMany({
    where: eq(tinderUsageTable.tinderProfileId, DEMO_PROFILE_ID),
  });

  console.log(`Found ${usage.length} usage records`);

  // Fetch profile meta
  const profileMeta = await db.query.profileMetaTable.findMany({
    where: eq(profileMetaTable.tinderProfileId, DEMO_PROFILE_ID),
  });

  console.log(`Found ${profileMeta.length} profile meta records`);

  // Fetch events for the user who owns this profile
  const events = profile.userId
    ? await db.query.eventTable.findMany({
        where: eq(eventTable.userId, profile.userId),
        orderBy: [desc(eventTable.startDate)],
        with: {
          location: true,
        },
      })
    : [];

  // Combine into the expected shape
  const demoData = {
    profile: {
      ...profile,
      usage,
      profileMeta,
    },
    events,
  };

  // Write to file
  const outputPath = join(process.cwd(), "public/demo-profile.json");
  writeFileSync(outputPath, JSON.stringify(demoData, null, 2));

  console.log(`✅ Demo profile exported to ${outputPath}`);
  console.log(`   Profile: ${profile.tinderId}`);
  console.log(`   Usage records: ${usage.length}`);
  console.log(`   Meta records: ${profileMeta.length}`);
  console.log(`   Events: ${events.length}`);
}

exportDemoProfile()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error exporting demo profile:", error);
    process.exit(1);
  });
