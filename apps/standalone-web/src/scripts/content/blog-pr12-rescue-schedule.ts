import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_COMMIT = "b3c341d312ac5edf89fda078b880c35a5670f2e0";
const IMMEDIATE_DATE = "2026-07-14";
const SCHEDULE_START = "2026-07-15";

const IMMEDIATE_SLUGS = [
  "best-conversation-starters-over-text",
  "first-message-on-dating-app",
  "how-to-ask-her-out-over-text",
  "how-to-flirt-over-text",
  "how-to-keep-a-conversation-going-over-text",
  "pick-up-lines",
];

const PRIORITY_SLUGS = [
  "how-does-tinder-work",
  "how-to-get-matches-on-tinder",
  "ai-rizz-generator",
  "ai-text-message-generator",
  "tinder-platinum",
  "bumble-premium",
  "hinge-algorithm",
  "how-to-reset-tinder",
  "tinder-subscription",
  "hinge-subscription",
  "is-hinge-x-worth-it",
  "is-hinge-better-than-tinder",
];

function sourceSlugs(): string[] {
  const command = Bun.spawnSync([
    "git",
    "diff-tree",
    "--no-commit-id",
    "--diff-filter=A",
    "--name-only",
    "-r",
    SOURCE_COMMIT,
    "--",
    "content/posts/*.mdx",
  ]);

  if (command.exitCode !== 0) {
    throw new Error(command.stderr.toString() || "Could not read source commit");
  }

  return command.stdout
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((file) => path.basename(file, ".mdx"))
    .sort();
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const allSlugs = sourceSlugs();
const namedSlugs = new Set([...IMMEDIATE_SLUGS, ...PRIORITY_SLUGS]);

if (allSlugs.length !== 81) {
  throw new Error(`Expected 81 rescued posts, found ${allSlugs.length}`);
}

for (const slug of namedSlugs) {
  if (!allSlugs.includes(slug)) {
    throw new Error(`Schedule references missing rescued post: ${slug}`);
  }
}

const scheduledSlugs = [
  ...PRIORITY_SLUGS,
  ...allSlugs.filter((slug) => !namedSlugs.has(slug)),
];

const calendar = new Map<string, string>();
for (const slug of IMMEDIATE_SLUGS) calendar.set(slug, IMMEDIATE_DATE);
scheduledSlugs.forEach((slug, index) => {
  calendar.set(slug, addDays(SCHEDULE_START, Math.floor(index / 2)));
});

for (const slug of allSlugs) {
  const file = path.join(process.cwd(), "content/posts", `${slug}.mdx`);
  const content = await readFile(file, "utf8");
  const publishedAt = calendar.get(slug);
  if (!publishedAt) throw new Error(`No publication date for ${slug}`);

  const updated = content.replace(
    /^publishedAt:\s*"[^"]+"$/m,
    `publishedAt: "${publishedAt}"`,
  );

  if (updated === content && !content.includes(`publishedAt: "${publishedAt}"`)) {
    throw new Error(`Could not update publishedAt for ${slug}`);
  }

  await writeFile(file, updated);
}

const finalDate = addDays(
  SCHEDULE_START,
  Math.floor((scheduledSlugs.length - 1) / 2),
);

console.log(
  `Scheduled ${IMMEDIATE_SLUGS.length} immediate posts and ${scheduledSlugs.length} future posts through ${finalDate}`,
);
