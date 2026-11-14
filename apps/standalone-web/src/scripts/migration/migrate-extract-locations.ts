/** Retired: use the resumable, dry-run-first local Codex extraction command. */
if (import.meta.main) {
  console.error(
    "This legacy location migration is retired. Run bun locations:extract --help for v2. No database queries or updates were performed.",
  );
  process.exitCode = 1;
}
