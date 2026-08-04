import { getDefaultEligibility, type SwipeRankPeriodKind } from "./periods";
import { surveySeasons } from "./queries";

const args = process.argv.slice(2);

function getFlagValue(flag: string): string | null {
  const index = args.indexOf(flag);
  return index >= 0 ? (args[index + 1] ?? null) : null;
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

function parseKind(): Exclude<SwipeRankPeriodKind, "all-time"> {
  const value = getFlagValue("--period-type") ?? "month";
  if (value !== "month" && value !== "quarter" && value !== "year") {
    throw new Error("--period-type must be month, quarter, or year.");
  }
  return value;
}

function printHelp(): void {
  console.log(`
Survey how many Tinder profiles form a viable SwipeRank field in each season.

Usage:
  bun run swipe-rank:survey -- [options]

Options:
  --period-type <type>       month (default), quarter, or year
  --min-likes <number>       Override the period's default likes floor
  --min-active-days <number> Override the period's default active-day floor
  --last <number>            Show only the most recent N seasons
  --json                     Print machine-readable JSON
  --help                     Show this help
`);
}

function formatRate(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  if (args.includes("--help")) {
    printHelp();
    return;
  }

  const kind = parseKind();
  const defaults = getDefaultEligibility(kind);
  const eligibility = {
    minLikes: getPositiveIntegerFlag("--min-likes") ?? defaults.minLikes,
    minActiveDays:
      getPositiveIntegerFlag("--min-active-days") ?? defaults.minActiveDays,
  };
  const last = getPositiveIntegerFlag("--last");
  const allRows = await surveySeasons(kind, eligibility);
  const rows = last === null ? allRows : allRows.slice(-last);

  if (args.includes("--json")) {
    console.log(
      JSON.stringify(
        {
          periodType: kind,
          eligibility,
          seasons: rows,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`\nSwipeRank ${kind} field survey`);
  console.log(
    `Eligibility: ${eligibility.minLikes.toLocaleString()} likes and ` +
      `${eligibility.minActiveDays.toLocaleString()} active days`,
  );
  console.log(
    "Season      eligible / total   coverage   median likes   median rate   p90 rate   >100%",
  );

  for (const row of rows) {
    console.log(
      [
        row.season.padEnd(11),
        `${row.eligibleProfiles.toLocaleString()} / ${row.totalProfiles.toLocaleString()}`.padEnd(
          18,
        ),
        formatRate(row.eligibilityRate).padEnd(10),
        (row.medianEligibleLikes?.toLocaleString() ?? "n/a").padEnd(14),
        formatRate(row.medianMatchRate).padEnd(13),
        formatRate(row.p90MatchRate).padEnd(10),
        row.overOneHundredPercentProfiles.toLocaleString(),
      ].join(""),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
