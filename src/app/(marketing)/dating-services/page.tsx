import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Camera,
  Globe2,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";

import { CatalogEntryCard } from "@/components/catalog/catalog-entry-card";
import { CatalogSubmissionDialog } from "@/components/catalog/catalog-dialogs";
import { CatalogTrustBadges } from "@/components/catalog/catalog-trust-badges";
import { Panel } from "@/components/golden";
import { Button } from "@/components/ui/button";
import {
  CATALOG_CATEGORIES,
  CATALOG_CATEGORY_KEYS,
  type CatalogCategoryKey,
} from "@/lib/catalog";
import { trpcApi } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Dating Services Directory",
  description:
    "Find dating coaches, photographers, matchmakers, AI photo services, and dating apps curated by SwipeStats.",
};

const categoryIcons: Record<CatalogCategoryKey, LucideIcon> = {
  dating_coach: UserRound,
  dating_photographer: Camera,
  matchmaker: HeartHandshake,
  ai_photo_generation: Sparkles,
  dating_app: Smartphone,
};

export default async function DatingServicesPage() {
  const api = await trpcApi();
  const { counts, featuredEntries, locations } = await api.catalog.overview();
  const featuredCities = locations.filter(
    (location) => location.kind === "CITY" && location.isFeatured,
  );
  const broaderAreas = locations.filter(
    (location) => location.kind === "COUNTRY" || location.kind === "REGION",
  );
  const countByCategory = new Map(
    counts.map((row) => [row.category, Number(row.count)]),
  );

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="relative overflow-hidden border-b border-gray-200">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.92_0.01_286/0.45)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.92_0.01_286/0.45)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_92%)] bg-[size:80px_80px]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 font-mono text-[12px] font-medium tracking-[0.12em] text-rose-600 uppercase">
              <span className="h-px w-6 bg-rose-400" />
              Dating services
            </div>
            <h1 className="mt-6 max-w-4xl text-[clamp(44px,7vw,76px)] leading-[0.98] font-bold tracking-[-0.045em] text-balance">
              Found the problem in your stats? Find the fix.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-8 text-gray-600 sm:text-[20px]">
              A curated guide to coaches, photographers, matchmakers, and tools
              that can improve dating-app results. Hand-picked and clearly
              labeled.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs">
                <MapPin className="h-4 w-4 text-rose-600" />
                Launching in six cities
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs">
                <Globe2 className="h-4 w-4 text-emerald-600" />
                Remote-friendly
              </span>
            </div>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-gray-200 bg-gray-200 shadow-[0_1px_2px_oklch(0.2_0.02_286/0.05)] sm:grid-cols-2 lg:grid-cols-5">
            {CATALOG_CATEGORY_KEYS.map((key) => {
              const category = CATALOG_CATEGORIES[key];
              const Icon = categoryIcons[key];
              const count = countByCategory.get(key) ?? 0;
              return (
                <Link
                  key={key}
                  href={`/dating-services/${category.slug}`}
                  className="group flex min-h-[240px] flex-col bg-white p-6 transition hover:bg-rose-50/40"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 transition group-hover:bg-rose-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-6 text-[17px] font-bold tracking-[-0.02em]">
                    {category.shortLabel}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {category.description}
                  </p>
                  <span className="mt-auto flex items-center gap-1 pt-5 font-mono text-[11px] text-rose-600">
                    {count > 0
                      ? `${count} ${count === 1 ? "listing" : "listings"}`
                      : "Opening soon"}
                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {featuredCities.map((location) => (
              <Link
                key={location.id}
                href={`/dating-services/location/${location.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3.5 py-2 font-mono text-[11px] text-gray-600 transition hover:border-rose-300 hover:text-rose-600"
              >
                {location.shortName}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[10px] tracking-[0.08em] text-gray-400 uppercase">
              Broader areas
            </span>
            {broaderAreas.map((location) => (
              <Link
                key={location.id}
                href={`/dating-services/location/${location.slug}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 font-mono text-[11px] text-gray-600 transition hover:border-rose-300 hover:text-rose-600"
              >
                {location.shortName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featuredEntries.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] font-medium tracking-[0.08em] text-gray-500 uppercase">
                Start here
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em]">
                Curated listings
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-gray-500">
              A small catalog on purpose. Every entry is added or approved by a
              SwipeStats editor.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredEntries.map((entry) => (
              <CatalogEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-16 lg:grid-cols-[1.6fr_1fr] lg:px-8">
          <Panel className="flex items-start gap-4 shadow-none">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-rose-50 text-rose-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em]">
                Labels mean exactly one thing
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Verified, featured, affiliate, and editorial are separate
                signals. Paying for placement never implies editorial
                preference. Ownership status stays out of the way for now.
              </p>
              <CatalogTrustBadges
                className="mt-4"
                verified
                featured
                editorialPick
                affiliate
              />
            </div>
          </Panel>
          <Panel className="flex flex-col justify-between shadow-none">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em]">
                Are you a provider or builder?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Ask us to add a listing, or claim an editor-created listing from
                its detail page.
              </p>
            </div>
            <CatalogSubmissionDialog
              locations={locations}
              trigger={
                <Button className="mt-6 w-fit" variant="outline">
                  Submit a listing
                </Button>
              }
            />
          </Panel>
        </div>
      </section>
    </main>
  );
}
