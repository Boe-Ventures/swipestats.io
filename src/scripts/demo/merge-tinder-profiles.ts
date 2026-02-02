/**
 * Merge Two Tinder Profiles Script
 *
 * This script merges two Tinder data exports into one combined profile.
 * Use case: When a user deletes their Tinder account and creates a new one,
 * they get a new tinderId. This script combines the historical data from
 * the old account with the new account.
 *
 * What gets merged:
 * - Usage data (app_opens, swipes, matches, messages) - UNION of dates
 * - Messages/Matches - CONCATENATED from both accounts
 *
 * What comes from NEW profile only:
 * - User data (bio, age, settings, etc.)
 * - Photos (old URLs are expired anyway)
 * - Spotify, Campaigns, Experiences, etc.
 *
 * Usage:
 *   bun run src/scripts/demo/merge-tinder-profiles.ts \
 *     --old ./path/to/old-tinder-data.json \
 *     --new ./path/to/new-tinder-data.json \
 *     --output ./path/to/merged-profile.json
 */

import fs from "fs";
import path from "path";
import type {
  AnonymizedTinderDataJSON,
  TinderJsonMatch,
} from "@/lib/interfaces/TinderDataJSON";
import type { DateValueMap } from "@/lib/interfaces/utilInterfaces";

// ============================================================================
// Merge Functions
// ============================================================================

/**
 * Merge two DateValueMaps (date -> number mappings)
 * For overlapping dates, sums the values (in case both accounts were active same day)
 */
function mergeDateValueMaps(
  older: DateValueMap | undefined,
  newer: DateValueMap | undefined,
): DateValueMap {
  const merged: DateValueMap = {};

  // Add all entries from older profile
  if (older) {
    for (const [date, value] of Object.entries(older)) {
      merged[date] = value;
    }
  }

  // Add/merge entries from newer profile
  if (newer) {
    for (const [date, value] of Object.entries(newer)) {
      if (merged[date] !== undefined) {
        // Overlapping date - sum the values
        merged[date] = merged[date] + value;
        console.log(
          `  ⚠️  Overlapping date ${date}: ${merged[date] - value} + ${value} = ${merged[date]}`,
        );
      } else {
        merged[date] = value;
      }
    }
  }

  return merged;
}

/**
 * Merge messages/matches from both profiles
 * Simply concatenates - each account has unique match_ids
 */
function mergeMessages(
  olderMessages: TinderJsonMatch[],
  newerMessages: TinderJsonMatch[],
): TinderJsonMatch[] {
  // Just concatenate - match_ids are unique per Tinder account
  return [...olderMessages, ...newerMessages];
}

/**
 * Main merge function - combines two Tinder profiles
 *
 * @param olderProfile - The older Tinder data export (from deleted account)
 * @param newerProfile - The newer Tinder data export (current account)
 * @returns Merged profile with combined usage/messages and new user data
 */
export function mergeTinderProfiles(
  olderProfile: AnonymizedTinderDataJSON,
  newerProfile: AnonymizedTinderDataJSON,
): AnonymizedTinderDataJSON {
  console.log("\n📊 Merging Usage data...");

  const mergedUsage = {
    app_opens: mergeDateValueMaps(
      olderProfile.Usage.app_opens,
      newerProfile.Usage.app_opens,
    ),
    swipes_likes: mergeDateValueMaps(
      olderProfile.Usage.swipes_likes,
      newerProfile.Usage.swipes_likes,
    ),
    swipes_passes: mergeDateValueMaps(
      olderProfile.Usage.swipes_passes,
      newerProfile.Usage.swipes_passes,
    ),
    matches: mergeDateValueMaps(
      olderProfile.Usage.matches,
      newerProfile.Usage.matches,
    ),
    messages_sent: mergeDateValueMaps(
      olderProfile.Usage.messages_sent,
      newerProfile.Usage.messages_sent,
    ),
    messages_received: mergeDateValueMaps(
      olderProfile.Usage.messages_received,
      newerProfile.Usage.messages_received,
    ),
    superlikes: mergeDateValueMaps(
      olderProfile.Usage.superlikes,
      newerProfile.Usage.superlikes,
    ),
    // Use advertising IDs from newer profile only
    advertising_id: newerProfile.Usage.advertising_id,
    idfa: newerProfile.Usage.idfa,
  };

  console.log("\n💬 Merging Messages/Matches...");
  const mergedMessages = mergeMessages(
    olderProfile.Messages,
    newerProfile.Messages,
  );

  // Build the merged profile
  const merged: AnonymizedTinderDataJSON = {
    // User data from NEW profile (current bio, age, settings)
    User: newerProfile.User,

    // Merged usage data
    Usage: mergedUsage,

    // Merged messages/matches
    Messages: mergedMessages,

    // Everything else from NEW profile
    Photos: newerProfile.Photos,
    Spotify: newerProfile.Spotify,
    Campaigns: newerProfile.Campaigns,
    Experiences: newerProfile.Experiences,
    Purchases: {
      // Optionally merge subscription history from both
      subscription: [
        ...(olderProfile.Purchases?.subscription ?? []),
        ...(newerProfile.Purchases?.subscription ?? []),
      ],
      consumable: [
        ...(olderProfile.Purchases?.consumable ?? []),
        ...(newerProfile.Purchases?.consumable ?? []),
      ],
      boost_tracking: newerProfile.Purchases?.boost_tracking ?? [],
      super_like_tracking: newerProfile.Purchases?.super_like_tracking ?? [],
    },
    SwipeNotes: newerProfile.SwipeNotes,
    RoomsAndInteractions: newerProfile.RoomsAndInteractions,
    StudentVerifications: newerProfile.StudentVerifications,
    SwipeParty: newerProfile.SwipeParty,
    SocialGraph: newerProfile.SocialGraph,
  };

  return merged;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function printUsage() {
  console.log(`
Usage:
  bun run src/scripts/demo/merge-tinder-profiles.ts \\
    --old ./path/to/old-tinder-data.json \\
    --new ./path/to/new-tinder-data.json \\
    --output ./path/to/merged-profile.json

Options:
  --old      Path to the older Tinder data export (from deleted account)
  --new      Path to the newer Tinder data export (current account)
  --output   Path where the merged profile will be written
  --help     Show this help message
`);
}

function parseArgs(): { oldPath: string; newPath: string; outputPath: string } {
  const args = process.argv.slice(2);

  let oldPath = "";
  let newPath = "";
  let outputPath = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--old" && nextArg) {
      oldPath = nextArg;
      i++;
    } else if (arg === "--new" && nextArg) {
      newPath = nextArg;
      i++;
    } else if (arg === "--output" && nextArg) {
      outputPath = nextArg;
      i++;
    }
  }

  if (!oldPath || !newPath || !outputPath) {
    console.error("❌ Missing required arguments.\n");
    printUsage();
    process.exit(1);
  }

  return { oldPath, newPath, outputPath };
}

function loadJsonFile(filePath: string): AnonymizedTinderDataJSON {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  return JSON.parse(content) as AnonymizedTinderDataJSON;
}

function getProfileStats(profile: AnonymizedTinderDataJSON): {
  usageDays: number;
  totalMatches: number;
  totalMessages: number;
  dateRange: { first: string; last: string };
} {
  // Get all dates from usage
  const allDates = new Set<string>();
  for (const dateMap of [
    profile.Usage.app_opens,
    profile.Usage.swipes_likes,
    profile.Usage.swipes_passes,
    profile.Usage.matches,
    profile.Usage.messages_sent,
    profile.Usage.messages_received,
  ]) {
    if (dateMap) {
      Object.keys(dateMap).forEach((d) => allDates.add(d));
    }
  }

  const sortedDates = Array.from(allDates).sort();
  const totalMessages = profile.Messages.reduce(
    (sum, match) => sum + match.messages.length,
    0,
  );

  return {
    usageDays: allDates.size,
    totalMatches: profile.Messages.length,
    totalMessages,
    dateRange: {
      first: sortedDates[0] ?? "N/A",
      last: sortedDates[sortedDates.length - 1] ?? "N/A",
    },
  };
}

async function main() {
  console.log("🔄 Tinder Profile Merger\n");
  console.log("════════════════════════════════════════\n");

  const { oldPath, newPath, outputPath } = parseArgs();

  // Load profiles
  console.log("📂 Loading profiles...");
  console.log(`   Old: ${oldPath}`);
  console.log(`   New: ${newPath}`);

  const olderProfile = loadJsonFile(oldPath);
  const newerProfile = loadJsonFile(newPath);

  // Print stats before merge
  const oldStats = getProfileStats(olderProfile);
  const newStats = getProfileStats(newerProfile);

  console.log("\n📈 Old Profile Stats:");
  console.log(
    `   Date range: ${oldStats.dateRange.first} → ${oldStats.dateRange.last}`,
  );
  console.log(`   Usage days: ${oldStats.usageDays}`);
  console.log(`   Matches: ${oldStats.totalMatches}`);
  console.log(`   Messages: ${oldStats.totalMessages}`);

  console.log("\n📈 New Profile Stats:");
  console.log(
    `   Date range: ${newStats.dateRange.first} → ${newStats.dateRange.last}`,
  );
  console.log(`   Usage days: ${newStats.usageDays}`);
  console.log(`   Matches: ${newStats.totalMatches}`);
  console.log(`   Messages: ${newStats.totalMessages}`);

  // Merge
  const mergedProfile = mergeTinderProfiles(olderProfile, newerProfile);

  // Print merged stats
  const mergedStats = getProfileStats(mergedProfile);

  console.log("\n✅ Merged Profile Stats:");
  console.log(
    `   Date range: ${mergedStats.dateRange.first} → ${mergedStats.dateRange.last}`,
  );
  console.log(`   Usage days: ${mergedStats.usageDays}`);
  console.log(`   Matches: ${mergedStats.totalMatches}`);
  console.log(`   Messages: ${mergedStats.totalMessages}`);

  // Write output
  const absoluteOutputPath = path.resolve(outputPath);
  const outputDir = path.dirname(absoluteOutputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(absoluteOutputPath, JSON.stringify(mergedProfile, null, 2));

  console.log(`\n💾 Merged profile written to: ${absoluteOutputPath}`);
  console.log("\n════════════════════════════════════════");
  console.log("🎉 Done! You can now upload the merged profile.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
