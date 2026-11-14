import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import { SWIPE_RANK_METRIC_VERSION } from "@/server/services/swipe-rank/constants";
import { isSwipeRankReady } from "@/server/services/swipe-rank/readiness";

import { hasFlag, printHeading, printJson, printRows } from "./utils";

interface RetirementRow extends Record<string, unknown> {
  cohort_definition_retired: boolean;
  cohort_stats_retired: boolean;
  synthetic_profiles: number | string;
  period_facts: number | string;
  fact_profiles: number | string;
  completed_full_builds: number | string;
}

async function main(): Promise<void> {
  const result = await db.execute<RetirementRow>(sql`
    SELECT
      to_regclass('public.cohort_definition') IS NULL
        AS cohort_definition_retired,
      to_regclass('public.cohort_stats') IS NULL AS cohort_stats_retired,
      (
        SELECT count(*) FROM tinder_profile
        WHERE computed = true OR left(tinder_id, 7) = 'cohort_'
      )::bigint AS synthetic_profiles,
      (
        SELECT count(*) FROM swipe_rank_period_fact
        WHERE metric_version = ${SWIPE_RANK_METRIC_VERSION}
      )::bigint AS period_facts,
      (
        SELECT count(DISTINCT profile_id) FROM swipe_rank_period_fact
        WHERE metric_version = ${SWIPE_RANK_METRIC_VERSION}
      )::bigint AS fact_profiles,
      (
        SELECT count(*) FROM swipe_rank_build
        WHERE data_provider = 'TINDER'
          AND metric_version = ${SWIPE_RANK_METRIC_VERSION}
          AND scope = 'FULL'
          AND status = 'COMPLETE'
      )::bigint AS completed_full_builds
  `);
  const row = result.rows[0];
  if (!row) throw new Error("Cohort retirement audit returned no result.");

  const audit = {
    retired: {
      cohortDefinition: row.cohort_definition_retired,
      cohortStats: row.cohort_stats_retired,
    },
    legacySyntheticProfiles: Number(row.synthetic_profiles),
    replacement: {
      metricVersion: SWIPE_RANK_METRIC_VERSION,
      periodFacts: Number(row.period_facts),
      profiles: Number(row.fact_profiles),
      completedFullBuilds: Number(row.completed_full_builds),
      productReady: await isSwipeRankReady(),
    },
  };

  if (hasFlag("--json")) {
    printJson(audit);
  } else {
    printHeading("Legacy cohort retirement");
    printRows([
      ["cohort_definition removed", audit.retired.cohortDefinition],
      ["cohort_stats removed", audit.retired.cohortStats],
      ["legacy synthetic profiles", audit.legacySyntheticProfiles],
      ["replacement period facts", audit.replacement.periodFacts],
      ["replacement profiles", audit.replacement.profiles],
      ["completed full builds", audit.replacement.completedFullBuilds],
      ["product ready", audit.replacement.productReady],
    ]);
  }

  if (
    !audit.retired.cohortDefinition ||
    !audit.retired.cohortStats ||
    audit.legacySyntheticProfiles !== 0 ||
    !audit.replacement.productReady
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
