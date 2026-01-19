/**
 * Extract Media/Photos from OriginalAnonymizedFile records
 *
 * Queries the last 20 users' Tinder data files and extracts Photos
 * to see what image data we have stored.
 *
 * Usage:
 *   OLD_DATABASE_URL=<old-db-url> pnpm tsx src/scripts/extract-media-from-files.ts
 */

import { neon } from "@neondatabase/serverless";
import type {
  AnonymizedTinderDataJSON,
  TinderPhoto,
} from "@/lib/interfaces/TinderDataJSON";
import {
  isNewPhotoFormat,
  isOldPhotoFormat,
} from "@/lib/interfaces/TinderDataJSON";

// ---- CONFIG -------------------------------------------------------

const USER_LIMIT = 20; // Number of users to check

// ---- DATABASE CONNECTION ------------------------------------------

if (!process.env.OLD_DATABASE_URL) {
  throw new Error("OLD_DATABASE_URL environment variable is required");
}

const oldSql = neon(process.env.OLD_DATABASE_URL);

// ---- TYPES --------------------------------------------------------

interface OriginalFileRecord {
  id: string;
  userId: string;
  dataProvider: string;
  swipestatsVersion: string;
  file: AnonymizedTinderDataJSON;
  createdAt: Date;
  updatedAt: Date;
}

// ---- UTILITIES ----------------------------------------------------

function log(message: string) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

function formatPhoto(photo: string | TinderPhoto, index: number): string {
  if (typeof photo === "string") {
    return `  [${index}] URL: ${photo}`;
  }

  const parts = [
    `  [${index}] ID: ${photo.id}`,
    `      URL: ${photo.url}`,
    `      Type: ${photo.type}`,
    `      Created: ${photo.created_at}`,
    `      Filename: ${photo.filename}`,
  ];

  if (photo.prompt_id) {
    parts.push(`      Prompt ID: ${photo.prompt_id}`);
  }
  if (photo.prompt_text) {
    parts.push(`      Prompt Text: ${photo.prompt_text}`);
  }
  if (photo.selfie_verified !== undefined) {
    parts.push(`      Selfie Verified: ${photo.selfie_verified}`);
  }

  return parts.join("\n");
}

// ---- MAIN EXTRACTION ----------------------------------------------

async function extractMedia() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   Extract Media from Original Files                   ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  log(`Querying last ${USER_LIMIT} users' Tinder data files...`);

  // Query OriginalAnonymizedFile for TINDER files, ordered by createdAt DESC
  const files = (await oldSql`
    SELECT 
      id,
      "userId",
      "dataProvider",
      "swipestatsVersion",
      file,
      "createdAt",
      "updatedAt"
    FROM "OriginalAnonymizedFile"
    WHERE "dataProvider" = 'TINDER'
    ORDER BY "createdAt" DESC
    LIMIT ${USER_LIMIT}
  `) as OriginalFileRecord[];

  log(`Found ${files.length} Tinder data files\n`);

  if (files.length === 0) {
    console.log("❌ No Tinder data files found");
    return;
  }

  let totalPhotos = 0;
  let usersWithPhotos = 0;
  let usersWithNewFormat = 0;
  let usersWithOldFormat = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!file) {
      console.log(`⚠️  Skipping index ${i} - file is undefined`);
      continue;
    }

    const data = file.file;

    console.log(`\n${"─".repeat(60)}`);
    console.log(`User ${i + 1}/${files.length}: ${file.userId}`);
    console.log(`  File ID: ${file.id}`);
    console.log(`  Version: ${file.swipestatsVersion}`);
    console.log(`  Uploaded: ${file.createdAt.toISOString()}`);

    // Extract Photos from the JSON
    if (!data.Photos) {
      console.log(`  ⚠️  No Photos field found`);
      continue;
    }

    const photos = data.Photos;

    if (isNewPhotoFormat(photos)) {
      usersWithNewFormat++;
      console.log(`  📸 Photos (New Format): ${photos.length} photos`);
      totalPhotos += photos.length;

      if (photos.length > 0) {
        usersWithPhotos++;
        console.log("\n  Photo Details:");
        photos.forEach((photo, idx) => {
          console.log(formatPhoto(photo, idx));
        });
      } else {
        console.log(`  ⚠️  Photos array is empty`);
      }
    } else if (isOldPhotoFormat(photos)) {
      usersWithOldFormat++;
      console.log(`  📸 Photos (Old Format): ${photos.length} URLs`);
      totalPhotos += photos.length;

      if (photos.length > 0) {
        usersWithPhotos++;
        console.log("\n  Photo URLs:");
        photos.forEach((url, idx) => {
          console.log(formatPhoto(url, idx));
        });
      } else {
        console.log(`  ⚠️  Photos array is empty`);
      }
    } else {
      console.log(`  ⚠️  Unknown photo format`);
      console.log(`  Type: ${typeof photos}`);
      console.log(`  Is Array: ${Array.isArray(photos)}`);
      if (Array.isArray(photos)) {
        const photosArray = photos as unknown[];
        if (photosArray.length > 0) {
          console.log(`  First item type: ${typeof photosArray[0]}`);
          console.log(
            `  First item: ${JSON.stringify(photosArray[0], null, 2)}`,
          );
        }
      }
    }
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("📊 Summary");
  console.log(`${"═".repeat(60)}`);
  console.log(`Total users checked: ${files.length}`);
  console.log(`Users with photos: ${usersWithPhotos}`);
  console.log(`Users with new format: ${usersWithNewFormat}`);
  console.log(`Users with old format: ${usersWithOldFormat}`);
  console.log(`Total photos found: ${totalPhotos}`);
  console.log(
    `Average photos per user: ${files.length > 0 ? (totalPhotos / files.length).toFixed(2) : 0}`,
  );
}

// Run extraction
extractMedia().catch((error) => {
  console.error("\n❌ Extraction failed:");
  console.error(error);
  if (error instanceof Error) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
  process.exit(1);
});
