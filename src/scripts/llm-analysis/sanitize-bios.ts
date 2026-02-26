/**
 * Bio Sanitization Script
 *
 * Processes Tinder profile bios to redact PII using the AI SDK directly.
 * Only ~7,800 profiles with bios — fast enough for real-time API calls.
 *
 * - Overwrites `bio` column directly (`bioOriginal` is the backup)
 * - Sets `llmAnalyzedAt` on the profile
 * - Uses same PII redaction tokens as the batch message analysis
 *
 * Usage:
 *   bun run src/scripts/llm-analysis/sanitize-bios.ts
 */

import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "@/server/db";
import { tinderProfileTable } from "@/server/db/schema";
import { and, isNull, isNotNull, eq } from "drizzle-orm";

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

const CONFIG = {
  DRY_RUN: true,
  /** Process N profiles per parallel batch */
  BATCH_SIZE: 10,
  /** Delay between batches (ms) to avoid rate limits */
  BATCH_DELAY_MS: 1000,
  /** Max profiles to process. null = all */
  PROFILE_LIMIT: null as number | null,
};

// ════════════════════════════════════════════════════════════════════
// SCHEMA
// ════════════════════════════════════════════════════════════════════

const piiTypeEnum = z.enum([
  "PHONE_NUMBER",
  "EMAIL",
  "SOCIAL_HANDLE",
  "FULL_NAME",
  "ADDRESS",
  "URL_WITH_PII",
  "OTHER",
]);

const bioAnalysisSchema = z.object({
  redactedBio: z.string().describe("Bio text with PII replaced by redaction tokens"),
  hasPii: z.boolean().describe("Whether any PII was found"),
  piiTypes: z.array(piiTypeEnum).describe("Types of PII found, empty if none"),
});

type BioAnalysis = z.infer<typeof bioAnalysisSchema>;

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

function fmtNum(n: number): string {
  return Number(n).toLocaleString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

// ════════════════════════════════════════════════════════════════════
// BIO ANALYSIS
// ════════════════════════════════════════════════════════════════════

async function analyzeBio(bio: string): Promise<BioAnalysis> {
  const result = await generateText({
    model: anthropic("claude-haiku-4-5"),
    output: Output.object({ schema: bioAnalysisSchema }),
    prompt: `Analyze this dating app bio for PII and return the bio with any PII redacted.

PII types to detect and their replacement tokens:
- Phone numbers → [PHONE_NUMBER]
- Email addresses → [EMAIL]
- Social media handles (@username, Snapchat names, Instagram handles) → [SOCIAL_HANDLE]
- Full names (first + last together) → [FULL_NAME]
- Physical addresses → [ADDRESS]
- URLs containing PII (personal websites, social profiles) → [URL_WITH_PII]
- Other PII → [OTHER]

DO NOT flag: city/country names, first names only, job titles, company names, restaurant/bar names, generic app references without handles.

If no PII is found, return the bio unchanged with hasPii=false and empty piiTypes.

BIO:
${bio}`,
  });

  return result.output;
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

async function main() {
  console.log(bold("\n╔═══════════════════════════════════════════════════════╗"));
  console.log(bold("║  Bio Sanitization Pipeline                             ║"));
  console.log(bold("╚═══════════════════════════════════════════════════════╝\n"));

  console.log(`  DRY_RUN: ${CONFIG.DRY_RUN ? yellow("true") : green("false")}`);
  console.log(`  BATCH_SIZE: ${CONFIG.BATCH_SIZE}`);
  console.log(`  PROFILE_LIMIT: ${CONFIG.PROFILE_LIMIT ?? "all"}\n`);

  // Query profiles with bios that haven't been analyzed
  const query = db
    .select({
      tinderId: tinderProfileTable.tinderId,
      bio: tinderProfileTable.bio,
    })
    .from(tinderProfileTable)
    .where(
      and(
        isNotNull(tinderProfileTable.bio),
        isNull(tinderProfileTable.llmAnalyzedAt),
      ),
    );

  const profiles = CONFIG.PROFILE_LIMIT
    ? await query.limit(CONFIG.PROFILE_LIMIT)
    : await query;

  console.log(`  Found ${cyan(fmtNum(profiles.length))} profiles with bios to analyze\n`);

  if (profiles.length === 0) {
    console.log(green("  All profiles already analyzed!"));
    return;
  }

  let processed = 0;
  let piiFound = 0;
  let errors = 0;
  const piiTypeCounts = new Map<string, number>();

  // Process in batches
  for (let i = 0; i < profiles.length; i += CONFIG.BATCH_SIZE) {
    const batch = profiles.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(profiles.length / CONFIG.BATCH_SIZE);

    console.log(
      dim(`  Batch ${batchNum}/${totalBatches} (${batch.length} profiles)...`),
    );

    const results = await Promise.allSettled(
      batch.map(async (profile) => {
        if (!profile.bio) return null;

        const analysis = await analyzeBio(profile.bio);

        if (analysis.hasPii) {
          piiFound++;
          for (const piiType of analysis.piiTypes) {
            piiTypeCounts.set(piiType, (piiTypeCounts.get(piiType) ?? 0) + 1);
          }

          console.log(
            `    ${yellow("PII")} ${profile.tinderId.slice(0, 12)}... | ${analysis.piiTypes.join(", ")}`,
          );
          console.log(
            dim(`      Before: ${truncate(profile.bio, 80)}`),
          );
          console.log(
            dim(`      After:  ${truncate(analysis.redactedBio, 80)}`),
          );
        }

        if (!CONFIG.DRY_RUN) {
          await db
            .update(tinderProfileTable)
            .set({
              bio: analysis.hasPii ? analysis.redactedBio : profile.bio,
              llmAnalyzedAt: new Date(),
            })
            .where(eq(tinderProfileTable.tinderId, profile.tinderId));
        }

        processed++;
        return analysis;
      }),
    );

    // Count errors
    for (const result of results) {
      if (result.status === "rejected") {
        errors++;
        console.log(red(`    Error: ${result.reason}`));
      }
    }

    // Rate limit between batches
    if (i + CONFIG.BATCH_SIZE < profiles.length) {
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  // Summary
  console.log(bold("\n═══ Summary ═══\n"));
  console.log(`  Profiles processed: ${green(fmtNum(processed))}`);
  console.log(`  Profiles with PII:  ${piiFound > 0 ? yellow(fmtNum(piiFound)) : green("0")}`);
  console.log(`  Errors:             ${errors > 0 ? red(fmtNum(errors)) : green("0")}`);
  console.log(`  PII rate:           ${((piiFound / processed) * 100).toFixed(1)}%`);

  if (piiTypeCounts.size > 0) {
    console.log(bold("\n  PII type breakdown:"));
    for (const [type, count] of [...piiTypeCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`    ${type.padEnd(20)} ${fmtNum(count)}`);
    }
  }

  if (CONFIG.DRY_RUN) {
    console.log(
      yellow("\n  DRY RUN — no DB writes. Set DRY_RUN=false to apply changes."),
    );
  }

  console.log("");
}

main().catch((err) => {
  console.error(red("\nFatal error:"), err);
  process.exit(1);
});
