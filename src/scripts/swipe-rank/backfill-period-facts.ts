/**
 * Write-side backfill for the versioned SwipeRank period fact layer.
 *
 * This script refuses to write without --confirm-write. Point DATABASE_URL at
 * the intended isolated branch before rehearsing a full build.
 *
 * Examples:
 *   bun run src/scripts/swipe-rank/backfill-period-facts.ts --confirm-write
 *   bun run src/scripts/swipe-rank/backfill-period-facts.ts \
 *     --confirm-write --profile-id <tinder-id>
 */

import { recomputeTinderSwipeRankFacts } from "@/server/services/swipe-rank/recompute.service";

function valuesFor(flag: string): string[] {
  const args = process.argv.slice(2);
  return args.flatMap((arg, index) =>
    arg === flag && args[index + 1] ? [args[index + 1]!] : [],
  );
}

function valueFor(flag: string): string | undefined {
  return valuesFor(flag)[0];
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--confirm-write")) {
    throw new Error(
      "Refusing to mutate the database without the explicit --confirm-write flag.",
    );
  }

  const profileIds = valuesFor("--profile-id");
  const metricVersion = valueFor("--metric-version");
  const summary = await recomputeTinderSwipeRankFacts({
    profileIds: profileIds.length > 0 ? profileIds : undefined,
    metricVersion,
  });

  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
