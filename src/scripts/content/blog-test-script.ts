import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Base URLs to check
const BASE_URLS = {
  production: "https://www.swipestats.io",
  beta: "https://swipestats-4-beta.vercel.app",
};

// Threshold for highlighting content length differences (percentage)
const CONTENT_LENGTH_DIFF_THRESHOLD = 0.2; // 20% difference

// Blog URLs from production (Prismic)
const BLOG_URLS = [
  "https://www.swipestats.io/blog",
  "https://www.swipestats.io/blog/a-random-fact-i-love-is-hinge-prompt-answers",
  "https://www.swipestats.io/blog/zoosk-review",
  "https://www.swipestats.io/blog/doublelist-review",
  "https://www.swipestats.io/blog/my-love-language-is-hinge-prompt-answers",
  "https://www.swipestats.io/blog/dating-me-is-like-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-self-care-routine-is-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-last-journal-entry-was-about-hinge-prompt-answers",
  "https://www.swipestats.io/blog/im-looking-for-hinge-prompt-answers",
  "https://www.swipestats.io/blog/bumble-statistics",
  "https://www.swipestats.io/blog/facebook-dating-review",
  "https://www.swipestats.io/blog/best-rizz-pickup-lines",
  "https://www.swipestats.io/blog/my-best-celebrity-impression-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-best-dad-joke-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-most-irrational-fear-hinge-prompt-answers",
  "https://www.swipestats.io/blog/hinge-review",
  "https://www.swipestats.io/blog/i-want-someone-who-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-bffs-reasons-for-why-you-should-date-me-hinge-prompt-answers",
  "https://www.swipestats.io/blog/bumble-review",
  "https://www.swipestats.io/blog/tinder-statistics",
  "https://www.swipestats.io/blog/skip-dating-app-review",
  "https://www.swipestats.io/blog/together-we-could-hinge-prompt",
  "https://www.swipestats.io/blog/my-last-journal-entry-was-about-hinge-prompt-answers-2",
  "https://www.swipestats.io/blog/is-tinder-gold-worth-it",
  "https://www.swipestats.io/blog/my-most-controversial-opinion-is-hinge-prompt-answers",
  "https://www.swipestats.io/blog/plenty-of-fish-review",
  "https://www.swipestats.io/blog/i-know-the-best-spot-in-town-for-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-friends-ask-me-for-advice-about-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-beat-my-blues-by-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-wont-shut-up-about-hinge-prompt-answers",
  "https://www.swipestats.io/blog/ill-give-you-the-set-up-you-guess-the-punchline-hinge-prompt-answers",
  "https://www.swipestats.io/blog/im-weirdly-attracted-to-hinge-prompt-answers",
  "https://www.swipestats.io/blog/elite-singles-review",
  "https://www.swipestats.io/blog/if-loving-this-is-wrong-i-dont-want-to-be-right-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-unwind-by-hinge-prompt-answers",
  "https://www.swipestats.io/blog/how-to-pronounce-my-name-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-cry-in-the-car-song-is-hinge-prompt-answers",
  "https://www.swipestats.io/blog/raya-review",
  "https://www.swipestats.io/blog/dont-hate-me-if-i-hinge-prompt-answers",
  "https://www.swipestats.io/blog/lets-chat-about-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-biggest-date-fail-hinge-prompt-answers",
  "https://www.swipestats.io/blog/getting-personal-hinge-prompt-answers",
  "https://www.swipestats.io/blog/most-spontaneous-thing-ive-done-hinge-prompt-answers",
  "https://www.swipestats.io/blog/guess-the-song-hinge-prompt-answers",
  "https://www.swipestats.io/blog/do-you-agree-or-disagree-that-hinge-prompt-answers",
  "https://www.swipestats.io/blog/im-convinced-that-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-geek-out-on-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-hype-myself-up-by-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-feel-most-supported-when-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-wish-more-people-knew-hinge-prompt-answers",
  "https://www.swipestats.io/blog/first-round-is-on-me-if-hinge-prompt-answers",
  "https://www.swipestats.io/blog/coffee-meets-bagel-review",
  "https://www.swipestats.io/blog/the-league-review",
  "https://www.swipestats.io/blog/my-favourite-line-from-a-film-hinge-prompt-answers",
  "https://www.swipestats.io/blog/badoo-review",
  "https://www.swipestats.io/blog/ill-brag-about-you-to-my-friends-if-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-recently-discovered-that-hinge-prompt-answers",
  "https://www.swipestats.io/blog/id-fall-for-you-if-hinge-prompt-answers",
  "https://www.swipestats.io/blog/give-me-travel-tips-for-hinge-prompt-answers",
  "https://www.swipestats.io/blog/my-greatest-strength-hinge-prompt-answers",
  "https://www.swipestats.io/blog/lets-make-sure-were-on-the-same-page-about-hinge-prompt-answers",
  "https://www.swipestats.io/blog/ill-pick-the-topic-if-you-start-the-conversation-hinge-prompt-answers",
  "https://www.swipestats.io/blog/dating-profile-photos-that-get-girls-to-notice-you",
  "https://www.swipestats.io/blog/lets-debate-this-topic-hinge-prompt-answers",
  "https://www.swipestats.io/blog/a-quick-rant-about-hinge-prompt-answers",
  "https://www.swipestats.io/blog/all-i-ask-is-that-you-hinge-prompt-answers",
  "https://www.swipestats.io/blog/a-boundary-of-mine-is-hinge-prompt-answers",
  "https://www.swipestats.io/blog/i-go-crazy-for-hinge-prompt",
  "https://www.swipestats.io/blog/biggest-risk-ive-taken-hinge-prompt-answers",
  "https://www.swipestats.io/blog/how-to-get-more-matches-on-tinder-as-a-man",
  "https://www.swipestats.io/blog/my-therapist-would-say-i-hinge-prompt-answers",
  "https://www.swipestats.io/blog/green-flags-i-look-out-for-hinge-prompt",
  "https://www.swipestats.io/blog/rizz-app-review",
  "https://www.swipestats.io/blog/a-thought-i-recently-had-in-the-shower-hinge-prompt",
  "https://www.swipestats.io/blog/well-get-along-if-hinge-prompt-answers",
  "https://www.swipestats.io/blog/tinder-review",
  "https://www.swipestats.io/blog/best-travel-story-hinge-prompt-answers",
  "https://www.swipestats.io/blog/change-my-mind-about-hinge-prompt-answers",
  "https://www.swipestats.io/blog/apparently-my-lifes-soundtrack-is-hinge-prompt-answers",
  "https://www.swipestats.io/blog/a-life-goal-of-mine-hinge-prompt-answers",
  "https://www.swipestats.io/blog/tinder-insights-review",
  "https://www.swipestats.io/blog/when-do-tinder-likes-reset",
  "https://www.swipestats.io/blog/heated-affairs-review",
  "https://www.swipestats.io/blog/how-to-compliment-a-girls-picture",
];

interface CheckResult {
  slug: string;
  production: {
    status: number;
    contentLength: number;
    url: string;
    title?: string;
  };
  beta: {
    status: number;
    contentLength: number;
    url: string;
    title?: string;
  };
  hasError: boolean;
  contentLengthDiff: number;
  contentLengthDiffPercent: number;
  titleMatch: boolean;
}

interface MdxCheckResult {
  file: string;
  hasH1: boolean;
  h1Lines: number[];
}

function extractMetaTitle(html: string): string | undefined {
  // Try og:title first, then regular title tag
  const ogTitleMatch =
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i.exec(
      html,
    );
  if (ogTitleMatch) return ogTitleMatch[1];

  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  return undefined;
}

async function checkUrl(url: string): Promise<{
  status: number;
  contentLength: number;
  title?: string;
}> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Blog-Test-Script/1.0",
      },
    });

    const content = await response.text();
    const title = extractMetaTitle(content);

    return {
      status: response.status,
      contentLength: content.length,
      title,
    };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

function extractSlug(url: string): string {
  // Extract slug from URL (everything after /blog/)
  // Handle both /blog and /blog/slug cases
  if (url.endsWith("/blog")) {
    return ""; // Empty slug for blog index
  }
  const match = /\/blog\/(.+)$/.exec(url);
  return match?.[1] ? match[1] : "";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check MDX files for h1 headings in content (not frontmatter)
 * h1 should only be defined in frontmatter, not in MDX content
 */
function checkMdxFiles(): MdxCheckResult[] {
  const contentDir = join(process.cwd(), "content", "posts");
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".mdx"));
  const results: MdxCheckResult[] = [];

  for (const file of files) {
    try {
      const filePath = join(contentDir, file);
      const content = readFileSync(filePath, "utf-8");

      // Find the end of frontmatter (second "---")
      const firstDashIndex = content.indexOf("---\n");
      if (firstDashIndex === -1) continue;

      // Find the second occurrence of "---" which marks the end of frontmatter
      const secondDashIndex = content.indexOf("---\n", firstDashIndex + 4);
      if (secondDashIndex === -1) continue;

      // Split entire file into lines to get accurate line numbers
      const allLines = content.split("\n");
      const frontmatterEndLine = content
        .substring(0, secondDashIndex)
        .split("\n").length;

      // Find all h1 headings (# ) in the content (after frontmatter)
      const h1Lines: number[] = [];

      allLines.forEach((line, index) => {
        // Only check lines after frontmatter
        if (index >= frontmatterEndLine) {
          // Match lines that start with # followed by a space (h1 heading)
          // But not ## (h2) or ### (h3), etc.
          if (/^#\s/.test(line.trim())) {
            h1Lines.push(index + 1); // +1 because line numbers are 1-indexed
          }
        }
      });

      if (h1Lines.length > 0) {
        results.push({
          file,
          hasH1: true,
          h1Lines,
        });
      }
    } catch (error) {
      console.error(`Error checking file ${file}:`, error);
    }
  }

  return results;
}

async function checkSlug(slug: string): Promise<CheckResult> {
  // Handle empty slug (blog index page)
  const slugPath = slug ? `/${slug}` : "";
  const prodUrl = `${BASE_URLS.production}/blog${slugPath}`;
  const betaUrl = `${BASE_URLS.beta}/blog${slugPath}`;

  const displaySlug = slug || "(blog index)";

  const [prodResult, betaResult] = await Promise.all([
    checkUrl(prodUrl).catch(() => ({
      status: 0,
      contentLength: 0,
      title: undefined,
    })),
    checkUrl(betaUrl).catch(() => ({
      status: 0,
      contentLength: 0,
      title: undefined,
    })),
  ]);

  const hasError = prodResult.status !== 200 || betaResult.status !== 200;
  const contentLengthDiff = Math.abs(
    prodResult.contentLength - betaResult.contentLength,
  );
  const avgLength = (prodResult.contentLength + betaResult.contentLength) / 2;
  const contentLengthDiffPercent =
    avgLength > 0 ? contentLengthDiff / avgLength : 0;

  // Compare titles
  const titleMatch =
    prodResult.title !== undefined &&
    betaResult.title !== undefined &&
    prodResult.title === betaResult.title;

  return {
    slug: displaySlug,
    production: {
      status: prodResult.status,
      contentLength: prodResult.contentLength,
      url: prodUrl,
      title: prodResult.title,
    },
    beta: {
      status: betaResult.status,
      contentLength: betaResult.contentLength,
      url: betaUrl,
      title: betaResult.title,
    },
    hasError,
    contentLengthDiff,
    contentLengthDiffPercent,
    titleMatch,
  };
}

function printResult(result: CheckResult) {
  const {
    slug,
    production,
    beta,
    hasError,
    contentLengthDiffPercent,
    titleMatch,
  } = result;

  // Only print if there's an issue
  if (
    hasError ||
    !titleMatch ||
    contentLengthDiffPercent > CONTENT_LENGTH_DIFF_THRESHOLD
  ) {
    console.log(`\n${slug}`);

    // Always show URLs when there's an issue
    console.log(`  Prod: ${production.url}`);
    console.log(`  Beta: ${beta.url}`);

    if (hasError) {
      const prodStatus = production.status === 200 ? "✅" : "❌";
      const betaStatus = beta.status === 200 ? "✅" : "❌";
      console.log(
        `  Status: Prod ${prodStatus} ${production.status} | Beta ${betaStatus} ${beta.status}`,
      );
    }

    if (!titleMatch && production.title && beta.title) {
      console.log(`  ⚠️  Title mismatch:`);
      console.log(`    Prod: ${production.title}`);
      console.log(`    Beta: ${beta.title}`);
    }

    if (contentLengthDiffPercent > CONTENT_LENGTH_DIFF_THRESHOLD) {
      console.log(
        `  ⚠️  Content length diff: ${(contentLengthDiffPercent * 100).toFixed(1)}%`,
      );
      console.log(`    Prod: ${formatBytes(production.contentLength)}`);
      console.log(`    Beta: ${formatBytes(beta.contentLength)}`);
    }
  } else {
    // Just show a dot for successful checks
    process.stdout.write(".");
  }
}

async function main() {
  // First, check MDX files for h1 headings
  console.log("=".repeat(60));
  console.log("CHECKING MDX FILES FOR H1 HEADINGS");
  console.log("=".repeat(60));

  const mdxResults = checkMdxFiles();

  if (mdxResults.length === 0) {
    console.log("\n✅ No h1 headings found in MDX content (all good!)");
  } else {
    console.log(
      `\n⚠️  Found ${mdxResults.length} file(s) with h1 headings in content:\n`,
    );
    mdxResults.forEach((result) => {
      console.log(`  ❌ ${result.file}`);
      console.log(`     Line(s): ${result.h1Lines.join(", ")}`);
      console.log(
        `     Note: h1 should only be in frontmatter, use h2 (##) for content headings\n`,
      );
    });
  }

  // Extract slugs from URLs
  const slugs = BLOG_URLS.map(extractSlug);

  console.log("\n" + "=".repeat(60));
  console.log("CHECKING BLOG URLS");
  console.log("=".repeat(60));
  console.log(`Found ${slugs.length} slugs to check`);
  console.log(`\nBase URLs:`);
  console.log(`  Production: ${BASE_URLS.production}`);
  console.log(`  Beta:       ${BASE_URLS.beta}`);

  const results: CheckResult[] = [];

  // Check each slug
  for (const slug of slugs) {
    const result = await checkSlug(slug);
    results.push(result);
    printResult(result);

    // Small delay to avoid overwhelming the servers
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const successful = results.filter(
    (r) => r.production.status === 200 && r.beta.status === 200,
  ).length;
  const failed = results.length - successful;

  const significantDiffs = results.filter(
    (r) =>
      r.contentLengthDiffPercent > CONTENT_LENGTH_DIFF_THRESHOLD &&
      r.production.status === 200 &&
      r.beta.status === 200,
  );

  const titleMismatches = results.filter(
    (r) =>
      r.production.status === 200 &&
      r.beta.status === 200 &&
      !r.titleMatch &&
      r.production.title &&
      r.beta.title,
  );

  console.log(`\n\nTotal slugs checked: ${results.length}`);
  console.log(`✅ Successful (200 on both): ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `⚠️  Significant content length differences (>${CONTENT_LENGTH_DIFF_THRESHOLD * 100}%): ${significantDiffs.length}`,
  );
  console.log(`⚠️  Title mismatches: ${titleMismatches.length}`);
  console.log(`⚠️  MDX files with h1 in content: ${mdxResults.length}`);

  if (failed > 0) {
    console.log("\nFailed slugs:");
    results
      .filter((r) => r.hasError)
      .forEach((r) => {
        console.log(`  - ${r.slug}`);
        if (r.production.status !== 200) {
          console.log(`    Production: ${r.production.status}`);
        }
        if (r.beta.status !== 200) {
          console.log(`    Beta: ${r.beta.status}`);
        }
      });
  }

  if (titleMismatches.length > 0) {
    console.log("\n⚠️  Title mismatches (already shown above)");
  }
}

main().catch(console.error);
