import { and, eq } from "drizzle-orm";

import { db, withAdvisoryLockTransaction } from "@/server/db";
import { swipeRankSnapshotTable } from "@/server/db/schema";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import { invalidatePublicSwipeRankCache } from "./public-cache";
import {
  swipeRankSeasonsToPublish,
  type ClosedSwipeRankPeriodBounds,
} from "./periods";
import { activateTinderSwipeRankBuild } from "./readiness";
import { recomputeTinderSwipeRankFacts } from "./recompute.service";
import { createGlobalSwipeRankSnapshot } from "./snapshot.service";
import { validateTinderSwipeRankFacts } from "./validate.service";

const SWIPE_RANK_PUBLICATION_LOCK = "swipe-rank-publication:TINDER";

interface PublishedSnapshot {
  id: string;
  buildId: string;
  publishedAt: Date | null;
}

export interface SwipeRankPublicationDependencies {
  withLock: <T>(callback: () => Promise<T>) => Promise<T>;
  findPublishedSnapshot: (
    period: ClosedSwipeRankPeriodBounds,
  ) => Promise<PublishedSnapshot | undefined>;
  recompute: typeof recomputeTinderSwipeRankFacts;
  validate: typeof validateTinderSwipeRankFacts;
  activate: typeof activateTinderSwipeRankBuild;
  createSnapshot: typeof createGlobalSwipeRankSnapshot;
  invalidatePublicCache: typeof invalidatePublicSwipeRankCache;
}

const productionDependencies: SwipeRankPublicationDependencies = {
  withLock: (callback) =>
    withAdvisoryLockTransaction(SWIPE_RANK_PUBLICATION_LOCK, callback),
  findPublishedSnapshot: (period) =>
    db.query.swipeRankSnapshotTable.findFirst({
      where: and(
        eq(swipeRankSnapshotTable.dataProvider, "TINDER"),
        eq(swipeRankSnapshotTable.metricKey, "MATCH_YIELD"),
        eq(swipeRankSnapshotTable.metricVersion, SWIPE_RANK_METRIC_VERSION),
        eq(swipeRankSnapshotTable.periodKind, period.kind),
        eq(swipeRankSnapshotTable.periodStart, period.start),
        eq(swipeRankSnapshotTable.status, "PUBLISHED"),
      ),
    }),
  recompute: recomputeTinderSwipeRankFacts,
  validate: validateTinderSwipeRankFacts,
  activate: activateTinderSwipeRankBuild,
  createSnapshot: createGlobalSwipeRankSnapshot,
  invalidatePublicCache: invalidatePublicSwipeRankCache,
};

/**
 * One monthly invocation publishes every season that closed at the current
 * UTC month boundary: prior month, plus prior quarter and year when due.
 */
export async function publishClosedTinderSwipeRankSeasonsWithDependencies(
  now: Date,
  dependencies: SwipeRankPublicationDependencies,
) {
  const periods = swipeRankSeasonsToPublish(now);
  return dependencies.withLock(async () => {
    const existing = await Promise.all(
      periods.map(async (period) => ({
        period,
        snapshot: await dependencies.findPublishedSnapshot(period),
      })),
    );
    const missing = existing.filter((item) => !item.snapshot);
    if (missing.length === 0) {
      return {
        alreadyPublished: true,
        periods,
        published: existing.map(({ period, snapshot }) => ({
          period,
          snapshotId: snapshot!.id,
          buildId: snapshot!.buildId,
          publishedAt: snapshot!.publishedAt,
        })),
      };
    }

    const closedBefore = periods[0]!.end;
    const build = await dependencies.recompute({
      metricVersion: SWIPE_RANK_METRIC_VERSION,
      closedBefore,
    });
    const validation = await dependencies.validate(
      build.metricVersion,
      closedBefore,
    );
    if (!validation.valid) {
      throw new Error(
        `SwipeRank closed-season validation failed for build ${build.buildId}.`,
      );
    }

    const activatedAt = await dependencies.activate(build.buildId);
    const snapshots = [];
    for (const { period } of missing) {
      snapshots.push(
        await dependencies.createSnapshot({
          period,
          publish: true,
          metricVersion: build.metricVersion,
        }),
      );
    }
    dependencies.invalidatePublicCache();
    return {
      alreadyPublished: false,
      periods,
      activatedAt,
      build,
      validation,
      snapshots,
    };
  });
}

export async function publishClosedTinderSwipeRankSeasons(now = new Date()) {
  return publishClosedTinderSwipeRankSeasonsWithDependencies(
    now,
    productionDependencies,
  );
}
