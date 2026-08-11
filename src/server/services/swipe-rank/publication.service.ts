import { and, eq } from "drizzle-orm";

import { db, withAdvisoryLockTransaction } from "@/server/db";
import { swipeRankSnapshotTable } from "@/server/db/schema";

import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import { invalidatePublicSwipeRankCache } from "./public-cache";
import { previousCalendarMonth } from "./periods";
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
    period: ReturnType<typeof previousCalendarMonth>,
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
        eq(swipeRankSnapshotTable.periodKind, "MONTH"),
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

export async function publishPreviousTinderSwipeRankMonthWithDependencies(
  now: Date,
  dependencies: SwipeRankPublicationDependencies,
) {
  const period = previousCalendarMonth(now);

  return dependencies.withLock(async () => {
    const existing = await dependencies.findPublishedSnapshot(period);
    if (existing) {
      return {
        alreadyPublished: true,
        period,
        snapshotId: existing.id,
        buildId: existing.buildId,
        publishedAt: existing.publishedAt,
      };
    }

    const build = await dependencies.recompute({
      metricVersion: SWIPE_RANK_METRIC_VERSION,
      closedBefore: period.end,
    });
    const validation = await dependencies.validate(
      build.metricVersion,
      period.end,
    );
    if (!validation.valid) {
      throw new Error(
        `SwipeRank monthly validation failed for build ${build.buildId}.`,
      );
    }

    const activatedAt = await dependencies.activate(build.buildId);
    const snapshot = await dependencies.createSnapshot({
      period,
      publish: true,
      metricVersion: build.metricVersion,
    });
    dependencies.invalidatePublicCache();

    return {
      alreadyPublished: false,
      period,
      activatedAt,
      build,
      validation,
      snapshot,
    };
  });
}

export async function publishPreviousTinderSwipeRankMonth(now = new Date()) {
  return publishPreviousTinderSwipeRankMonthWithDependencies(
    now,
    productionDependencies,
  );
}
