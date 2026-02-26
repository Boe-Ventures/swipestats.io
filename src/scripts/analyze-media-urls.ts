/**
 * Analyze media URLs to understand where they're hosted.
 *
 * Pulls all media URLs, groups by hostname, and prints samples
 * for manual inspection before planning a migration to our own blob storage.
 *
 * Usage:
 *   bun run src/scripts/analyze-media-urls.ts
 */

import { db } from "@/server/db";
import { mediaTable } from "@/server/db/schema";
import { sql, isNotNull } from "drizzle-orm";

async function analyzeMediaUrls() {
  console.log("=== Media URL Analysis ===\n");

  // ---- Total counts ----
  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaTable);

  const [withTinder] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaTable)
    .where(isNotNull(mediaTable.tinderProfileId));

  const [withHinge] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaTable)
    .where(isNotNull(mediaTable.hingeProfileId));

  console.log(`Total media rows:   ${total?.count.toLocaleString()}`);
  console.log(`  Tinder:           ${withTinder?.count.toLocaleString()}`);
  console.log(`  Hinge:            ${withHinge?.count.toLocaleString()}`);
  console.log("");

  // ---- Group by host ----
  console.log("=== URLs grouped by host ===\n");

  // Extract hostname: split on '://' to get "host/path...", then split on '/' to get host
  const hostGroupsResult = await db.execute<{
    host: string;
    count: number;
  }>(sql`
    SELECT
      split_part(split_part(url, '://', 2), '/', 1) AS host,
      count(*)::int AS count
    FROM media
    GROUP BY host
    ORDER BY count DESC
  `);
  const hostGroups = hostGroupsResult.rows;

  for (const row of hostGroups) {
    const pct = ((row.count / (total?.count ?? 1)) * 100).toFixed(1);
    console.log(`  ${row.host}`);
    console.log(`    count: ${row.count.toLocaleString()} (${pct}%)`);
  }
  console.log("");

  // ---- Sample URLs per host ----
  console.log("=== Sample URLs per host (up to 3 each) ===\n");

  for (const { host } of hostGroups) {
    const samplesResult = await db.execute<{ url: string; type: string }>(sql`
      SELECT url, type
      FROM media
      WHERE split_part(split_part(url, '://', 2), '/', 1) = ${host}
      LIMIT 3
    `);

    console.log(`  [${host}]`);
    for (const s of samplesResult.rows) {
      console.log(`    (${s.type}) ${s.url.substring(0, 120)}${s.url.length > 120 ? "..." : ""}`);
    }
    console.log("");
  }

  // ---- URL pattern analysis ----
  console.log("=== URL path patterns (first path segment) ===\n");

  const pathPatternsResult = await db.execute<{
    host: string;
    path_prefix: string;
    count: number;
  }>(sql`
    SELECT
      split_part(split_part(url, '://', 2), '/', 1) AS host,
      split_part(split_part(url, '://', 2), '/', 2) AS path_prefix,
      count(*)::int AS count
    FROM media
    GROUP BY host, path_prefix
    ORDER BY count DESC
    LIMIT 20
  `);

  for (const row of pathPatternsResult.rows) {
    console.log(`  ${row.host}/${row.path_prefix}  (${row.count.toLocaleString()})`);
  }
  console.log("");

  // ---- Clean up broken URLs ----
  console.log("=== Broken URLs (no https:// prefix) ===\n");

  const brokenResult = await db.execute<{
    id: string;
    url: string;
    type: string;
    tinder_profile_id: string | null;
    hinge_profile_id: string | null;
  }>(sql`
    SELECT id, url, type, tinder_profile_id, hinge_profile_id
    FROM media
    WHERE url NOT LIKE 'https://%'
  `);

  for (const row of brokenResult.rows) {
    console.log(`  id=${row.id}  url="${row.url}"  type=${row.type}`);
  }
  console.log(`\n  Total broken: ${brokenResult.rows.length}`);

  // Also include malformed host (gotinder.com0077a339)
  const malformedResult = await db.execute<{
    id: string;
    url: string;
  }>(sql`
    SELECT id, url
    FROM media
    WHERE url LIKE '%gotinder.com0%'
  `);

  for (const row of malformedResult.rows) {
    console.log(`  malformed: id=${row.id}  url="${row.url}"`);
  }

  const totalToDelete = brokenResult.rows.length + malformedResult.rows.length;
  console.log(`\n  Total to delete: ${totalToDelete}`);

  if (process.env.DELETE === "true") {
    const brokenIds = [
      ...brokenResult.rows.map((r) => r.id),
      ...malformedResult.rows.map((r) => r.id),
    ];

    const deleted = await db
      .delete(mediaTable)
      .where(sql`${mediaTable.id} IN ${brokenIds}`)
      .returning({ id: mediaTable.id });

    console.log(`\n  Deleted ${deleted.length} broken media rows.`);
  } else {
    console.log(`\n  Run with DELETE=true to remove them.`);
  }
  console.log("");

  console.log("Done.");
}

analyzeMediaUrls().catch(console.error);
