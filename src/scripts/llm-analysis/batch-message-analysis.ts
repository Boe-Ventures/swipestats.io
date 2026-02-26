/**
 * LLM Batch Message Analysis Pipeline
 *
 * Processes dating app conversations through the Anthropic Batch API:
 * 1. Queries matches with their messages (skips ghosted + already analyzed)
 * 2. Builds JSONL batch file (1 request per conversation)
 * 3. Submits to Anthropic Batch API
 * 4. Polls for completion, downloads results
 * 5. Parses results and writes language + PII redactions to DB
 * 6. Aggregates user-level languages from their matches
 *
 * Usage:
 *   bun run src/scripts/llm-analysis/batch-message-analysis.ts
 *
 * Modes:
 *   --dry-run     Generate JSONL without submitting (default)
 *   --submit      Submit batch to Anthropic API
 *   --process     Process results from a completed batch
 *   --aggregate   Run user language aggregation only
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/server/db";
import {
  matchTable,
  messageTable,
  tinderProfileTable,
  userTable,
} from "@/server/db/schema";
import {
  and,
  eq,
  gt,
  isNull,
  isNotNull,
  sql,
  inArray,
  desc,
} from "drizzle-orm";
import { z } from "zod";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

const CONFIG = {
  /** No API calls or DB writes — just generate JSONL for inspection */
  DRY_RUN: true,
  /** Max matches to process. null = all matches */
  MATCH_LIMIT: 1000 as number | null,
  /** Max requests per Anthropic batch (API limit) */
  BATCH_SIZE: 100_000,
  /** Model to use */
  MODEL: "claude-haiku-4-5-20251001" as const,
  /** Max output tokens per request */
  MAX_TOKENS: 1024,
  /** Output directory for JSONL files */
  OUTPUT_DIR: path.join(new URL(".", import.meta.url).pathname, "output"),
  /** DB write batch size (how many updates per transaction) */
  DB_WRITE_BATCH_SIZE: 500,
  /** Poll interval for batch status (ms) */
  POLL_INTERVAL_MS: 30_000,
};

// ════════════════════════════════════════════════════════════════════
// SCHEMAS
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

const conversationAnalysisSchema = z.object({
  primaryLanguage: z.string(),
  languages: z.array(z.string()),
  piiMessages: z.array(
    z.object({
      messageIndex: z.number(),
      piiTypes: z.array(piiTypeEnum),
      redactedContent: z.string(),
    }),
  ),
});

type ConversationAnalysis = z.infer<typeof conversationAnalysisSchema>;

interface MatchAnalysisResult extends ConversationAnalysis {
  matchId: string;
}

// JSON Schema for Anthropic tool use
const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    primaryLanguage: {
      type: "string" as const,
      description:
        "ISO 639-1 code for the primary language of this conversation (en, de, fr, es, pt, nl, sv, fi, da, no, pl, cs, hu, ro, it, gsw, etc.)",
    },
    languages: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        "All ISO 639-1 language codes detected, ordered by frequency",
    },
    piiMessages: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          messageIndex: {
            type: "number" as const,
            description: "0-based index in the conversation",
          },
          piiTypes: {
            type: "array" as const,
            items: {
              type: "string" as const,
              enum: [
                "PHONE_NUMBER",
                "EMAIL",
                "SOCIAL_HANDLE",
                "FULL_NAME",
                "ADDRESS",
                "URL_WITH_PII",
                "OTHER",
              ],
            },
            description: "What types of PII were found in this message",
          },
          redactedContent: {
            type: "string" as const,
            description:
              "Full message text with PII replaced by redaction tokens like [PHONE_NUMBER], [EMAIL], etc.",
          },
        },
        required: ["messageIndex", "piiTypes", "redactedContent"] as const,
      },
      description:
        "Only messages containing PII, with full text rewritten using redaction tokens. Empty array if no PII found.",
    },
  },
  required: ["primaryLanguage", "languages", "piiMessages"] as const,
};

// ════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a multilingual PII detection and language identification system.

Analyze the conversation and return:
1. The primary language (ISO 639-1 two-letter code)
2. All languages detected, ordered by frequency
3. Any messages containing PII, with the full message rewritten using redaction tokens

PII types to detect and their tokens:
- Phone numbers → [PHONE_NUMBER]
- Email addresses → [EMAIL]
- Social media handles (@username, Snapchat, Instagram) → [SOCIAL_HANDLE]
- Full names (first + last together) → [FULL_NAME]
- Physical addresses → [ADDRESS]
- URLs containing PII → [URL_WITH_PII]
- Other PII → [OTHER]

DO NOT flag: city/country names alone, first names only, job titles, generic app references, GIF/image URLs, restaurant/bar names.

Return empty piiMessages array if no PII is found (most conversations have none).`;

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

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ════════════════════════════════════════════════════════════════════
// CONVERSATION FORMATTING
// ════════════════════════════════════════════════════════════════════

interface ConversationMessage {
  id: string;
  index: number;
  direction: "USER" | "MATCH";
  content: string;
  charCount: number;
  messageType: string;
}

function formatConversationForLLM(messages: ConversationMessage[]): string {
  const lines = messages.map((m) => {
    if (m.messageType !== "TEXT") {
      return `[${m.index}] ${m.direction}: [${m.messageType}]`;
    }
    return `[${m.index}] ${m.direction}: ${m.content}`;
  });
  return `Analyze this dating app conversation:\n\n${lines.join("\n")}`;
}

// ════════════════════════════════════════════════════════════════════
// BATCH REQUEST BUILDING
// ════════════════════════════════════════════════════════════════════

function buildBatchRequest(
  matchId: string,
  messages: ConversationMessage[],
): object {
  const conversationText = formatConversationForLLM(messages);

  return {
    custom_id: matchId,
    params: {
      model: CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: conversationText,
        },
      ],
      tools: [
        {
          name: "conversation_analysis",
          description:
            "Report the language and PII analysis for this conversation",
          input_schema: TOOL_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "conversation_analysis" },
    },
  };
}

// ════════════════════════════════════════════════════════════════════
// STEP 1: QUERY MATCHES WITH MESSAGES
// ════════════════════════════════════════════════════════════════════

async function queryMatchesWithMessages(): Promise<
  Array<{ matchId: string; messages: ConversationMessage[] }>
> {
  console.log(bold("\n═══ Step 1: Query matches ═══\n"));

  // Get matches that have messages, haven't been analyzed, and are Tinder
  const matchQuery = db
    .select({
      id: matchTable.id,
      totalMessageCount: matchTable.totalMessageCount,
    })
    .from(matchTable)
    .where(
      and(
        gt(matchTable.totalMessageCount, 0),
        isNull(matchTable.llmAnalyzedAt),
        isNotNull(matchTable.tinderProfileId),
      ),
    )
    .orderBy(desc(matchTable.totalMessageCount));

  const matches = CONFIG.MATCH_LIMIT
    ? await matchQuery.limit(CONFIG.MATCH_LIMIT)
    : await matchQuery;

  console.log(`  Found ${cyan(fmtNum(matches.length))} matches to process`);
  console.log(
    `  Total messages in selection: ${cyan(fmtNum(matches.reduce((sum, m) => sum + m.totalMessageCount, 0)))}`,
  );

  // Load messages for each match
  const results: Array<{ matchId: string; messages: ConversationMessage[] }> =
    [];

  const QUERY_BATCH_SIZE = 100;
  for (let i = 0; i < matches.length; i += QUERY_BATCH_SIZE) {
    const batch = matches.slice(i, i + QUERY_BATCH_SIZE);
    const matchIds = batch.map((m) => m.id);

    const messages = await db
      .select({
        id: messageTable.id,
        matchId: messageTable.matchId,
        to: messageTable.to,
        content: messageTable.content,
        charCount: messageTable.charCount,
        messageType: messageTable.messageType,
        order: messageTable.order,
      })
      .from(messageTable)
      .where(inArray(messageTable.matchId, matchIds))
      .orderBy(messageTable.matchId, messageTable.order);

    // Group messages by matchId
    const messagesByMatch = new Map<
      string,
      (typeof messages)[number][]
    >();
    for (const msg of messages) {
      const existing = messagesByMatch.get(msg.matchId) ?? [];
      existing.push(msg);
      messagesByMatch.set(msg.matchId, existing);
    }

    for (const matchId of matchIds) {
      const matchMessages = messagesByMatch.get(matchId) ?? [];
      const formatted: ConversationMessage[] = matchMessages.map((m, idx) => ({
        id: m.id,
        index: idx,
        direction: m.to === 0 ? ("USER" as const) : ("MATCH" as const),
        content: m.content,
        charCount: m.charCount,
        messageType: m.messageType,
      }));
      results.push({ matchId, messages: formatted });
    }

    if (i % 10000 === 0 && i > 0) {
      console.log(
        dim(
          `  Loaded messages for ${fmtNum(Math.min(i + QUERY_BATCH_SIZE, matches.length))} / ${fmtNum(matches.length)} matches`,
        ),
      );
    }
  }

  console.log(
    `  Loaded ${green(fmtNum(results.length))} conversations with messages\n`,
  );
  return results;
}

// ════════════════════════════════════════════════════════════════════
// STEP 2: BUILD JSONL BATCH FILES
// ════════════════════════════════════════════════════════════════════

function buildJsonlFiles(
  conversations: Array<{ matchId: string; messages: ConversationMessage[] }>,
): string[] {
  console.log(bold("═══ Step 2: Build JSONL batch files ═══\n"));

  mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });

  const filePaths: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokensEstimate = 0;

  for (
    let batchIdx = 0;
    batchIdx * CONFIG.BATCH_SIZE < conversations.length;
    batchIdx++
  ) {
    const start = batchIdx * CONFIG.BATCH_SIZE;
    const end = Math.min(start + CONFIG.BATCH_SIZE, conversations.length);
    const batch = conversations.slice(start, end);

    const lines: string[] = [];
    for (const conv of batch) {
      const request = buildBatchRequest(conv.matchId, conv.messages);
      const line = JSON.stringify(request);
      lines.push(line);

      // Estimate tokens
      totalInputTokens += estimateTokens(
        SYSTEM_PROMPT + formatConversationForLLM(conv.messages),
      );
      totalOutputTokensEstimate += 80; // Typical structured output size
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `batch-${batchIdx + 1}-${timestamp}.jsonl`;
    const filePath = path.join(CONFIG.OUTPUT_DIR, filename);
    writeFileSync(filePath, lines.join("\n") + "\n");

    filePaths.push(filePath);
    const sizeKB = Buffer.byteLength(lines.join("\n")) / 1024;
    console.log(
      `  ${green("Wrote:")} ${filename} (${fmtNum(batch.length)} requests, ${(sizeKB / 1024).toFixed(1)} MB)`,
    );
  }

  // Cost estimate
  const inputCost = (totalInputTokens / 1e6) * 0.5; // Haiku batch: $0.50/MTok
  const outputCost = (totalOutputTokensEstimate / 1e6) * 2.5; // Haiku batch: $2.50/MTok
  const totalCost = inputCost + outputCost;

  console.log(`\n  ${bold("Cost estimate")} (before prompt caching):`);
  console.log(
    `    Input tokens:  ${fmtNum(totalInputTokens)} → $${inputCost.toFixed(2)}`,
  );
  console.log(
    `    Output tokens: ~${fmtNum(totalOutputTokensEstimate)} → $${outputCost.toFixed(2)}`,
  );
  console.log(`    ${bold("Estimated total:")} $${totalCost.toFixed(2)}`);
  console.log(
    dim(
      `    (With 60-90% prompt cache hits, input cost could be 50-70% lower)`,
    ),
  );

  return filePaths;
}

// ════════════════════════════════════════════════════════════════════
// STEP 3: SUBMIT BATCH TO ANTHROPIC API
// ════════════════════════════════════════════════════════════════════

async function submitBatch(jsonlPath: string): Promise<string> {
  console.log(bold("\n═══ Step 3: Submit batch ═══\n"));

  const client = new Anthropic();

  // Read and parse the JSONL file into individual requests
  const fileContent = readFileSync(jsonlPath, "utf-8");
  const lines = fileContent.trim().split("\n");
  const requests = lines.map((line) => JSON.parse(line) as Parameters<typeof client.messages.batches.create>[0]["requests"][number]);

  console.log(
    `  Submitting ${cyan(fmtNum(requests.length))} requests from ${path.basename(jsonlPath)}...`,
  );

  const batch = await client.messages.batches.create({
    requests,
  });

  console.log(`  ${green("Batch created!")} ID: ${batch.id}`);
  console.log(`  Status: ${batch.processing_status}`);

  // Save batch ID for later retrieval
  const batchInfoPath = path.join(
    CONFIG.OUTPUT_DIR,
    `batch-info-${batch.id}.json`,
  );
  writeFileSync(
    batchInfoPath,
    JSON.stringify(
      {
        batchId: batch.id,
        jsonlPath,
        requestCount: requests.length,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`  Batch info saved to: ${batchInfoPath}`);

  return batch.id;
}

// ════════════════════════════════════════════════════════════════════
// STEP 4: POLL FOR COMPLETION & DOWNLOAD RESULTS
// ════════════════════════════════════════════════════════════════════

async function pollAndDownloadResults(
  batchId: string,
): Promise<MatchAnalysisResult[]> {
  console.log(bold("\n═══ Step 4: Poll & download results ═══\n"));

  const client = new Anthropic();

  // Poll until complete
  let status: string;
  do {
    const batch = await client.messages.batches.retrieve(batchId);
    status = batch.processing_status;

    console.log(
      `  Status: ${status} | Counts: succeeded=${batch.request_counts.succeeded} failed=${batch.request_counts.errored} processing=${batch.request_counts.processing}`,
    );

    if (status === "ended") break;

    console.log(
      dim(
        `  Polling again in ${CONFIG.POLL_INTERVAL_MS / 1000}s...`,
      ),
    );
    await sleep(CONFIG.POLL_INTERVAL_MS);
  } while (status !== "ended");

  // Download and parse results
  console.log(`\n  Downloading results...`);

  const results: MatchAnalysisResult[] = [];
  let succeeded = 0;
  let failed = 0;

  const resultsStream = await client.messages.batches.results(batchId);
  for await (const result of resultsStream) {
    const matchId = result.custom_id;

    if (result.result.type !== "succeeded") {
      failed++;
      console.log(
        yellow(
          `  Warning: ${matchId} — ${result.result.type}: ${JSON.stringify(result.result)}`,
        ),
      );
      continue;
    }

    // Extract tool use result
    const toolUse = result.result.message.content.find(
      (c: { type: string }) => c.type === "tool_use",
    );
    if (toolUse?.type !== "tool_use") {
      failed++;
      console.log(
        yellow(
          `  Warning: ${matchId} — no tool_use block in response`,
        ),
      );
      continue;
    }

    try {
      const analysis = conversationAnalysisSchema.parse(toolUse.input);
      results.push({ ...analysis, matchId });
      succeeded++;
    } catch (parseErr) {
      failed++;
      console.log(
        yellow(
          `  Warning: ${matchId} — failed to parse: ${String(parseErr)}`,
        ),
      );
    }
  }

  console.log(`\n  Results: ${green(fmtNum(succeeded))} succeeded, ${failed > 0 ? red(fmtNum(failed)) : fmtNum(failed)} failed`);

  // Save results to JSONL for backup
  const resultsPath = path.join(
    CONFIG.OUTPUT_DIR,
    `results-${batchId}.jsonl`,
  );
  const resultLines = results.map((r) => JSON.stringify(r));
  writeFileSync(resultsPath, resultLines.join("\n") + "\n");
  console.log(`  Results saved to: ${resultsPath}`);

  return results;
}

// ════════════════════════════════════════════════════════════════════
// STEP 5: PROCESS RESULTS & WRITE TO DB
// ════════════════════════════════════════════════════════════════════

async function processResults(
  results: MatchAnalysisResult[],
  /** Map from matchId → ordered message IDs (for resolving messageIndex → message.id) */
  messageIdMap: Map<string, string[]>,
): Promise<void> {
  console.log(bold("\n═══ Step 5: Write results to database ═══\n"));

  if (CONFIG.DRY_RUN) {
    console.log(yellow("  DRY RUN — skipping DB writes\n"));
    printResultsSummary(results);
    return;
  }

  let matchesUpdated = 0;
  let messagesRedacted = 0;
  const now = new Date();

  // Process in batches
  for (let i = 0; i < results.length; i += CONFIG.DB_WRITE_BATCH_SIZE) {
    const batch = results.slice(i, i + CONFIG.DB_WRITE_BATCH_SIZE);

    for (const result of batch) {
      // 1. Update match with language + llmAnalyzedAt
      await db
        .update(matchTable)
        .set({
          primaryLanguage: result.primaryLanguage,
          languages: result.languages,
          llmAnalyzedAt: now,
        })
        .where(eq(matchTable.id, result.matchId));
      matchesUpdated++;

      // 2. Update messages that have PII (overwrite content, contentRaw is backup)
      if (result.piiMessages.length > 0) {
        const msgIds = messageIdMap.get(result.matchId);
        if (!msgIds) continue;

        for (const pii of result.piiMessages) {
          const messageId = msgIds[pii.messageIndex];
          if (!messageId) {
            console.log(
              yellow(
                `  Warning: No message ID at index ${pii.messageIndex} for match ${result.matchId}`,
              ),
            );
            continue;
          }

          await db
            .update(messageTable)
            .set({ content: pii.redactedContent })
            .where(eq(messageTable.id, messageId));
          messagesRedacted++;
        }
      }
    }

    console.log(
      dim(
        `  Processed ${fmtNum(Math.min(i + CONFIG.DB_WRITE_BATCH_SIZE, results.length))} / ${fmtNum(results.length)} results`,
      ),
    );
  }

  console.log(`\n  ${green("Done!")} Updated:`);
  console.log(`    Matches (language + llmAnalyzedAt): ${fmtNum(matchesUpdated)}`);
  console.log(`    Messages (PII redacted): ${fmtNum(messagesRedacted)}`);
}

function printResultsSummary(
  results: MatchAnalysisResult[],
): void {
  // Language distribution
  const langCounts = new Map<string, number>();
  for (const r of results) {
    langCounts.set(
      r.primaryLanguage,
      (langCounts.get(r.primaryLanguage) ?? 0) + 1,
    );
  }
  const sortedLangs = [...langCounts.entries()].sort((a, b) => b[1] - a[1]);

  console.log(bold("  Language distribution:"));
  for (const [lang, count] of sortedLangs.slice(0, 20)) {
    const pct = ((count / results.length) * 100).toFixed(1);
    console.log(`    ${lang.padEnd(4)} ${fmtNum(count).padStart(8)} (${pct}%)`);
  }

  // PII stats
  let totalPiiMessages = 0;
  const piiTypeCounts = new Map<string, number>();
  for (const r of results) {
    totalPiiMessages += r.piiMessages.length;
    for (const pii of r.piiMessages) {
      for (const piiType of pii.piiTypes) {
        piiTypeCounts.set(piiType, (piiTypeCounts.get(piiType) ?? 0) + 1);
      }
    }
  }

  console.log(
    `\n  PII: ${fmtNum(totalPiiMessages)} messages with PII across ${fmtNum(results.length)} conversations`,
  );
  if (piiTypeCounts.size > 0) {
    console.log(bold("  PII type breakdown:"));
    for (const [type, count] of [...piiTypeCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`    ${type.padEnd(20)} ${fmtNum(count)}`);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// STEP 6: AGGREGATE USER LANGUAGES
// ════════════════════════════════════════════════════════════════════

async function aggregateUserLanguages(): Promise<void> {
  console.log(bold("\n═══ Step 6: Aggregate user languages ═══\n"));

  if (CONFIG.DRY_RUN) {
    console.log(yellow("  DRY RUN — skipping user language aggregation\n"));
    return;
  }

  // Get all users with tinder profiles
  const users = await db
    .select({
      userId: tinderProfileTable.userId,
    })
    .from(tinderProfileTable)
    .where(isNotNull(tinderProfileTable.userId));

  console.log(`  Processing ${fmtNum(users.length)} users with Tinder profiles...`);

  let updated = 0;
  for (const { userId } of users) {
    if (!userId) continue;

    // Get all languages from this user's analyzed matches
    const matchLanguages = await db
      .select({
        languages: matchTable.languages,
      })
      .from(matchTable)
      .where(
        and(
          eq(matchTable.tinderProfileId, sql`(
            SELECT tinder_id FROM tinder_profile WHERE user_id = ${userId}
          )`),
          isNotNull(matchTable.llmAnalyzedAt),
        ),
      );

    // Aggregate + deduplicate
    const allLangs = new Set<string>();
    for (const m of matchLanguages) {
      const langs = m.languages;
      if (Array.isArray(langs)) {
        for (const lang of langs) {
          allLangs.add(lang);
        }
      }
    }

    if (allLangs.size > 0) {
      await db
        .update(userTable)
        .set({ languages: [...allLangs] })
        .where(eq(userTable.id, userId));
      updated++;
    }
  }

  console.log(`  ${green("Done!")} Updated ${fmtNum(updated)} users with languages\n`);
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "--dry-run";

  console.log(bold("\n╔═══════════════════════════════════════════════════════╗"));
  console.log(bold("║  LLM Batch Message Analysis Pipeline                  ║"));
  console.log(bold("╚═══════════════════════════════════════════════════════╝\n"));

  console.log(`  Mode: ${cyan(mode)}`);
  console.log(`  DRY_RUN: ${CONFIG.DRY_RUN ? yellow("true") : green("false")}`);
  console.log(`  MATCH_LIMIT: ${CONFIG.MATCH_LIMIT ? fmtNum(CONFIG.MATCH_LIMIT) : "all"}`);
  console.log(`  MODEL: ${CONFIG.MODEL}`);

  if (mode === "--aggregate") {
    // Just run user language aggregation
    await aggregateUserLanguages();
    return;
  }

  if (mode === "--process") {
    // Process results from a specific batch
    const batchId = args[1];
    if (!batchId) {
      console.log(red("\n  Error: --process requires a batch ID"));
      console.log(
        dim(
          "  Usage: bun run src/scripts/llm-analysis/batch-message-analysis.ts --process msgbatch_xxx",
        ),
      );
      process.exit(1);
    }

    // We need the message ID map. Try to load from a saved file, or re-query.
    const mapPath = path.join(CONFIG.OUTPUT_DIR, `message-id-map-${batchId}.json`);
    let messageIdMap: Map<string, string[]>;

    if (existsSync(mapPath)) {
      const mapData = JSON.parse(readFileSync(mapPath, "utf-8")) as Record<string, string[]>;
      messageIdMap = new Map(Object.entries(mapData));
    } else {
      console.log(
        yellow(
          "  No saved message ID map found. Will re-query matches from results...",
        ),
      );
      messageIdMap = new Map();
    }

    const results = await pollAndDownloadResults(batchId);
    await processResults(results, messageIdMap);
    await aggregateUserLanguages();
    return;
  }

  // Default flow: query → build → optionally submit

  // Step 1: Load conversations
  const conversations = await queryMatchesWithMessages();

  if (conversations.length === 0) {
    console.log(green("\n  No unanalyzed matches found. All done!"));
    return;
  }

  // Build message ID map (matchId → ordered array of message IDs)
  const messageIdMap = new Map<string, string[]>();
  for (const conv of conversations) {
    messageIdMap.set(
      conv.matchId,
      conv.messages.map((m) => m.id),
    );
  }

  // Step 2: Build JSONL files
  const jsonlPaths = buildJsonlFiles(conversations);

  if (mode === "--dry-run" || CONFIG.DRY_RUN) {
    console.log(
      bold(`\n  DRY RUN complete. JSONL files written to: ${CONFIG.OUTPUT_DIR}`),
    );
    console.log(
      dim(
        "  To submit: set DRY_RUN=false and run with --submit\n",
      ),
    );
    return;
  }

  if (mode === "--submit") {
    // Step 3: Submit each batch
    for (const jsonlPath of jsonlPaths) {
      const batchId = await submitBatch(jsonlPath);

      // Save message ID map for this batch
      const mapPath = path.join(
        CONFIG.OUTPUT_DIR,
        `message-id-map-${batchId}.json`,
      );
      const mapObj: Record<string, string[]> = {};
      for (const [k, v] of messageIdMap) {
        mapObj[k] = v;
      }
      writeFileSync(mapPath, JSON.stringify(mapObj));
      console.log(`  Message ID map saved to: ${mapPath}`);

      // Step 4: Poll and download
      const results = await pollAndDownloadResults(batchId);

      // Step 5: Process results
      await processResults(results, messageIdMap);
    }

    // Step 6: Aggregate user languages
    await aggregateUserLanguages();
  }
}

main().catch((err) => {
  console.error(red("\nFatal error:"), err);
  process.exit(1);
});
