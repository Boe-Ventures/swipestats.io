import { sql, type SQL } from "drizzle-orm";

import { db } from "@/server/db";
import { parseSwipeRankPeriod } from "@/scripts/swipe-rank/periods";

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

function extractPlan(result: {
  rows: Array<Record<string, unknown>>;
}): unknown {
  const row = result.rows[0];
  if (!row) return null;
  return row["QUERY PLAN"] ?? row.query_plan ?? Object.values(row)[0] ?? null;
}

interface PlanNode extends Record<string, unknown> {
  Plans?: PlanNode[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function summarizePlan(plan: unknown): Record<string, unknown> {
  const envelope = asRecord(Array.isArray(plan) ? plan[0] : plan);
  const root = asRecord(envelope?.Plan);
  if (!envelope || !root) return { available: false };

  const nodes: PlanNode[] = [];
  const visit = (node: PlanNode): void => {
    nodes.push(node);
    for (const child of node.Plans ?? []) visit(child);
  };
  visit(root as PlanNode);

  const maximum = (field: string): number =>
    Math.max(
      0,
      ...nodes.map((node) => {
        const value = node[field];
        return typeof value === "number" ? value : 0;
      }),
    );

  const nodeTypes = [...new Set(nodes.map((node) => node["Node Type"]))]
    .filter((value): value is string => typeof value === "string")
    .sort();
  const sortMethods = [
    ...new Set(nodes.map((node) => node["Sort Method"])),
  ].filter((value): value is string => typeof value === "string");

  return {
    available: true,
    planningTimeMs: envelope["Planning Time"] ?? null,
    executionTimeMs: envelope["Execution Time"] ?? null,
    estimatedRows: root["Plan Rows"] ?? null,
    actualRows: root["Actual Rows"] ?? null,
    totalCost: root["Total Cost"] ?? null,
    nodeTypes,
    sortMethods,
    maxSharedHitBlocks: maximum("Shared Hit Blocks"),
    maxSharedReadBlocks: maximum("Shared Read Blocks"),
    maxTempReadBlocks: maximum("Temp Read Blocks"),
    maxTempWrittenBlocks: maximum("Temp Written Blocks"),
  };
}

async function explain(query: SQL, analyze: boolean): Promise<unknown> {
  const prefix = analyze
    ? sql.raw("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)")
    : sql.raw("EXPLAIN (FORMAT JSON)");
  const result = await db.execute<Record<string, unknown>>(sql`
    ${prefix} ${query}
  `);
  return extractPlan(result);
}

async function main(): Promise<void> {
  const period = parseSwipeRankPeriod(getFlagValue("--period") ?? "2025");
  const analyze = hasFlag("--analyze");
  const fullPlans = hasFlag("--full-plans");

  const [sizes, indexes, volume, plans] = await Promise.all([
    db.execute<Record<string, unknown>>(sql`
      SELECT
        c.relname AS table_name,
        pg_size_pretty(pg_relation_size(c.oid)) AS heap_size,
        pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        coalesce(s.n_live_tup, 0)::bigint AS estimated_live_rows,
        s.last_analyze,
        s.last_autoanalyze
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'tinder_profile',
          'tinder_usage',
          'profile_meta',
          'swipe_rank_profile',
          'swipe_rank_build',
          'swipe_rank_period_fact'
        )
      ORDER BY pg_total_relation_size(c.oid) DESC
    `),
    db.execute<Record<string, unknown>>(sql`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (
          'tinder_profile',
          'tinder_usage',
          'profile_meta',
          'swipe_rank_profile',
          'swipe_rank_build',
          'swipe_rank_period_fact'
        )
      ORDER BY tablename, indexname
    `),
    db.execute<Record<string, unknown>>(sql`
      WITH profile_grains AS (
        SELECT
          u.tinder_profile_id,
          substring(u.date_stamp_raw, 1, 7) AS month,
          concat(
            substring(u.date_stamp_raw, 1, 4),
            '-Q',
            ((substring(u.date_stamp_raw, 6, 2)::int - 1) / 3 + 1)::int
          ) AS quarter,
          substring(u.date_stamp_raw, 1, 4) AS year
        FROM tinder_usage u
        JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
        WHERE p.computed = false
      )
      SELECT
        (SELECT count(*)::bigint FROM tinder_usage) AS usage_rows,
        (SELECT count(*)::bigint FROM tinder_profile WHERE computed = false)
          AS real_profiles,
        count(DISTINCT (tinder_profile_id, month))::bigint
          AS profile_month_rows,
        count(DISTINCT (tinder_profile_id, quarter))::bigint
          AS profile_quarter_rows,
        count(DISTINCT (tinder_profile_id, year))::bigint
          AS profile_year_rows,
        count(DISTINCT tinder_profile_id)::bigint AS profiles_with_usage,
        min(month) AS first_month,
        max(month) AS last_month
      FROM profile_grains
    `),
    Promise.all([
      explain(
        sql`
          SELECT
            u.tinder_profile_id,
            sum(u.swipe_likes)::bigint AS likes,
            sum(u.swipe_passes)::bigint AS passes,
            sum(u.matches)::bigint AS matches,
            count(*) FILTER (
              WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
            )::int AS active_days
          FROM tinder_usage u
          JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
          WHERE p.computed = false
          ${periodFilter(period.startDate, period.endDate)}
          GROUP BY u.tinder_profile_id
        `,
        analyze,
      ),
      explain(
        sql`
          WITH profile_period AS (
            SELECT
              u.tinder_profile_id,
              p.gender,
              p.interested_in,
              sum(u.swipe_likes)::bigint AS likes,
              count(*) FILTER (
                WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
              )::int AS active_days,
              CASE
                WHEN sum(u.swipe_likes) > 0
                  THEN sum(u.matches)::numeric / sum(u.swipe_likes)
                ELSE NULL
              END AS match_rate
            FROM tinder_usage u
            JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
            WHERE p.computed = false
            ${periodFilter(period.startDate, period.endDate)}
            GROUP BY
              u.tinder_profile_id,
              p.gender,
              p.interested_in
          ),
          eligible AS (
            SELECT *
            FROM profile_period
            WHERE likes >= 100
              AND active_days >= 5
              AND match_rate IS NOT NULL
          )
          SELECT
            tinder_profile_id,
            rank() OVER (ORDER BY match_rate DESC) AS global_rank,
            rank() OVER (
              PARTITION BY gender, interested_in
              ORDER BY match_rate DESC
            ) AS peer_rank
          FROM eligible
        `,
        analyze,
      ),
    ]),
  ]);

  const result = {
    inspectionVersion: "period-layer-inspection-v1",
    asOf: new Date().toISOString(),
    period,
    analyze,
    tableSizes: sizes.rows,
    indexes: indexes.rows,
    periodFactVolume: volume.rows[0] ?? {},
    planSummaries: {
      profilePeriodAggregation: summarizePlan(plans[0]),
      liveRank: summarizePlan(plans[1]),
    },
    plans: fullPlans
      ? {
          profilePeriodAggregation: plans[0],
          liveRank: plans[1],
        }
      : undefined,
    interpretation: {
      monthRows:
        "The profile-month count is the canonical fact-layer floor. Quarter, year, and all-time facts can be stored too or derived from months.",
      analyze:
        "Without --analyze, plans contain estimates only. --analyze executes the read-only SELECTs and reports actual timings/buffers.",
    },
  };

  if (hasFlag("--json")) {
    printJson(result);
    return;
  }

  printHeading("Relevant table sizes");
  console.table(sizes.rows);
  printHeading("Current indexes");
  console.table(indexes.rows);
  printHeading("Candidate period-fact volume");
  printRows(Object.entries(volume.rows[0] ?? {}));
  printHeading(`Query plan summaries · ${period.label}`);
  console.dir(result.planSummaries, { depth: null });
  if (fullPlans) {
    printHeading(`Full query plans · ${period.label}`);
    console.dir(result.plans, { depth: null });
  }
  console.log(
    `\nPlanner mode: ${analyze ? "actual execution" : "estimates only"}. All queries were read-only.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
