/**
 * LLM Analysis Planner (READ-ONLY)
 *
 * Comprehensive analysis of message data to plan the LLM pipeline:
 * - Message distribution across profiles (power law?)
 * - Geographic breakdown using user location data
 * - Message type & length distribution (what can we skip?)
 * - Cost estimation for different strategies
 *
 * Usage:
 *   bun run src/scripts/llm-analysis/sample-messages.ts
 */

import { db } from "@/server/db";
import {
  tinderProfileTable,
  hingeProfileTable,
  matchTable,
  messageTable,
  userTable,
} from "@/server/db/schema";
import { desc, eq, sql, isNotNull, and, lte } from "drizzle-orm";

// ---- HELPERS ------------------------------------------------------

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;


function fmtNum(n: number): string {
  return Number(n).toLocaleString();
}

function fmtPct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function bar(n: number, max: number, width = 30): string {
  const filled = Math.round((n / max) * width);
  return "█".repeat(filled) + dim("░".repeat(width - filled));
}

function printTable(
  headers: string[],
  rows: string[][],
  maxWidths?: number[],
) {
  const widths = headers.map((h, i) => {
    const max = maxWidths?.[i] ?? 60;
    return Math.min(
      max,
      Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
    );
  });

  const separator = widths.map((w) => "─".repeat(w + 2)).join("┼");
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${(cell ?? "").padEnd(widths[i]!)} `).join("│");

  console.log(dim(`┌${separator.replaceAll("┼", "┬")}┐`));
  console.log(`│${formatRow(headers)}│`);
  console.log(dim(`├${separator}┤`));
  for (const row of rows) {
    console.log(`│${formatRow(row)}│`);
  }
  console.log(dim(`└${separator.replaceAll("┼", "┴")}┘`));
}

// ---- MAIN ---------------------------------------------------------

async function main() {
  console.log(bold("\n📊 SwipeStats LLM Analysis Planner\n"));
  console.log(dim("All queries are READ-ONLY. No data will be modified.\n"));

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: Basic counts
  // ═══════════════════════════════════════════════════════════════════

  const [[messageCount], [matchCount], [tinderCount], [hingeCount], [userCount]] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(messageTable),
      db.select({ count: sql<number>`count(*)` }).from(matchTable),
      db.select({ count: sql<number>`count(*)` }).from(tinderProfileTable),
      db.select({ count: sql<number>`count(*)` }).from(hingeProfileTable),
      db.select({ count: sql<number>`count(*)` }).from(userTable),
    ]);

  const totalMessages = Number(messageCount!.count);
  const totalMatches = Number(matchCount!.count);

  console.log(bold("═══ Database Overview ═══\n"));
  console.log(`  Users:           ${cyan(fmtNum(Number(userCount!.count)))}`);
  console.log(`  Tinder profiles: ${cyan(fmtNum(Number(tinderCount!.count)))}`);
  console.log(`  Hinge profiles:  ${cyan(fmtNum(Number(hingeCount!.count)))}`);
  console.log(`  Matches:         ${cyan(fmtNum(totalMatches))}`);
  console.log(`  Messages:        ${cyan(fmtNum(totalMessages))}`);
  console.log(`  Avg msgs/match:  ${cyan((totalMessages / totalMatches).toFixed(1))}`);

  // Column fill status
  const [[langFilled], [sanitizedFilled]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(messageTable)
      .where(isNotNull(messageTable.language)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messageTable)
      .where(isNotNull(messageTable.contentSanitized)),
  ]);

  console.log(
    `\n  language column:         ${Number(langFilled!.count) > 0 ? green(fmtNum(Number(langFilled!.count))) : red("0")} / ${fmtNum(totalMessages)}`,
  );
  console.log(
    `  contentSanitized column: ${Number(sanitizedFilled!.count) > 0 ? green(fmtNum(Number(sanitizedFilled!.count))) : red("0")} / ${fmtNum(totalMessages)}`,
  );

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: Message distribution across profiles (power law check)
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ Message Distribution (Tinder) ═══\n"));

  const profileMessageCounts = await db
    .select({
      tinderId: tinderProfileTable.tinderId,
      msgCount: sql<number>`count(${messageTable.id})`,
    })
    .from(tinderProfileTable)
    .leftJoin(
      messageTable,
      eq(messageTable.tinderProfileId, tinderProfileTable.tinderId),
    )
    .groupBy(tinderProfileTable.tinderId)
    .orderBy(desc(sql`count(${messageTable.id})`));

  const counts = profileMessageCounts.map((p) => Number(p.msgCount));
  const totalProfileMsgs = counts.reduce((a, b) => a + b, 0);
  const nonZeroCounts = counts.filter((c) => c > 0);

  // Percentile buckets
  const buckets = [
    { label: "Top 1% profiles", n: Math.max(1, Math.ceil(counts.length * 0.01)) },
    { label: "Top 5% profiles", n: Math.max(1, Math.ceil(counts.length * 0.05)) },
    { label: "Top 10% profiles", n: Math.max(1, Math.ceil(counts.length * 0.1)) },
    { label: "Top 25% profiles", n: Math.max(1, Math.ceil(counts.length * 0.25)) },
    { label: "Top 50% profiles", n: Math.max(1, Math.ceil(counts.length * 0.5)) },
  ];

  console.log(`  Total Tinder profiles: ${fmtNum(counts.length)}`);
  console.log(`  Profiles with messages: ${fmtNum(nonZeroCounts.length)} (${fmtPct(nonZeroCounts.length, counts.length)})`);
  console.log(`  Profiles with 0 messages: ${fmtNum(counts.length - nonZeroCounts.length)}`);
  console.log(`  Max messages on 1 profile: ${fmtNum(counts[0] ?? 0)}`);
  console.log(`  Median messages: ${fmtNum(nonZeroCounts[Math.floor(nonZeroCounts.length / 2)] ?? 0)}`);
  console.log("");

  for (const bucket of buckets) {
    const sum = counts.slice(0, bucket.n).reduce((a, b) => a + b, 0);
    console.log(
      `  ${bucket.label.padEnd(20)} (${String(bucket.n).padStart(4)} profiles): ${bar(sum, totalProfileMsgs)} ${fmtNum(sum)} msgs (${fmtPct(sum, totalProfileMsgs)})`,
    );
  }

  // Histogram of message count ranges
  console.log(bold("\n  Message count histogram:"));
  const ranges = [
    { label: "0", min: 0, max: 0 },
    { label: "1-10", min: 1, max: 10 },
    { label: "11-100", min: 11, max: 100 },
    { label: "101-500", min: 101, max: 500 },
    { label: "501-1k", min: 501, max: 1000 },
    { label: "1k-5k", min: 1001, max: 5000 },
    { label: "5k-10k", min: 5001, max: 10000 },
    { label: "10k-50k", min: 10001, max: 50000 },
    { label: "50k+", min: 50001, max: Infinity },
  ];

  for (const range of ranges) {
    const inRange = counts.filter(
      (c) => c >= range.min && c <= range.max,
    ).length;
    const msgInRange = counts
      .filter((c) => c >= range.min && c <= range.max)
      .reduce((a, b) => a + b, 0);
    console.log(
      `    ${range.label.padEnd(8)} ${bar(inRange, counts.length, 20)} ${String(inRange).padStart(5)} profiles (${fmtPct(inRange, counts.length).padStart(6)}) → ${fmtNum(msgInRange).padStart(10)} msgs (${fmtPct(msgInRange, totalProfileMsgs).padStart(6)})`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: Message type breakdown
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ Message Type Breakdown ═══\n"));

  const typeBreakdown = await db
    .select({
      messageType: messageTable.messageType,
      count: sql<number>`count(*)`,
      avgChars: sql<number>`avg(${messageTable.charCount})`,
    })
    .from(messageTable)
    .groupBy(messageTable.messageType)
    .orderBy(desc(sql`count(*)`));

  const rows = typeBreakdown.map((t) => [
    t.messageType,
    fmtNum(Number(t.count)),
    fmtPct(Number(t.count), totalMessages),
    Math.round(Number(t.avgChars)).toString(),
    bar(Number(t.count), totalMessages),
  ]);

  printTable(["Type", "Count", "% Total", "Avg Chars", "Distribution"], rows, [
    14, 12, 8, 9, 30,
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: Message length distribution (for TEXT only)
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ TEXT Message Length Distribution ═══\n"));

  const lengthBuckets = await db
    .select({
      bucket: sql<string>`CASE
        WHEN ${messageTable.charCount} <= 1 THEN '0-1 (emoji/single)'
        WHEN ${messageTable.charCount} <= 5 THEN '2-5 (tiny)'
        WHEN ${messageTable.charCount} <= 20 THEN '6-20 (short)'
        WHEN ${messageTable.charCount} <= 50 THEN '21-50 (medium)'
        WHEN ${messageTable.charCount} <= 100 THEN '51-100 (long)'
        WHEN ${messageTable.charCount} <= 200 THEN '101-200 (very long)'
        ELSE '200+ (essay)'
      END`,
      count: sql<number>`count(*)`,
      totalChars: sql<number>`sum(${messageTable.charCount})`,
    })
    .from(messageTable)
    .where(eq(messageTable.messageType, "TEXT"))
    .groupBy(sql`CASE
      WHEN ${messageTable.charCount} <= 1 THEN '0-1 (emoji/single)'
      WHEN ${messageTable.charCount} <= 5 THEN '2-5 (tiny)'
      WHEN ${messageTable.charCount} <= 20 THEN '6-20 (short)'
      WHEN ${messageTable.charCount} <= 50 THEN '21-50 (medium)'
      WHEN ${messageTable.charCount} <= 100 THEN '51-100 (long)'
      WHEN ${messageTable.charCount} <= 200 THEN '101-200 (very long)'
      ELSE '200+ (essay)'
    END`)
    .orderBy(sql`min(${messageTable.charCount})`);

  const textTotal = lengthBuckets.reduce((a, b) => a + Number(b.count), 0);
  const charTotal = lengthBuckets.reduce((a, b) => a + Number(b.totalChars), 0);

  for (const b of lengthBuckets) {
    const cnt = Number(b.count);
    const chars = Number(b.totalChars);
    console.log(
      `  ${(b.bucket).padEnd(22)} ${bar(cnt, textTotal, 20)} ${fmtNum(cnt).padStart(10)} msgs (${fmtPct(cnt, textTotal).padStart(6)}) │ ${fmtNum(chars).padStart(12)} chars (${fmtPct(chars, charTotal).padStart(6)})`,
    );
  }

  console.log(dim(`\n  Total TEXT messages: ${fmtNum(textTotal)}, Total chars: ${fmtNum(charTotal)}`));
  console.log(dim(`  Estimated tokens (chars/4): ~${fmtNum(Math.round(charTotal / 4))}`));

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: Geographic distribution
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ Geographic Distribution (from user table) ═══\n"));

  const geoByContinent = await db
    .select({
      continent: userTable.continent,
      count: sql<number>`count(*)`,
    })
    .from(userTable)
    .groupBy(userTable.continent)
    .orderBy(desc(sql`count(*)`));

  console.log(bold("  By continent:"));
  const totalUsers = geoByContinent.reduce((a, b) => a + Number(b.count), 0);
  for (const g of geoByContinent) {
    const cnt = Number(g.count);
    console.log(
      `    ${(g.continent ?? "(unknown)").padEnd(20)} ${bar(cnt, totalUsers, 20)} ${fmtNum(cnt).padStart(5)} users (${fmtPct(cnt, totalUsers).padStart(6)})`,
    );
  }

  const geoByCountry = await db
    .select({
      country: userTable.country,
      count: sql<number>`count(*)`,
    })
    .from(userTable)
    .where(isNotNull(userTable.country))
    .groupBy(userTable.country)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  console.log(bold("\n  Top 20 countries:"));
  const topCountryMax = Number(geoByCountry[0]?.count ?? 1);
  for (const g of geoByCountry) {
    const cnt = Number(g.count);
    console.log(
      `    ${(g.country ?? "?").padEnd(4)} ${bar(cnt, topCountryMax, 20)} ${fmtNum(cnt).padStart(5)} users`,
    );
  }

  // Cross-reference: messages per country (via tinder profile → user)
  console.log(bold("\n  Messages per country (top 15, via Tinder profile → user):"));

  const msgsByCountry = await db
    .select({
      country: userTable.country,
      msgCount: sql<number>`count(${messageTable.id})`,
      profileCount: sql<number>`count(DISTINCT ${tinderProfileTable.tinderId})`,
    })
    .from(messageTable)
    .innerJoin(
      tinderProfileTable,
      eq(messageTable.tinderProfileId, tinderProfileTable.tinderId),
    )
    .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
    .where(isNotNull(userTable.country))
    .groupBy(userTable.country)
    .orderBy(desc(sql`count(${messageTable.id})`))
    .limit(15);

  const topMsgCountry = Number(msgsByCountry[0]?.msgCount ?? 1);
  for (const g of msgsByCountry) {
    const msgs = Number(g.msgCount);
    const profiles = Number(g.profileCount);
    console.log(
      `    ${(g.country ?? "?").padEnd(4)} ${bar(msgs, topMsgCountry, 20)} ${fmtNum(msgs).padStart(10)} msgs across ${fmtNum(profiles).padStart(4)} profiles (${fmtNum(Math.round(msgs / profiles)).padStart(6)} avg)`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6: Skippable messages analysis
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ LLM Processing Scope Analysis ═══\n"));

  // Count messages we could skip for PII analysis
  const [[nonTextCount], [emojiOnly], [urlOnly]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(messageTable)
      .where(sql`${messageTable.messageType} != 'TEXT'`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messageTable)
      .where(
        and(
          eq(messageTable.messageType, "TEXT"),
          lte(messageTable.charCount, 2),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messageTable)
      .where(
        and(
          eq(messageTable.messageType, "TEXT"),
          sql`${messageTable.content} LIKE 'http%'`,
        ),
      ),
  ]);

  const skipNonText = Number(nonTextCount!.count);
  const skipEmoji = Number(emojiOnly!.count);
  const skipUrl = Number(urlOnly!.count);
  const skipTotal = skipNonText + skipEmoji + skipUrl;
  const processable = totalMessages - skipTotal;

  console.log(`  Total messages:         ${cyan(fmtNum(totalMessages))}`);
  console.log(
    `  Skip: non-TEXT          ${red(fmtNum(skipNonText).padStart(10))} (${fmtPct(skipNonText, totalMessages)}) — GIFs, gestures, voice notes`,
  );
  console.log(
    `  Skip: ≤2 chars          ${red(fmtNum(skipEmoji).padStart(10))} (${fmtPct(skipEmoji, totalMessages)}) — emoji, "ok", "hi"`,
  );
  console.log(
    `  Skip: URL-only          ${red(fmtNum(skipUrl).padStart(10))} (${fmtPct(skipUrl, totalMessages)}) — links (tenor, etc)`,
  );
  console.log(dim(`  ──────────────────────────────────`));
  console.log(
    `  ${bold("Processable messages:")}   ${green(fmtNum(processable).padStart(10))} (${fmtPct(processable, totalMessages)})`,
  );
  console.log(
    `  ${bold("Skippable messages:")}     ${yellow(fmtNum(skipTotal).padStart(10))} (${fmtPct(skipTotal, totalMessages)})`,
  );

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7: Cost estimation
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ LLM Cost Estimation ═══\n"));

  // Estimate average tokens per message from char data
  const avgCharsPerTextMsg = charTotal / textTotal;
  const avgTokensPerMsg = avgCharsPerTextMsg / 4; // rough chars-to-tokens ratio

  console.log(dim(`  Assumptions:`));
  console.log(dim(`    Avg chars/msg: ${avgCharsPerTextMsg.toFixed(0)}, Avg tokens/msg: ${avgTokensPerMsg.toFixed(0)}`));
  console.log(dim(`    System prompt: ~300 tokens, Batch size: 30 msgs/call`));
  console.log(dim(`    Output per msg: ~30 tokens (structured: {language, hasPII, sanitized})`));
  console.log("");

  const batchSize = 30;
  const systemPromptTokens = 300;
  const outputTokensPerMsg = 30;
  const apiCalls = Math.ceil(processable / batchSize);
  const inputTokensTotal =
    apiCalls * systemPromptTokens + processable * avgTokensPerMsg;
  const outputTokensTotal = processable * outputTokensPerMsg;

  const models = [
    { name: "Haiku 4.5", inputPer1M: 0.8, outputPer1M: 4.0 },
    { name: "Haiku 4.5 (batch)", inputPer1M: 0.4, outputPer1M: 2.0 },
    { name: "Sonnet 4.5", inputPer1M: 3.0, outputPer1M: 15.0 },
    { name: "Sonnet 4.5 (batch)", inputPer1M: 1.5, outputPer1M: 7.5 },
  ];

  const costRows = models.map((m) => {
    const inputCost = (inputTokensTotal / 1_000_000) * m.inputPer1M;
    const outputCost = (outputTokensTotal / 1_000_000) * m.outputPer1M;
    return [
      m.name,
      `$${inputCost.toFixed(0)}`,
      `$${outputCost.toFixed(0)}`,
      bold(`$${(inputCost + outputCost).toFixed(0)}`),
    ];
  });

  console.log(`  API calls needed: ${cyan(fmtNum(apiCalls))}`);
  console.log(`  Input tokens:     ${cyan(fmtNum(Math.round(inputTokensTotal)))}`);
  console.log(`  Output tokens:    ${cyan(fmtNum(Math.round(outputTokensTotal)))}`);
  console.log("");

  printTable(
    ["Model", "Input Cost", "Output Cost", "Total"],
    costRows,
    [22, 12, 12, 12],
  );

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 8: Match-level view (what batching by conversation looks like)
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ Match/Conversation Level Stats ═══\n"));

  const matchMsgDistribution = await db
    .select({
      bucket: sql<string>`CASE
        WHEN ${matchTable.totalMessageCount} = 0 THEN '0 (ghosted)'
        WHEN ${matchTable.totalMessageCount} <= 2 THEN '1-2 (opener)'
        WHEN ${matchTable.totalMessageCount} <= 10 THEN '3-10 (short chat)'
        WHEN ${matchTable.totalMessageCount} <= 30 THEN '11-30 (conversation)'
        WHEN ${matchTable.totalMessageCount} <= 100 THEN '31-100 (extended)'
        ELSE '100+ (relationship)'
      END`,
      matchCount: sql<number>`count(*)`,
      msgCount: sql<number>`sum(${matchTable.totalMessageCount})`,
    })
    .from(matchTable)
    .groupBy(sql`CASE
      WHEN ${matchTable.totalMessageCount} = 0 THEN '0 (ghosted)'
      WHEN ${matchTable.totalMessageCount} <= 2 THEN '1-2 (opener)'
      WHEN ${matchTable.totalMessageCount} <= 10 THEN '3-10 (short chat)'
      WHEN ${matchTable.totalMessageCount} <= 30 THEN '11-30 (conversation)'
      WHEN ${matchTable.totalMessageCount} <= 100 THEN '31-100 (extended)'
      ELSE '100+ (relationship)'
    END`)
    .orderBy(sql`min(${matchTable.totalMessageCount})`);

  console.log(dim("  Conversation depth → great for deciding batch-by-match strategy:\n"));

  for (const b of matchMsgDistribution) {
    const matches = Number(b.matchCount);
    const msgs = Number(b.msgCount);
    console.log(
      `  ${(b.bucket).padEnd(24)} ${bar(matches, totalMatches, 15)} ${fmtNum(matches).padStart(8)} matches (${fmtPct(matches, totalMatches).padStart(6)}) │ ${fmtNum(msgs).padStart(10)} msgs (${fmtPct(msgs, totalMessages).padStart(6)})`,
    );
  }

  // How many matches already have language data?
  const [matchLangFilled] = await db
    .select({ count: sql<number>`count(*)` })
    .from(matchTable)
    .where(isNotNull(matchTable.primaryLanguage));

  console.log(
    `\n  Matches with primaryLanguage: ${Number(matchLangFilled!.count) > 0 ? green(fmtNum(Number(matchLangFilled!.count))) : red("0")} / ${fmtNum(totalMatches)}`,
  );

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 9: Profile-level PII candidates (bios, jobs, schools)
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ Profile-Level PII Candidates ═══\n"));

  const [[biosCount], [bioOrigCount], [jobsCount], [schoolsCount]] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(tinderProfileTable)
        .where(isNotNull(tinderProfileTable.bio)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tinderProfileTable)
        .where(isNotNull(tinderProfileTable.bioOriginal)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tinderProfileTable)
        .where(isNotNull(tinderProfileTable.jobTitle)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tinderProfileTable)
        .where(isNotNull(tinderProfileTable.school)),
    ]);

  console.log(`  Tinder profiles with bio:         ${fmtNum(Number(biosCount!.count))}`);
  console.log(`  Tinder profiles with bioOriginal:  ${fmtNum(Number(bioOrigCount!.count))}`);
  console.log(`  Tinder profiles with jobTitle:     ${fmtNum(Number(jobsCount!.count))}`);
  console.log(`  Tinder profiles with school:       ${fmtNum(Number(schoolsCount!.count))}`);
  console.log(dim(`  (These are small numbers — cheap to process with LLM)`));

  // Hinge prompts
  const [hingePromptCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sql`hinge_prompt`);
  console.log(`  Hinge prompts:                     ${fmtNum(Number(hingePromptCount!.count))}`);

  // ═══════════════════════════════════════════════════════════════════
  // Done
  // ═══════════════════════════════════════════════════════════════════

  console.log(bold("\n\n═══ Summary & Recommendations ═══\n"));
  console.log(
    `  ${magenta("1.")} ${bold("Process by conversation (match), not individual message.")}`,
  );
  console.log(
    `     Send full conversation to LLM → get language + PII for all msgs at once.`,
  );
  console.log(
    `     ${fmtNum(totalMatches)} API calls instead of ${fmtNum(processable)} (${fmtPct(totalMatches, processable)} of naive approach).`,
  );
  console.log(
    `\n  ${magenta("2.")} ${bold("Skip ghosted matches (0 messages) — save API calls.")}`,
  );
  console.log(
    `\n  ${magenta("3.")} ${bold("Skip non-TEXT, ≤2 char, and URL-only messages.")}`,
  );
  console.log(
    `     Assign them a language from the conversation's majority language.`,
  );
  console.log(
    `\n  ${magenta("4.")} ${bold("Use Haiku 4.5 Batch API for 50% cost reduction.")}`,
  );
  console.log(
    `\n  ${magenta("5.")} ${bold("Profile bios/jobs/schools are tiny — process separately, cheap.")}`,
  );

  console.log(bold("\n\nDone. ") + dim("This was a read-only exploration — no data was modified.\n"));
}

main().catch(console.error);
