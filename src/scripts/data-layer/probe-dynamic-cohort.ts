import { eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";
import { tinderProfileTable } from "@/server/db/schema";
import { swipeRankCountryFilterSql } from "@/server/services/swipe-rank/country-filter";
import {
  getDefaultEligibility,
  parseSwipeRankPeriod,
} from "@/scripts/swipe-rank/periods";

import {
  getFlagValue,
  getIntegerFlag,
  hasFlag,
  printHeading,
  printJson,
  printRows,
  toNullableNumber,
  toNumber,
} from "./utils";

const VALID_GENDERS = new Set(["MALE", "FEMALE", "OTHER", "MORE", "UNKNOWN"]);

interface Descriptor {
  gender: string | null;
  interestedIn: string | null;
  ageMin: number | null;
  ageMax: number | null;
  country: string | null;
  region: string | null;
  city: string | null;
  locationSource: "profile" | "user";
}

interface ProbeRow extends Record<string, unknown> {
  member_count: number | string;
  eligible_count: number | string;
  median_likes: number | string | null;
  median_matches: number | string | null;
  median_active_days: number | string | null;
  match_rate_p_10: number | string | null;
  match_rate_p_25: number | string | null;
  match_rate_p_50: number | string | null;
  match_rate_p_75: number | string | null;
  match_rate_p_90: number | string | null;
  mean_match_rate: number | string | null;
  weighted_match_rate: number | string | null;
  target_member: boolean | null;
  target_eligible: boolean | null;
  target_likes: number | string | null;
  target_matches: number | string | null;
  target_active_days: number | string | null;
  target_match_rate: number | string | null;
  target_rank: number | string | null;
  target_field_size: number | string | null;
  target_tie_count: number | string | null;
}

function validateGender(value: string | null, flag: string): string | null {
  if (value === null) return null;
  const normalized = value.toUpperCase();
  if (!VALID_GENDERS.has(normalized)) {
    throw new Error(`${flag} must be a SwipeStats gender enum value.`);
  }
  return normalized;
}

function periodFilter(startDate: string | null, endDate: string | null): SQL {
  if (!startDate || !endDate) return sql``;
  return sql`
    AND u.date_stamp_raw >= ${startDate}
    AND u.date_stamp_raw < ${endDate}
  `;
}

function descriptorFilter(descriptor: Descriptor): SQL {
  const conditions: SQL[] = [];
  if (descriptor.gender) {
    conditions.push(sql`gender = ${descriptor.gender}`);
  }
  if (descriptor.interestedIn) {
    conditions.push(sql`interested_in = ${descriptor.interestedIn}`);
  }
  if (descriptor.ageMin !== null) {
    conditions.push(sql`age_in_period >= ${descriptor.ageMin}`);
  }
  if (descriptor.ageMax !== null) {
    conditions.push(sql`age_in_period <= ${descriptor.ageMax}`);
  }

  const prefix = descriptor.locationSource === "profile" ? "profile" : "user";
  if (descriptor.country) {
    conditions.push(
      prefix === "profile"
        ? swipeRankCountryFilterSql(sql`profile_country`, descriptor.country)
        : swipeRankCountryFilterSql(sql`user_country`, descriptor.country),
    );
  }
  if (descriptor.region) {
    conditions.push(
      prefix === "profile"
        ? sql`profile_region = ${descriptor.region}`
        : sql`user_region = ${descriptor.region}`,
    );
  }
  if (descriptor.city) {
    conditions.push(
      prefix === "profile"
        ? sql`profile_city = ${descriptor.city}`
        : sql`user_city = ${descriptor.city}`,
    );
  }

  return conditions.length === 0
    ? sql``
    : sql`WHERE ${sql.join(conditions, sql` AND `)}`;
}

function profilePeriodCte(
  startDate: string | null,
  endDate: string | null,
): SQL {
  return sql`
    profile_period AS (
      SELECT
        p.tinder_id,
        p.gender,
        p.interested_in,
        p.country AS profile_country,
        p.region AS profile_region,
        p.city AS profile_city,
        usr.country AS user_country,
        usr.region AS user_region,
        usr.city AS user_city,
        max(u.user_age_this_day)::int AS age_in_period,
        min(u.date_stamp_raw) AS first_observed_date,
        max(u.date_stamp_raw) AS last_observed_date,
        count(*) FILTER (
          WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
        )::int AS active_days,
        sum(u.swipe_likes)::bigint AS likes,
        sum(u.swipe_passes)::bigint AS passes,
        sum(u.matches)::bigint AS matches,
        CASE
          WHEN sum(u.swipe_likes) > 0
            THEN sum(u.matches)::numeric / sum(u.swipe_likes)
          ELSE NULL
        END AS match_rate
      FROM tinder_usage u
      JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
      LEFT JOIN "user" usr ON usr.id = p.user_id
      WHERE p.computed = false
      ${periodFilter(startDate, endDate)}
      GROUP BY
        p.tinder_id,
        p.gender,
        p.interested_in,
        p.country,
        p.region,
        p.city,
        usr.country,
        usr.region,
        usr.city
    )
  `;
}

async function computeProbe(
  descriptor: Descriptor,
  targetId: string | null,
  startDate: string | null,
  endDate: string | null,
  minLikes: number,
  minActiveDays: number,
): Promise<ProbeRow> {
  const result = await db.execute<ProbeRow>(sql`
    WITH
    ${profilePeriodCte(startDate, endDate)},
    members AS (
      SELECT * FROM profile_period
      ${descriptorFilter(descriptor)}
    ),
    eligible AS (
      SELECT * FROM members
      WHERE likes >= ${minLikes}
        AND active_days >= ${minActiveDays}
        AND match_rate IS NOT NULL
    ),
    ranked AS (
      SELECT
        *,
        rank() OVER (ORDER BY match_rate DESC) AS rank,
        count(*) OVER () AS field_size,
        count(*) OVER (PARTITION BY match_rate) AS tie_count
      FROM eligible
    )
    SELECT
      (SELECT count(*)::bigint FROM members) AS member_count,
      (SELECT count(*)::bigint FROM eligible) AS eligible_count,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY likes)
       FROM eligible) AS median_likes,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY matches)
       FROM eligible) AS median_matches,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY active_days)
       FROM eligible) AS median_active_days,
      (SELECT percentile_cont(0.1) WITHIN GROUP (ORDER BY match_rate)
       FROM eligible) AS match_rate_p_10,
      (SELECT percentile_cont(0.25) WITHIN GROUP (ORDER BY match_rate)
       FROM eligible) AS match_rate_p_25,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY match_rate)
       FROM eligible) AS match_rate_p_50,
      (SELECT percentile_cont(0.75) WITHIN GROUP (ORDER BY match_rate)
       FROM eligible) AS match_rate_p_75,
      (SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY match_rate)
       FROM eligible) AS match_rate_p_90,
      (SELECT avg(match_rate) FROM eligible) AS mean_match_rate,
      (SELECT sum(matches)::numeric / nullif(sum(likes), 0) FROM eligible)
        AS weighted_match_rate,
      EXISTS (
        SELECT 1 FROM members WHERE tinder_id = ${targetId}::text
      ) AS target_member,
      EXISTS (
        SELECT 1 FROM eligible WHERE tinder_id = ${targetId}::text
      ) AS target_eligible,
      (SELECT likes FROM members WHERE tinder_id = ${targetId}::text)
        AS target_likes,
      (SELECT matches FROM members WHERE tinder_id = ${targetId}::text)
        AS target_matches,
      (SELECT active_days FROM members WHERE tinder_id = ${targetId}::text)
        AS target_active_days,
      (SELECT match_rate FROM members WHERE tinder_id = ${targetId}::text)
        AS target_match_rate,
      (SELECT rank FROM ranked WHERE tinder_id = ${targetId}::text)
        AS target_rank,
      (SELECT field_size FROM ranked WHERE tinder_id = ${targetId}::text)
        AS target_field_size,
      (SELECT tie_count FROM ranked WHERE tinder_id = ${targetId}::text)
        AS target_tie_count
  `);

  const row = result.rows[0];
  if (!row) throw new Error("Dynamic cohort query returned no result.");
  return row;
}

async function computeMonthlySeries(
  descriptor: Descriptor,
  startDate: string | null,
  endDate: string | null,
): Promise<Array<Record<string, unknown>>> {
  const result = await db.execute<Record<string, unknown>>(sql`
    WITH
    ${profilePeriodCte(startDate, endDate)},
    members AS (
      SELECT tinder_id FROM profile_period
      ${descriptorFilter(descriptor)}
    ),
    member_count AS (
      SELECT count(*)::numeric AS value FROM members
    ),
    profile_month AS (
      SELECT
        substring(u.date_stamp_raw, 1, 7) AS month,
        u.tinder_profile_id,
        sum(u.swipe_likes)::bigint AS likes,
        sum(u.matches)::bigint AS matches,
        count(*) FILTER (
          WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
        )::int AS active_days
      FROM tinder_usage u
      JOIN members m ON m.tinder_id = u.tinder_profile_id
      WHERE true
      ${periodFilter(startDate, endDate)}
      GROUP BY month, u.tinder_profile_id
    )
    SELECT
      pm.month,
      mc.value::int AS cohort_members,
      count(*)::int AS members_with_rows,
      count(*) FILTER (WHERE pm.active_days > 0)::int AS active_members,
      sum(pm.likes)::numeric / nullif(mc.value, 0) AS mean_likes_zero_filled,
      sum(pm.matches)::numeric / nullif(mc.value, 0)
        AS mean_matches_zero_filled,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY pm.likes) FILTER (
        WHERE pm.active_days > 0
      ) AS median_likes_among_active,
      sum(pm.matches)::numeric / nullif(sum(pm.likes), 0)
        AS weighted_match_rate
    FROM profile_month pm
    CROSS JOIN member_count mc
    GROUP BY pm.month, mc.value
    ORDER BY pm.month
  `);
  return result.rows;
}

function normalizeProbe(row: ProbeRow): Record<string, unknown> {
  const rank = toNullableNumber(row.target_rank);
  const fieldSize = toNullableNumber(row.target_field_size);
  return {
    population: {
      membersWithUsage: toNumber(row.member_count),
      eligibleMembers: toNumber(row.eligible_count),
    },
    benchmark: {
      medianLikes: toNullableNumber(row.median_likes),
      medianMatches: toNullableNumber(row.median_matches),
      medianActiveDays: toNullableNumber(row.median_active_days),
      matchRate: {
        p10: toNullableNumber(row.match_rate_p_10),
        p25: toNullableNumber(row.match_rate_p_25),
        p50: toNullableNumber(row.match_rate_p_50),
        p75: toNullableNumber(row.match_rate_p_75),
        p90: toNullableNumber(row.match_rate_p_90),
        meanOfProfileRates: toNullableNumber(row.mean_match_rate),
        weightedFromTotalMatchesAndLikes: toNullableNumber(
          row.weighted_match_rate,
        ),
      },
    },
    target: {
      inCohort: row.target_member === true,
      eligible: row.target_eligible === true,
      likes: toNullableNumber(row.target_likes),
      matches: toNullableNumber(row.target_matches),
      activeDays: toNullableNumber(row.target_active_days),
      matchRate: toNullableNumber(row.target_match_rate),
      rank,
      fieldSize,
      tieCount: toNullableNumber(row.target_tie_count),
      percentile:
        rank !== null && fieldSize !== null && fieldSize > 0
          ? ((fieldSize - rank + 1) / fieldSize) * 100
          : null,
      topShare:
        rank !== null && fieldSize !== null && fieldSize > 0
          ? (rank / fieldSize) * 100
          : null,
    },
  };
}

function printHelp(): void {
  console.log(`
Probe a descriptor-defined Tinder cohort without storing a fake profile.

Usage:
  bun run data-layer:probe-cohort -- --tinder-id <id> --period 2025-12
  bun run data-layer:probe-cohort -- --period 2025 --gender MALE \\
    --interested-in FEMALE --age-min 25 --age-max 34 --country US

Descriptor flags:
  --gender, --interested-in, --age-min, --age-max
  --country, --region, --city
  --location-source user|profile   Default: user

Ranking flags:
  --tinder-id, --period, --min-likes, --min-active-days
  --series                         Include a zero-filled monthly benchmark
  --json

When a Tinder ID is supplied without descriptors, gender and interested-in are
inferred from the target profile. All queries are read-only.
`);
}

async function main(): Promise<void> {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }

  const targetId = getFlagValue("--tinder-id");
  const target = targetId
    ? await db.query.tinderProfileTable.findFirst({
        where: eq(tinderProfileTable.tinderId, targetId),
      })
    : null;
  if (targetId && !target)
    throw new Error(`Profile ${targetId} was not found.`);

  const locationSourceRaw = getFlagValue("--location-source") ?? "user";
  if (locationSourceRaw !== "user" && locationSourceRaw !== "profile") {
    throw new Error("--location-source must be user or profile.");
  }

  const explicitDescriptor = [
    "--gender",
    "--interested-in",
    "--age-min",
    "--age-max",
    "--country",
    "--region",
    "--city",
  ].some(hasFlag);

  const descriptor: Descriptor = {
    gender: validateGender(
      getFlagValue("--gender") ??
        (!explicitDescriptor ? (target?.gender ?? null) : null),
      "--gender",
    ),
    interestedIn: validateGender(
      getFlagValue("--interested-in") ??
        (!explicitDescriptor ? (target?.interestedIn ?? null) : null),
      "--interested-in",
    ),
    ageMin: getIntegerFlag("--age-min"),
    ageMax: getIntegerFlag("--age-max"),
    country: getFlagValue("--country"),
    region: getFlagValue("--region"),
    city: getFlagValue("--city"),
    locationSource: locationSourceRaw,
  };
  if (
    descriptor.ageMin !== null &&
    descriptor.ageMax !== null &&
    descriptor.ageMin > descriptor.ageMax
  ) {
    throw new Error("--age-min cannot be greater than --age-max.");
  }

  const period = parseSwipeRankPeriod(getFlagValue("--period") ?? "all-time");
  const defaults = getDefaultEligibility(period.kind);
  const minLikes = getIntegerFlag("--min-likes") ?? defaults.minLikes;
  const minActiveDays =
    getIntegerFlag("--min-active-days") ?? defaults.minActiveDays;

  const rawProbe = await computeProbe(
    descriptor,
    targetId,
    period.startDate,
    period.endDate,
    minLikes,
    minActiveDays,
  );
  const normalized = normalizeProbe(rawProbe);
  const monthlySeries = hasFlag("--series")
    ? await computeMonthlySeries(descriptor, period.startDate, period.endDate)
    : undefined;

  const result = {
    probeVersion: "dynamic-tinder-cohort-v1",
    asOf: new Date().toISOString(),
    period,
    descriptor,
    eligibility: { minLikes, minActiveDays },
    ...normalized,
    monthlySeries,
    modelingNote:
      "The benchmark is a distribution over real profile-period facts. It is not inserted as a fake Tinder profile; a comparison UI can adapt this response as a COHORT subject.",
  };

  if (hasFlag("--json")) {
    printJson(result);
    return;
  }

  printHeading("Dynamic cohort descriptor");
  printRows(Object.entries(descriptor));
  printHeading(`Period · ${period.label}`);
  printRows([
    ["minimum likes", minLikes],
    ["minimum active days", minActiveDays],
  ]);
  printHeading("Population");
  printRows(Object.entries(normalized.population as Record<string, unknown>));
  printHeading("Benchmark");
  console.dir(normalized.benchmark, { depth: null });
  if (targetId) {
    printHeading("Target rank inside this cohort");
    printRows(Object.entries(normalized.target as Record<string, unknown>));
  }
  if (monthlySeries) {
    printHeading("Zero-filled monthly comparison series");
    console.table(monthlySeries);
  }
  console.log(
    "\nAll queries were read-only. Use --json for the full contract.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
