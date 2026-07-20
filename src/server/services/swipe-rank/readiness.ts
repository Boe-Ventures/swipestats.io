import { eq, sql, type SQL } from "drizzle-orm";

import { db, withAdvisoryLockTransaction } from "@/server/db";
import { swipeRankBuildTable } from "@/server/db/schema";

import { SWIPE_RANK_METRIC_VERSION, swipeRankBuildLockName } from "./constants";

interface ActivationStateRow extends Record<string, unknown> {
  build_id: string;
  status: "RUNNING" | "COMPLETE" | "FAILED";
  scope: "FULL" | "PROFILE";
  metric_version: string;
  latest_complete_full_build_id: string | null;
  foreign_fact_count: number | string;
  source_generation: number | string | null;
  current_generation: number | string;
}

export interface TinderSwipeRankActivationState {
  status: "RUNNING" | "COMPLETE" | "FAILED";
  scope: "FULL" | "PROFILE";
  latestCompleteFullBuildId: string | null;
  foreignFactCount: number;
  sourceGeneration: number | null;
  currentGeneration: number;
}

/** Pure activation contract, shared with focused tests. */
export function assertTinderSwipeRankBuildCanActivate(
  buildId: string,
  state: TinderSwipeRankActivationState,
): void {
  if (state.status !== "COMPLETE" || state.scope !== "FULL") {
    throw new Error(
      `SwipeRank build ${buildId} is not a completed FULL build.`,
    );
  }
  if (state.latestCompleteFullBuildId !== buildId) {
    throw new Error(
      `SwipeRank build ${buildId} is no longer the latest completed FULL build.`,
    );
  }
  if (state.foreignFactCount !== 0) {
    throw new Error(
      `SwipeRank facts changed after build ${buildId} validation.`,
    );
  }
  if (
    state.sourceGeneration === null ||
    state.sourceGeneration !== state.currentGeneration
  ) {
    throw new Error(
      `Tinder source data changed after build ${buildId} validation.`,
    );
  }
}

/**
 * Product reads are enabled only when the newest completed FULL build was
 * explicitly activated after validation. A newly committed full replacement
 * therefore makes reads dark until launch validation succeeds; an older
 * activation cannot accidentally bless newer facts.
 */
export function completedFullSwipeRankBuildSql(
  dataProvider: "TINDER",
  metricVersion = SWIPE_RANK_METRIC_VERSION,
): SQL {
  return sql`coalesce((
    SELECT readiness_build.activated_at IS NOT NULL
    FROM swipe_rank_build readiness_build
    WHERE readiness_build.data_provider = ${dataProvider}
      AND readiness_build.metric_version = ${metricVersion}
      AND readiness_build.scope = 'FULL'
      AND readiness_build.status = 'COMPLETE'
    ORDER BY
      readiness_build.completed_at DESC,
      readiness_build.started_at DESC,
      readiness_build.id DESC
    LIMIT 1
  ), false)`;
}

export async function isSwipeRankReady(
  metricVersion = SWIPE_RANK_METRIC_VERSION,
): Promise<boolean> {
  const result = await db.execute<{ ready: boolean }>(sql`
    SELECT ${completedFullSwipeRankBuildSql("TINDER", metricVersion)} AS ready
  `);
  return result.rows[0]?.ready ?? false;
}

/**
 * Activate one independently validated FULL build.
 *
 * Validation runs outside this transaction because it deliberately executes
 * several independent parity queries. Before activation we reacquire the
 * provider-wide exclusive lock and prove that neither a source mutation nor a
 * scoped/full fact replacement happened during that validation window.
 */
export async function activateTinderSwipeRankBuild(
  buildId: string,
): Promise<Date> {
  return withAdvisoryLockTransaction(
    swipeRankBuildLockName("TINDER"),
    async (tx) => {
      const result = await tx.execute<ActivationStateRow>(sql`
        SELECT
          candidate.id AS build_id,
          candidate.status,
          candidate.scope,
          candidate.metric_version,
          (
            SELECT latest.id
            FROM swipe_rank_build latest
            WHERE latest.data_provider = 'TINDER'
              AND latest.metric_version = candidate.metric_version
              AND latest.scope = 'FULL'
              AND latest.status = 'COMPLETE'
            ORDER BY
              latest.completed_at DESC,
              latest.started_at DESC,
              latest.id DESC
            LIMIT 1
          ) AS latest_complete_full_build_id,
          (
            SELECT count(*)
            FROM swipe_rank_period_fact fact
            JOIN swipe_rank_profile profile ON profile.id = fact.profile_id
            WHERE profile.data_provider = 'TINDER'
              AND fact.metric_version = candidate.metric_version
              AND fact.build_id <> candidate.id
          )::bigint AS foreign_fact_count,
          (candidate.source_watermark ->> 'sourceGeneration')::bigint
            AS source_generation,
          coalesce((
            SELECT max(mutation.id)
            FROM swipe_rank_source_mutation mutation
            WHERE mutation.data_provider = 'TINDER'
          ), 0)::bigint AS current_generation
        FROM swipe_rank_build candidate
        WHERE candidate.id = ${buildId}
          AND candidate.data_provider = 'TINDER'
      `);
      const state = result.rows[0];
      if (!state) {
        throw new Error(`SwipeRank build ${buildId} does not exist.`);
      }
      assertTinderSwipeRankBuildCanActivate(buildId, {
        status: state.status,
        scope: state.scope,
        latestCompleteFullBuildId: state.latest_complete_full_build_id,
        foreignFactCount: Number(state.foreign_fact_count),
        sourceGeneration:
          state.source_generation === null
            ? null
            : Number(state.source_generation),
        currentGeneration: Number(state.current_generation),
      });

      const activatedAt = new Date();
      const activated = await tx
        .update(swipeRankBuildTable)
        .set({ activatedAt })
        .where(eq(swipeRankBuildTable.id, buildId))
        .returning({ activatedAt: swipeRankBuildTable.activatedAt });
      const value = activated[0]?.activatedAt;
      if (!value) {
        throw new Error(`SwipeRank build ${buildId} could not be activated.`);
      }
      return value;
    },
  );
}
