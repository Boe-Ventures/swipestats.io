/** Manually run the same idempotent closed-month publisher as the cron. */

import { publishClosedTinderSwipeRankSeasons } from "@/server/services/swipe-rank/publication.service";

async function main() {
  if (!process.argv.slice(2).includes("--confirm-write")) {
    throw new Error(
      "Refusing to publish SwipeRank without the explicit --confirm-write flag.",
    );
  }
  const result = await publishClosedTinderSwipeRankSeasons();
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
