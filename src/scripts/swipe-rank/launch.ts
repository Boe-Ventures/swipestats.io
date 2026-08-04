/**
 * Deploy-time gate: build every Tinder fact, then refuse success unless the
 * independent raw/month/rollup/descriptor/staleness validation is clean.
 */

import { SWIPE_RANK_METRIC_VERSION } from "@/server/services/swipe-rank/constants";
import { recomputeTinderSwipeRankFacts } from "@/server/services/swipe-rank/recompute.service";
import {
  activateTinderSwipeRankBuild,
  isSwipeRankReady,
} from "@/server/services/swipe-rank/readiness";
import { validateTinderSwipeRankFacts } from "@/server/services/swipe-rank/validate.service";

function valueFor(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  if (!process.argv.slice(2).includes("--confirm-write")) {
    throw new Error(
      "Refusing to launch SwipeRank without the explicit --confirm-write flag.",
    );
  }

  const requestedMetricVersion = valueFor("--metric-version");
  if (
    requestedMetricVersion &&
    requestedMetricVersion !== SWIPE_RANK_METRIC_VERSION
  ) {
    throw new Error(
      `SwipeRank launch can activate only the product metric ${SWIPE_RANK_METRIC_VERSION}.`,
    );
  }
  const metricVersion = SWIPE_RANK_METRIC_VERSION;
  const build = await recomputeTinderSwipeRankFacts({ metricVersion });
  if (build.scope !== "FULL") {
    throw new Error("SwipeRank launch requires a FULL fact build.");
  }

  const validation = await validateTinderSwipeRankFacts(metricVersion);
  if (!validation.valid) {
    throw new Error(
      `SwipeRank launch validation failed for build ${build.buildId}.`,
    );
  }
  const activatedAt = await activateTinderSwipeRankBuild(build.buildId);
  if (!(await isSwipeRankReady(build.metricVersion))) {
    throw new Error(
      `SwipeRank build ${build.buildId} completed but readiness is false.`,
    );
  }

  console.log(
    JSON.stringify(
      {
        ready: true,
        activatedAt: activatedAt.toISOString(),
        build,
        validation,
      },
      null,
      2,
    ),
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
