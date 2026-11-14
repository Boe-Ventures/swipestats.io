/**
 * Shared CLI/agent entry point for SwipeRank moderation.
 *
 * Review with `swipe-rank:inspect-facts` or `swipe-rank:audit-over-100` first.
 * Writes are explicit and use the same locked service as the admin platform.
 */
import {
  listTinderSwipeRankExclusions,
  setTinderSwipeRankExclusion,
} from "@/server/services/swipe-rank/exclusion.service";

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function flagValue(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  if (hasFlag("--list")) {
    console.log(JSON.stringify(await listTinderSwipeRankExclusions(), null, 2));
    return;
  }

  const exclude = hasFlag("--exclude");
  const restore = hasFlag("--restore");
  if (exclude === restore) {
    throw new Error("Pass exactly one of --exclude or --restore.");
  }
  if (!hasFlag("--confirm-write")) {
    throw new Error(
      "Refusing to change SwipeRank moderation without --confirm-write. Point DATABASE_URL at the intended branch first.",
    );
  }

  const providerProfileId = flagValue("--tinder-id");
  const actor = flagValue("--actor");
  const reason = flagValue("--reason");
  if (!providerProfileId) {
    throw new Error("Pass --tinder-id <id>.");
  }
  if (!actor) {
    throw new Error(
      "Pass --actor <identity>, for example --actor agent:codex.",
    );
  }
  if (exclude && !reason) {
    throw new Error("Pass --reason <review reason> when excluding a profile.");
  }

  const result = await setTinderSwipeRankExclusion({
    providerProfileId,
    excluded: exclude,
    reason,
    actor,
  });
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
