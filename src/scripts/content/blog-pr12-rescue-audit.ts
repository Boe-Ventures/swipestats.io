import { readdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_COMMIT = "b3c341d312ac5edf89fda078b880c35a5670f2e0";
const POSTS_DIR = path.join(process.cwd(), "content/posts");
const DEFAULT_OUTPUT = path.join(
  process.cwd(),
  "docs/blog-pr12-rescue-ledger.md",
);

type ReviewBatch =
  | "evergreen"
  | "commercial"
  | "algorithm-account"
  | "other";

type ReviewTier = "light" | "medium" | "heavy";
type ReviewStatus = "pending" | "reviewed";

const REVIEWED_REWRITES = new Set([
  "ai-rizz-generator",
  "ai-text-message-generator",
  "best-conversation-starters-over-text",
  "break-up-text",
  "bumble-boost",
  "bumble-messaging",
  "bumble-premium",
  "can-you-send-pics-on-hinge",
  "chat-up-lines",
  "cheesy-pick-up-lines",
  "does-hinge-automatically-update-your-location",
  "double-texting",
  "dirty-pick-up-lines",
  "dry-texting",
  "first-message-on-dating-app",
  "flirty-emojis",
  "flirty-gifs",
  "flirty-texts-for-him",
  "good-morning-messages-for-him",
  "good-morning-texts-for-her",
  "good-night-texts",
  "free-messaging-dating-sites",
  "hinge-algorithm",
  "hinge-app-icons",
  "hinge-ban",
  "hinge-boost",
  "hinge-conversation-starters",
  "hinge-desktop",
  "hinge-for-friends",
  "hinge-gift-card",
  "hinge-match-note",
  "hinge-most-compatible",
  "hinge-notifications",
  "hinge-opening-lines",
  "hinge-or-bumble",
  "hinge-phone-number",
  "hinge-roses",
  "hinge-standouts",
  "hinge-subscription",
  "hinge-verification",
  "how-does-tinder-work",
  "how-does-facebook-dating-work",
  "how-does-hinge-work-for-guys",
  "how-does-match-com-work",
  "how-many-free-likes-on-hinge",
  "how-to-ask-her-out-over-text",
  "how-to-cancel-tinder-gold",
  "how-to-find-someone-on-hinge",
  "how-to-find-someone-on-tinder",
  "how-to-flirt-over-text",
  "how-to-get-matches-on-tinder",
  "how-to-keep-a-conversation-going-over-text",
  "how-to-like-someone-on-hinge",
  "how-to-refresh-hinge",
  "how-to-reset-tinder",
  "how-to-reset-hinge",
  "how-to-slide-into-dms",
  "how-to-talk-dirty",
  "how-to-tell-if-she-likes-you-over-text",
  "how-to-text-a-guy-to-like-you",
  "how-to-text-a-woman",
  "how-to-use-hinge",
  "is-hinge-x-worth-it",
  "is-hinge-a-good-dating-app",
  "is-hinge-better-than-tinder",
  "married-people-on-tinder",
  "if-you-x-someone-on-hinge-what-happens",
  "pick-up-lines",
  "pick-up-lines-for-girls",
  "tinder-platinum",
  "tinder-boost",
  "tinder-for-friends",
  "tinder-for-seniors",
  "tinder-subscription",
  "tinder-shadowban",
  "tinder-questionnaire",
  "tinder-terms-and-conditions",
  "when-do-hinge-roses-reset",
  "who-should-text-first-after-a-date",
  "what-does-rizz-mean",
  "what-to-text-your-crush",
]);

interface PostInventory {
  file: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
  enableAutoCtAs: boolean;
  words: number;
  h2s: number;
  internalLinks: string[];
  rescueDependencies: string[];
  missingInternalTargets: string[];
  sourceLinks: number;
  productCards: number;
  sponsorCards: number;
  riskFlags: string[];
  batch: ReviewBatch;
  reviewTier: ReviewTier;
  reviewStatus: ReviewStatus;
}

function sourceFiles(): string[] {
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
    .sort();
}

function frontmatterValue(frontmatter: string, key: string): string {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(frontmatter);
  if (!match?.[1]) return "";
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function classifyBatch(slug: string, content: string): ReviewBatch {
  if (
    /(algorithm|shadowban|reset|ban|terms-and-conditions|phone-number|location)/.test(
      slug,
    )
  ) {
    return "algorithm-account";
  }

  if (
    /(premium|platinum|subscription|boost|rose|standout|gift-card|worth-it)/.test(
      slug,
    )
  ) {
    return "commercial";
  }

  if (
    /(text|message|conversation|pick-up|chat-up|flirt|rizz|emoji|gif|crush|dms|good-morning|good-night)/.test(
      slug,
    ) || /category:\s*["']?Texting/im.test(content)
  ) {
    return "evergreen";
  }

  return "other";
}

function riskFlags(slug: string, body: string): string[] {
  const flags: string[] = [];

  if (/\$\d|pricing:|per (week|month|year)/i.test(body)) {
    flags.push("dynamic-pricing");
  }
  if (/\b(I tested|I downloaded|I've used|I spent|I paid|I tried)\b/i.test(body)) {
    flags.push("first-person-claim");
  }
  if (/\b(our data|our dataset|SwipeStats dataset|we analyzed)\b/i.test(body)) {
    flags.push("swipestats-data-claim");
  }
  if (/\b(algorithm|ELO|visibility|new user boost|shadowban|mass-liking)\b/i.test(body)) {
    flags.push("algorithm-claim");
  }
  if (
    /\b(new (phone|SIM|number)|VPN|device ID|photo fingerprint|identity wipe|burner|factory reset)\b/i.test(
      body,
    )
  ) {
    flags.push("evasion-or-identity-guidance");
  }
  if (/\b(guarantee|proven to|always|never|definitely)\b/i.test(body)) {
    flags.push("absolute-claim");
  }
  if (/\b\d+(?:\.\d+)?%\b/.test(body)) {
    flags.push("quantitative-claim");
  }
  if (/youtube\.com|youtu\.be|medium\.com/i.test(body)) {
    flags.push("weak-source-candidate");
  }
  if (/(dirty-pick-up-lines|how-to-talk-dirty)/.test(slug)) {
    flags.push("adult-content");
  }

  return flags;
}

function reviewTier(flags: string[], sourceLinks: number): ReviewTier {
  if (
    flags.includes("evasion-or-identity-guidance") ||
    flags.includes("algorithm-claim") ||
    flags.includes("adult-content")
  ) {
    return "heavy";
  }
  if (flags.length >= 3 || sourceLinks === 0) return "medium";
  return "light";
}

function wordCount(body: string): number {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!??\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}'’-]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function dependencyOrder(posts: PostInventory[]): {
  ordered: string[];
  cycles: string[];
} {
  const remaining = new Map(
    posts.map((post) => [post.slug, new Set(post.rescueDependencies)]),
  );
  const dependents = new Map<string, Set<string>>();

  for (const post of posts) {
    for (const dependency of post.rescueDependencies) {
      const current = dependents.get(dependency) ?? new Set<string>();
      current.add(post.slug);
      dependents.set(dependency, current);
    }
  }

  const queue = [...remaining]
    .filter(([, dependencies]) => dependencies.size === 0)
    .map(([slug]) => slug)
    .sort();
  const ordered: string[] = [];

  while (queue.length > 0) {
    const slug = queue.shift();
    if (!slug || !remaining.has(slug)) continue;
    ordered.push(slug);
    remaining.delete(slug);

    for (const dependent of dependents.get(slug) ?? []) {
      const dependencies = remaining.get(dependent);
      if (!dependencies) continue;
      dependencies.delete(slug);
      if (dependencies.size === 0) {
        queue.push(dependent);
        queue.sort();
      }
    }
  }

  return { ordered, cycles: [...remaining.keys()].sort() };
}

async function main() {
  const files = sourceFiles();
  if (files.length !== 81) {
    throw new Error(`Expected 81 source files, found ${files.length}`);
  }

  const allPostFiles = await readdir(POSTS_DIR);
  const allSlugs = new Set(
    allPostFiles
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, "")),
  );
  const rescueSlugs = new Set(
    files.map((file) => path.basename(file, ".mdx")),
  );

  const posts: PostInventory[] = [];

  for (const file of files) {
    const content = await Bun.file(path.join(process.cwd(), file)).text();
    const [, frontmatter = "", body = ""] = content.split(/^---\s*$/m);
    const slug = path.basename(file, ".mdx");
    const internalLinks = unique(
      [...body.matchAll(/\]\(\/blog\/([^#?/)]+)(?:[?#][^)]*)?\)/g)].map(
        (match) => match[1] ?? "",
      ),
    ).filter(Boolean);
    const sourceSection = body.split(/^## Sources\s*$/m)[1] ?? "";
    const sourceLinks = [...sourceSection.matchAll(/https?:\/\/[^)\s]+/g)].length;
    const flags = riskFlags(slug, body);

    posts.push({
      file,
      slug,
      title: frontmatterValue(frontmatter, "h1"),
      category: frontmatterValue(frontmatter, "category"),
      publishedAt: frontmatterValue(frontmatter, "publishedAt"),
      enableAutoCtAs:
        frontmatterValue(frontmatter, "enableAutoCtAs") !== "false",
      words: wordCount(body),
      h2s: [...body.matchAll(/^## /gm)].length,
      internalLinks,
      rescueDependencies: internalLinks.filter((target) =>
        rescueSlugs.has(target),
      ),
      missingInternalTargets: internalLinks.filter(
        (target) => !allSlugs.has(target),
      ),
      sourceLinks,
      productCards: [...body.matchAll(/<ProductCard\b/g)].length,
      sponsorCards: [...body.matchAll(/<SponsorCard\b/g)].length,
      riskFlags: flags,
      batch: classifyBatch(slug, content),
      reviewTier: reviewTier(flags, sourceLinks),
      reviewStatus: REVIEWED_REWRITES.has(slug) ? "reviewed" : "pending",
    });
  }

  const dependency = dependencyOrder(posts);
  const uniqueRescueTargets = new Set(
    posts.flatMap((post) => post.rescueDependencies),
  );
  const missingTargets = unique(
    posts.flatMap((post) => post.missingInternalTargets),
  );
  const reviewedPosts = posts.filter(
    (post) => post.reviewStatus === "reviewed",
  );
  const counts = <T extends string>(values: T[]) =>
    Object.fromEntries(
      [...new Set(values)].sort().map((value) => [
        value,
        values.filter((candidate) => candidate === value).length,
      ]),
    );

  const lines = [
    "# PR #12 rescue review ledger",
    "",
    `Generated from source commit \`${SOURCE_COMMIT}\`. Re-run with \`bun src/scripts/content/blog-pr12-rescue-audit.ts\`.`,
    "",
    "This ledger is the explicit editorial decision surface for the 81 recovered posts. `rewrite` retains a post only after review. `pending` means the historical draft is not publication-ready; `reviewed` means its factual boundaries, sources, tone, dates, and CTA strategy received a manual pass.",
    "",
    "## Inventory summary",
    "",
    `- Recovered posts: **${posts.length}**`,
    `- Total draft words: **${posts.reduce((sum, post) => sum + post.words, 0).toLocaleString()}**`,
    `- Review decisions: **81 rewrite / 0 keep-as-is / 0 drop**`,
    `- Editorial status: **${reviewedPosts.length} reviewed / ${posts.length - reviewedPosts.length} pending**`,
    `- Review tiers: ${JSON.stringify(counts(posts.map((post) => post.reviewTier)))}`,
    `- Editorial batches: ${JSON.stringify(counts(posts.map((post) => post.batch)))}`,
    `- Unique in-batch link targets: **${uniqueRescueTargets.size}**`,
    `- Dependency-orderable posts: **${dependency.ordered.length}**`,
    `- Posts in dependency cycles: **${dependency.cycles.length}**`,
    `- Missing internal targets after recovery: **${missingTargets.length}**${missingTargets.length ? ` (${missingTargets.join(", ")})` : ""}`,
    "",
    "## Review decisions",
    "",
    "| Slug | Decision | Status | Tier | Batch | Words | Sources | Auto CTA | Product cards | In-batch dependencies | Risk flags |",
    "| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: | --- |",
    ...posts.map(
      (post) =>
        `| \`${post.slug}\` | rewrite | ${post.reviewStatus} | ${post.reviewTier} | ${post.batch} | ${post.words} | ${post.sourceLinks} | ${post.enableAutoCtAs ? "on" : "off"} | ${post.productCards} | ${post.rescueDependencies.length} | ${escapeCell(post.riskFlags.join(", ") || "none")} |`,
    ),
    "",
    "## Dependency cycles",
    "",
    dependency.cycles.length
      ? dependency.cycles.map((slug) => `- \`${slug}\``).join("\n")
      : "No cycles detected.",
    "",
    "## Publication dependency order",
    "",
    "This is a mechanical topological order only. Editorial priority and the final two-per-day calendar still need to be applied.",
    "",
    ...dependency.ordered.map((slug, index) => `${index + 1}. \`${slug}\``),
    "",
  ];

  const outputArg = process.argv.find((argument) => argument.startsWith("--out="));
  const outputPath = outputArg?.slice("--out=".length) || DEFAULT_OUTPUT;
  await Bun.write(outputPath, lines.join("\n"));
  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
}

await main();
