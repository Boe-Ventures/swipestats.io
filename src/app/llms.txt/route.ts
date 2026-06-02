import { posts } from "@velite";

export const dynamic = "force-static";

const BASE_URL = "https://www.swipestats.io";

const OVERVIEW = `# SwipeStats

> Dating app analytics for the people who use them and the researchers who study them. Upload your Tinder or Hinge data export, get visualizations and cohort comparisons, and help build the largest anonymized dataset of real dating behavior.

SwipeStats is a free tool that turns the JSON data exports dating apps give you into insights about your own swiping and messaging patterns — and benchmarks them against thousands of other users. The aggregated, anonymized data also powers a research dataset used by journalists, academics, and content creators.

Currently supports Tinder and Hinge data exports. Messages are excluded from all shared data for privacy.`;

const PRODUCT_LINKS: [string, string, string?][] = [
  ["Upload your data (Tinder)", "/upload/tinder"],
  ["Upload your data (Hinge)", "/upload/hinge"],
  ["Upload landing", "/upload"],
  ["How to request your data", "/how-to-request-your-data"],
  ["Research datasets", "/research"],
  ["Public profile directory", "/directory"],
  ["Contact", "/contact"],
];

const DATASET_LINKS: [string, string, string?][] = [
  [
    "Free demo dataset (JSONL)",
    "/downloads/swipestats-demo-dataset.jsonl",
    "Anonymized sample profile with daily usage, aggregate stats, and match counts. Messages excluded. Includes metadata and citation lines.",
  ],
  ["Demo dataset (zipped)", "/downloads/swipestats-demo-dataset.jsonl.zip"],
  [
    "Demo profile (JSON)",
    "/demo-profile.json",
    "Single anonymized profile in the format SwipeStats uses internally.",
  ],
  [
    "Dataset README",
    "/downloads/README.md",
    "Schema, tiers, privacy posture, and citation guidance for the demo dataset.",
  ],
];

const AGENT_LINKS: [string, string, string?][] = [
  ["XML sitemap", "/sitemap.xml"],
  ["robots.txt", "/robots.txt"],
];

const LEGAL_LINKS: [string, string, string?][] = [
  ["Privacy policy", "/privacy"],
  ["Terms of service", "/tos"],
];

type Category = "Texting" | "Prompts" | "Guides" | "Reviews" | "Statistics";

const CATEGORY_ORDER: Category[] = [
  "Guides",
  "Statistics",
  "Reviews",
  "Texting",
  "Prompts",
];

interface Post {
  metaTitle: string;
  metaDescription: string;
  permalink: string;
  category?: Category;
  isPublished: boolean;
  lastModified: string;
}

const renderLink = (label: string, path: string, note?: string) => {
  const absolute = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const line = `- [${label}](${absolute})`;
  return note ? `${line} — ${note}` : line;
};

const renderPost = (post: Post) =>
  `- [${post.metaTitle}](${BASE_URL}${post.permalink}) — ${post.metaDescription}`;

const renderList = (links: [string, string, string?][]) =>
  links.map(([label, path, note]) => renderLink(label, path, note)).join("\n");

const buildLlmsTxt = () => {
  const published = (posts as Post[])
    .filter((p) => p.isPublished)
    .sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    );

  const byCategory = new Map<Category | "Uncategorized", Post[]>();
  for (const post of published) {
    const key = post.category ?? "Uncategorized";
    const bucket = byCategory.get(key) ?? [];
    bucket.push(post);
    byCategory.set(key, bucket);
  }

  const categorySections = CATEGORY_ORDER.filter((c) => byCategory.has(c)).map(
    (category) => {
      const bucket = byCategory.get(category)!;
      return `### ${category}\n\n${bucket.map(renderPost).join("\n")}`;
    },
  );

  const uncategorized = byCategory.get("Uncategorized");
  if (uncategorized && uncategorized.length > 0) {
    categorySections.push(
      `### Other\n\n${uncategorized.map(renderPost).join("\n")}`,
    );
  }

  const sections = [
    OVERVIEW,
    `## Product\n\n${renderList(PRODUCT_LINKS)}`,
    `## Datasets\n\nSwipeStats publishes a free sample dataset plus paid research tiers. See /research for the full catalog.\n\n${renderList(DATASET_LINKS)}`,
    `## For AI agents and crawlers\n\n${renderList(AGENT_LINKS)}`,
    `## Blog\n\nThe SwipeStats blog covers dating app guides, statistics, prompt answers, and app reviews. Posts are grouped by category and sorted by last modified date.\n\n${categorySections.join("\n\n")}`,
    `## Legal\n\n${renderList(LEGAL_LINKS)}`,
  ];

  return sections.join("\n\n") + "\n";
};

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
