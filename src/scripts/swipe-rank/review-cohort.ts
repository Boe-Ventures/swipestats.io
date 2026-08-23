/** Run bounded Sonnet trust reviews for the top entries in one closed month. */

import { reviewSwipeRankCohort } from "@/server/services/swipe-rank/ai-review.service";

function valueFor(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function monthPeriod(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Pass --month in YYYY-MM format.");
  }
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error(`Invalid month: ${month}`);
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  return {
    kind: "MONTH" as const,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function main() {
  if (!hasFlag("--confirm-write")) {
    throw new Error(
      "This command stores AI reviews. Re-run with --confirm-write after checking DATABASE_URL.",
    );
  }
  const month = valueFor("--month");
  if (!month) throw new Error("Pass --month YYYY-MM.");
  const limit = Number(valueFor("--limit") ?? "50");
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) {
    throw new Error("--limit must be an integer between 1 and 250.");
  }
  const concurrency = Number(valueFor("--concurrency") ?? "3");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error("--concurrency must be an integer between 1 and 8.");
  }
  const actor = valueFor("--actor")?.trim() || "cli:swipe-rank-review";
  const force = hasFlag("--force");
  const period = monthPeriod(month);
  console.log(
    JSON.stringify({
      event: "review_started",
      period,
      profiles: limit,
    }),
  );
  const result = await reviewSwipeRankCohort({
    period,
    limit,
    concurrency,
    actor,
    force,
    onCompleted: (row) =>
      console.log(JSON.stringify({ event: "review_completed", ...row })),
    onFailed: (row) =>
      console.error(JSON.stringify({ event: "review_failed", ...row })),
  });
  if (result.requested === 0) {
    throw new Error(`No published SwipeRank entries found for ${month}.`);
  }
  console.log(
    JSON.stringify(
      {
        event: "review_finished",
        period,
        ...result,
      },
      null,
      2,
    ),
  );
  if (result.errors.length > 0) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
