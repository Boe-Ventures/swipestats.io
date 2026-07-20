export const retirement = {
  status: "retired",
  command: "data-layer:repair-profile-meta",
  databaseOpened: false,
  reason:
    "The legacy repair mixed usage aggregation with superseded conversation-derived metadata and could reconstruct missing rows from stale match derivatives. It is intentionally non-operational.",
  replacement: {
    audit: "bun run data-layer:audit-profile-meta -- --json",
    tinderCalendarDryRun: "bun run data-layer:repair-tinder-dates -- --json",
    tinderCalendarApply:
      "bun run data-layer:repair-tinder-dates -- --apply --json",
    tinderConversationDryRun:
      "bun run data-layer:repair-conversations -- --provider TINDER --json",
    tinderConversationApply:
      "bun run data-layer:repair-conversations -- --provider TINDER --apply --json",
    rebuildSwipeRank: "bun run swipe-rank:launch -- --confirm-write",
  },
  guidance:
    "Run the audit and both dry runs first. Apply the calendar and conversation repairs during a maintenance window, rerun the audit, then rebuild SwipeRank. If the audit reports missing profile_meta rows, stop: the canonical repair scripts deliberately do not invent a row, so regenerate it through the profile ingestion/service path.",
} as const;

function main(): void {
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(retirement, null, 2));
  } else {
    console.error(
      [
        "data-layer:repair-profile-meta is retired and did not open the database.",
        "",
        retirement.reason,
        "",
        "Use the canonical sequence:",
        `1. ${retirement.replacement.audit}`,
        `2. ${retirement.replacement.tinderCalendarDryRun}`,
        `3. ${retirement.replacement.tinderConversationDryRun}`,
        "4. During a maintenance window, rerun steps 2 and 3 with --apply.",
        `5. Rerun the audit, then ${retirement.replacement.rebuildSwipeRank}`,
        "",
        retirement.guidance,
      ].join("\n"),
    );
  }

  process.exitCode = 1;
}

if (import.meta.main) main();
