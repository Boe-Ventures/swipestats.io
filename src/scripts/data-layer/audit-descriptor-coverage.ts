import { sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";
import {
  getDefaultEligibility,
  parseSwipeRankPeriod,
} from "@/scripts/swipe-rank/periods";

import {
  getFlagValue,
  hasFlag,
  printHeading,
  printJson,
  printRows,
} from "./utils";

function periodFilter(startDate: string | null, endDate: string | null): SQL {
  if (!startDate || !endDate) return sql``;
  return sql`
    AND u.date_stamp_raw >= ${startDate}
    AND u.date_stamp_raw < ${endDate}
  `;
}

async function main(): Promise<void> {
  const period = parseSwipeRankPeriod(getFlagValue("--period") ?? "2025");
  const targetId = getFlagValue("--tinder-id");
  const eligibility = getDefaultEligibility(period.kind);

  const [coverage, commonLocations, segmentResult, targetResult] =
    await Promise.all([
      db.execute<Record<string, unknown>>(sql`
        SELECT
          count(*)::int AS real_profiles,
          count(*) FILTER (WHERE p.gender <> 'UNKNOWN')::int
            AS known_gender,
          count(*) FILTER (WHERE p.interested_in <> 'UNKNOWN')::int
            AS known_interested_in,
          count(*) FILTER (WHERE p.age_at_last_usage BETWEEN 18 AND 100)::int
            AS plausible_latest_age,
          count(*) FILTER (WHERE nullif(trim(p.country), '') IS NOT NULL)::int
            AS profile_country_present,
          count(*) FILTER (WHERE nullif(trim(usr.country), '') IS NOT NULL)::int
            AS user_country_present,
          count(*) FILTER (WHERE nullif(trim(p.region), '') IS NOT NULL)::int
            AS profile_region_present,
          count(*) FILTER (WHERE nullif(trim(usr.region), '') IS NOT NULL)::int
            AS user_region_present,
          count(*) FILTER (WHERE nullif(trim(p.city), '') IS NOT NULL)::int
            AS profile_city_present,
          count(*) FILTER (WHERE nullif(trim(usr.city), '') IS NOT NULL)::int
            AS user_city_present,
          count(*) FILTER (
            WHERE nullif(trim(p.country), '') IS NOT NULL
              AND nullif(trim(usr.country), '') IS NOT NULL
              AND upper(trim(p.country)) <> upper(trim(usr.country))
          )::int AS country_disagreements_when_both_present,
          count(*) FILTER (
            WHERE nullif(trim(p.region), '') IS NOT NULL
              AND nullif(trim(usr.region), '') IS NOT NULL
              AND upper(trim(p.region)) <> upper(trim(usr.region))
          )::int AS region_disagreements_when_both_present,
          count(*) FILTER (
            WHERE nullif(trim(p.city), '') IS NOT NULL
              AND nullif(trim(usr.city), '') IS NOT NULL
              AND upper(trim(p.city)) <> upper(trim(usr.city))
          )::int AS city_disagreements_when_both_present,
          count(*) FILTER (
            WHERE jsonb_typeof(usr.location_history) = 'array'
              AND jsonb_array_length(usr.location_history) > 0
          )::int AS users_with_location_history,
          count(*) FILTER (WHERE p.user_id IS NULL)::int AS profiles_without_user
        FROM tinder_profile p
        LEFT JOIN "user" usr ON usr.id = p.user_id
        WHERE p.computed = false
      `),
      db.execute<Record<string, unknown>>(sql`
        WITH values_by_source AS (
          SELECT 'profile_country'::text AS source, upper(trim(p.country)) AS value
          FROM tinder_profile p
          WHERE p.computed = false AND nullif(trim(p.country), '') IS NOT NULL
          UNION ALL
          SELECT 'user_country', upper(trim(usr.country))
          FROM tinder_profile p
          JOIN "user" usr ON usr.id = p.user_id
          WHERE p.computed = false AND nullif(trim(usr.country), '') IS NOT NULL
          UNION ALL
          SELECT 'profile_region', upper(trim(p.region))
          FROM tinder_profile p
          WHERE p.computed = false AND nullif(trim(p.region), '') IS NOT NULL
          UNION ALL
          SELECT 'user_region', upper(trim(usr.region))
          FROM tinder_profile p
          JOIN "user" usr ON usr.id = p.user_id
          WHERE p.computed = false AND nullif(trim(usr.region), '') IS NOT NULL
        ),
        counts AS (
          SELECT source, value, count(*)::int AS profiles
          FROM values_by_source
          GROUP BY source, value
        ),
        ranked AS (
          SELECT *, row_number() OVER (
            PARTITION BY source ORDER BY profiles DESC, value
          ) AS position
          FROM counts
        )
        SELECT source, value, profiles
        FROM ranked
        WHERE position <= 10
        ORDER BY source, position
      `),
      db.execute<Record<string, unknown>>(sql`
        WITH profile_period AS (
          SELECT
            p.tinder_id,
            p.gender::text AS gender,
            p.interested_in::text AS interested_in,
            upper(nullif(trim(p.country), '')) AS profile_country,
            upper(nullif(trim(usr.country), '')) AS user_country,
            max(u.user_age_this_day)::int AS age_in_period,
            sum(u.swipe_likes)::bigint AS likes,
            count(*) FILTER (
              WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
            )::int AS active_days
          FROM tinder_usage u
          JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
          LEFT JOIN "user" usr ON usr.id = p.user_id
          WHERE p.computed = false
          ${periodFilter(period.startDate, period.endDate)}
          GROUP BY
            p.tinder_id,
            p.gender,
            p.interested_in,
            p.country,
            usr.country
        ),
        classified AS (
          SELECT
            *,
            CASE
              WHEN age_in_period < 18 THEN 'under_18'
              WHEN age_in_period <= 24 THEN '18_24'
              WHEN age_in_period <= 34 THEN '25_34'
              WHEN age_in_period <= 44 THEN '35_44'
              WHEN age_in_period <= 54 THEN '45_54'
              WHEN age_in_period IS NOT NULL THEN '55_plus'
              ELSE 'unknown'
            END AS age_band,
            likes >= ${eligibility.minLikes}
              AND active_days >= ${eligibility.minActiveDays} AS eligible
          FROM profile_period
        ),
        segments AS (
          SELECT
            'gender_interest'::text AS dimension_set,
            concat_ws('|', gender, interested_in) AS segment_key,
            count(*)::int AS members,
            count(*) FILTER (WHERE eligible)::int AS eligible_members
          FROM classified
          GROUP BY gender, interested_in
          UNION ALL
          SELECT
            'gender_interest_age',
            concat_ws('|', gender, interested_in, age_band),
            count(*)::int,
            count(*) FILTER (WHERE eligible)::int
          FROM classified
          GROUP BY gender, interested_in, age_band
          UNION ALL
          SELECT
            'gender_interest_age_user_country',
            concat_ws('|', gender, interested_in, age_band, user_country),
            count(*)::int,
            count(*) FILTER (WHERE eligible)::int
          FROM classified
          WHERE user_country IS NOT NULL
          GROUP BY gender, interested_in, age_band, user_country
          UNION ALL
          SELECT
            'gender_interest_age_profile_country',
            concat_ws('|', gender, interested_in, age_band, profile_country),
            count(*)::int,
            count(*) FILTER (WHERE eligible)::int
          FROM classified
          WHERE profile_country IS NOT NULL
          GROUP BY gender, interested_in, age_band, profile_country
        ),
        summaries AS (
          SELECT
            dimension_set,
            count(*)::int AS segments,
            min(members)::int AS smallest_membership,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY members)
              AS median_membership,
            max(members)::int AS largest_membership,
            count(*) FILTER (WHERE eligible_members >= 10)::int
              AS segments_with_10_eligible,
            count(*) FILTER (WHERE eligible_members >= 25)::int
              AS segments_with_25_eligible,
            count(*) FILTER (WHERE eligible_members >= 50)::int
              AS segments_with_50_eligible,
            count(*) FILTER (WHERE eligible_members >= 100)::int
              AS segments_with_100_eligible
          FROM segments
          GROUP BY dimension_set
        ),
        ranked_segments AS (
          SELECT
            *,
            row_number() OVER (
              PARTITION BY dimension_set
              ORDER BY eligible_members DESC, members DESC, segment_key
            ) AS position
          FROM segments
        )
        SELECT
          (SELECT count(*)::int FROM classified) AS profiles_with_usage,
          (SELECT count(*) FILTER (WHERE eligible)::int FROM classified)
            AS eligible_profiles,
          (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.dimension_set)
           FROM summaries s) AS segment_viability,
          (SELECT jsonb_agg(
             to_jsonb(r) - 'position'
             ORDER BY r.dimension_set, r.position
           )
           FROM ranked_segments r
           WHERE r.position <= 10) AS largest_segments
      `),
      targetId
        ? db.execute<Record<string, unknown>>(sql`
            SELECT
              p.tinder_id,
              p.gender,
              p.interested_in,
              p.age_at_last_usage,
              p.city AS profile_city,
              p.region AS profile_region,
              p.country AS profile_country,
              usr.city AS user_city,
              usr.region AS user_region,
              usr.country AS user_country,
              jsonb_typeof(usr.location_history) AS location_history_type,
              CASE
                WHEN jsonb_typeof(usr.location_history) = 'array'
                  THEN jsonb_array_length(usr.location_history)
                ELSE NULL
              END AS location_history_entries
            FROM tinder_profile p
            LEFT JOIN "user" usr ON usr.id = p.user_id
            WHERE p.tinder_id = ${targetId}
          `)
        : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    ]);

  const segments = segmentResult.rows[0] ?? {};
  const result = {
    auditVersion: "descriptor-coverage-v1",
    asOf: new Date().toISOString(),
    period,
    eligibility,
    currentProfileCoverage: coverage.rows[0] ?? {},
    commonRawLocationValues: commonLocations.rows,
    periodSegments: segments,
    target: targetResult.rows[0] ?? null,
    notes: {
      locationValues:
        "Values are only uppercased and trimmed, not geocoded or canonicalized.",
      age: "Period segments use user_age_this_day from raw usage, not age_at_last_usage.",
      privacy:
        "Segment viability should be reviewed before exposing descriptor cohorts; a product endpoint needs a minimum cohort size.",
    },
  };

  if (hasFlag("--json")) {
    printJson(result);
    return;
  }

  printHeading("Current Tinder descriptor coverage");
  printRows(Object.entries(result.currentProfileCoverage));
  printHeading("Most common raw location values");
  console.table(result.commonRawLocationValues);
  printHeading(`Descriptor segment viability · ${period.label}`);
  printRows(
    Object.entries(segments).filter(
      ([key]) => key !== "segment_viability" && key !== "largest_segments",
    ),
  );
  console.log("\nViability by dimension set:");
  console.table((segments.segment_viability as unknown[]) ?? []);
  console.log("\nLargest segments:");
  console.table((segments.largest_segments as unknown[]) ?? []);
  if (result.target) {
    printHeading("Target descriptors");
    printRows(Object.entries(result.target));
  }
  console.log("\nAll queries were read-only.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
