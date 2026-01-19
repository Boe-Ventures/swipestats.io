/**
 * Extract Original JSON Files from Top Profiles
 *
 * Extracts original JSON files from the top 10 Tinder profiles with the most matches.
 * These files can be used to test the upload flow by:
 * 1. Deleting the profiles from the dev database
 * 2. Re-uploading the JSON files through the upload page
 *
 * Usage:
 *   DATABASE_URL=<your-db-url> pnpm tsx src/scripts/extract-json-for-testing.ts
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";

// ---- CONFIG -------------------------------------------------------

const OUTPUT_DIR = path.join(process.cwd(), "test-data", "tinder-uploads");
const PROFILE_LIMIT = 10; // Number of profiles to extract

// ---- DATABASE CONNECTION ------------------------------------------

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(process.env.DATABASE_URL);

// ---- TYPES --------------------------------------------------------

interface ProfileWithMatchCount {
  tinderId: string;
  userId: string;
  matchCount: number;
  birthDate: Date;
  createDate: Date;
  gender: string;
  bio: string | null;
}

interface OriginalFileRecord {
  id: string;
  userId: string;
  dataProvider: string;
  swipestatsVersion: string;
  file: AnonymizedTinderDataJSON;
  createdAt: Date;
}

// ---- UTILITIES ----------------------------------------------------

function log(message: string) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

// ---- MAIN EXTRACTION ----------------------------------------------

async function extractJsonFiles() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   Extract JSON Files for Testing                     ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Ensure output directory exists
  ensureOutputDir();

  log(`Fetching recent profiles and their match counts...`);

  // First, get all profiles with their user IDs
  // Note: database columns are snake_case, not camelCase
  const profiles = (await sql`
    SELECT 
      tinder_id as "tinderId",
      user_id as "userId",
      birth_date as "birthDate",
      create_date as "createDate",
      gender,
      bio
    FROM tinder_profile
    ORDER BY created_at DESC
    LIMIT 50
  `) as Array<{
    tinderId: string;
    userId: string;
    birthDate: Date;
    createDate: Date;
    gender: string;
    bio: string | null;
  }>;

  log(`Found ${profiles.length} profiles, counting matches...`);

  // Count matches for each profile
  const profilesWithCounts: ProfileWithMatchCount[] = [];
  for (const profile of profiles) {
    const matchCountResult = (await sql`
      SELECT COUNT(*)::int as count
      FROM match
      WHERE tinder_profile_id = ${profile.tinderId}
    `) as Array<{ count: number }>;

    profilesWithCounts.push({
      ...profile,
      matchCount: matchCountResult[0]?.count ?? 0,
    });
  }

  // Sort by match count and take top N
  const topProfiles = profilesWithCounts
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, PROFILE_LIMIT);

  log(`Found ${topProfiles.length} profiles\n`);

  if (topProfiles.length === 0) {
    console.log("❌ No profiles found");
    return;
  }

  // Display the profiles we're extracting
  console.log("Top Profiles by Match Count:");
  console.log("═".repeat(60));
  topProfiles.forEach((profile, idx) => {
    console.log(
      `${idx + 1}. ${profile.tinderId.substring(0, 16)}... - ${profile.matchCount} matches`,
    );
  });
  console.log();

  // Get the user IDs to query OriginalAnonymizedFile
  const userIds = topProfiles.map((p) => p.userId);

  log(`Fetching original JSON files for ${userIds.length} users...`);

  // Query OriginalAnonymizedFile for these users
  // Note: database columns are snake_case
  const originalFiles = (await sql`
    SELECT 
      id,
      user_id as "userId",
      data_provider as "dataProvider",
      swipestats_version as "swipestatsVersion",
      file,
      created_at as "createdAt"
    FROM original_anonymized_file
    WHERE user_id = ANY(${userIds})
    AND data_provider = 'TINDER'
    ORDER BY created_at DESC
  `) as OriginalFileRecord[];

  log(`Found ${originalFiles.length} original files\n`);

  if (originalFiles.length === 0) {
    console.log("❌ No original files found for these profiles");
    return;
  }

  // Create a map of userId to profile for quick lookup
  const userIdToProfile = new Map<string, ProfileWithMatchCount>();
  topProfiles.forEach((profile) => {
    userIdToProfile.set(profile.userId, profile);
  });

  // Extract and save each file
  let successCount = 0;
  const manifestEntries: Array<{
    filename: string;
    tinderId: string;
    userId: string;
    matchCount: number;
    fileId: string;
    uploadedAt: string;
  }> = [];

  for (let i = 0; i < originalFiles.length; i++) {
    const file = originalFiles[i];

    if (!file) {
      log(`⚠️  Skipping index ${i} - file is undefined`);
      continue;
    }

    const profile = userIdToProfile.get(file.userId);

    if (!profile) {
      log(`⚠️  Skipping file ${file.id} - no matching profile found`);
      continue;
    }

    console.log(`\n${"─".repeat(60)}`);
    console.log(`File ${i + 1}/${originalFiles.length}`);
    console.log(`  Tinder ID: ${profile.tinderId}`);
    console.log(`  User ID: ${file.userId}`);
    console.log(`  Match Count: ${profile.matchCount}`);
    console.log(`  Version: ${file.swipestatsVersion}`);
    console.log(`  Uploaded: ${file.createdAt.toISOString()}`);

    try {
      // Create filename with tinderId prefix for easy identification
      const tinderIdShort = profile.tinderId.substring(0, 16);
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `tinder_${tinderIdShort}_${profile.matchCount}matches_${timestamp}.json`;
      const filepath = path.join(OUTPUT_DIR, filename);

      // Write the JSON file
      fs.writeFileSync(filepath, JSON.stringify(file.file, null, 2), "utf-8");

      console.log(`  ✅ Saved: ${filename}`);
      console.log(
        `  📦 Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`,
      );

      successCount++;

      // Add to manifest
      manifestEntries.push({
        filename,
        tinderId: profile.tinderId,
        userId: file.userId,
        matchCount: profile.matchCount,
        fileId: file.id,
        uploadedAt: file.createdAt.toISOString(),
      });
    } catch (error) {
      console.error(
        `  ❌ Failed to save file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Create a manifest file with metadata
  const manifest = {
    extractedAt: new Date().toISOString(),
    totalProfiles: originalFiles.length,
    profiles: manifestEntries,
  };

  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // Create a README with instructions
  const readme = `# Test Data for Tinder Upload Flow

## Overview
This directory contains ${successCount} original Tinder JSON files extracted from the database.
These files are from the top ${PROFILE_LIMIT} profiles with the most matches.

## Files
${manifestEntries
  .map(
    (entry, idx) =>
      `${idx + 1}. **${entry.filename}**
   - Tinder ID: \`${entry.tinderId}\`
   - User ID: \`${entry.userId}\`
   - Matches: ${entry.matchCount}
   - Original Upload: ${entry.uploadedAt}
`,
  )
  .join("\n")}

## How to Use for Testing

### 1. Delete the profiles from your dev database
\`\`\`sql
-- Delete profiles by tinderId
DELETE FROM "tinder_profile" WHERE "tinderId" IN (
${manifestEntries.map((e) => `  '${e.tinderId}'`).join(",\n")}
);
\`\`\`

Or use the dev admin tools in the upload page to delete each profile individually.

### 2. Upload the JSON files
- Go to http://localhost:3000/upload/tinder
- Drag and drop each JSON file or use the file picker
- Test the upload flow, preview, and data processing

### 3. Verify the data
- Check that the profile was created correctly
- Visit the insights page to see if everything looks good
- Compare with the original data if needed

## Manifest
See \`manifest.json\` for detailed metadata about each file.

## Extracted
${new Date().toISOString()}
`;

  const readmePath = path.join(OUTPUT_DIR, "README.md");
  fs.writeFileSync(readmePath, readme, "utf-8");

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("📊 Summary");
  console.log(`${"═".repeat(60)}`);
  console.log(`Total profiles queried: ${topProfiles.length}`);
  console.log(`Original files found: ${originalFiles.length}`);
  console.log(`Files successfully saved: ${successCount}`);
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log(`\nFiles created:`);
  console.log(`  - ${successCount} JSON files`);
  console.log(`  - manifest.json (metadata)`);
  console.log(`  - README.md (instructions)`);
  console.log(`\n✨ Ready for testing!`);
}

// Run extraction
extractJsonFiles().catch((error) => {
  console.error("\n❌ Extraction failed:");
  console.error(error);
  if (error instanceof Error) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
  process.exit(1);
});
