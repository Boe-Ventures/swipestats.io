/**
 * Extract Location Data from User Records
 *
 * Queries users and extracts all location-related data across:
 * - User table (country, timezone, locationHistory)
 * - Tinder profiles (city, region, country)
 * - Hinge profiles (country, hometowns)
 * - Sessions (IP addresses)
 * - Original anonymized files (location data in JSON)
 *
 * Also counts messages per profile.
 *
 * Usage:
 *   pnpm tsx src/scripts/extract-user-location-data.ts
 */

import { db } from "@/server/db";
import {
  userTable,
  tinderProfileTable,
  hingeProfileTable,
  sessionTable,
  originalAnonymizedFileTable,
  messageTable,
} from "@/server/db/schema";
import { eq, desc, count } from "drizzle-orm";

// ---- CONFIG -------------------------------------------------------

const USER_LIMIT = 10000; // Number of users to check (effectively all)

// ---- TYPES --------------------------------------------------------

type UserLocationData = {
  user: {
    id: string;
    username: string | null;
    email: string | null;
    country: string | null;
    timeZone: string | null;
    locationHistory: unknown;
    createdAt: Date;
  };
  sessionIPs: string[];
  tinderProfiles: Array<{
    tinderId: string;
    city: string | null;
    region: string | null;
    country: string | null;
    messageCount: number;
  }>;
  hingeProfiles: Array<{
    hingeId: string;
    country: string | null;
    hometowns: string[] | null;
    messageCount: number;
  }>;
  originalFileLocations: Array<{
    fileId: string;
    dataProvider: string;
    extractedLocations: string[];
  }>;
};

// ---- UTILITIES ----------------------------------------------------

function log(message: string) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

function extractLocationsFromJSON(data: unknown): string[] {
  const locations = new Set<string>();

  function traverse(obj: unknown, path = ""): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === "string") {
      // Look for location-related field names in path
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

// ---- QUERY FUNCTIONS ----------------------------------------------

async function queryUserLocationData(): Promise<UserLocationData[]> {
  log("Querying database...");

  // Get last N users ordered by creation date
  const users = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      email: userTable.email,
      country: userTable.country,
      timeZone: userTable.timeZone,
      locationHistory: userTable.locationHistory,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .orderBy(desc(userTable.createdAt))
    .limit(USER_LIMIT);

  const results: UserLocationData[] = [];

  for (const user of users) {
    // Get session IPs
    const sessions = await db
      .select({ ipAddress: sessionTable.ipAddress })
      .from(sessionTable)
      .where(eq(sessionTable.userId, user.id));

    const sessionIPs = sessions
      .map((s) => s.ipAddress)
      .filter((ip): ip is string => ip !== null)
      .filter((ip, index, self) => self.indexOf(ip) === index); // unique

    // Get Tinder profiles with message counts
    const tinderProfiles = await db
      .select({
        tinderId: tinderProfileTable.tinderId,
        city: tinderProfileTable.city,
        region: tinderProfileTable.region,
        country: tinderProfileTable.country,
      })
      .from(tinderProfileTable)
      .where(eq(tinderProfileTable.userId, user.id));

    const tinderProfilesWithCounts = await Promise.all(
      tinderProfiles.map(async (profile) => {
        const [result] = await db
          .select({ count: count() })
          .from(messageTable)
          .where(eq(messageTable.tinderProfileId, profile.tinderId));

        return {
          ...profile,
          messageCount: result?.count ?? 0,
        };
      }),
    );

    // Get Hinge profiles with message counts
    const hingeProfiles = await db
      .select({
        hingeId: hingeProfileTable.hingeId,
        country: hingeProfileTable.country,
        hometowns: hingeProfileTable.hometowns,
      })
      .from(hingeProfileTable)
      .where(eq(hingeProfileTable.userId, user.id));

    const hingeProfilesWithCounts = await Promise.all(
      hingeProfiles.map(async (profile) => {
        const [result] = await db
          .select({ count: count() })
          .from(messageTable)
          .where(eq(messageTable.hingeProfileId, profile.hingeId));

        return {
          ...profile,
          messageCount: result?.count ?? 0,
        };
      }),
    );

    // Get original files and extract location data
    const originalFiles = await db
      .select({
        id: originalAnonymizedFileTable.id,
        dataProvider: originalAnonymizedFileTable.dataProvider,
        file: originalAnonymizedFileTable.file,
      })
      .from(originalAnonymizedFileTable)
      .where(eq(originalAnonymizedFileTable.userId, user.id));

    const originalFileLocations = originalFiles.map((file) => ({
      fileId: file.id,
      dataProvider: file.dataProvider,
      extractedLocations: extractLocationsFromJSON(file.file),
    }));

    results.push({
      user,
      sessionIPs,
      tinderProfiles: tinderProfilesWithCounts,
      hingeProfiles: hingeProfilesWithCounts,
      originalFileLocations,
    });
  }

  return results;
}

// ---- DISPLAY FUNCTIONS --------------------------------------------

function displayUserLocationData(data: UserLocationData, index: number) {
  const hasProfiles =
    data.tinderProfiles.length > 0 || data.hingeProfiles.length > 0;
  const hasLocationData =
    data.user.country ||
    data.user.timeZone ||
    data.sessionIPs.length > 0 ||
    hasProfiles ||
    data.originalFileLocations.length > 0;

  // Skip users with no interesting data
  if (!hasLocationData) {
    return;
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`User ${index + 1}: ${data.user.id.substring(0, 12)}...`);

  // Only show username/email if not anonymous temp email
  const isAnonymous =
    data.user.email?.includes("@anonymous.swipestats.io") ?? true;
  if (!isAnonymous) {
    console.log(`  Username: ${data.user.username ?? "(none)"}`);
    console.log(`  Email: ${data.user.email ?? "(none)"}`);
  }
  console.log(`  Created: ${data.user.createdAt.toISOString().split("T")[0]}`);

  // User-level location data (compact)
  const userLocations: string[] = [];
  if (data.user.country) userLocations.push(`Country: ${data.user.country}`);
  if (data.user.timeZone) userLocations.push(`TZ: ${data.user.timeZone}`);
  if (
    data.user.locationHistory &&
    Array.isArray(data.user.locationHistory) &&
    data.user.locationHistory.length > 0
  ) {
    userLocations.push(
      `Location History: ${data.user.locationHistory.length} entries`,
    );
  }
  if (userLocations.length > 0) {
    console.log(`  📍 User: ${userLocations.join(" | ")}`);
  }

  // Session IPs (compact)
  if (data.sessionIPs.length > 0) {
    console.log(`  🌐 IPs: ${data.sessionIPs.join(", ")}`);
  }

  // Tinder profiles (compact)
  if (data.tinderProfiles.length > 0) {
    console.log(
      `\n  💘 Tinder (${data.tinderProfiles.length} profile${data.tinderProfiles.length > 1 ? "s" : ""}):`,
    );
    data.tinderProfiles.forEach((profile, idx) => {
      const location = [profile.city, profile.region, profile.country]
        .filter(Boolean)
        .join(", ");
      console.log(
        `     [${idx + 1}] ${location || "No location"} | ${profile.messageCount} messages`,
      );
    });
  }

  // Hinge profiles (compact)
  if (data.hingeProfiles.length > 0) {
    console.log(
      `\n  💙 Hinge (${data.hingeProfiles.length} profile${data.hingeProfiles.length > 1 ? "s" : ""}):`,
    );
    data.hingeProfiles.forEach((profile, idx) => {
      const location =
        profile.hometowns?.join(", ") || profile.country || "No location";
      console.log(
        `     [${idx + 1}] ${location} | ${profile.messageCount} messages`,
      );
    });
  }

  // Original file location data (compact)
  if (data.originalFileLocations.length > 0) {
    data.originalFileLocations.forEach((file) => {
      if (file.extractedLocations.length > 0) {
        console.log(
          `  📄 ${file.dataProvider} file: ${file.extractedLocations.length} locations`,
        );
        // Show first 3 location references
        file.extractedLocations.slice(0, 3).forEach((loc) => {
          console.log(`     • ${loc}`);
        });
        if (file.extractedLocations.length > 3) {
          console.log(`     ... +${file.extractedLocations.length - 3} more`);
        }
      }
    });
  }
}

function displaySummary(allData: UserLocationData[]) {
  console.log(`\n${"═".repeat(70)}`);
  console.log("📊 Summary");
  console.log(`${"═".repeat(70)}`);

  const totalUsers = allData.length;
  const usersWithCountry = allData.filter((d) => d.user.country).length;
  const usersWithTimezone = allData.filter((d) => d.user.timeZone).length;
  const usersWithSessionIPs = allData.filter(
    (d) => d.sessionIPs.length > 0,
  ).length;
  const usersWithTinderProfiles = allData.filter(
    (d) => d.tinderProfiles.length > 0,
  ).length;
  const usersWithHingeProfiles = allData.filter(
    (d) => d.hingeProfiles.length > 0,
  ).length;
  const usersWithOriginalFiles = allData.filter(
    (d) => d.originalFileLocations.length > 0,
  ).length;

  const totalTinderProfiles = allData.reduce(
    (sum, d) => sum + d.tinderProfiles.length,
    0,
  );
  const totalHingeProfiles = allData.reduce(
    (sum, d) => sum + d.hingeProfiles.length,
    0,
  );
  const totalTinderMessages = allData.reduce(
    (sum, d) => sum + d.tinderProfiles.reduce((s, p) => s + p.messageCount, 0),
    0,
  );
  const totalHingeMessages = allData.reduce(
    (sum, d) => sum + d.hingeProfiles.reduce((s, p) => s + p.messageCount, 0),
    0,
  );

  // Collect unique countries and cities from all sources
  const uniqueCountries = new Set<string>();
  const uniqueCities = new Set<string>();
  const uniqueCountryCodes = new Set<string>();

  allData.forEach((d) => {
    if (d.user.country) uniqueCountries.add(d.user.country);

    d.tinderProfiles.forEach((p) => {
      if (p.country) uniqueCountries.add(p.country);
      if (p.city) uniqueCities.add(p.city);
    });

    d.hingeProfiles.forEach((p) => {
      if (p.country) uniqueCountries.add(p.country);
      p.hometowns?.forEach((h) => uniqueCities.add(h));
    });

    // Extract countries from original file data
    d.originalFileLocations.forEach((file) => {
      file.extractedLocations.forEach((loc) => {
        // Look for country codes (2-letter codes)
        const countryMatch = /country[^:]*:\s*([A-Z]{2})\b/i.exec(loc);
        if (countryMatch?.[1]) {
          uniqueCountryCodes.add(countryMatch[1].toUpperCase());
        }
        // Look for city names
        const cityMatch = /city[^:]*:\s*([^,\n]+)/i.exec(loc);
        if (cityMatch?.[1]) {
          const city = cityMatch[1].trim();
          if (city && city.length > 2) uniqueCities.add(city);
        }
      });
    });
  });

  console.log(`Total users checked: ${totalUsers}`);
  console.log(`\nUser-level location data:`);
  console.log(`  Users with country set: ${usersWithCountry}`);
  console.log(`  Users with timezone set: ${usersWithTimezone}`);
  console.log(`  Users with session IPs: ${usersWithSessionIPs}`);
  console.log(`\nProfile data:`);
  console.log(`  Users with Tinder profiles: ${usersWithTinderProfiles}`);
  console.log(`  Total Tinder profiles: ${totalTinderProfiles}`);
  console.log(`  Users with Hinge profiles: ${usersWithHingeProfiles}`);
  console.log(`  Total Hinge profiles: ${totalHingeProfiles}`);
  console.log(`\nMessage counts:`);
  console.log(
    `  Total Tinder messages: ${totalTinderMessages.toLocaleString()}`,
  );
  console.log(`  Total Hinge messages: ${totalHingeMessages.toLocaleString()}`);
  if (totalTinderProfiles > 0) {
    console.log(
      `  Average Tinder messages per profile: ${(totalTinderMessages / totalTinderProfiles).toFixed(0)}`,
    );
  }
  if (totalHingeProfiles > 0) {
    console.log(
      `  Average Hinge messages per profile: ${(totalHingeMessages / totalHingeProfiles).toFixed(0)}`,
    );
  }
  console.log(`\nGeographic data:`);
  console.log(`  Unique countries (full names): ${uniqueCountries.size}`);
  if (uniqueCountries.size > 0) {
    console.log(`    ${Array.from(uniqueCountries).sort().join(", ")}`);
  }
  console.log(`  Unique country codes: ${uniqueCountryCodes.size}`);
  if (uniqueCountryCodes.size > 0) {
    console.log(`    ${Array.from(uniqueCountryCodes).sort().join(", ")}`);
  }
  console.log(`  Unique cities: ${uniqueCities.size}`);
  if (uniqueCities.size > 0 && uniqueCities.size <= 20) {
    console.log(`    ${Array.from(uniqueCities).sort().join(", ")}`);
  }
  console.log(`\nOriginal files:`);
  console.log(`  Users with original files: ${usersWithOriginalFiles}`);
}

// ---- MAIN EXTRACTION ----------------------------------------------

async function extractLocationData() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║   Extract User Location Data & Message Counts                ║",
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝\n",
  );

  log(`Querying users (limit: ${USER_LIMIT})...`);

  const allData = await queryUserLocationData();

  log(`Found ${allData.length} users\n`);

  if (allData.length === 0) {
    console.log("❌ No users found");
    return;
  }

  // Display each user's data
  let displayedUsers = 0;
  allData.forEach((userData, index) => {
    const hasProfiles =
      userData.tinderProfiles.length > 0 || userData.hingeProfiles.length > 0;
    const hasLocationData =
      userData.user.country ||
      userData.user.timeZone ||
      userData.sessionIPs.length > 0 ||
      hasProfiles ||
      userData.originalFileLocations.length > 0;

    if (hasLocationData) {
      displayUserLocationData(userData, index);
      displayedUsers++;
    }
  });

  log(
    `\nDisplayed ${displayedUsers} users with location data (${allData.length - displayedUsers} skipped)\n`,
  );

  // Display summary
  displaySummary(allData);

  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ Extraction complete");
  console.log(`${"═".repeat(70)}\n`);
}

// Run extraction
extractLocationData().catch((error) => {
  console.error("\n❌ Extraction failed:");
  console.error(error);
  if (error instanceof Error) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
  process.exit(1);
});
