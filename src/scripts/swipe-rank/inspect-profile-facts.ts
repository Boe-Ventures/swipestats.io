/** Inspect the exact owner-facing SwipeRank response from versioned facts. */

import { getTinderSwipeRankSummary } from "@/server/services/swipe-rank/product.service";

function valueFor(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const tinderId = valueFor("--tinder-id");
  if (!tinderId) {
    throw new Error("Pass --tinder-id <id> to inspect versioned facts.");
  }

  const result = await getTinderSwipeRankSummary(tinderId);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
