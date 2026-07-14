import { sql } from "drizzle-orm";

import { db } from "@/server/db";

import { hasFlag, printHeading, printJson } from "./utils";

type Row = Record<string, unknown>;

async function loadUploadCohorts(): Promise<Row[]> {
  const result = await db.execute<Row>(sql`
    SELECT
      extract(year FROM created_at)::int AS upload_year,
      count(*)::int AS profiles
    FROM tinder_profile
    WHERE computed = false
    GROUP BY 1
    ORDER BY 1
  `);
  return result.rows;
}

async function loadHistoricalCoverage(): Promise<Row[]> {
  const result = await db.execute<Row>(sql`
    WITH profile_activity_year AS (
      SELECT DISTINCT
        usage.tinder_profile_id,
        left(usage.date_stamp_raw, 4)::int AS activity_year
      FROM tinder_usage AS usage
      JOIN tinder_profile AS profile
        ON profile.tinder_id = usage.tinder_profile_id
      WHERE profile.computed = false
    ), coverage AS (
      SELECT
        activity.activity_year,
        count(*)::int AS observed_profiles,
        count(*) FILTER (
          WHERE extract(year FROM profile.created_at)::int
            > activity.activity_year
        )::int AS uploaded_after_activity_year,
        count(*) FILTER (
          WHERE profile.created_at >=
            date_trunc('year', now()) - interval '1 year'
        )::int AS uploaded_current_or_prior_year
      FROM profile_activity_year AS activity
      JOIN tinder_profile AS profile
        ON profile.tinder_id = activity.tinder_profile_id
      GROUP BY activity.activity_year
    )
    SELECT
      activity_year,
      observed_profiles,
      uploaded_after_activity_year,
      round(
        100.0 * uploaded_after_activity_year /
          nullif(observed_profiles, 0),
        1
      )::double precision AS late_upload_share_percent,
      uploaded_current_or_prior_year,
      round(
        100.0 * uploaded_current_or_prior_year /
          nullif(observed_profiles, 0),
        1
      )::double precision AS recent_upload_share_percent
    FROM coverage
    ORDER BY activity_year
  `);
  return result.rows;
}

function printTable(rows: Row[]): void {
  if (rows.length === 0) {
    console.log("No rows.");
    return;
  }
  console.table(rows);
}

async function main(): Promise<void> {
  const [uploadCohorts, historicalCoverage] = await Promise.all([
    loadUploadCohorts(),
    loadHistoricalCoverage(),
  ]);
  const output = {
    asOf: new Date().toISOString(),
    interpretation:
      "Activity periods are reconstructed from every profile uploaded by the as-of timestamp; late uploads can revise historical field sizes and ranks.",
    uploadCohorts,
    historicalCoverage,
  };

  if (hasFlag("--json")) {
    printJson(output);
    return;
  }

  printHeading("Tinder profile uploads by database year");
  printTable(uploadCohorts);
  printHeading("Historical activity coverage by upload vintage");
  printTable(historicalCoverage);
  console.log(`\nAs of ${output.asOf}`);
  console.log(output.interpretation);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
