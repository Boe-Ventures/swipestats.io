/**
 * Research Dataset Export Pipeline
 *
 * Exports 1k Tinder profiles with full data (geo, usage, meta, matches, messages)
 * to a JSONL file for research use. One line per profile.
 *
 * Usage:
 *   bun run src/scripts/llm-analysis/export-research-dataset.ts
 *
 * Output:
 *   src/scripts/llm-analysis/output/research-demo-YYYY-MM-DD.jsonl
 */

import { db } from "@/server/db";
import {
  profileMetaTable,
  tinderProfileTable,
  userTable,
  tinderUsageTable,
  matchTable,
  messageTable,
} from "@/server/db/schema";
import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { writeFileSync, appendFileSync, mkdirSync, statSync } from "fs";
import path from "path";

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

// Parse CLI flags
const args = process.argv.slice(2);
const countryIdx = args.indexOf("--country");
const countryFilter = countryIdx !== -1 ? args[countryIdx + 1]! : null;
const limitIdx = args.indexOf("--limit");
const profileLimitOverride = limitIdx !== -1 ? parseInt(args[limitIdx + 1]!, 10) : null;

const CONFIG = {
  /** Number of profiles to export */
  PROFILE_LIMIT: profileLimitOverride ?? 1000,
  /** Batch size for processing profiles */
  BATCH_SIZE: 100,
  /** Batch size for fetching messages by match IDs */
  MESSAGE_BATCH_SIZE: 500,
  /** Output directory */
  OUTPUT_DIR: path.join(new URL(".", import.meta.url).pathname, "output"),
};

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

function fmtNum(n: number): string {
  return Number(n).toLocaleString();
}

// ════════════════════════════════════════════════════════════════════
// STEP 1: SELECT PROFILE IDs
// ════════════════════════════════════════════════════════════════════

async function selectProfileIds(): Promise<string[]> {
  console.log(bold("\n═══ Step 1: Select profile IDs ═══\n"));

  // Random sample of profiles that have messages and geo data (userId)
  const conditions = [
    gt(profileMetaTable.messagesSentTotal, 0),
    isNotNull(tinderProfileTable.userId),
  ];

  // Need to join user table if filtering by country
  const baseQuery = db
    .select({
      tinderId: profileMetaTable.tinderProfileId,
      messagesSentTotal: profileMetaTable.messagesSentTotal,
    })
    .from(profileMetaTable)
    .innerJoin(
      tinderProfileTable,
      eq(profileMetaTable.tinderProfileId, tinderProfileTable.tinderId),
    );

  // Add country filter via user table join
  const finalQuery = countryFilter
    ? baseQuery.innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
    : baseQuery;

  if (countryFilter) {
    conditions.push(eq(userTable.country, countryFilter));
    console.log(`  Country filter: ${cyan(countryFilter)}`);
  }

  const profiles = await finalQuery
    .where(and(...conditions))
    .orderBy(sql`RANDOM()`)
    .limit(CONFIG.PROFILE_LIMIT);

  const ids = profiles
    .map((p) => p.tinderId)
    .filter((id): id is string => id !== null);

  const avgMsgs = Math.round(
    profiles.reduce((sum, p) => sum + p.messagesSentTotal, 0) / profiles.length,
  );
  console.log(`  Selected ${cyan(fmtNum(ids.length))} random profiles`);
  console.log(`  Avg messages sent per profile: ${fmtNum(avgMsgs)}`);

  return ids;
}

// ════════════════════════════════════════════════════════════════════
// STEP 2: BATCH FETCH & WRITE JSONL
// ════════════════════════════════════════════════════════════════════

async function exportProfiles(
  profileIds: string[],
  outputPath: string,
): Promise<void> {
  console.log(bold("\n═══ Step 2: Export profiles to JSONL ═══\n"));

  // Create/truncate output file
  writeFileSync(outputPath, "");

  let totalMatches = 0;
  let totalMessages = 0;
  let totalUsageRows = 0;

  for (let i = 0; i < profileIds.length; i += CONFIG.BATCH_SIZE) {
    const batchIds = profileIds.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(profileIds.length / CONFIG.BATCH_SIZE);

    console.log(
      dim(
        `  Batch ${batchNum}/${totalBatches} (${batchIds.length} profiles)...`,
      ),
    );

    // 5 parallel queries for this batch
    const [profiles, users, metas, usageRows, matches] = await Promise.all([
      // 1. Profile data
      db
        .select()
        .from(tinderProfileTable)
        .where(inArray(tinderProfileTable.tinderId, batchIds)),

      // 2. User geo data (via profile's userId)
      db
        .select({
          tinderId: tinderProfileTable.tinderId,
          continent: userTable.continent,
          country: userTable.country,
          region: userTable.region,
          city: userTable.city,
          languages: userTable.languages,
          timeZone: userTable.timeZone,
        })
        .from(tinderProfileTable)
        .innerJoin(userTable, eq(tinderProfileTable.userId, userTable.id))
        .where(inArray(tinderProfileTable.tinderId, batchIds)),

      // 3. Profile meta
      db
        .select()
        .from(profileMetaTable)
        .where(inArray(profileMetaTable.tinderProfileId, batchIds)),

      // 4. Usage data (ALL daily records)
      db
        .select()
        .from(tinderUsageTable)
        .where(inArray(tinderUsageTable.tinderProfileId, batchIds))
        .orderBy(tinderUsageTable.tinderProfileId, tinderUsageTable.dateStamp),

      // 5. Matches
      db
        .select()
        .from(matchTable)
        .where(inArray(matchTable.tinderProfileId, batchIds))
        .orderBy(matchTable.tinderProfileId, matchTable.order),
    ]);

    // Index by profile ID for fast lookup
    const profileMap = new Map(profiles.map((p) => [p.tinderId, p]));
    const userMap = new Map(users.map((u) => [u.tinderId, u]));
    const metaMap = new Map(
      metas.map((m) => [m.tinderProfileId, m]),
    );

    // Group usage by profile
    const usageByProfile = new Map<string, (typeof usageRows)[number][]>();
    for (const u of usageRows) {
      const existing = usageByProfile.get(u.tinderProfileId) ?? [];
      existing.push(u);
      usageByProfile.set(u.tinderProfileId, existing);
    }

    // Group matches by profile
    const matchesByProfile = new Map<string, (typeof matches)[number][]>();
    for (const m of matches) {
      if (!m.tinderProfileId) continue;
      const existing = matchesByProfile.get(m.tinderProfileId) ?? [];
      existing.push(m);
      matchesByProfile.set(m.tinderProfileId, existing);
    }

    // Fetch messages for all matches in this batch (in chunks)
    const allMatchIds = matches.map((m) => m.id);
    type MessageRow = typeof messageTable.$inferSelect;
    const messagesByMatch = new Map<string, MessageRow[]>();
    const allMessages: MessageRow[] = [];

    if (allMatchIds.length > 0) {
      for (
        let mi = 0;
        mi < allMatchIds.length;
        mi += CONFIG.MESSAGE_BATCH_SIZE
      ) {
        const matchIdChunk = allMatchIds.slice(
          mi,
          mi + CONFIG.MESSAGE_BATCH_SIZE,
        );
        const msgs = await db
          .select()
          .from(messageTable)
          .where(inArray(messageTable.matchId, matchIdChunk))
          .orderBy(messageTable.matchId, messageTable.order);

        for (const msg of msgs) {
          allMessages.push(msg);
          const existing = messagesByMatch.get(msg.matchId) ?? [];
          existing.push(msg);
          messagesByMatch.set(msg.matchId, existing);
        }
      }
    }

    // Assemble and write JSONL lines
    const lines: string[] = [];
    for (const tinderId of batchIds) {
      const profile = profileMap.get(tinderId);
      if (!profile) continue;

      const user = userMap.get(tinderId) ?? null;
      const meta = metaMap.get(tinderId) ?? null;
      const usage = usageByProfile.get(tinderId) ?? [];
      const profileMatches = matchesByProfile.get(tinderId) ?? [];

      // Build matches with messages
      const matchesWithMessages = profileMatches.map((m) => {
        const msgs = messagesByMatch.get(m.id) ?? [];
        return {
          match: {
            id: m.id,
            order: m.order,
            totalMessageCount: m.totalMessageCount,
            textCount: m.textCount,
            gifCount: m.gifCount,
            gestureCount: m.gestureCount,
            otherMessageTypeCount: m.otherMessageTypeCount,
            primaryLanguage: m.primaryLanguage,
            languages: m.languages,
            initialMessageAt: m.initialMessageAt,
            lastMessageAt: m.lastMessageAt,
            engagementScore: m.engagementScore,
            responseTimeMedianSeconds: m.responseTimeMedianSeconds,
            conversationDurationDays: m.conversationDurationDays,
            messageImbalanceRatio: m.messageImbalanceRatio,
            longestGapHours: m.longestGapHours,
            didMatchReply: m.didMatchReply,
            lastMessageFrom: m.lastMessageFrom,
          },
          messages: msgs.map((msg) => ({
            content: msg.content,
            contentRaw: msg.contentRaw,
            charCount: msg.charCount,
            messageType: msg.messageType,
            sentDate: msg.sentDate,
            order: msg.order,
            language: msg.language,
            to: msg.to,
          })),
        };
      });

      const row = {
        profile: {
          tinderId: profile.tinderId,
          gender: profile.gender,
          birthDate: profile.birthDate,
          ageAtUpload: profile.ageAtUpload,
          ageAtLastUsage: profile.ageAtLastUsage,
          bio: profile.bio,
          bioOriginal: profile.bioOriginal,
          city: profile.city,
          country: profile.country,
          region: profile.region,
          interests: profile.interests,
          userInterests: profile.userInterests,
          sexualOrientations: profile.sexualOrientations,
          descriptors: profile.descriptors,
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
          createDate: profile.createDate,
          activeTime: profile.activeTime,
          firstDayOnApp: profile.firstDayOnApp,
          lastDayOnApp: profile.lastDayOnApp,
          daysInProfilePeriod: profile.daysInProfilePeriod,
        },
        user: user
          ? {
              continent: user.continent,
              country: user.country,
              region: user.region,
              city: user.city,
              languages: user.languages,
              timeZone: user.timeZone,
            }
          : null,
        meta: meta
          ? {
              from: meta.from,
              to: meta.to,
              daysInPeriod: meta.daysInPeriod,
              daysActive: meta.daysActive,
              swipeLikesTotal: meta.swipeLikesTotal,
              swipePassesTotal: meta.swipePassesTotal,
              matchesTotal: meta.matchesTotal,
              messagesSentTotal: meta.messagesSentTotal,
              messagesReceivedTotal: meta.messagesReceivedTotal,
              appOpensTotal: meta.appOpensTotal,
              likeRate: meta.likeRate,
              matchRate: meta.matchRate,
              swipesPerDay: meta.swipesPerDay,
              conversationCount: meta.conversationCount,
              conversationsWithMessages: meta.conversationsWithMessages,
              ghostedCount: meta.ghostedCount,
              averageResponseTimeSeconds: meta.averageResponseTimeSeconds,
              meanResponseTimeSeconds: meta.meanResponseTimeSeconds,
              medianConversationDurationDays:
                meta.medianConversationDurationDays,
              longestConversationDays: meta.longestConversationDays,
              averageMessagesPerConversation:
                meta.averageMessagesPerConversation,
              medianMessagesPerConversation:
                meta.medianMessagesPerConversation,
            }
          : null,
        usage: usage.map((u) => ({
          dateStamp: u.dateStamp,
          appOpens: u.appOpens,
          matches: u.matches,
          swipeLikes: u.swipeLikes,
          swipeSuperLikes: u.swipeSuperLikes,
          swipePasses: u.swipePasses,
          swipesCombined: u.swipesCombined,
          messagesReceived: u.messagesReceived,
          messagesSent: u.messagesSent,
          matchRate: u.matchRate,
          likeRate: u.likeRate,
          messagesSentRate: u.messagesSentRate,
          responseRate: u.responseRate,
          engagementRate: u.engagementRate,
          userAgeThisDay: u.userAgeThisDay,
        })),
        matches: matchesWithMessages,
      };

      lines.push(JSON.stringify(row));

      totalMatches += profileMatches.length;
      totalMessages += matchesWithMessages.reduce(
        (sum, m) => sum + m.messages.length,
        0,
      );
      totalUsageRows += usage.length;
    }

    // Append batch to file
    if (lines.length > 0) {
      appendFileSync(outputPath, lines.join("\n") + "\n");
    }

    console.log(
      dim(
        `    ${lines.length} profiles written | ` +
          `${fmtNum(matches.length)} matches | ` +
          `${fmtNum(allMessages.length)} messages`,
      ),
    );
  }

  console.log(`\n  ${green("Export complete!")}`);
  console.log(`  Profiles: ${cyan(fmtNum(profileIds.length))}`);
  console.log(`  Total matches: ${cyan(fmtNum(totalMatches))}`);
  console.log(`  Total messages: ${cyan(fmtNum(totalMessages))}`);
  console.log(`  Total usage rows: ${cyan(fmtNum(totalUsageRows))}`);
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

async function main() {
  console.log(
    bold(
      "\n╔═══════════════════════════════════════════════════════╗",
    ),
  );
  console.log(
    bold(
      "║  Research Dataset Export Pipeline                      ║",
    ),
  );
  console.log(
    bold(
      "╚═══════════════════════════════════════════════════════╝\n",
    ),
  );

  console.log(`  PROFILE_LIMIT: ${CONFIG.PROFILE_LIMIT}`);
  console.log(`  BATCH_SIZE: ${CONFIG.BATCH_SIZE}`);
  console.log(`  OUTPUT_DIR: ${CONFIG.OUTPUT_DIR}\n`);

  // Step 1: Select profile IDs
  const profileIds = await selectProfileIds();

  if (profileIds.length === 0) {
    console.log(red("\n  No profiles found with messages. Aborting."));
    process.exit(1);
  }

  // Step 2: Export to JSONL
  mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  const date = new Date().toISOString().split("T")[0];
  const countrySuffix = countryFilter ? `-${countryFilter.toLowerCase()}` : "";
  const outputPath = path.join(
    CONFIG.OUTPUT_DIR,
    `research-${date}${countrySuffix}-${CONFIG.PROFILE_LIMIT}p.jsonl`,
  );

  console.log(`  Output file: ${outputPath}`);

  await exportProfiles(profileIds, outputPath);

  // File size
  const fileStats = statSync(outputPath);
  const sizeMB = (fileStats.size / 1024 / 1024).toFixed(1);
  console.log(`  File size: ${cyan(sizeMB)} MB`);
  console.log(`  Path: ${outputPath}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error(red("\nFatal error:"), err);
  process.exit(1);
});
