/**
 * Gender Inference Migration
 *
 * Self-contained script that:
 * 1. Queries profiles with gender IN ('UNKNOWN', 'OTHER', 'MORE')
 * 2. Gathers signals from bio, messages, metadata, and raw files
 * 3. Uses Claude Haiku to infer binary gender or confirm OTHER
 * 4. Updates gender column if confidence >= 0.4
 *
 * Usage:
 *   bun tsx src/scripts/migration/migrate-infer-gender.ts
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/server/db";
import {
  tinderProfileTable,
  hingeProfileTable,
  originalAnonymizedFileTable,
  messageTable,
  type Gender,
} from "@/server/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { BlobService } from "@/server/services/blob.service";

// ---- CONFIG -------------------------------------------------------

const DRY_RUN = true; // Set to false for production run
const BATCH_SIZE = 10; // Process in batches for rate limiting
const PROFILE_LIMIT: number | null = 50; // Set to null for all profiles
const CONFIDENCE_THRESHOLD = 0.4; // Minimum confidence to update gender
const MAX_MESSAGES_PER_PROFILE = 100; // Cap message samples

// ---- AI EXTRACTION SCHEMA -----------------------------------------

const genderInferenceSchema = z.object({
  inferredGender: z
    .enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"])
    .describe("Inferred gender identity"),
  confidence: z
    .number()
    .describe("Confidence score from 0.0 to 1.0"),
  signals: z
    .array(
      z.object({
        type: z.enum([
          "PRONOUN",
          "SELF_DESCRIPTION",
          "ROLE",
          "ACTIVITY",
          "METADATA",
          "RAW_DATA",
        ]),
        evidence: z.string().describe("Text evidence for this signal"),
        weight: z
          .number()
          .describe("Weight of this signal from 0.1 to 1.0"),
      }),
    )
    .describe("Evidence signals used in inference"),
  reasoning: z.string().describe("Brief explanation of inference"),
});

type GenderInferenceResult = z.infer<typeof genderInferenceSchema>;

// ---- TYPES --------------------------------------------------------

interface GenderSignals {
  profileType: "tinder" | "hinge";
  profileId: string;
  bioText: string[];
  messageSamples: string[];
  metadata: {
    interestedIn?: Gender;
    jobTitle?: string;
    company?: string;
    school?: string;
    interests?: unknown;
    descriptors?: unknown;
    ageAtUpload: number;
    city?: string;
    country?: string;
  };
  rawFileData: string[];
}

// ---- EXTRACTION LOGIC ---------------------------------------------

async function inferGender(
  signals: GenderSignals,
): Promise<GenderInferenceResult> {
  // Log incoming signals
  console.log(`\n  📥 Signals for ${signals.profileType}:${signals.profileId.substring(0, 12)}:`);
  console.log(`     Bio: ${signals.bioText.length > 0 ? "✓" : "None"}`);
  console.log(`     Messages: ${signals.messageSamples.length}`);
  console.log(`     Metadata: ${Object.keys(signals.metadata).length} fields`);
  console.log(`     Raw files: ${signals.rawFileData.length}`);

  const prompt = `Infer the user's gender identity from these signals. Goal: Assign binary MALE/FEMALE when confident, or OTHER when clearly non-binary.

PROFILE BIO:
${signals.bioText.length > 0 ? signals.bioText.join("\n") : "None"}

MESSAGE SAMPLES (${signals.messageSamples.length} messages):
${signals.messageSamples.length > 0 ? signals.messageSamples.join("\n") : "None"}

PROFILE METADATA:
- Interested in: ${signals.metadata.interestedIn || "Unknown"}
- Job title: ${signals.metadata.jobTitle || "None"}
- Company: ${signals.metadata.company || "None"}
- School: ${signals.metadata.school || "None"}
- Age at upload: ${signals.metadata.ageAtUpload}
- Location: ${signals.metadata.city || "?"}, ${signals.metadata.country || "?"}
${signals.metadata.interests ? `- Interests: ${JSON.stringify(signals.metadata.interests)}` : ""}
${signals.metadata.descriptors ? `- Descriptors: ${JSON.stringify(signals.metadata.descriptors)}` : ""}

RAW FILE DATA (first 10):
${signals.rawFileData.slice(0, 10).join("\n") || "None"}

INFERENCE RULES:
1. Look for explicit pronouns (he/him → MALE, she/her → FEMALE, they/them → OTHER)
2. Self-descriptions ("I'm a guy/girl/woman/man/person")
3. Gendered roles or activities (gendered sports, social roles)
4. Dating preference (if user seeks women, likely MALE or FEMALE; analyze patterns)
5. Job/school context (some fields have gender distributions, but use carefully)

CONFIDENCE SCORING:
- 0.8-1.0: Multiple strong signals all agree (pronouns + self-description)
- 0.6-0.8: Strong single signal or multiple weak signals
- 0.4-0.6: Weak signals with some ambiguity
- 0.2-0.4: Very weak signals, mostly guessing
- 0.0-0.2: No useful signals

IMPORTANT:
- Be conservative: if uncertain, use lower confidence
- Non-binary users may explicitly state "non-binary", "enby", "genderqueer" → OTHER
- Users with they/them pronouns → OTHER (unless other strong signals suggest binary)
- If data is sparse or contradictory → lower confidence or UNKNOWN
- Account for cultural differences in gender expression
- Weight: 1.0 = very strong, 0.5 = moderate, 0.1 = weak`;

  const result = await generateText({
    model: anthropic("claude-haiku-4-5"),
    output: Output.object({ schema: genderInferenceSchema }),
    prompt,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "swipestats-infer-gender",
    },
  });

  // Log structured output
  console.log(
    `  📤 AI Output: ${result.output.inferredGender} (confidence: ${result.output.confidence.toFixed(2)})`,
  );
  console.log(`     Reasoning: ${result.output.reasoning}`);

  return result.output;
}

// ---- SIGNAL GATHERING ---------------------------------------------

async function gatherTinderSignals(profile: {
  tinderId: string;
  bio: string | null;
  bioOriginal: string | null;
  gender: Gender;
  genderStr: string;
  interestedIn: Gender;
  jobTitle: string | null;
  company: string | null;
  school: string | null;
  interests: unknown;
  descriptors: unknown;
  ageAtUpload: number;
  city: string | null;
  country: string | null;
  userId: string | null;
}): Promise<GenderSignals> {
  const bioText: string[] = [];
  if (profile.bio) bioText.push(profile.bio);
  if (profile.bioOriginal && profile.bioOriginal !== profile.bio) {
    bioText.push(profile.bioOriginal);
  }

  // Get message samples
  const messages = await db
    .select()
    .from(messageTable)
    .where(eq(messageTable.tinderProfileId, profile.tinderId))
    .orderBy(desc(messageTable.sentDate))
    .limit(MAX_MESSAGES_PER_PROFILE);

  const messageSamples = messages
    .filter(
      (m) =>
        m.type === "TEXT" &&
        m.content !== null &&
        m.content.length >= 20 &&
        m.content.length <= 500,
    )
    .map((m) => m.content)
    .slice(0, 30); // Take first 30 text messages

  // Get raw file data if available
  const rawFileData: string[] = [];
  if (profile.userId) {
    const files = await db
      .select()
      .from(originalAnonymizedFileTable)
      .where(eq(originalAnonymizedFileTable.userId, profile.userId));

    for (const f of files) {
      try {
        let fileData: unknown;
        if (f.file !== null && f.file !== undefined) {
          fileData = f.file;
        } else if (f.blobUrl) {
          fileData = await BlobService.fetchJson(f.blobUrl);
        } else {
          continue;
        }

        const genderRefs = extractGenderFromJSON(fileData);
        rawFileData.push(...genderRefs);
      } catch (error) {
        console.warn(
          `  ⚠️  Failed to fetch file ${f.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return {
    profileType: "tinder",
    profileId: profile.tinderId,
    bioText,
    messageSamples,
    metadata: {
      interestedIn: profile.interestedIn,
      jobTitle: profile.jobTitle || undefined,
      company: profile.company || undefined,
      school: profile.school || undefined,
      interests: profile.interests,
      descriptors: profile.descriptors,
      ageAtUpload: profile.ageAtUpload,
      city: profile.city || undefined,
      country: profile.country || undefined,
    },
    rawFileData,
  };
}

async function gatherHingeSignals(profile: {
  hingeId: string;
  gender: Gender;
  genderStr: string;
  genderIdentity: string;
  jobTitle: string;
  ageAtUpload: number;
  hometowns: string[] | null;
  country: string | null;
  workplaces: string[] | null;
  schools: string[] | null;
  userId: string | null;
  genderPreference: string;
}): Promise<GenderSignals> {
  const bioText: string[] = [];
  if (profile.genderIdentity) {
    bioText.push(`Gender identity: ${profile.genderIdentity}`);
  }

  // Get message samples from matches
  const messages = await db.query.messageTable.findMany({
    where: (message, { eq, and, isNotNull }) =>
      and(eq(message.hingeProfileId, profile.hingeId), isNotNull(message.content)),
    orderBy: (message, { desc }) => desc(message.sentDate),
    limit: MAX_MESSAGES_PER_PROFILE,
  });

  const messageSamples = messages
    .filter(
      (m) =>
        m.content !== null &&
        m.content.length >= 20 &&
        m.content.length <= 500,
    )
    .map((m) => m.content)
    .slice(0, 30);

  // Get raw file data if available
  const rawFileData: string[] = [];
  if (profile.userId) {
    const files = await db
      .select()
      .from(originalAnonymizedFileTable)
      .where(eq(originalAnonymizedFileTable.userId, profile.userId));

    for (const f of files) {
      try {
        let fileData: unknown;
        if (f.file !== null && f.file !== undefined) {
          fileData = f.file;
        } else if (f.blobUrl) {
          fileData = await BlobService.fetchJson(f.blobUrl);
        } else {
          continue;
        }

        const genderRefs = extractGenderFromJSON(fileData);
        rawFileData.push(...genderRefs);
      } catch (error) {
        console.warn(
          `  ⚠️  Failed to fetch file ${f.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return {
    profileType: "hinge",
    profileId: profile.hingeId,
    bioText,
    messageSamples,
    metadata: {
      jobTitle: profile.jobTitle || undefined,
      school: profile.schools?.[0] || undefined,
      company: profile.workplaces?.[0] || undefined,
      ageAtUpload: profile.ageAtUpload,
      city: profile.hometowns?.[0] || undefined,
      country: profile.country || undefined,
    },
    rawFileData,
  };
}

// ---- JSON GENDER EXTRACTION ---------------------------------------

function extractGenderFromJSON(data: unknown): string[] {
  const genderRefs = new Set<string>();

  function traverse(obj: unknown, path = ""): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === "string") {
      const lowerPath = path.toLowerCase();
      // Look for gender-related fields
      if (
        lowerPath.includes("gender") ||
        lowerPath.includes("pronoun") ||
        lowerPath.includes("identity") ||
        lowerPath.includes("sex")
      ) {
        if (obj.trim().length > 0) {
          genderRefs.add(`${path}: ${obj}`);
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
  return Array.from(genderRefs);
}

function isEmptySignals(signals: GenderSignals): boolean {
  return (
    signals.bioText.length === 0 &&
    signals.messageSamples.length === 0 &&
    signals.rawFileData.length === 0
  );
}

// ---- MAIN MIGRATION -----------------------------------------------

async function migrateGenderInference() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║   Gender Inference Migration                                  ║",
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝\n",
  );

  const targetGenders: Gender[] = ["UNKNOWN", "OTHER", "MORE"];

  // Get Tinder profiles
  const tinderQuery = db
    .select({
      tinderId: tinderProfileTable.tinderId,
      bio: tinderProfileTable.bio,
      bioOriginal: tinderProfileTable.bioOriginal,
      gender: tinderProfileTable.gender,
      genderStr: tinderProfileTable.genderStr,
      interestedIn: tinderProfileTable.interestedIn,
      jobTitle: tinderProfileTable.jobTitle,
      company: tinderProfileTable.company,
      school: tinderProfileTable.school,
      interests: tinderProfileTable.interests,
      descriptors: tinderProfileTable.descriptors,
      ageAtUpload: tinderProfileTable.ageAtUpload,
      city: tinderProfileTable.city,
      country: tinderProfileTable.country,
      userId: tinderProfileTable.userId,
    })
    .from(tinderProfileTable)
    .where(inArray(tinderProfileTable.gender, targetGenders))
    .orderBy(desc(tinderProfileTable.createdAt));

  const tinderProfiles =
    PROFILE_LIMIT !== null
      ? await tinderQuery.limit(Math.floor(PROFILE_LIMIT / 2))
      : await tinderQuery;

  // Get Hinge profiles
  const hingeQuery = db
    .select({
      hingeId: hingeProfileTable.hingeId,
      gender: hingeProfileTable.gender,
      genderStr: hingeProfileTable.genderStr,
      genderIdentity: hingeProfileTable.genderIdentity,
      jobTitle: hingeProfileTable.jobTitle,
      ageAtUpload: hingeProfileTable.ageAtUpload,
      hometowns: hingeProfileTable.hometowns,
      country: hingeProfileTable.country,
      workplaces: hingeProfileTable.workplaces,
      schools: hingeProfileTable.schools,
      userId: hingeProfileTable.userId,
      genderPreference: hingeProfileTable.genderPreference,
    })
    .from(hingeProfileTable)
    .where(inArray(hingeProfileTable.gender, targetGenders))
    .orderBy(desc(hingeProfileTable.createdAt));

  const hingeProfiles =
    PROFILE_LIMIT !== null
      ? await hingeQuery.limit(Math.ceil(PROFILE_LIMIT / 2))
      : await hingeQuery;

  const totalProfiles = tinderProfiles.length + hingeProfiles.length;

  console.log(`Found ${tinderProfiles.length} Tinder profiles to process`);
  console.log(`Found ${hingeProfiles.length} Hinge profiles to process`);
  console.log(`Total: ${totalProfiles} profiles`);
  console.log(`PROFILE LIMIT: ${PROFILE_LIMIT ?? "None (all profiles)"}`);
  console.log(`CONFIDENCE THRESHOLD: ${CONFIDENCE_THRESHOLD}`);
  console.log(`DRY RUN: ${DRY_RUN}\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Combine profiles into batches
  const allProfiles: Array<
    | { type: "tinder"; profile: (typeof tinderProfiles)[0] }
    | { type: "hinge"; profile: (typeof hingeProfiles)[0] }
  > = [
    ...tinderProfiles.map((p) => ({ type: "tinder" as const, profile: p })),
    ...hingeProfiles.map((p) => ({ type: "hinge" as const, profile: p })),
  ];

  // Process in batches
  for (let i = 0; i < allProfiles.length; i += BATCH_SIZE) {
    const batch = allProfiles.slice(i, i + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allProfiles.length / BATCH_SIZE)}`,
    );

    await Promise.all(
      batch.map(async ({ type, profile }) => {
        try {
          const signals =
            type === "tinder"
              ? await gatherTinderSignals(profile)
              : await gatherHingeSignals(profile);

          if (isEmptySignals(signals)) {
            skipped++;
            const profileId =
              type === "tinder" ? profile.tinderId : profile.hingeId;
            console.log(`⊘ ${type}:${profileId.substring(0, 12)}: No signals`);
            return;
          }

          const result = await inferGender(signals);

          if (result.confidence >= CONFIDENCE_THRESHOLD) {
            updated++;
            const profileId =
              type === "tinder" ? profile.tinderId : profile.hingeId;
            console.log(
              `✓ ${type}:${profileId.substring(0, 12)}: ${profile.gender} → ${result.inferredGender} (${result.confidence.toFixed(2)})`,
            );

            if (!DRY_RUN) {
              if (type === "tinder") {
                await db
                  .update(tinderProfileTable)
                  .set({ gender: result.inferredGender })
                  .where(eq(tinderProfileTable.tinderId, profile.tinderId));
              } else {
                await db
                  .update(hingeProfileTable)
                  .set({ gender: result.inferredGender })
                  .where(eq(hingeProfileTable.hingeId, profile.hingeId));
              }
            }
          } else {
            skipped++;
            const profileId =
              type === "tinder" ? profile.tinderId : profile.hingeId;
            console.log(
              `✗ ${type}:${profileId.substring(0, 12)}: Low confidence (${result.confidence.toFixed(2)})`,
            );
          }

          processed++;
        } catch (error) {
          errors++;
          const profileId =
            type === "tinder" ? profile.tinderId : profile.hingeId;
          console.error(`❌ ${type}:${profileId.substring(0, 12)}: ${String(error)}`);
        }
      }),
    );

    // Rate limit between batches
    if (i + BATCH_SIZE < allProfiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("📊 Summary");
  console.log(`${"═".repeat(60)}`);
  console.log(`Total profiles: ${totalProfiles}`);
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nDRY RUN: ${DRY_RUN}`);
  if (DRY_RUN) {
    console.log("Set DRY_RUN = false to actually write to database");
  }
}

// Run
migrateGenderInference().catch(console.error);
