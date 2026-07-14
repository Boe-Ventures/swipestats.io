import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe2, MapPin } from "lucide-react";

import { CatalogRequestDialog } from "@/components/catalog/catalog-dialogs";
import { CatalogEntryCard } from "@/components/catalog/catalog-entry-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";
import { CATALOG_CATEGORIES, getCatalogCategoryBySlug } from "@/lib/catalog";
import { trpcApi } from "@/trpc/server";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ location?: string; remote?: string }>;
}

function filterHref({
  category,
  location,
  remote,
}: {
  category: string;
  location?: string;
  remote?: boolean;
}) {
  const query = new URLSearchParams();
  if (location) query.set("location", location);
  if (remote) query.set("remote", "1");
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dating-services/${category}${suffix}`;
}

export default async function DatingServicesCategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const [{ category: categorySlug }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const category = getCatalogCategoryBySlug(categorySlug);
  if (!category) notFound();

  const location = rawSearchParams.location?.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    ? rawSearchParams.location
    : undefined;
  const config = CATALOG_CATEGORIES[category];
  const supportsRemote = category !== "dating_app";
  const includeRemote = supportsRemote && rawSearchParams.remote === "1";
  const api = await trpcApi();
  const [listResult, locations] = await Promise.all([
    api.catalog
      .list({ category, location, includeRemote, tags: [] })
      .catch(() => notFound()),
    api.catalog.locations(),
  ]);
  const { entries, totalCount, place, contextPlaceIds } = listResult;
  const featuredCities = locations.filter(
    (item) => item.kind === "CITY" && item.isFeatured,
  );
  const broaderAreas = locations.filter(
    (item) => item.kind === "COUNTRY" || item.kind === "REGION",
  );

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <nav className="flex items-center gap-2 font-mono text-[12px] text-gray-500">
            <Link href="/dating-services" className="hover:text-rose-600">
              Services
            </Link>
            <span>/</span>
            <span className="text-gray-800">{config.label}</span>
          </nav>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.1em] text-rose-600 uppercase">
                <span className="h-px w-6 bg-rose-400" />
                {config.label}
              </div>
              <h1 className="mt-4 text-[clamp(36px,5vw,56px)] leading-[1.02] font-bold tracking-[-0.04em]">
                {config.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-[17px] leading-7 text-gray-600">
                {config.description} Browse a deliberately small, editor-curated
                catalog across the first SwipeStats launch cities.
              </p>
            </div>
            <div className="font-mono text-[12px] text-gray-500">
              {totalCount} {totalCount === 1 ? "listing" : "listings"}
              {place ? ` · ${place.name}` : ""}
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-2">
            <Link
              href={filterHref({
                category: categorySlug,
                remote: includeRemote,
              })}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                !location
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              All locations
            </Link>
            {featuredCities.map((item) => (
              <Link
                key={item.id}
                href={filterHref({
                  category: categorySlug,
                  location: item.slug,
                  remote: includeRemote,
                })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                  location === item.slug
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                {item.shortName}
              </Link>
            ))}
            {broaderAreas.map((item) => (
              <Link
                key={item.id}
                href={filterHref({
                  category: categorySlug,
                  location: item.slug,
                  remote: includeRemote,
                })}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                  location === item.slug
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300",
                )}
              >
                {item.shortName}
              </Link>
            ))}
            {supportsRemote && (
              <Link
                href={filterHref({
                  category: categorySlug,
                  location,
                  remote: !includeRemote,
                })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                  includeRemote
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                )}
              >
                <Globe2 className="h-3.5 w-3.5" />
                {location ? "Include remote" : "Remote only"}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        {entries.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => (
              <CatalogEntryCard
                key={entry.id}
                entry={entry}
                contextPlaceIds={contextPlaceIds}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
            <h2 className="text-2xl font-bold tracking-[-0.03em]">
              No {config.shortLabel.toLowerCase()}{" "}
              {location ? `in ${place?.name ?? location}` : "here yet"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              Try remote-friendly providers, or send a private request and
              we&apos;ll use it to prioritize who gets added next.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!includeRemote && (
                <ButtonLink
                  variant="outline"
                  href={filterHref({
                    category: categorySlug,
                    location,
                    remote: true,
                  })}
                >
                  Show remote providers
                </ButtonLink>
              )}
              <CatalogRequestDialog
                category={category}
                locations={locations}
                trigger={<Button>Request help</Button>}
              />
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-8">
          <ButtonLink variant="ghost" href="/dating-services">
            <ArrowLeft className="h-4 w-4" />
            All services
          </ButtonLink>
          <CatalogRequestDialog
            category={category}
            locations={locations}
            trigger={
              <Button variant="outline">Can&apos;t find the right fit?</Button>
            }
          />
        </div>
      </section>
    </main>
  );
}
