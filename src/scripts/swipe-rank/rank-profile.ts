import {
  getDefaultEligibility,
  getObservedPeriods,
  parseSwipeRankPeriod,
  type SwipeRankPeriod,
} from "./periods";
import {
  computeSwipeRanks,
  getObservedDateRange,
  type SwipeRankResult,
} from "./queries";

const args = process.argv.slice(2);

function getFlagValues(flag: string): string[] {
  return args.flatMap((arg, index) =>
    arg === flag && args[index + 1] ? [args[index + 1]!] : [],
  );
}

function getFlagValue(flag: string): string | null {
  return getFlagValues(flag)[0] ?? null;
}

function getPositiveIntegerFlag(flag: string): number | null {
  const raw = getFlagValue(flag);
  if (raw === null) return null;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer.`);
  }

  return parsed;
}

function printHelp(): void {
  console.log(`
Compute an exploratory SwipeRank directly from Tinder usage data.

Usage:
  bun run swipe-rank:profile -- --tinder-id <id> [options]

Options:
  --period <period>          Repeatable: YYYY-MM, YYYY-Q1..Q4, YYYY, all-time
  --min-likes <number>       Override the period's default likes floor
  --min-active-days <number> Override the period's default active-day floor
  --json                     Print machine-readable JSON
  --help                     Show this help

With no --period, the script ranks the profile in its latest observed month,
quarter, year, and all-time period.
`);
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatRate(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(2)}%`;
}

function formatPercent(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

function formatRank(
  rank: number | null,
  fieldSize: number,
  topShare: number | null,
): string {
  if (rank === null) return `not ranked (${formatNumber(fieldSize)} eligible)`;
  return `#${formatNumber(rank)} / ${formatNumber(fieldSize)} (top ${formatPercent(topShare)})`;
}

function printHumanResults(results: SwipeRankResult[]): void {
  const first = results[0];
  if (!first) return;

  console.log("\nSwipeRank prototype v1");
  console.log(`Profile: ${first.profile.tinderId}`);
  console.log(
    `Identity: ${first.profile.gender}, interested in ${first.profile.interestedIn}, ` +
      `age ${first.profile.ageAtLastUsage}, ${first.profile.city ?? "unknown city"}, ` +
      `${first.profile.country ?? "unknown country"}`,
  );
  console.log(`As of: ${first.asOf}`);
  console.log(
    "Metric: observed matches / swipe likes. This is a flow ratio and can exceed 100%.",
  );

  for (const result of results) {
    console.log(`\n${result.period.label}`);
    console.log(
      `  Activity: ${formatNumber(result.stats.likes)} likes, ` +
        `${formatNumber(result.stats.matches)} matches, ` +
        `${formatNumber(result.stats.activeDays)} active days`,
    );
    console.log(`  Match rate: ${formatRate(result.stats.matchRate)}`);
    console.log(
      `  Eligibility: ${result.eligible ? "eligible" : "not eligible"} ` +
        `(minimum ${formatNumber(result.eligibility.minLikes)} likes and ` +
        `${formatNumber(result.eligibility.minActiveDays)} active days)`,
    );
    console.log(
      `  Global: ${formatRank(
        result.global.rank,
        result.global.fieldSize,
        result.global.topShare,
      )}`,
    );
    console.log(
      `  Peer (${result.peer.definition}): ${formatRank(
        result.peer.rank,
        result.peer.fieldSize,
        result.peer.topShare,
      )}`,
    );
  }

  console.log(
    "\nProvisional: rerunning against newer uploads can change both position and field size.",
  );
}

async function main(): Promise<void> {
  if (args.includes("--help")) {
    printHelp();
    return;
  }

  const tinderId = getFlagValue("--tinder-id");
  if (!tinderId) {
    throw new Error("Missing required --tinder-id.");
  }

  const requestedPeriodInputs = getFlagValues("--period");
  let periods: SwipeRankPeriod[];

  if (requestedPeriodInputs.length > 0) {
    periods = requestedPeriodInputs.map(parseSwipeRankPeriod);
  } else {
    const range = await getObservedDateRange(tinderId);
    periods = getObservedPeriods(range.lastObservedDate);
  }

  const minLikesOverride = getPositiveIntegerFlag("--min-likes");
  const minActiveDaysOverride = getPositiveIntegerFlag("--min-active-days");
  const requests = periods.map((period) => {
    const defaults = getDefaultEligibility(period.kind);
    return {
      period,
      eligibility: {
        minLikes: minLikesOverride ?? defaults.minLikes,
        minActiveDays: minActiveDaysOverride ?? defaults.minActiveDays,
      },
    };
  });

  const results = await computeSwipeRanks(tinderId, requests);

  if (args.includes("--json")) {
    console.log(
      JSON.stringify(
        {
          metricVersion: "swipe-rank-match-rate-v1",
          provisional: true,
          results,
        },
        null,
        2,
      ),
    );
  } else {
    printHumanResults(results);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
