import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, Globe2, MapPin } from "lucide-react";

import { CatalogEntryCard } from "@/components/catalog/catalog-entry-card";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";
import {
  CATALOG_CATEGORIES,
  CATALOG_CATEGORY_KEYS,
  CATALOG_PLACE_OPTIONS,
  getCatalogLocationBreadcrumb,
  getCatalogPlaceBySlug,
  isCatalogLocationFilterKey,
  type CatalogLocationFilterKey,
} from "@/lib/catalog";
import { trpcApi } from "@/trpc/server";

interface LocationPageProps {
  params: Promise<{ location: string }>;
  searchParams: Promise<{ remote?: string }>;
}

const getLocationEntries = cache(
  async (location: CatalogLocationFilterKey, includeRemote: boolean) => {
    const api = await trpcApi();
    return api.catalog.byLocation({ location, includeRemote });
  },
);

export async function generateMetadata({
  params,
}: Pick<LocationPageProps, "params">): Promise<Metadata> {
  const { location } = await params;
  if (!isCatalogLocationFilterKey(location)) {
    return { robots: { index: false, follow: false } };
  }

  const place = getCatalogPlaceBySlug(location);
  const { totalCount } = await getLocationEntries(location, false);
  return {
    title: `Dating Services in ${place.name}`,
    description: `Browse SwipeStats-curated dating coaches, photographers, matchmakers, and local dating-app market notes for ${place.name}.`,
    alternates: { canonical: `/dating-services/location/${place.slug}` },
    robots:
      totalCount > 0
        ? { index: true, follow: true }
        : { index: false, follow: true },
  };
}

function locationHref(location: CatalogLocationFilterKey, remote: boolean) {
  return `/dating-services/location/${location}${remote ? "?remote=1" : ""}`;
}

export default async function DatingServicesLocationPage({
  params,
  searchParams,
}: LocationPageProps) {
  const [{ location: rawLocation }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isCatalogLocationFilterKey(rawLocation)) {
    notFound();
  }

  const location = rawLocation;
  const includeRemote = rawSearchParams.remote === "1";
  const selectedPlace = getCatalogPlaceBySlug(location);
  const breadcrumb = getCatalogLocationBreadcrumb(location);
  const featuredCities = CATALOG_PLACE_OPTIONS.filter(
    (place) => place.kind === "city" && place.isFeatured,
  );
  const broaderAreas = CATALOG_PLACE_OPTIONS.filter(
    (place) => place.kind === "country" || place.kind === "region",
  );
  const { entries, totalCount } = await getLocationEntries(
    location,
    includeRemote,
  );
  const groupedEntries = CATALOG_CATEGORY_KEYS.map((category) => ({
    category,
    entries: entries.filter((entry) => entry.primaryCategory === category),
  })).filter((group) => group.entries.length > 0);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <nav className="flex items-center gap-2 font-mono text-[12px] text-gray-500">
            <Link href="/dating-services" className="hover:text-rose-600">
              Services
            </Link>
            {breadcrumb.map((place) => (
              <span key={place.id} className="flex items-center gap-2">
                <span>/</span>
                {place.id === selectedPlace.id ? (
                  <span className="text-gray-800">{place.shortName}</span>
                ) : (
                  <Link
                    href={locationHref(place.slug, includeRemote)}
                    className="hover:text-rose-600"
                  >
                    {place.shortName}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.1em] text-rose-600 uppercase">
                <span className="h-px w-6 bg-rose-400" />
                Local catalog
              </div>
              <h1 className="mt-4 text-[clamp(38px,5vw,58px)] leading-[1.02] font-bold tracking-[-0.04em]">
                Dating services in {selectedPlace.name}
              </h1>
              <p className="mt-5 max-w-2xl text-[17px] leading-7 text-gray-600">
                Browse local providers and apps with a meaningful presence in
                this market. Remote services stay optional.
              </p>
            </div>
            <div className="font-mono text-[12px] text-gray-500">
              {totalCount} {totalCount === 1 ? "listing" : "listings"} ·{" "}
              {groupedEntries.length}{" "}
              {groupedEntries.length === 1 ? "category" : "categories"}
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-2">
            {featuredCities.map((place) => (
              <Link
                key={place.id}
                href={locationHref(place.slug, includeRemote)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                  location === place.slug
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                {place.shortName}
              </Link>
            ))}
            {broaderAreas.map((place) => (
              <Link
                key={place.id}
                href={locationHref(place.slug, includeRemote)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                  location === place.slug
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300",
                )}
              >
                {place.shortName}
              </Link>
            ))}
            <Link
              href={locationHref(location, !includeRemote)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                includeRemote
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              <Globe2 className="h-3.5 w-3.5" />
              Include remote services
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
        {groupedEntries.length > 0 ? (
          <div className="space-y-16">
            {groupedEntries.map((group) => {
              const config = CATALOG_CATEGORIES[group.category];
              return (
                <section key={group.category}>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="font-mono text-[11px] text-gray-500 uppercase">
                        {group.entries.length}{" "}
                        {group.entries.length === 1 ? "listing" : "listings"}
                      </div>
                      <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em]">
                        {config.label}
                      </h2>
                    </div>
                    <Link
                      href={`/dating-services/${config.slug}?location=${location}`}
                      className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                    >
                      View only {config.shortLabel.toLowerCase()} →
                    </Link>
                  </div>
                  <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {group.entries.map((entry) => (
                      <CatalogEntryCard
                        key={entry.id}
                        entry={entry}
                        contextLocation={location}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
            <h2 className="text-2xl font-bold tracking-[-0.03em]">
              No local listings in {selectedPlace.name} yet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              Include remote services, or browse by category while the local
              catalog fills in.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!includeRemote && (
                <ButtonLink
                  variant="outline"
                  href={locationHref(location, true)}
                >
                  Show remote services
                </ButtonLink>
              )}
              <ButtonLink href="/dating-services">
                Browse all services
              </ButtonLink>
            </div>
          </div>
        )}

        <div className="mt-14 border-t border-gray-200 pt-8">
          <ButtonLink variant="ghost" href="/dating-services">
            <ArrowLeft className="h-4 w-4" />
            All services
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
