const retirement = {
  status: "retired",
  command: "data-layer:audit-hinge-over-100",
  databaseOpened: false,
  reason:
    "The legacy audit classified Hinge match origin with an older linked-thread heuristic. That interpretation is superseded by the canonical persisted-origin and conversation-repair model.",
  replacement: {
    profileMetaAudit: "bun run data-layer:audit-profile-meta -- --json",
    hingeConversationAudit:
      "bun run data-layer:repair-conversations -- --provider HINGE --json",
    hingeConversationApply:
      "bun run data-layer:repair-conversations -- --provider HINGE --apply --json",
  },
  guidance:
    "Use the profile-meta audit for provider grain, formulas, and stored Hinge rates. Use the conversation repair without --apply for a read-only comparison against canonical outbound-like yield. Apply only during a maintenance window, then rerun both audits. The retired per-profile and source-blob verification flags have no canonical equivalent and are intentionally unavailable.",
} as const;

function main(): void {
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(retirement, null, 2));
  } else {
    console.error(
      [
        "data-layer:audit-hinge-over-100 is retired and did not open the database.",
        "",
        retirement.reason,
        "",
        "Use the canonical read-only checks:",
        `1. ${retirement.replacement.profileMetaAudit}`,
        `2. ${retirement.replacement.hingeConversationAudit}`,
        "",
        retirement.guidance,
      ].join("\n"),
    );
  }

  process.exitCode = 1;
}

if (import.meta.main) main();
