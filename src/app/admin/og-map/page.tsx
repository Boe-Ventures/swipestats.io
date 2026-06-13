import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import sitemap from "@/app/sitemap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedMeta {
  url: string;
  path: string;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogImageWidth: string | null;
  ogImageHeight: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterImage: string | null;
  fetchError: string | null;
}

interface RouteGroup {
  label: string;
  entries: ParsedMeta[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&apos;/g, "'");
}

function extractTag(html: string, regex: RegExp): string | null {
  const match = regex.exec(html);
  const raw = match?.[1]?.trim() ?? null;
  return raw ? decodeHtmlEntities(raw) : null;
}

function parseMeta(
  html: string,
): Omit<ParsedMeta, "url" | "path" | "fetchError"> {
  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  const head = headMatch?.[1] ?? html;

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const rawTitle = titleMatch?.[1]?.trim() ?? null;

  return {
    title: rawTitle ? decodeHtmlEntities(rawTitle) : null,
    description:
      extractTag(
        head,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      ) ??
      extractTag(
        head,
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      ),
    ogTitle: extractTag(
      head,
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
    ),
    ogDescription: extractTag(
      head,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    ),
    ogImage: extractTag(
      head,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i,
    ),
    ogImageWidth: extractTag(
      head,
      /<meta[^>]+property=["']og:image:width["'][^>]+content=["']([^"']*)["']/i,
    ),
    ogImageHeight: extractTag(
      head,
      /<meta[^>]+property=["']og:image:height["'][^>]+content=["']([^"']*)["']/i,
    ),
    twitterCard: extractTag(
      head,
      /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i,
    ),
    twitterTitle: extractTag(
      head,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']*)["']/i,
    ),
    twitterImage: extractTag(
      head,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']*)["']/i,
    ),
  };
}

function groupPath(path: string): string {
  if (path === "/") return "Marketing";
  const seg = path.split("/").filter(Boolean)[0] ?? "";
  if (seg === "blog") return "Blog";
  if (seg === "upload") return "Upload";
  if (seg === "app") return "App";
  if (seg === "admin") return "Admin";
  if (seg === "try" || seg === "demo") return "Try / Demo";
  if (["privacy", "tos", "contact"].includes(seg)) return "Legal & Info";
  return "Marketing";
}

function isComplete(entry: ParsedMeta): boolean {
  return !!(
    entry.title &&
    entry.description &&
    entry.ogTitle &&
    entry.ogDescription &&
    entry.ogImage
  );
}

function countIssues(entry: ParsedMeta): number {
  let n = 0;
  if (!entry.title) n++;
  if (!entry.description) n++;
  if (!entry.ogTitle) n++;
  if (!entry.ogDescription) n++;
  if (!entry.ogImage) n++;
  if (!entry.twitterCard) n++;
  if (entry.fetchError) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Multi-platform share previews
// ---------------------------------------------------------------------------

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function OgThumb({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={`bg-gray-100 object-cover ${className ?? ""}`}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gray-100 text-[10px] text-gray-400 ${className ?? ""}`}
    >
      No og:image
    </div>
  );
}

function FacebookPreview({ entry }: { entry: ParsedMeta }) {
  const title = entry.ogTitle ?? entry.title;
  const desc = entry.ogDescription ?? entry.description;
  const domain = getDomain(entry.url);
  return (
    <div className="w-[200px] shrink-0 overflow-hidden rounded-md border bg-white shadow-sm">
      <OgThumb src={entry.ogImage} alt="" className="h-[105px] w-full" />
      <div className="space-y-0.5 px-2 pb-1.5 pt-1">
        <div className="text-[9px] uppercase text-gray-400">{domain}</div>
        <div className="line-clamp-2 text-[11px] font-semibold leading-tight text-[#1d2129]">
          {title ? (title.length > 50 ? title.slice(0, 50) + "…" : title) : "—"}
        </div>
        <div className="line-clamp-1 text-[10px] text-gray-500">
          {desc ? (desc.length > 70 ? desc.slice(0, 70) + "…" : desc) : "—"}
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ entry }: { entry: ParsedMeta }) {
  const title = entry.ogTitle ?? entry.title;
  const domain = getDomain(entry.url);
  return (
    <div className="w-[200px] shrink-0 overflow-hidden rounded-md border bg-white shadow-sm">
      <OgThumb src={entry.ogImage} alt="" className="h-[105px] w-full" />
      <div className="space-y-0.5 border-t px-2 pb-1.5 pt-1">
        <div className="line-clamp-2 text-[11px] font-semibold leading-tight text-[#000000e6]">
          {title ? (title.length > 50 ? title.slice(0, 50) + "…" : title) : "—"}
        </div>
        <div className="text-[9px] text-gray-500">{domain}</div>
      </div>
    </div>
  );
}

function XPreview({ entry }: { entry: ParsedMeta }) {
  const title = entry.twitterTitle ?? entry.ogTitle ?? entry.title;
  const domain = getDomain(entry.url);
  return (
    <div className="w-[200px] shrink-0 overflow-hidden rounded-2xl border bg-black shadow-sm">
      <OgThumb
        src={entry.twitterImage ?? entry.ogImage}
        alt=""
        className="h-[105px] w-full"
      />
      <div className="px-2 pb-1.5 pt-1">
        <div className="line-clamp-1 text-[11px] font-medium leading-tight text-white">
          {title ? (title.length > 45 ? title.slice(0, 45) + "…" : title) : "—"}
        </div>
        <div className="mt-0.5 text-[9px] text-gray-500">{domain}</div>
      </div>
    </div>
  );
}

function InstagramPreview({ entry }: { entry: ParsedMeta }) {
  const title = entry.ogTitle ?? entry.title;
  const domain = getDomain(entry.url);
  return (
    <div className="w-[140px] shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm">
      <OgThumb src={entry.ogImage} alt="" className="h-[140px] w-full" />
      <div className="px-1.5 pb-1 pt-0.5">
        <div className="line-clamp-1 text-[10px] font-semibold text-gray-900">
          {title ? (title.length > 30 ? title.slice(0, 30) + "…" : title) : "—"}
        </div>
        <div className="text-[9px] text-gray-400">{domain}</div>
      </div>
    </div>
  );
}

function SharePreviews({ entry }: { entry: ParsedMeta }) {
  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Share previews
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-medium text-gray-400">
            Facebook / WhatsApp
          </span>
          <FacebookPreview entry={entry} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-medium text-gray-400">LinkedIn</span>
          <LinkedInPreview entry={entry} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-medium text-gray-400">
            X (Twitter)
          </span>
          <XPreview entry={entry} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-medium text-gray-400">
            Instagram DM
          </span>
          <InstagramPreview entry={entry} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function MissingBadge({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-600">
      {label}
    </Badge>
  );
}

function Truncate({ text, max }: { text: string | null; max: number }) {
  if (!text) return <span className="text-xs text-red-400">—</span>;
  return (
    <span className="text-xs">
      {text.length > max ? text.slice(0, max) + "…" : text}
    </span>
  );
}

function CharCount({ text, type }: { text: string | null; type: "title" | "description" }) {
  if (!text) return null;
  const max = type === "title" ? 60 : 160;
  const isOver = text.length > max;
  return (
    <span
      className={`ml-1 text-[10px] ${isOver ? "font-medium text-amber-500" : "text-gray-400"}`}
    >
      {text.length}/{max}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MetaRow
// ---------------------------------------------------------------------------

function MetaRow({ entry }: { entry: ParsedMeta }) {
  const missingFields: string[] = [];
  if (!entry.title) missingFields.push("title");
  if (!entry.description) missingFields.push("description");
  if (!entry.ogTitle) missingFields.push("og:title");
  if (!entry.ogDescription) missingFields.push("og:description");
  if (!entry.ogImage) missingFields.push("og:image");
  if (!entry.twitterCard) missingFields.push("twitter:card");

  return (
    <div className="border-b px-4 py-4 last:border-b-0">
      {/* URL + badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm font-medium text-blue-600 hover:underline"
        >
          {entry.path}
        </a>
        {entry.fetchError && (
          <Badge variant="destructive" className="text-[10px]">
            Fetch Error: {entry.fetchError}
          </Badge>
        )}
        {missingFields.map((f) => (
          <MissingBadge key={f} label={f} />
        ))}
        {missingFields.length === 0 && !entry.fetchError && (
          <Badge variant="secondary" className="bg-green-100 text-[10px] text-green-700">
            ✓ Complete
          </Badge>
        )}
      </div>

      {/* Meta details — collapsed when title/OG title match */}
      <div>
        <div className="space-y-1 text-sm">
          <div>
            <span className="inline-block w-24 font-medium text-gray-500">Title:</span>
            <Truncate text={entry.title} max={70} />
            <CharCount text={entry.title} type="title" />
          </div>
          {entry.ogTitle && entry.ogTitle !== entry.title && (
            <div>
              <span className="inline-block w-24 font-medium text-amber-500">OG Title:</span>
              <Truncate text={entry.ogTitle} max={70} />
              <CharCount text={entry.ogTitle} type="title" />
              <span className="ml-1 text-[10px] text-amber-500">≠ title</span>
            </div>
          )}

          <div>
            <span className="inline-block w-24 font-medium text-gray-500">Description:</span>
            <Truncate text={entry.description} max={120} />
            <CharCount text={entry.description} type="description" />
          </div>
          {entry.ogDescription && entry.ogDescription !== entry.description && (
            <div>
              <span className="inline-block w-24 font-medium text-amber-500">OG Desc:</span>
              <Truncate text={entry.ogDescription} max={120} />
              <CharCount text={entry.ogDescription} type="description" />
              <span className="ml-1 text-[10px] text-amber-500">≠ desc</span>
            </div>
          )}

          <div>
            <span className="inline-block w-24 font-medium text-gray-500">Twitter:</span>
            <span className="text-xs text-gray-500">
              {entry.twitterCard ? `card=${entry.twitterCard}` : "—"}
              {entry.twitterTitle && entry.twitterTitle !== entry.ogTitle
                ? ` · ${entry.twitterTitle.slice(0, 40)}`
                : ""}
            </span>
          </div>

          {entry.ogImage && (
            <div>
              <span className="inline-block w-24 font-medium text-gray-500">OG Image:</span>
              <a
                href={entry.ogImage}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-xs text-blue-500 hover:underline"
              >
                {entry.ogImage.length > 80
                  ? entry.ogImage.slice(0, 80) + "…"
                  : entry.ogImage}
              </a>
              {entry.ogImageWidth && entry.ogImageHeight && (
                <span className="ml-1 text-[10px] text-gray-400">
                  ({entry.ogImageWidth}×{entry.ogImageHeight})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Platform share previews */}
        <SharePreviews entry={entry} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const metadata = {
  title: "OG/Meta Audit | Admin",
};

export const dynamic = "force-dynamic";

const DEFAULT_OPEN = new Set(["Marketing", "Blog"]);

export default async function OgMapPage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.swipestats.io";
  const sitemapEntries = await sitemap();
  const refreshedAt = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Fetch all pages and parse meta tags
  const results = await Promise.allSettled(
    sitemapEntries.map(async (entry): Promise<ParsedMeta> => {
      const url = entry.url;
      let path: string;
      try {
        path = new URL(url).pathname;
      } catch {
        path = url;
      }

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "SwipeStatsOGAuditBot/1.0" },
          next: { revalidate: 0 },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          return {
            url,
            path,
            ...emptyMeta(),
            fetchError: `HTTP ${res.status}`,
          };
        }
        const html = await res.text();
        return { url, path, ...parseMeta(html), fetchError: null };
      } catch (err) {
        return {
          url,
          path,
          ...emptyMeta(),
          fetchError: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  const entries = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          url: "",
          path: "/error",
          ...emptyMeta(),
          fetchError: r.reason instanceof Error ? r.reason.message : "Unknown",
        },
  );

  // Group by route segment
  const groupMap = new Map<string, ParsedMeta[]>();
  for (const entry of entries) {
    const label = groupPath(entry.path);
    const list = groupMap.get(label) ?? [];
    list.push(entry);
    groupMap.set(label, list);
  }
  const groups: RouteGroup[] = [...groupMap.entries()]
    .map(([label, e]) => ({ label, entries: e }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Stats
  const total = entries.length;
  const complete = entries.filter(isComplete).length;
  const missingOgImage = entries.filter((e) => !e.ogImage).length;
  const missingDescription = entries.filter((e) => !e.description).length;
  const missingTitle = entries.filter((e) => !e.title).length;
  const fetchErrors = entries.filter((e) => e.fetchError).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">OG / Meta Audit</h1>
        <p className="mt-1 text-gray-600">
          Live meta tag audit for all pages in the sitemap ({total} pages)
        </p>
        <a
          href="/admin/og-preview"
          className="mt-2 inline-flex items-center gap-1 text-sm text-rose-500 hover:underline"
        >
          ← OG Image Preview & Wall
        </a>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>ℹ️ How this works:</strong> Pages fetched from{" "}
        <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">sitemap.ts</code>.
        Meta tags parsed from server-rendered HTML. Last refreshed:{" "}
        <time className="font-medium">{refreshedAt}</time>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Pages" value={total} />
        <StatCard label="Complete" value={complete} color="text-green-600" />
        <StatCard label="Missing OG Image" value={missingOgImage} color="text-amber-600" />
        <StatCard label="Missing Description" value={missingDescription} color="text-amber-600" />
        <StatCard label="Missing Title" value={missingTitle} color="text-amber-600" />
        <StatCard label="Fetch Errors" value={fetchErrors} color="text-red-600" />
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const groupComplete = group.entries.filter(isComplete).length;
        const groupIssues = group.entries.reduce((sum, e) => sum + countIssues(e), 0);
        const allComplete = groupComplete === group.entries.length;

        return (
          <details
            key={group.label}
            open={DEFAULT_OPEN.has(group.label)}
            className="group/details rounded-lg border"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-3">
                <svg
                  className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open/details:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
                <Badge variant="outline" className="text-xs">
                  {group.entries.length} page{group.entries.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">
                  {groupComplete}/{group.entries.length} complete
                </span>
                {allComplete ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    ✓ All Complete
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300 text-amber-600">
                    {groupIssues} issue{groupIssues !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </summary>
            <div className="border-t">
              {group.entries.map((entry) => (
                <MetaRow key={entry.path} entry={entry} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-0">
        <div className={`text-2xl font-bold ${color ?? ""}`}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </CardContent>
    </Card>
  );
}

function emptyMeta(): Omit<ParsedMeta, "url" | "path" | "fetchError"> {
  return {
    title: null,
    description: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogImageWidth: null,
    ogImageHeight: null,
    twitterCard: null,
    twitterTitle: null,
    twitterImage: null,
  };
}
