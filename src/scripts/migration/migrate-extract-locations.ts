/**
 * Experimental Location Extraction Migration
 *
 * Self-contained script that:
 * 1. Queries users without location data
 * 2. Gathers location signals from profiles/files/IPs
 * 3. Uses Claude Haiku to extract normalized location
 * 4. Writes city + country (ISO code) to user table
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-extract-locations.ts
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/server/db";
import {
  userTable,
  tinderProfileTable,
  hingeProfileTable,
  originalAnonymizedFileTable,
  messageTable,
} from "@/server/db/schema";
import { eq, desc, isNull, or } from "drizzle-orm";

// ---- CONFIG -------------------------------------------------------

const DRY_RUN = false; // Set to true for dry run (no database writes)
const BATCH_SIZE = 10; // Process in batches for rate limiting

// ---- AI EXTRACTION SCHEMA -----------------------------------------

const locationSchema = z.object({
  city: z.string().optional().describe("Primary city name"),
  country: z
    .string()
    .length(2)
    .optional()
    .describe("ISO alpha-2 code (US, NO, DE)"),
  confidence: z.enum(["high", "medium", "low"]),
});

// ---- TYPES --------------------------------------------------------

interface LocationSignals {
  profileLocations: string[];
  ipAddresses: string[];
  fileLocationRefs: string[];
  messageSamples?: string[];
}

// ---- EXTRACTION LOGIC ---------------------------------------------

async function extractLocation(signals: LocationSignals, userId: string) {
  // Log incoming signals
  console.log(`\n  📥 Signals for ${userId.substring(0, 12)}:`);
  console.log(
    `     Profiles: ${signals.profileLocations.length > 0 ? signals.profileLocations.join(", ") : "None"}`,
  );
  console.log(
    `     IPs: ${signals.ipAddresses.length > 0 ? signals.ipAddresses.join(", ") : "None"}`,
  );
  console.log(`     File refs: ${signals.fileLocationRefs.length}`);
  if (signals.messageSamples?.length) {
    console.log(`     Messages: ${signals.messageSamples.length} samples`);
  }

  const prompt = `Extract user's PRIMARY location from these signals:

PROFILE LOCATIONS:
${signals.profileLocations.join("\n") || "None"}

IP ADDRESSES:
${signals.ipAddresses.join("\n") || "None"}

FILE DATA (first 10):
${signals.fileLocationRefs.slice(0, 10).join("\n") || "None"}

${signals.messageSamples?.length ? `MESSAGES:\n${signals.messageSamples.slice(0, 5).join("\n")}\n` : ""}

RULES:
- Extract MOST LIKELY primary/current location
- City: MUST be in English (e.g., "Zurich" not "Zürich", "Hanoi" not "Hà Nội", "Copenhagen" not "København", "Milan" not "Milano", "Wroclaw" not "Wrocław", "Malaga" not "Málaga")
- City: Clean name only ("Oslo", not "Oslo, Norway")
- Country: ISO alpha-2 code ONLY (2 letters: US, NO, DE, BR, etc.)
- If multiple locations, prioritize most consistent/recent
- High confidence: Clear consistent data
- Medium: Some ambiguity but likely correct
- Low: Conflicting/insufficient data`;

  const result = await generateText({
    model: anthropic("claude-haiku-4-5"),
    output: Output.object({ schema: locationSchema }),
    prompt,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "swipestats-extract-location",
    },
  });

  // Log structured output
  console.log(
    `  📤 AI Output: ${result.output.city || "?"}, ${result.output.country || "?"} (${result.output.confidence})`,
  );

  // Skip low confidence
  if (result.output.confidence === "low") {
    return { city: null, country: null };
  }

  return {
    city: result.output.city || null,
    country: result.output.country || null,
  };
}

// ---- SIGNAL GATHERING ---------------------------------------------

async function gatherSignals(userId: string): Promise<LocationSignals> {
  // Get Tinder profiles
  const tinderProfiles = await db
    .select()
    .from(tinderProfileTable)
    .where(eq(tinderProfileTable.userId, userId));

  // Get Hinge profiles
  const hingeProfiles = await db
    .select()
    .from(hingeProfileTable)
    .where(eq(hingeProfileTable.userId, userId));

  // Aggregate profile locations
  const profileLocations = [
    ...tinderProfiles
      .map((p) => [p.city, p.region].filter(Boolean).join(", "))
      .filter(Boolean),
    ...hingeProfiles.flatMap((p) => p.hometowns || []),
  ];

  // Get original files
  const files = await db
    .select()
    .from(originalAnonymizedFileTable)
    .where(eq(originalAnonymizedFileTable.userId, userId));

  const fileLocationRefs = files.flatMap((f) =>
    extractLocationsFromJSON(f.file),
  );

  // Extract IPs
  const ipAddresses = fileLocationRefs
    .filter((ref) => ref.includes("ip_address"))
    .map((ref) => ref.split(": ")[1])
    .filter(
      (ip): ip is string => ip !== undefined && ip !== null && ip.length > 0,
    );

  // Get message samples ONLY if very little location data
  let messageSamples: string[] = [];
  if (profileLocations.length === 0 && fileLocationRefs.length < 3) {
    const firstProfileId = tinderProfiles[0]?.tinderId;
    if (firstProfileId) {
      const messages = await db
        .select()
        .from(messageTable)
        .where(eq(messageTable.tinderProfileId, firstProfileId))
        .limit(10);

      messageSamples = messages
        .filter(
          (m): m is typeof m & { content: string } =>
            m.content !== null &&
            m.content !== undefined &&
            m.content.length > 20 &&
            m.content.length < 200,
        )
        .slice(0, 5)
        .map((m) => m.content);
    }
  }

  return {
    profileLocations,
    ipAddresses,
    fileLocationRefs: fileLocationRefs.slice(0, 15),
    messageSamples,
  };
}

// ---- JSON LOCATION EXTRACTION -------------------------------------

function extractLocationsFromJSON(data: unknown): string[] {
  const locations = new Set<string>();

  function traverse(obj: unknown, path = ""): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === "string") {
      const lowerPath = path.toLowerCase();
      if (
        lowerPath.includes("city") ||
        lowerPath.includes("country") ||
        lowerPath.includes("region") ||
        lowerPath.includes("location") ||
        lowerPath.includes("hometown") ||
        lowerPath.includes("address")
      ) {
        if (obj.trim().length > 0) {
          locations.add(`${path}: ${obj}`);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
    } else if (typeof obj === "object") {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        traverse(value, newPath);
      });
    }
  }

  traverse(data);
  return Array.from(locations);
}

function isEmptySignals(signals: LocationSignals): boolean {
  return (
    signals.profileLocations.length === 0 &&
    signals.ipAddresses.length === 0 &&
    signals.fileLocationRefs.length === 0
  );
}

// ---- MAIN MIGRATION -----------------------------------------------

async function migrateUserLocations() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║   Experimental Location Extraction Migration                  ║",
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝\n",
  );

  // Get users without location data
  const users = await db
    .select()
    .from(userTable)
    .where(or(isNull(userTable.city), isNull(userTable.country)))
    .orderBy(desc(userTable.createdAt));

  console.log(`Found ${users.length} users without location data`);
  console.log(`DRY RUN: ${DRY_RUN}\n`);

  let processed = 0;
  let extracted = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`,
    );

    await Promise.all(
      batch.map(async (user) => {
        try {
          const signals = await gatherSignals(user.id);

          if (isEmptySignals(signals)) {
            skipped++;
            console.log(`⊘ ${user.id.substring(0, 12)}: No signals`);
            return;
          }

          const { city, country } = await extractLocation(signals, user.id);

          if (city || country) {
            extracted++;
            console.log(
              `✓ ${user.id.substring(0, 12)}: ${city || "?"}, ${country || "?"}`,
            );

            if (!DRY_RUN) {
              await db
                .update(userTable)
                .set({ city, country })
                .where(eq(userTable.id, user.id));
            }
          } else {
            console.log(`✗ ${user.id.substring(0, 12)}: Could not extract`);
          }

          processed++;
        } catch (error) {
          errors++;
          console.error(`❌ ${user.id.substring(0, 12)}: ${String(error)}`);
        }
      }),
    );

    // Rate limit between batches
    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("📊 Summary");
  console.log(`${"═".repeat(60)}`);
  console.log(`Processed: ${processed}`);
  console.log(`Extracted: ${extracted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nDRY RUN: ${DRY_RUN}`);
  if (DRY_RUN) {
    console.log("Set DRY_RUN = false to actually write to database");
  }
}

// Run
migrateUserLocations().catch(console.error);
