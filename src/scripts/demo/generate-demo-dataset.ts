/**
 * Script to generate a demo dataset file for free download
 * This creates a sample dataset matching the format that paying customers receive
 *
 * Run with: bun run src/scripts/demo/generate-demo-dataset.ts
 */

import { db } from "@/server/db";
import { eq, inArray, sql } from "drizzle-orm";
import {
  tinderProfileTable,
  profileMetaTable,
  tinderUsageTable,
  matchTable,
} from "@/server/db/schema";
import { DEMO_PROFILE_IDS } from "@/lib/constants/demoProfiles";
import { writeFileSync } from "fs";
import { join } from "path";
import JSZip from "jszip";

async function generateDemoDataset() {
  console.log("🔍 Fetching demo profiles for dataset...");

  // Get the specific demo profiles
  const profiles = await db
    .select()
    .from(tinderProfileTable)
    .where(inArray(tinderProfileTable.tinderId, DEMO_PROFILE_IDS))
    .execute();

  if (profiles.length === 0) {
    throw new Error(
      "No demo profiles found. Make sure the profiles exist in the database.",
    );
  }

  console.log(`✅ Found ${profiles.length} profiles`);

  // Build JSONL: one line per object (matches production export format)
  const lines: string[] = [];

  // First line: metadata
  lines.push(
    JSON.stringify({
      type: "metadata",
      exportId: "demo-sample",
      tier: "FREE_SAMPLE",
      profileCount: profiles.length,
      generatedAt: new Date().toISOString(),
      version: "1.0",
      format: "jsonl",
      recency: "MIXED",
    }),
  );

  // Process each profile individually
  for (const profile of profiles) {
    const [meta, usage, matchCount] = await Promise.all([
      db.query.profileMetaTable.findFirst({
        where: eq(profileMetaTable.tinderProfileId, profile.tinderId),
      }),

      db
        .select()
        .from(tinderUsageTable)
        .where(eq(tinderUsageTable.tinderProfileId, profile.tinderId))
        .orderBy(tinderUsageTable.dateStamp),

      db
        .select({ count: sql<number>`count(*)` })
        .from(matchTable)
        .where(eq(matchTable.tinderProfileId, profile.tinderId))
        .then((rows) => rows[0]?.count ?? 0),
    ]);

    // Strip internal fields, keep everything researchers need
    const {
      userId,
      computed,
      createdAt,
      updatedAt,
      llmAnalyzedAt,
      bioOriginal,
      swipestatsVersion,
      ...profileData
    } = profile;

    lines.push(
      JSON.stringify({
        type: "profile",
        profile: profileData,
        meta: meta ?? null,
        usage, // Full usage history
        matchCount,
      }),
    );
  }

  // Last line: citation
  lines.push(
    JSON.stringify({
      type: "citation",
      text:
        'SwipeStats.io Dating App Dataset. Please cite as: "SwipeStats.io Dating App Dataset, ' +
        new Date().getFullYear() +
        ", " +
        profiles.length +
        ' Profiles"',
    }),
  );

  const jsonlContent = lines.join("\n") + "\n";

  // Write JSONL file
  const jsonlOutputPath = join(
    process.cwd(),
    "public/downloads/swipestats-demo-dataset.jsonl",
  );
  writeFileSync(jsonlOutputPath, jsonlContent);
  console.log(`✅ JSONL file created: ${jsonlOutputPath}`);

  // Create a README
  const readme = `# SwipeStats Demo Dataset

## Overview
This is a FREE sample dataset containing ${profiles.length} anonymized dating app profiles.

## Format
JSONL (JSON Lines) — one JSON object per line.

- Line 1: metadata object (export info)
- Lines 2–N: profile objects (one per profile)
- Last line: citation object

## What's Included Per Profile
- **Profile Data**: Age, gender, location, bio, interests, education, preferences
- **Aggregated Stats**: Total swipes, matches, messages, conversion rates
- **Full Daily Activity**: Complete app usage history (swipes, matches, messages per day)
- **Match Count**: Total number of matches

## Data Structure

\`\`\`json
{"type": "metadata", "exportId": "...", "tier": "FREE_SAMPLE", ...}
{"type": "profile", "profile": {...}, "meta": {...}, "usage": [...], "matchCount": 123}
{"type": "citation", "text": "..."}
\`\`\`

## Privacy & Ethics
- All data is fully anonymized
- No personal identifiers included
- Message content excluded for privacy
- Collected with explicit user consent
- GDPR compliant

## Usage Rights
This sample dataset is provided for:
- Personal exploration and learning
- Testing data analysis workflows
- Understanding the data structure

For commercial use, publication, or larger datasets, please visit:
https://swipestats.io/research

## Need More Data?

| Tier | Profiles | Price |
|------|----------|-------|
| Starter | 10 | $15 |
| Standard | 1,000 | $50 |
| Fresh | 1,000 recent | $150 |
| Premium | 3,000 recent | $300 |
| Academic | 5,000+ custom | From $1,500 |

Visit https://swipestats.io/research to purchase

## Citation
If you use this data in research or publications, please cite as:
"SwipeStats.io Dating App Dataset, ${new Date().getFullYear()}, ${profiles.length} Profiles"

## Questions?
Contact: kris@swipestats.io
Website: https://swipestats.io
`;

  const readmePath = join(process.cwd(), "public/downloads/README.md");
  writeFileSync(readmePath, readme);
  console.log(`✅ README created: ${readmePath}`);

  // Create a ZIP file with both JSONL and README
  const zip = new JSZip();
  zip.file("swipestats-demo-dataset.jsonl", jsonlContent);
  zip.file("README.md", readme);

  const zipPath = join(
    process.cwd(),
    "public/downloads/swipestats-demo-dataset.jsonl.zip",
  );
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(zipPath, zipBuffer);
  console.log(`✅ ZIP file created: ${zipPath}`);

  // Summary
  const profileIds = profiles.map((p) => p.tinderId);
  console.log("\n📊 Demo Dataset Summary:");
  console.log(`   Profiles: ${profiles.length}`);
  console.log(`   Profile IDs: ${profileIds.join(", ")}`);
  console.log(
    `   Size: ${(jsonlContent.length / 1024).toFixed(2)} KB`,
  );
  console.log(`   Output: public/downloads/swipestats-demo-dataset.jsonl.zip`);
  console.log("\n🎉 Demo dataset ready for download!");
}

generateDemoDataset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error generating demo dataset:", error);
    process.exit(1);
  });
