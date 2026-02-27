/**
 * Script to generate a demo dataset file for free download
 * This creates a sample dataset matching the format that paying customers receive
 *
 * Run with: bun run src/scripts/demo/generate-demo-dataset.ts
 */

import { db } from "@/server/db";
import { inArray, sql } from "drizzle-orm";
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

  const profileIds = profiles.map((p) => p.tinderId);

  // Batch fetch all related data in 3 parallel queries (not N×3)
  const [metas, usageRows, matchCounts] = await Promise.all([
    db
      .select()
      .from(profileMetaTable)
      .where(inArray(profileMetaTable.tinderProfileId, profileIds)),

    db
      .select()
      .from(tinderUsageTable)
      .where(inArray(tinderUsageTable.tinderProfileId, profileIds))
      .orderBy(tinderUsageTable.tinderProfileId, tinderUsageTable.dateStamp),

    db
      .select({
        tinderProfileId: matchTable.tinderProfileId,
        count: sql<number>`count(*)`,
      })
      .from(matchTable)
      .where(inArray(matchTable.tinderProfileId, profileIds))
      .groupBy(matchTable.tinderProfileId),
  ]);

  // Index by profile ID for O(1) lookup
  const metaMap = new Map(metas.map((m) => [m.tinderProfileId, m]));
  const matchCountMap = new Map(
    matchCounts.map((r) => [r.tinderProfileId, r.count]),
  );

  const usageByProfile = new Map<string, typeof usageRows>();
  for (const u of usageRows) {
    const existing = usageByProfile.get(u.tinderProfileId) ?? [];
    existing.push(u);
    usageByProfile.set(u.tinderProfileId, existing);
  }

  // Assemble enriched profiles
  const enrichedProfiles = profiles.map((profile) => {
    const profileMeta = metaMap.get(profile.tinderId);
    const usageData = (usageByProfile.get(profile.tinderId) ?? []).slice(-30);
    const matchCount = matchCountMap.get(profile.tinderId) ?? 0;

    return {
      profile: {
        tinderId: profile.tinderId,
        birthDate: profile.birthDate,
        ageAtUpload: profile.ageAtUpload,
        ageAtLastUsage: profile.ageAtLastUsage,
        createDate: profile.createDate,
        activeTime: profile.activeTime,
        gender: profile.gender,
        bio: profile.bio,
        city: profile.city,
        country: profile.country,
        region: profile.region,
        interests: profile.interests,
        sexualOrientations: profile.sexualOrientations,
        instagramConnected: profile.instagramConnected,
        spotifyConnected: profile.spotifyConnected,
        jobTitle: profile.jobTitle,
        company: profile.company,
        school: profile.school,
        educationLevel: profile.educationLevel,
        ageFilterMin: profile.ageFilterMin,
        ageFilterMax: profile.ageFilterMax,
        interestedIn: profile.interestedIn,
        genderFilter: profile.genderFilter,
        firstDayOnApp: profile.firstDayOnApp,
        lastDayOnApp: profile.lastDayOnApp,
        daysInProfilePeriod: profile.daysInProfilePeriod,
      },
      meta: profileMeta ?? null,
      usageSample: usageData.map((u) => ({
        dateStamp: u.dateStamp,
        appOpens: u.appOpens,
        matches: u.matches,
        swipeLikes: u.swipeLikes,
        swipePasses: u.swipePasses,
        messagesReceived: u.messagesReceived,
        messagesSent: u.messagesSent,
        matchRate: u.matchRate,
        likeRate: u.likeRate,
      })),
      matchCount,
    };
  });

  // Create the dataset JSON (matching production format)
  const dataset = {
    metadata: {
      exportId: "demo-sample",
      tier: "FREE_SAMPLE",
      profileCount: profiles.length,
      generatedAt: new Date().toISOString(),
      version: "1.0",
      recency: "MIXED",
    },
    profiles: enrichedProfiles,
    citation:
      'SwipeStats.io Dating App Dataset. Please cite as: "SwipeStats.io Dating App Dataset, ' +
      new Date().getFullYear() +
      ", " +
      profiles.length +
      ' Profiles"',
    documentation: {
      description:
        "This is a free sample dataset from SwipeStats.io. For larger datasets (10-5000+ profiles), visit swipestats.io/research",
      dataStructure: {
        profile: "Basic profile information (age, gender, location, bio, etc.)",
        meta: "Aggregated statistics (total swipes, matches, messages, rates)",
        usageSample: "Daily activity data (up to 30 days)",
        matchCount: "Total number of matches for this profile",
      },
      notes: [
        "All data is fully anonymized",
        "Message content is excluded for privacy",
        "Personal identifiers have been removed",
        "Data is collected with explicit user consent",
      ],
      upgradePath: {
        description: "Need more data for your research?",
        url: "https://swipestats.io/research",
        tiers: {
          starter: "10 profiles - $15",
          standard: "1,000 profiles - $50",
          fresh: "1,000 recent profiles - $150",
          premium: "3,000 recent profiles - $300",
          academic: "5,000+ profiles with custom options - From $1,500",
        },
      },
      typeScriptInterfaces: {
        description:
          "For TypeScript users, full type definitions are available in our open-source repository",
        tinderTypes:
          "https://github.com/Boe-Ventures/swipestats.io/blob/main/src/lib/interfaces/TinderDataJSON.ts",
        hingeTypes:
          "https://github.com/Boe-Ventures/swipestats.io/blob/main/src/lib/interfaces/HingeDataJSON.ts",
      },
    },
  };

  // Write JSON file
  const jsonOutputPath = join(
    process.cwd(),
    "public/downloads/swipestats-demo-profile.json",
  );
  writeFileSync(jsonOutputPath, JSON.stringify(dataset, null, 2));
  console.log(`✅ JSON file created: ${jsonOutputPath}`);

  // Create a README
  const readme = `# SwipeStats Demo Dataset

## Overview
This is a FREE sample dataset containing ${profiles.length} anonymized dating app profiles.

## What's Included
- **Profile Data**: Age, gender, location, bio, interests, education
- **Aggregated Stats**: Total swipes, matches, messages, conversion rates
- **Daily Activity**: Up to 30 days of app usage data per profile
- **Match Counts**: Total matches for each profile

## Data Format
The data is provided in JSON format with the following structure:

\`\`\`json
{
  "metadata": { /* Export information */ },
  "profiles": [
    {
      "profile": { /* Basic profile info */ },
      "meta": { /* Aggregated statistics */ },
      "usageSample": [ /* Daily activity data */ ],
      "matchCount": 123
    }
  ]
}
\`\`\`

## Privacy & Ethics
✅ All data is fully anonymized
✅ No personal identifiers included
✅ Message content excluded for privacy
✅ Collected with explicit user consent
✅ GDPR compliant

## Usage Rights
This sample dataset is provided for:
- Personal exploration and learning
- Testing data analysis workflows
- Understanding the data structure

For commercial use, publication, or larger datasets, please visit:
👉 https://swipestats.io/research

## TypeScript Types
Full TypeScript interfaces are available in our open-source repository:
- Tinder types: https://github.com/Boe-Ventures/swipestats.io/blob/main/src/lib/interfaces/TinderDataJSON.ts
- Hinge types: https://github.com/Boe-Ventures/swipestats.io/blob/main/src/lib/interfaces/HingeDataJSON.ts

## Need More Data?

### Starter Pack - $15
- 10 profiles
- Perfect for testing and learning

### Standard Dataset - $50
- 1,000 profiles
- Commercial use ✓
- Publication rights ✓
- Best price per profile ($0.05)

### Fresh Dataset - $150
- 1,000 most recent profiles
- Latest dating trends
- Priority support

### Premium Dataset - $300
- 3,000 recent profiles
- Statistical significance
- Deep market analysis

### Academic License - From $1,500
- 5,000+ profiles
- Custom data requests
- Student distribution rights
- Monthly support

Visit https://swipestats.io/research to purchase

## Citation
If you use this data in research or publications, please cite as:
"SwipeStats.io Dating App Dataset, ${new Date().getFullYear()}, ${profiles.length} Profiles"

## Questions?
Contact: kris@swipestats.io
Website: https://swipestats.io
GitHub: https://github.com/Boe-Ventures/swipestats.io
`;

  const readmePath = join(process.cwd(), "public/downloads/README.md");
  writeFileSync(readmePath, readme);
  console.log(`✅ README created: ${readmePath}`);

  // Create a ZIP file with both JSON and README
  const zip = new JSZip();
  zip.file("swipestats-demo-profile.json", JSON.stringify(dataset, null, 2));
  zip.file("README.md", readme);

  const zipPath = join(
    process.cwd(),
    "public/downloads/swipestats-demo-profile.json.zip",
  );
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(zipPath, zipBuffer);
  console.log(`✅ ZIP file created: ${zipPath}`);

  // Summary
  console.log("\n📊 Demo Dataset Summary:");
  console.log(`   Profiles: ${profiles.length}`);
  console.log(`   Profile IDs: ${profileIds.join(", ")}`);
  console.log(
    `   Size: ${(JSON.stringify(dataset).length / 1024).toFixed(2)} KB`,
  );
  console.log(`   Output: public/downloads/swipestats-demo-profile.json.zip`);
  console.log("\n🎉 Demo dataset ready for download!");
}

generateDemoDataset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error generating demo dataset:", error);
    process.exit(1);
  });
