import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { withAdvisoryLockTransaction } from "@/server/db";
import { swipeRankSnapshotTable } from "@/server/db/schema";
import { createId } from "@/server/db/utils";

import { SWIPE_RANK_METRIC_VERSION, swipeRankBuildLockName } from "./constants";
import {
  SWIPE_RANK_ELIGIBILITY_VERSION,
  getSwipeRankEligibility,
} from "./eligibility";
import { assertAlignedPeriod, type SwipeRankPeriodBounds } from "./periods";

export interface CreateGlobalSwipeRankSnapshotInput {
  period: SwipeRankPeriodBounds;
  publish?: boolean;
  metricVersion?: string;
}

export interface SwipeRankSnapshotSummary {
  snapshotId: string;
  buildId: string;
  metricVersion: string;
  eligibilityVersion: string;
  period: SwipeRankPeriodBounds;
  fieldSize: number;
  entryCount: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sourceCutoff: string;
  created: boolean;
}

interface FactSetRow extends Record<string, unknown> {
  build_id: string | null;
  distinct_builds: number | string;
  field_size: number | string;
  source_cutoff: Date | string | null;
  build_scope: "FULL" | "PROFILE" | null;
  build_activated_at: Date | string | null;
  source_generation: number | string | null;
  current_generation: number | string;
}

interface CountRow extends Record<string, unknown> {
  count: number | string;
}

interface ExcludedProfileRow extends Record<string, unknown> {
  profile_id: string;
}

export function hashSwipeRankExclusionSet(profileIds: readonly string[]) {
  return createHash("sha256")
    .update([...profileIds].sort().join(":"))
    .digest("hex");
}

export function globalSwipeRankCohortSpec(
  exclusionSetHash = hashSwipeRankExclusionSet([]),
) {
  return {
    dataProvider: "TINDER",
    population: "REAL_NON_EXCLUDED_PROFILES",
    moderation: { exclusionSetHash },
    dimensions: {},
  } as const;
}

export function hashSwipeRankCohortSpec(cohortSpec: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(cohortSpec)).digest("hex");
}

function iso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function hasCoherentFullSwipeRankLineage(input: {
  distinctBuilds: number;
  buildScope: "FULL" | "PROFILE" | null;
  buildActivated: boolean;
  sourceGeneration: number | null;
  currentGeneration: number;
}): boolean {
  return (
    input.distinctBuilds === 1 &&
    input.buildScope === "FULL" &&
    input.buildActivated &&
    input.sourceGeneration !== null &&
    input.sourceGeneration === input.currentGeneration
  );
}

/**
 * Freeze one global leaderboard edition from a coherent full fact build.
 *
 * Scoped recomputes intentionally make the live fact set span build IDs. A
 * snapshot refuses that mixed lineage: run a full reconciliation first, then
 * freeze it. This keeps `snapshot.buildId` truthful and the edition exactly
 * reproducible from its stored entries.
 */
export async function createGlobalSwipeRankSnapshot(
  input: CreateGlobalSwipeRankSnapshotInput,
): Promise<SwipeRankSnapshotSummary> {
  assertAlignedPeriod(input.period);

  const metricVersion = input.metricVersion ?? SWIPE_RANK_METRIC_VERSION;
  const eligibility = getSwipeRankEligibility(input.period.kind);
  const eligibilityVersion = SWIPE_RANK_ELIGIBILITY_VERSION;
  const status = input.publish ? "PUBLISHED" : "DRAFT";

  return withAdvisoryLockTransaction(
    swipeRankBuildLockName("TINDER"),
    async (tx) => {
      const excludedProfiles = await tx.execute<ExcludedProfileRow>(sql`
        SELECT profile.id AS profile_id
        FROM swipe_rank_profile profile
        WHERE profile.data_provider = 'TINDER'
          AND profile.is_swipe_rank_excluded = true
        ORDER BY profile.id
      `);
      const cohortSpec = globalSwipeRankCohortSpec(
        hashSwipeRankExclusionSet(
          excludedProfiles.rows.map((row) => row.profile_id),
        ),
      );
      const cohortHash = hashSwipeRankCohortSpec(cohortSpec);
      const factSet = await tx.execute<FactSetRow>(sql`
      WITH period_facts AS (
        SELECT fact.*
        FROM swipe_rank_period_fact fact
        JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
        JOIN swipe_rank_build build
          ON build.id = fact.build_id
         AND build.status = 'COMPLETE'
        WHERE profile.data_provider = 'TINDER'
          AND profile.is_synthetic = false
          AND profile.is_swipe_rank_excluded = false
          AND fact.metric_version = ${metricVersion}
          AND fact.period_kind = ${input.period.kind}
          AND fact.period_start = ${input.period.start}::date
          AND fact.period_end = ${input.period.end}::date
      ), eligible AS (
        SELECT *
        FROM period_facts
        WHERE match_rate_denominator >= ${eligibility.minimumRateDenominator}
          AND active_days >= ${eligibility.minimumActiveDays}
          AND match_rate IS NOT NULL
      )
      SELECT
        min(period_facts.build_id) AS build_id,
        count(DISTINCT period_facts.build_id)::int AS distinct_builds,
        count(eligible.id)::int AS field_size,
        max(period_facts.computed_at) AS source_cutoff,
        min(build.scope::text) AS build_scope,
        min(build.activated_at) AS build_activated_at,
        min((build.source_watermark ->> 'sourceGeneration')::bigint)
          AS source_generation,
        coalesce((
          SELECT max(mutation.id)
          FROM swipe_rank_source_mutation mutation
          WHERE mutation.data_provider = 'TINDER'
        ), 0)::bigint AS current_generation
      FROM period_facts
      LEFT JOIN eligible ON eligible.id = period_facts.id
      LEFT JOIN swipe_rank_build build ON build.id = period_facts.build_id
    `);
      const source = factSet.rows[0];
      if (!source || Number(source.field_size) === 0 || !source.build_id) {
        throw new Error("No eligible SwipeRank facts exist for this period.");
      }
      if (
        !hasCoherentFullSwipeRankLineage({
          distinctBuilds: Number(source.distinct_builds),
          buildScope: source.build_scope,
          buildActivated: source.build_activated_at !== null,
          sourceGeneration:
            source.source_generation === null
              ? null
              : Number(source.source_generation),
          currentGeneration: Number(source.current_generation),
        })
      ) {
        throw new Error(
          "Snapshot lineage is not the latest activated, coherent FULL source generation. Run the SwipeRank launch gate immediately before creating an edition.",
        );
      }
      if (!source.source_cutoff) {
        throw new Error("SwipeRank snapshot facts have no source cutoff.");
      }

      // A single FULL build ID is necessary but not sufficient: a source upload
      // may have committed after that build. Refuse to freeze until every real
      // Tinder source with usage has current all-time facts and registry
      // descriptors. The exclusive provider transaction lock prevents source
      // writers or fact builders from changing this cutoff during the check.
      const freshness = await tx.execute<CountRow>(sql`
      WITH latest_files AS (
        SELECT source_file.user_id, max(source_file.created_at) AS created_at
        FROM original_anonymized_file source_file
        WHERE source_file.data_provider = 'TINDER'
        GROUP BY source_file.user_id
      )
      SELECT count(*)::int AS count
      FROM tinder_profile source_profile
      LEFT JOIN "user" app_user ON app_user.id = source_profile.user_id
      LEFT JOIN swipe_rank_profile registry
        ON registry.data_provider = 'TINDER'
       AND registry.provider_profile_id = source_profile.tinder_id
      LEFT JOIN swipe_rank_period_fact all_time_fact
        ON all_time_fact.profile_id = registry.id
       AND all_time_fact.metric_version = ${metricVersion}
       AND all_time_fact.period_kind = 'ALL_TIME'
       AND all_time_fact.period_start = date '0001-01-01'
      LEFT JOIN latest_files ON latest_files.user_id = source_profile.user_id
      WHERE source_profile.computed = false
        AND EXISTS (
          SELECT 1
          FROM tinder_usage usage
          WHERE usage.tinder_profile_id = source_profile.tinder_id
        )
        AND (
          registry.id IS NULL
          OR all_time_fact.id IS NULL
          OR source_profile.updated_at > all_time_fact.source_profile_updated_at
          OR (
            latest_files.created_at IS NOT NULL
            AND (
              all_time_fact.source_file_created_at IS NULL
              OR latest_files.created_at > all_time_fact.source_file_created_at
            )
          )
          OR registry.user_id IS DISTINCT FROM source_profile.user_id
          OR registry.gender IS DISTINCT FROM source_profile.gender
          OR registry.interested_in IS DISTINCT FROM source_profile.interested_in
          OR registry.city IS DISTINCT FROM coalesce(app_user.city, source_profile.city)
          OR registry.region IS DISTINCT FROM coalesce(app_user.region, source_profile.region)
          OR registry.country IS DISTINCT FROM coalesce(app_user.country, source_profile.country)
        )
    `);
      const staleSourceProfiles = Number(freshness.rows[0]?.count ?? 0);
      if (staleSourceProfiles > 0) {
        throw new Error(
          `Snapshot source parity found ${staleSourceProfiles} missing or stale Tinder profile(s). Run reconciliation and then a full SwipeRank backfill.`,
        );
      }

      const existing = await tx.query.swipeRankSnapshotTable.findFirst({
        where: and(
          eq(swipeRankSnapshotTable.dataProvider, "TINDER"),
          eq(swipeRankSnapshotTable.metricKey, "MATCH_YIELD"),
          eq(swipeRankSnapshotTable.metricVersion, metricVersion),
          eq(swipeRankSnapshotTable.eligibilityVersion, eligibilityVersion),
          eq(swipeRankSnapshotTable.periodKind, input.period.kind),
          eq(swipeRankSnapshotTable.periodStart, input.period.start),
          eq(swipeRankSnapshotTable.cohortHash, cohortHash),
          eq(swipeRankSnapshotTable.buildId, source.build_id),
        ),
      });

      if (existing) {
        const shouldPublish = input.publish && existing.status === "DRAFT";
        const nextExisting = shouldPublish
          ? (
              await tx
                .update(swipeRankSnapshotTable)
                .set({
                  status: "PUBLISHED",
                  publishedAt: new Date(),
                })
                .where(eq(swipeRankSnapshotTable.id, existing.id))
                .returning()
            )[0]
          : existing;
        if (!nextExisting) {
          throw new Error("Failed to update the existing SwipeRank snapshot.");
        }
        const entryResult = await tx.execute<CountRow>(sql`
        SELECT count(*)::int AS count
        FROM swipe_rank_entry
        WHERE snapshot_id = ${existing.id}
      `);
        return {
          snapshotId: nextExisting.id,
          buildId: nextExisting.buildId,
          metricVersion: nextExisting.metricVersion,
          eligibilityVersion: nextExisting.eligibilityVersion,
          period: input.period,
          fieldSize: nextExisting.fieldSize,
          entryCount: Number(entryResult.rows[0]?.count ?? 0),
          status: nextExisting.status,
          sourceCutoff: iso(nextExisting.sourceCutoff),
          created: false,
        };
      }

      const snapshotId = createId("srs");
      const now = new Date();
      await tx.insert(swipeRankSnapshotTable).values({
        id: snapshotId,
        dataProvider: "TINDER",
        buildId: source.build_id,
        metricKey: "MATCH_YIELD",
        metricVersion,
        eligibilityVersion,
        periodKind: input.period.kind,
        periodStart: input.period.start,
        periodEnd: input.period.end,
        cohortSpec,
        cohortHash,
        minimumRateDenominator: eligibility.minimumRateDenominator,
        minimumActiveDays: eligibility.minimumActiveDays,
        fieldSize: Number(source.field_size),
        status,
        sourceCutoff: new Date(source.source_cutoff),
        createdAt: now,
        publishedAt: input.publish ? now : null,
      });

      await tx.execute(sql`
      WITH eligible AS (
        SELECT fact.*
        FROM swipe_rank_period_fact fact
        JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
        WHERE profile.data_provider = 'TINDER'
          AND profile.is_synthetic = false
          AND profile.is_swipe_rank_excluded = false
          AND fact.build_id = ${source.build_id}
          AND fact.metric_version = ${metricVersion}
          AND fact.period_kind = ${input.period.kind}
          AND fact.period_start = ${input.period.start}::date
          AND fact.period_end = ${input.period.end}::date
          AND fact.match_rate_denominator >= ${eligibility.minimumRateDenominator}
          AND fact.active_days >= ${eligibility.minimumActiveDays}
          AND fact.match_rate IS NOT NULL
      ), ranked AS (
        SELECT
          eligible.*,
          rank() OVER (ORDER BY match_rate DESC) AS rank,
          count(*) OVER (PARTITION BY match_rate) AS tie_count,
          count(*) OVER () AS field_size
        FROM eligible
      )
      INSERT INTO swipe_rank_entry (
        id,
        snapshot_id,
        profile_id,
        rank,
        tie_count,
        field_size,
        percentile,
        top_share,
        metric_numerator,
        metric_denominator,
        metric_value,
        quality_flags,
        created_at
      )
      SELECT
        'sre_' || replace(gen_random_uuid()::text, '-', ''),
        ${snapshotId},
        ranked.profile_id,
        ranked.rank::int,
        ranked.tie_count::int,
        ranked.field_size::int,
        ((ranked.field_size - ranked.rank + 1)::double precision /
          ranked.field_size) * 100,
        (ranked.rank::double precision / ranked.field_size) * 100,
        ranked.match_rate_numerator,
        ranked.match_rate_denominator,
        ranked.match_rate,
        ranked.quality_flags,
        ${now}
      FROM ranked
    `);

      const entryResult = await tx.execute<CountRow>(sql`
      SELECT count(*)::int AS count
      FROM swipe_rank_entry
      WHERE snapshot_id = ${snapshotId}
    `);
      const entryCount = Number(entryResult.rows[0]?.count ?? 0);
      if (entryCount !== Number(source.field_size)) {
        throw new Error(
          `SwipeRank snapshot entry count ${entryCount} did not match field size ${source.field_size}.`,
        );
      }

      return {
        snapshotId,
        buildId: source.build_id,
        metricVersion,
        eligibilityVersion,
        period: input.period,
        fieldSize: Number(source.field_size),
        entryCount,
        status,
        sourceCutoff: iso(source.source_cutoff),
        created: true,
      };
    },
  );
}
