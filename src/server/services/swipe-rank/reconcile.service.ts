import { sql } from "drizzle-orm";

import { db, withAdvisoryLockTransaction } from "@/server/db";

import { SWIPE_RANK_METRIC_VERSION, swipeRankBuildLockName } from "./constants";
import {
  recomputeTinderSwipeRankFacts,
  type SwipeRankBuildSummary,
} from "./recompute.service";

interface CountRow extends Record<string, unknown> {
  count: number | string;
}

interface CandidateRow extends Record<string, unknown> {
  tinder_id: string;
}

export interface ReconcileTinderSwipeRankSummary {
  orphanProfilesPurged: number;
  candidateProfiles: number;
  build: SwipeRankBuildSummary | null;
}

export function assertSwipeRankReconcileLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new Error(
      "SwipeRank reconciliation limit must be between 1 and 500.",
    );
  }
  return limit;
}

async function purgeOrphanTinderSwipeRankProfiles(): Promise<number> {
  return withAdvisoryLockTransaction(
    swipeRankBuildLockName("TINDER"),
    async (tx) => {
    const result = await tx.execute<CountRow>(sql`
      WITH deleted AS (
        DELETE FROM swipe_rank_profile registry
        WHERE registry.data_provider = 'TINDER'
          AND NOT EXISTS (
            SELECT 1
            FROM tinder_profile source_profile
            WHERE source_profile.tinder_id = registry.provider_profile_id
              AND source_profile.computed = false
          )
        RETURNING 1
      )
      SELECT count(*)::int AS count FROM deleted
    `);
      const count = Number(result.rows[0]?.count ?? 0);
      if (count > 0) {
        await tx.execute(sql`
          INSERT INTO swipe_rank_source_mutation (data_provider, created_at)
          VALUES ('TINDER', now())
        `);
      }
      return count;
    },
  );
}

/**
 * Find source profiles whose live facts or descriptor registry need repair.
 *
 * This deliberately avoids a 5.8M-row fingerprint scan. Normal upload paths
 * advance the source profile or Tinder-file watermark; raw parity validation
 * remains the independent detector for exceptional source drift.
 */
export async function listTinderSwipeRankReconcileCandidates(
  limit = 100,
  metricVersion = SWIPE_RANK_METRIC_VERSION,
): Promise<string[]> {
  assertSwipeRankReconcileLimit(limit);
  const result = await db.execute<CandidateRow>(sql`
    WITH latest_files AS (
      SELECT source_file.user_id, max(source_file.created_at) AS created_at
      FROM original_anonymized_file source_file
      WHERE source_file.data_provider = 'TINDER'
      GROUP BY source_file.user_id
    )
    SELECT source_profile.tinder_id
    FROM tinder_profile source_profile
    LEFT JOIN "user" app_user ON app_user.id = source_profile.user_id
    LEFT JOIN swipe_rank_profile registry
      ON registry.data_provider = 'TINDER'
     AND registry.provider_profile_id = source_profile.tinder_id
    LEFT JOIN swipe_rank_period_fact fact
      ON fact.profile_id = registry.id
     AND fact.metric_version = ${metricVersion}
     AND fact.period_kind = 'ALL_TIME'
     AND fact.period_start = date '0001-01-01'
    LEFT JOIN latest_files ON latest_files.user_id = source_profile.user_id
    WHERE source_profile.computed = false
      AND EXISTS (
        SELECT 1
        FROM tinder_usage usage
        WHERE usage.tinder_profile_id = source_profile.tinder_id
      )
      AND (
        registry.id IS NULL
        OR fact.id IS NULL
        OR source_profile.updated_at > fact.source_profile_updated_at
        OR (
          latest_files.created_at IS NOT NULL
          AND (
            fact.source_file_created_at IS NULL
            OR latest_files.created_at > fact.source_file_created_at
          )
        )
        OR registry.user_id IS DISTINCT FROM source_profile.user_id
        OR registry.gender IS DISTINCT FROM source_profile.gender
        OR registry.interested_in IS DISTINCT FROM source_profile.interested_in
        OR registry.city IS DISTINCT FROM coalesce(app_user.city, source_profile.city)
        OR registry.region IS DISTINCT FROM coalesce(app_user.region, source_profile.region)
        OR registry.country IS DISTINCT FROM coalesce(app_user.country, source_profile.country)
      )
    ORDER BY fact.computed_at NULLS FIRST, source_profile.updated_at, source_profile.tinder_id
    LIMIT ${limit}
  `);
  return result.rows.map((row) => row.tinder_id);
}

/** Durable recovery companion to the request-scoped refresh path. */
export async function reconcileTinderSwipeRankFacts(
  options: {
    limit?: number;
    metricVersion?: string;
  } = {},
): Promise<ReconcileTinderSwipeRankSummary> {
  const limit = assertSwipeRankReconcileLimit(options.limit ?? 100);
  const metricVersion = options.metricVersion ?? SWIPE_RANK_METRIC_VERSION;
  const orphanProfilesPurged = await purgeOrphanTinderSwipeRankProfiles();
  const profileIds = await listTinderSwipeRankReconcileCandidates(
    limit,
    metricVersion,
  );

  return {
    orphanProfilesPurged,
    candidateProfiles: profileIds.length,
    build:
      profileIds.length > 0
        ? await recomputeTinderSwipeRankFacts({ profileIds, metricVersion })
        : null,
  };
}
