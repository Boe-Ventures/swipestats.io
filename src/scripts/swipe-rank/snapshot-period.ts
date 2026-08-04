/** Freeze an immutable global SwipeRank edition from one coherent full build. */

import {
  SWIPE_RANK_ALL_TIME_END,
  SWIPE_RANK_ALL_TIME_START,
} from "@/server/services/swipe-rank/constants";
import { createGlobalSwipeRankSnapshot } from "@/server/services/swipe-rank/snapshot.service";

import { parseSwipeRankPeriod } from "./periods";

function valueFor(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(flag: string) {
  return process.argv.slice(2).includes(flag);
}

async function main() {
  if (!hasFlag("--confirm-write")) {
    throw new Error(
      "Refusing to create a snapshot without the explicit --confirm-write flag.",
    );
  }

  const parsed = parseSwipeRankPeriod(valueFor("--period") ?? "all-time");
  const kind =
    parsed.kind === "month"
      ? "MONTH"
      : parsed.kind === "quarter"
        ? "QUARTER"
        : parsed.kind === "year"
          ? "YEAR"
          : "ALL_TIME";
  const period = {
    kind,
    start: parsed.startDate ?? SWIPE_RANK_ALL_TIME_START,
    end: parsed.endDate ?? SWIPE_RANK_ALL_TIME_END,
  } as const;

  const summary = await createGlobalSwipeRankSnapshot({
    period,
    publish: hasFlag("--publish"),
    metricVersion: valueFor("--metric-version"),
  });
  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
