/**
 * Research Dataset Anonymization Pipeline
 *
 * Reads a JSONL research dataset and anonymizes:
 * 1. Bios (bio + bioOriginal) — PII redaction via LLM
 * 2. Messages (content + contentRaw) — per-conversation language detection + PII redaction
 *
 * No DB access — operates entirely on JSONL files.
 *
 * Usage:
 *   bun run src/scripts/llm-analysis/anonymize-research-dataset.ts [input-file] [--sonnet] [--limit N]
 *
 * Flags:
 *   --sonnet   Use claude-sonnet-4-6 instead of claude-haiku-4-5 (~3x cost, better instruction following)
 *   --limit N  Only process first N profiles (useful for testing)
 *
 * If no input file is specified, uses the most recent research-demo-*.jsonl in output/
 */

import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "fs";
import path from "path";

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

// Parse CLI flags
const args = process.argv.slice(2);
const useSonnet = args.includes("--sonnet");
const limitIdx = args.indexOf("--limit");
const profileLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]!, 10) : null;
const skipIdx = args.indexOf("--skip");
const profileSkip = skipIdx !== -1 ? parseInt(args[skipIdx + 1]!, 10) : 0;
// Remove flags from args so input file detection still works
const flagsWithValues = new Set(["--limit", "--skip"]);
const positionalArgs = args.filter(
  (a, i) => !a.startsWith("--") && !(i > 0 && flagsWithValues.has(args[i - 1]!)),
);

const MODEL_ID = useSonnet ? "claude-sonnet-4-6" : "claude-haiku-4-5";

const CONFIG = {
  /** Number of profiles to process in parallel */
  PROFILE_CONCURRENCY: 30,
  /** Output directory */
  OUTPUT_DIR: path.join(new URL(".", import.meta.url).pathname, "output"),
};

// ════════════════════════════════════════════════════════════════════
// SCHEMAS (reused from existing scripts)
// ════════════════════════════════════════════════════════════════════

const PII_TYPES = [
  "PHONE_NUMBER",
  "EMAIL",
  "SOCIAL_HANDLE",
  "FULL_NAME",
  "ADDRESS",
  "URL_WITH_PII",
  "OTHER",
] as const;

const piiTypeEnum = z.enum(PII_TYPES);
const PII_TOKENS = PII_TYPES.map((t) => `[${t}]`);
const PII_TOKENS_STR = PII_TOKENS.join(", ");

const bioAnalysisSchema = z.object({
  redactedBio: z
    .string()
    .describe(
      `Bio with PII replaced using ONLY these exact tokens: ${PII_TOKENS_STR}. Never invent other tokens.`,
    ),
  hasPii: z.boolean().describe("Whether any PII was found"),
  piiTypes: z
    .array(piiTypeEnum)
    .describe("Types of PII found, empty if none"),
});

const conversationAnalysisSchema = z.object({
  primaryLanguage: z
    .string()
    .describe("ISO 639-1 two-letter code, e.g. 'en', 'es', 'fr', 'de'. Must be exactly 2 lowercase letters."),
  languages: z.array(
    z.string().describe("ISO 639-1 two-letter code, e.g. 'en', 'es'"),
  ),
  piiMessages: z.array(
    z.object({
      messageIndex: z.number().describe("Zero-based index of the message"),
      piiTypes: z.array(piiTypeEnum),
      redactedContent: z
        .string()
        .describe(
          `Original message with PII replaced using ONLY these exact tokens: ${PII_TOKENS_STR}. Never invent other tokens.`,
        ),
    }),
  ),
});

// ════════════════════════════════════════════════════════════════════
// TYPES (matching JSONL shape from export script)
// ════════════════════════════════════════════════════════════════════

interface ExportedMessage {
  content: string;
  contentRaw: string;
  charCount: number;
  messageType: string;
  sentDate: string;
  order: number;
  language: string | null;
  to: number;
}

interface ExportedMatch {
  match: {
    id: string;
    order: number;
    totalMessageCount: number;
    textCount: number;
    gifCount: number;
    gestureCount: number;
    otherMessageTypeCount: number;
    primaryLanguage: string | null;
    languages: string[];
    initialMessageAt: string | null;
    lastMessageAt: string | null;
    engagementScore: number | null;
    responseTimeMedianSeconds: number | null;
    conversationDurationDays: number | null;
    messageImbalanceRatio: number | null;
    longestGapHours: number | null;
    didMatchReply: boolean | null;
    lastMessageFrom: string | null;
  };
  messages: ExportedMessage[];
}

interface ExportedProfile {
  profile: {
    tinderId: string;
    gender: string;
    bio: string | null;
    bioOriginal: string | null;
    [key: string]: unknown;
  };
  user: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  usage: unknown[];
  matches: ExportedMatch[];
}

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

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

// ════════════════════════════════════════════════════════════════════
// CONVERSATION FORMATTING (from batch-message-analysis.ts)
// ════════════════════════════════════════════════════════════════════

const CONVERSATION_SYSTEM_PROMPT = `You work for SwipeStats, a dating app analytics platform. We are building an anonymized research dataset of Tinder conversations to share with academic researchers studying communication patterns, language use, and social dynamics in online dating.

Your job: detect languages and remove information that could be used to CONTACT or LOCATE a specific real person. That is the only test. Ask yourself: "Could someone use this piece of text to find, contact, or identify a specific individual?" If no, leave it alone.

## Why this matters

Researchers need natural, authentic conversation data. Every false redaction destroys research value. A message like "Hey Sarah! How was your weekend?" is perfectly safe and common — there are millions of Sarahs. But "my number is 555-867-5309" lets someone contact that person directly. That's the difference.

The most valuable parts of the dataset for researchers are:
- Natural greetings and how people address each other (first names)
- Geographic context (cities, neighborhoods, regions people mention)
- References to schools, workplaces, hobbies, pop culture
- The flow and rhythm of real conversation

None of these should be redacted. Only redact things that function as a direct line to a specific person.

## What to redact (things that let you CONTACT or LOCATE someone)

PHONE_NUMBER — Actual phone digit sequences that someone could dial or text.
  "5551234567", "+1 555 867 5309", "call me at 07943756021"

EMAIL — Actual email addresses someone could write to.
  "jane.doe@gmail.com"

SOCIAL_HANDLE — Actual account usernames someone could search and find.
  "@janedoe99", "my snap is coolcat_22", "Snapchat: jdoe42"

FULL_NAME — First AND last name together, enough to find someone on social media or public records.
  "Keegan Hoover", "I'm Jose David Gonzalez", "Kristen Gonzalez is not that bad"

ADDRESS — A physical street address with a number that someone could visit.
  "742 Evergreen Terrace Springfield IL", "3013 N 4th Street Minneapolis MN"

URL_WITH_PII — URLs that lead to a personal profile or reveal someone's identity.
  "facebook.com/john.doe.5", "instagram.com/personal_handle"

OTHER — Full dates of birth only (month/day/year together). Nothing else.

## What to NEVER redact (things researchers need)

- First names alone: "Hey Sarah", "What's up Jake", "SARAHHHHH!!!!!", "hola Katya", "Привет Маша". A first name cannot be used to contact or locate anyone. There are millions of people with any given first name. This is the #1 most common false positive — do not flag first names.
- Cities, towns, neighborhoods, regions: "I live in Austin", "I'm from Schaumburg", "Chapel Hill", "East Islip", "San Diego", "Denver". These are geographic data points, not addresses. You cannot show up at someone's door with just a city name.
- Platform names without handles: "do you have snap?", "IG?", "wanna move to snapchat?", "you got snap?". The word "snap" is not a username.
- School/university names: "I go to UMich", "Northeastern University", "BME"
- Company/employer names, hotel names, restaurant names, building names
- YouTube links, TikTok links, Spotify playlist links, product links, Google Maps links — these are content links, not personal profiles
- Pet names, nicknames, celebrity names
- Messages that merely DISCUSS sharing contact info: "what's your number?", "give me your snap", "do you have insta?"

## Input format
Messages: [index] USER/MATCH: message text. The prefix is metadata — your redactedContent must contain ONLY the message text, never the [index] or USER:/MATCH: prefix.

## Output rules
1. redactedContent = the EXACT original message with ONLY the contactable/locatable PII replaced by tokens. No rephrasing, no reordering, no adding or removing words.
2. Most conversations have ZERO PII. Return empty piiMessages array — this should be the common case.
3. When uncertain, do NOT flag. A missed redaction of a first name is fine. A missed redaction of a phone number is not.`;

function formatConversationForLLM(messages: ExportedMessage[]): string {
  const lines = messages.map((m, idx) => {
    const direction = m.to === 0 ? "USER" : "MATCH";
    if (m.messageType !== "TEXT") {
      return `[${idx}] ${direction}: [${m.messageType}]`;
    }
    return `[${idx}] ${direction}: ${m.content}`;
  });
  return `Analyze this dating app conversation:\n\n${lines.join("\n")}`;
}

// ════════════════════════════════════════════════════════════════════
// LLM CALLS
// ════════════════════════════════════════════════════════════════════

async function analyzeBio(
  bio: string,
): Promise<z.infer<typeof bioAnalysisSchema>> {
  const result = await generateText({
    model: anthropic(MODEL_ID),
    output: Output.object({ schema: bioAnalysisSchema }),
    prompt: `You work for SwipeStats. We're anonymizing dating app bios for a research dataset. Only redact information that could be used to CONTACT or LOCATE a specific person. Most bios have NO PII.

Tokens: [PHONE_NUMBER] [EMAIL] [SOCIAL_HANDLE] [FULL_NAME] [ADDRESS] [URL_WITH_PII] [OTHER]

Only redact: phone numbers, email addresses, social media usernames, first+last name together, street addresses with numbers, personal profile URLs, full dates of birth.

KEEP as-is: first names alone, city/town names, school names, company names, job titles, restaurant names, platform names without handles ("add me on snap"), celebrity names, interests, hobbies.

The redactedBio must be the EXACT original text with ONLY PII tokens swapped in. Do not rephrase.
If no PII is found, return the bio unchanged with hasPii=false and empty piiTypes.

BIO:
${bio}`,
  });

  return result.output;
}

async function analyzeConversation(
  messages: ExportedMessage[],
): Promise<z.infer<typeof conversationAnalysisSchema>> {
  const conversationText = formatConversationForLLM(messages);

  const result = await generateText({
    model: anthropic(MODEL_ID),
    output: Output.object({ schema: conversationAnalysisSchema }),
    system: CONVERSATION_SYSTEM_PROMPT,
    prompt: conversationText,
  });

  return result.output;
}

// ════════════════════════════════════════════════════════════════════
// TRACKING
// ════════════════════════════════════════════════════════════════════

interface Stats {
  profilesProcessed: number;
  biosAnalyzed: number;
  biosWithPii: number;
  conversationsAnalyzed: number;
  messagesWithPii: number;
  totalMessages: number;
  piiTypeCounts: Map<string, number>;
  languageCounts: Map<string, number>;
  errors: number;
  inputTokens: number;
  outputTokens: number;
}

function createStats(): Stats {
  return {
    profilesProcessed: 0,
    biosAnalyzed: 0,
    biosWithPii: 0,
    conversationsAnalyzed: 0,
    messagesWithPii: 0,
    totalMessages: 0,
    piiTypeCounts: new Map(),
    languageCounts: new Map(),
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

function trackPiiTypes(stats: Stats, piiTypes: string[]) {
  for (const t of piiTypes) {
    stats.piiTypeCounts.set(t, (stats.piiTypeCounts.get(t) ?? 0) + 1);
  }
}

function trackLanguage(stats: Stats, lang: string) {
  stats.languageCounts.set(lang, (stats.languageCounts.get(lang) ?? 0) + 1);
}

// ════════════════════════════════════════════════════════════════════
// PROFILE ANONYMIZATION
// ════════════════════════════════════════════════════════════════════

async function anonymizeProfile(
  profile: ExportedProfile,
  stats: Stats,
): Promise<ExportedProfile> {
  const result = structuredClone(profile);

  // 1. Anonymize bio if present
  if (result.profile.bio) {
    try {
      const bioResult = await analyzeBio(result.profile.bio);
      stats.biosAnalyzed++;

      if (bioResult.hasPii) {
        stats.biosWithPii++;
        trackPiiTypes(stats, bioResult.piiTypes);

        console.log(
          `  ${yellow("BIO PII")} ${truncate(result.profile.bio, 70)}`,
        );
        console.log(
          dim(`    → ${truncate(bioResult.redactedBio, 70)} | ${bioResult.piiTypes.join(", ")}`),
        );
        console.log(dim(`    "${truncate(result.profile.bio, 60)}" → "${truncate(bioResult.redactedBio, 60)}"`));

        result.profile.bio = bioResult.redactedBio;
        if (result.profile.bioOriginal) {
          result.profile.bioOriginal = bioResult.redactedBio;
        }
      }
    } catch (err) {
      stats.errors++;
      console.log(
        red(
          `    Bio error ${result.profile.tinderId.slice(0, 12)}...: ${String(err)}`,
        ),
      );
    }
  }

  // 2. Anonymize conversations (sequential for clean logging)
  const matchesWithMessages = result.matches.filter(
    (m) => m.messages.length > 0,
  );

  for (const matchEntry of matchesWithMessages) {
    const textMessages = matchEntry.messages.filter(
      (m) => m.messageType === "TEXT" && m.content,
    );
    if (textMessages.length === 0) continue;

    stats.totalMessages += matchEntry.messages.length;

    try {
      const analysis = await analyzeConversation(matchEntry.messages);
      stats.conversationsAnalyzed++;

      // Apply language
      trackLanguage(stats, analysis.primaryLanguage);
      matchEntry.match.primaryLanguage = analysis.primaryLanguage;
      matchEntry.match.languages = analysis.languages;

      // Set language on all messages
      for (const msg of matchEntry.messages) {
        msg.language = analysis.primaryLanguage;
      }

      // Apply PII redactions
      for (const pii of analysis.piiMessages) {
        const msg = matchEntry.messages[pii.messageIndex];
        if (!msg) continue;

        stats.messagesWithPii++;
        trackPiiTypes(stats, pii.piiTypes);

        console.log(
          `  ${yellow("MSG PII")} msg[${pii.messageIndex}] ${truncate(msg.content, 70)}`,
        );
        console.log(
          dim(`    → ${truncate(pii.redactedContent, 70)} | ${pii.piiTypes.join(", ")}`),
        );

        msg.content = pii.redactedContent;
        msg.contentRaw = pii.redactedContent;
      }
    } catch (err) {
      stats.errors++;
      console.log(
        red(
          `    Conv error match=${matchEntry.match.id.slice(0, 12)}...: ${String(err)}`,
        ),
      );
    }
  }

  stats.profilesProcessed++;
  return result;
}

// ════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════

function printSummary(stats: Stats) {
  console.log(bold("\n═══ Summary ═══\n"));
  console.log(`  Profiles processed:        ${green(fmtNum(stats.profilesProcessed))}`);
  console.log(`  Bios analyzed:             ${fmtNum(stats.biosAnalyzed)}`);
  console.log(
    `  Bios with PII:             ${stats.biosWithPii > 0 ? yellow(fmtNum(stats.biosWithPii)) : green("0")}`,
  );
  console.log(`  Conversations analyzed:    ${fmtNum(stats.conversationsAnalyzed)}`);
  console.log(`  Total messages scanned:    ${fmtNum(stats.totalMessages)}`);
  console.log(
    `  Messages with PII:         ${stats.messagesWithPii > 0 ? yellow(fmtNum(stats.messagesWithPii)) : green("0")}`,
  );
  console.log(
    `  Errors:                    ${stats.errors > 0 ? red(fmtNum(stats.errors)) : green("0")}`,
  );

  // PII type breakdown
  if (stats.piiTypeCounts.size > 0) {
    console.log(bold("\n  PII type breakdown:"));
    for (const [type, count] of [...stats.piiTypeCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`    ${type.padEnd(20)} ${fmtNum(count)}`);
    }
  }

  // Language distribution
  if (stats.languageCounts.size > 0) {
    console.log(bold("\n  Language distribution:"));
    const sortedLangs = [...stats.languageCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    );
    for (const [lang, count] of sortedLangs.slice(0, 20)) {
      const pct = (
        (count / stats.conversationsAnalyzed) *
        100
      ).toFixed(1);
      console.log(
        `    ${lang.padEnd(4)} ${fmtNum(count).padStart(8)} (${pct}%)`,
      );
    }
    if (sortedLangs.length > 20) {
      console.log(dim(`    ... and ${sortedLangs.length - 20} more`));
    }
  }

  // Cost estimate — Haiku: $0.80/$4.00 per MTok, Sonnet: $3.00/$15.00 per MTok
  const inputRate = useSonnet ? 3.0 : 0.8;
  const outputRate = useSonnet ? 15.0 : 4.0;
  const inputCost = (stats.inputTokens / 1e6) * inputRate;
  const outputCost = (stats.outputTokens / 1e6) * outputRate;
  console.log(bold(`\n  Cost estimate (${MODEL_ID}):`));
  console.log(`    Input tokens:  ~${fmtNum(stats.inputTokens)} → $${inputCost.toFixed(2)}`);
  console.log(`    Output tokens: ~${fmtNum(stats.outputTokens)} → $${outputCost.toFixed(2)}`);
  console.log(`    ${bold("Estimated total:")} $${(inputCost + outputCost).toFixed(2)}`);
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

function findLatestInputFile(): string | null {
  const files = readdirSync(CONFIG.OUTPUT_DIR)
    .filter(
      (f) =>
        f.startsWith("research-demo-") &&
        f.endsWith(".jsonl") &&
        !f.includes("-anonymized"),
    )
    .sort()
    .reverse();
  return files[0] ? path.join(CONFIG.OUTPUT_DIR, files[0]) : null;
}

async function main() {
  console.log(
    bold(
      "\n╔═══════════════════════════════════════════════════════╗",
    ),
  );
  console.log(
    bold(
      "║  Research Dataset Anonymization Pipeline               ║",
    ),
  );
  console.log(
    bold(
      "╚═══════════════════════════════════════════════════════╝\n",
    ),
  );

  // Resolve input file
  const inputArg = positionalArgs[0];
  const inputPath = inputArg
    ? path.resolve(inputArg)
    : findLatestInputFile();

  if (!inputPath) {
    console.log(
      red(
        "  No input file specified and no research-demo-*.jsonl found in output/",
      ),
    );
    console.log(
      dim(
        "  Usage: bun run src/scripts/llm-analysis/anonymize-research-dataset.ts [input.jsonl]",
      ),
    );
    process.exit(1);
  }

  // Derive output path (include model suffix for sonnet so it doesn't overwrite haiku output)
  const inputBasename = path.basename(inputPath, ".jsonl");
  const modelSuffix = useSonnet ? "-sonnet" : "";
  const limitSuffix = profileLimit ? `-test${profileLimit}` : "";
  const outputPath = path.join(
    CONFIG.OUTPUT_DIR,
    `${inputBasename}-anonymized${modelSuffix}${limitSuffix}.jsonl`,
  );

  console.log(`  Input:  ${inputPath}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  Model:  ${cyan(MODEL_ID)}`);
  if (profileSkip) console.log(`  Skip:   ${cyan(String(profileSkip))} profiles`);
  if (profileLimit) console.log(`  Limit:  ${cyan(String(profileLimit))} profiles`);
  console.log(`  Concurrency: ${CONFIG.PROFILE_CONCURRENCY} profiles in parallel\n`);

  // Read input
  const inputContent = readFileSync(inputPath, "utf-8");
  let lines = inputContent.trim().split("\n");
  if (profileSkip) {
    lines = lines.slice(profileSkip);
  }
  if (profileLimit) {
    lines = lines.slice(0, profileLimit);
  }
  console.log(`  Input lines: ${cyan(fmtNum(lines.length))}\n`);

  // Resume support: skip already-processed lines
  mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  let skipLines = 0;
  if (existsSync(outputPath)) {
    const existing = readFileSync(outputPath, "utf-8").trim();
    skipLines = existing ? existing.split("\n").length : 0;
  }
  if (skipLines > 0) {
    console.log(`  ${yellow(`Resuming: skipping ${skipLines} already-processed profiles`)}\n`);
  } else {
    writeFileSync(outputPath, "");
  }

  const stats = createStats();
  const startTime = Date.now();

  // Process profiles in concurrent batches
  for (
    let i = skipLines;
    i < lines.length;
    i += CONFIG.PROFILE_CONCURRENCY
  ) {
    const batchLines = lines.slice(i, i + CONFIG.PROFILE_CONCURRENCY);
    const batchNum = Math.floor(i / CONFIG.PROFILE_CONCURRENCY) + 1;
    const totalBatches = Math.ceil(lines.length / CONFIG.PROFILE_CONCURRENCY);

    // Estimate tokens for all profiles in this batch
    for (const line of batchLines) {
      const p = JSON.parse(line) as ExportedProfile;
      const matchesWithMsgs = p.matches.filter(
        (m) => m.messages.length > 0,
      ).length;
      const bioTokens = p.profile.bio
        ? Math.ceil(p.profile.bio.length / 4) + 200
        : 0;
      const convTokens = p.matches.reduce((sum, m) => {
        if (m.messages.length === 0) return sum;
        const textLen = m.messages.reduce(
          (s, msg) => s + (msg.content?.length ?? 0),
          0,
        );
        return sum + Math.ceil(textLen / 4) + 300;
      }, 0);
      stats.inputTokens += bioTokens + convTokens;
      stats.outputTokens +=
        (p.profile.bio ? 100 : 0) + matchesWithMsgs * 80;
    }

    // Process all profiles in this batch concurrently
    const results = await Promise.allSettled(
      batchLines.map(async (line) => {
        const profile = JSON.parse(line) as ExportedProfile;
        return anonymizeProfile(profile, stats);
      }),
    );

    // Write results in order, count errors
    for (const result of results) {
      if (result.status === "fulfilled") {
        appendFileSync(outputPath, JSON.stringify(result.value) + "\n");
      } else {
        stats.errors++;
        console.log(red(`    Profile error: ${result.reason}`));
      }
    }

    // Progress logging after each batch
    const profilesDone = Math.min(i + batchLines.length, lines.length);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = profilesDone / elapsed;
    const eta = (lines.length - profilesDone) / rate;
    console.log(
      bold(
        `  Batch ${batchNum}/${totalBatches} done — ${profilesDone}/${lines.length} profiles (${((profilesDone / lines.length) * 100).toFixed(0)}%) | ` +
          `${rate.toFixed(1)} profiles/s | ETA: ${Math.ceil(eta / 60)}min | ` +
          `convs: ${fmtNum(stats.conversationsAnalyzed)} | PII: bio=${stats.biosWithPii} msg=${stats.messagesWithPii} | errs=${stats.errors}`,
      ),
    );

    // Language distribution every few batches
    if (batchNum % 3 === 0 && stats.languageCounts.size > 0) {
      const top5 = [...stats.languageCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, count]) => `${lang}:${count}`)
        .join(" ");
      console.log(dim(`    Languages so far: ${top5}`));
    }
  }

  printSummary(stats);

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n  Total time: ${totalTime} minutes`);
  console.log(`  Output: ${outputPath}\n`);
}

main().catch((err) => {
  console.error(red("\nFatal error:"), err);
  process.exit(1);
});
