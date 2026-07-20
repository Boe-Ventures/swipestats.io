/** Read-only parity checks for a completed SwipeRank fact backfill. */

import { validateTinderSwipeRankFacts } from "@/server/services/swipe-rank/validate.service";

function valueFor(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const result = await validateTinderSwipeRankFacts(
    valueFor("--metric-version"),
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
