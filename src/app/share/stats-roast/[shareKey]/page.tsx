// Public share page for the STATS roast (ai_output kinds tinder_roast /
// hinge_roast) — the data-driven roast of a profile's ProfileMeta numbers.
// Distinct from /share/profile-roast (kind profile_roast, the vision roast).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { db } from "@/server/db";
import { aiOutputTable, type StatsRoastResult } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ shareKey: string }>;
}

async function getRoast(shareKey: string) {
  const row = await db.query.aiOutputTable.findFirst({
    where: eq(aiOutputTable.shareKey, shareKey),
  });
  if (
    !row?.isPublic ||
    (row.kind !== "tinder_roast" && row.kind !== "hinge_roast")
  ) {
    return null;
  }
  const output = row.output as StatsRoastResult;
  // Defensive on the public path: a malformed/older-version payload renders the
  // not-found state rather than throwing for an anonymous viewer.
  if (!Array.isArray(output.roastLines)) return null;
  // PAYWALL: only the first 3 lines may reach the browser. CSS blur is not
  // access control, so the locked lines must never enter the server-rendered
  // HTML — mirror roast.getPublic and drop them here.
  return {
    tagline: output.tagline,
    headline: output.headline,
    verdict: output.verdict,
    roastLines: output.roastLines.slice(0, 3),
    hiddenCount: Math.max(0, output.roastLines.length - 3),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareKey } = await params;
  const roast = await getRoast(shareKey);

  if (!roast) {
    return { title: "Roast Not Found" };
  }

  // The dynamic share card lives in opengraph-image.tsx (colocated); Next wires
  // it into both og:image and twitter:image automatically.
  const title = roast.tagline
    ? `${roast.tagline} — My Dating App Roast`
    : "My Dating App Roast";
  const description = roast.verdict ?? roast.headline;

  return {
    // Root title.template appends " | SwipeStats" to the document <title>.
    title: "My Dating App Roast",
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedRoastPage({ params }: Props) {
  const { shareKey } = await params;
  const roast = await getRoast(shareKey);

  if (!roast) {
    notFound();
  }

  const previewLines = roast.roastLines;
  const hiddenCount = roast.hiddenCount;

  return (
    <main className="min-h-screen bg-[#0f0a1e]">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-600 to-pink-700 text-lg">
              📊
            </div>
            <span className="font-bold text-white">SwipeStats</span>
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Get roasted →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Verdict badge */}
        <div className="mb-8 text-center">
          <div className="inline-block rounded-full bg-rose-500/15 px-5 py-2 text-sm font-bold tracking-widest text-rose-300 uppercase">
            {roast.tagline || "The Roast"}
          </div>
        </div>

        {/* Headline + verdict */}
        <blockquote className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-2xl font-medium text-white/90 italic sm:text-3xl">
            {`"${roast.headline}"`}
          </p>
          {roast.verdict && (
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/50">
              {roast.verdict}
            </p>
          )}
        </blockquote>

        {/* Preview roast lines */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-white/40 uppercase">
            The Roast
          </h2>
          <ul className="space-y-3">
            {previewLines.map((line, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <span className="mt-0.5 text-lg">🔥</span>
                <p className="leading-relaxed text-white/85">{line}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Paywall blur for remaining lines */}
        {hiddenCount > 0 && (
          <div className="relative mb-8">
            {/* Blurred preview of remaining lines */}
            <ul className="space-y-3 select-none" aria-hidden>
              {Array.from({ length: Math.min(hiddenCount, 3) }).map((_, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4 blur-sm"
                >
                  <span className="mt-0.5 text-lg">🔥</span>
                  <p className="leading-relaxed text-white/85">
                    Another brutally accurate read on your dating data, locked
                    until you upload your own.
                  </p>
                </li>
              ))}
            </ul>

            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#0f0a1e]/80 backdrop-blur-sm">
              <p className="mb-1 text-lg font-bold text-white">
                +{hiddenCount} more roast lines
              </p>
              <p className="mb-4 text-sm text-white/50">
                Plus Real Talk insights & shareable card
              </p>
              <Link
                href="/"
                className="rounded-xl bg-rose-600 px-6 py-3 font-semibold text-white transition hover:bg-rose-500"
              >
                Upload your data to get roasted →
              </Link>
            </div>
          </div>
        )}

        {/* CTA section */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
          <h3 className="mb-2 text-xl font-bold text-white">
            How does your dating game stack up?
          </h3>
          <p className="mb-6 text-white/60">
            Upload your Tinder or Hinge data to get your own AI roast + real
            insights to actually improve.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-rose-600 px-8 py-3 font-semibold text-white transition hover:bg-rose-500"
          >
            Get roasted for free →
          </Link>
          <p className="mt-4 text-xs text-white/30">
            Powered by SwipeStats · Your data never leaves your browser
          </p>
        </div>
      </div>
    </main>
  );
}
