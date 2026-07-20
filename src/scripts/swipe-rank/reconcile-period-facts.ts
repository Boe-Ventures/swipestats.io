/**
 * Repair missing/stale Tinder SwipeRank facts in a bounded batch.
 *
 * This command writes only with --confirm-write. It is the manual counterpart
 * to the scheduled recovery route and complements immediate upload refreshes.
 */
import { reconcileTinderSwipeRankFacts } from "@/server/services/swipe-rank/reconcile.service";

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  if (!process.argv.includes("--confirm-write")) {
    throw new Error(
      "Refusing to reconcile without --confirm-write. Point DATABASE_URL at the intended branch first.",
    );
  }
  const rawLimit = flagValue("--limit");
  const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  const summary = await reconcileTinderSwipeRankFacts({ limit });
  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
