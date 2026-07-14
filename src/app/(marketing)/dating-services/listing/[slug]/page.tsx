import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  Globe2,
  Link2,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import {
  CatalogClaimDialog,
  CatalogRequestDialog,
} from "@/components/catalog/catalog-dialogs";
import { CatalogTrustBadges } from "@/components/catalog/catalog-trust-badges";
import { Panel } from "@/components/golden";
import { Button } from "@/components/ui/button";
import {
  CATALOG_CATEGORIES,
  CATALOG_CITIES,
  formatCatalogTag,
} from "@/lib/catalog";
import { trpcApi } from "@/trpc/server";

interface ListingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CatalogListingPage({ params }: ListingPageProps) {
  const { slug } = await params;
  const api = await trpcApi();
  const entry = await api.catalog.bySlug({ slug }).catch(() => notFound());
  const category = CATALOG_CATEGORIES[entry.primaryCategory];
  const affiliate = entry.data.links?.some((link) => link.type === "affiliate");
  const primaryLink =
    entry.data.links?.find((link) => link.type === "booking") ??
    entry.data.links?.find((link) => link.type === "affiliate") ??
    entry.data.links?.find((link) => link.type === "official");
  const roastLens = entry.data.sourceRefs?.find(
    (ref) => ref.namespace === "profile_roast_lens",
  );
  const serviceTags = Array.from(
    new Map(
      [...(entry.data.services ?? []), ...(entry.data.tags ?? [])].map(
        (value) => [value.toLowerCase(), value],
      ),
    ).values(),
  );
  const initials = entry.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-5 font-mono text-[12px] text-gray-500 lg:px-8">
          <Link href="/dating-services" className="hover:text-rose-600">
            Services
          </Link>
          <span>/</span>
          <Link
            href={"/dating-services/" + category.slug}
            className="hover:text-rose-600"
          >
            {category.label}
          </Link>
          <span>/</span>
          <span className="text-gray-800">{entry.name}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="px-6 py-12 lg:border-r lg:border-gray-200 lg:px-8 lg:py-16">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {entry.data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- catalog URLs are editorially curated and may be external
              <img
                src={entry.data.imageUrl}
                alt=""
                className="h-28 w-28 rounded-3xl border border-gray-200 object-cover"
              />
            ) : (
              <div className="grid h-28 w-28 flex-none place-items-center rounded-3xl border border-gray-200 bg-gray-50 font-mono text-xl font-semibold text-gray-400">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[clamp(36px,5vw,56px)] leading-[1] font-bold tracking-[-0.04em]">
                {entry.name}
              </h1>
              {entry.data.descriptor && (
                <p className="mt-3 text-lg text-gray-600">
                  {entry.data.descriptor}
                  {entry.data.organizationName
                    ? " · " + entry.data.organizationName
                    : ""}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                {entry.locationKeys.map((key) => (
                  <span key={key} className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {CATALOG_CITIES[key].label}
                  </span>
                ))}
                {entry.remote && entry.primaryCategory !== "dating_app" && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <Globe2 className="h-4 w-4" />
                    Available remotely
                  </span>
                )}
              </div>
              <CatalogTrustBadges
                className="mt-5"
                claimed={!!entry.claimedAt}
                verified={entry.verificationStatus === "VERIFIED"}
                featured={entry.featured}
                editorialPick={entry.editorialPick}
                affiliate={affiliate}
              />
            </div>
          </header>

          <section className="mt-12 border-l-[3px] border-rose-600 pl-6">
            <div className="font-mono text-[11px] font-medium tracking-[0.09em] text-rose-600 uppercase">
              SwipeStats editorial
            </div>
            <p className="mt-3 text-[18px] leading-8 text-gray-700">
              {entry.data.editorialSummary}
            </p>
          </section>

          {entry.data.providerSummary && (
            <section className="mt-10">
              <div className="font-mono text-[11px] font-medium tracking-[0.09em] text-gray-500 uppercase">
                From the provider
              </div>
              <p className="mt-3 text-[16px] leading-7 text-gray-600">
                {entry.data.providerSummary}
              </p>
            </section>
          )}

          {entry.data.marketSignals && entry.data.marketSignals.length > 0 && (
            <section className="mt-10">
              <div className="font-mono text-[11px] font-medium tracking-[0.09em] text-violet-600 uppercase">
                Market notes
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {entry.data.marketSignals.map((signal) => (
                  <div
                    key={signal.locationKey}
                    className="rounded-xl border border-violet-100 bg-violet-50/40 p-4"
                  >
                    <div className="font-semibold text-gray-900">
                      {CATALOG_CITIES[signal.locationKey].shortLabel}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-violet-700 uppercase">
                      {formatCatalogTag(signal.strength)}
                      {signal.asOf ? ` · ${signal.asOf}` : ""}
                    </div>
                    {signal.note && (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {signal.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {serviceTags.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-bold tracking-[-0.02em]">Services</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {serviceTags.map((service) => (
                  <span
                    key={service}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-[12px] text-gray-600"
                  >
                    {formatCatalogTag(service)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {roastLens && (
            <Panel className="mt-10 flex items-start gap-4 border-violet-200 bg-violet-50/40 shadow-none">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-violet-100 text-violet-700">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold tracking-[-0.02em]">
                  Also available as a Profile Compare voice
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-gray-600">
                  SwipeStats can apply this creator&apos;s documented
                  perspective as an AI review lens. The listing and prompt stay
                  separate, connected by the source key{" "}
                  <code className="font-mono text-violet-700">
                    {roastLens.key}
                  </code>
                  .
                </p>
              </div>
            </Panel>
          )}
        </article>

        <aside className="bg-gray-50 px-6 py-10 lg:px-8 lg:py-16">
          <div className="sticky top-28 space-y-5">
            <Panel className="shadow-none">
              {entry.data.priceLabel && (
                <div className="text-3xl font-bold tracking-[-0.04em]">
                  {entry.data.priceLabel}
                </div>
              )}
              {entry.data.priceDetail && (
                <p className="mt-1 text-sm text-gray-500">
                  {entry.data.priceDetail}
                </p>
              )}

              <div className="mt-6 grid gap-3">
                {primaryLink && (
                  <Button asChild size="lg" className="w-full">
                    <a
                      href={primaryLink.url}
                      target="_blank"
                      rel={
                        primaryLink.type === "affiliate"
                          ? "noopener noreferrer sponsored"
                          : "noopener noreferrer"
                      }
                    >
                      {entry.data.primaryCtaLabel ??
                        primaryLink.label ??
                        "Visit provider"}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <CatalogRequestDialog
                  category={entry.primaryCategory}
                  targetEntryId={entry.id}
                  targetName={entry.name}
                  trigger={
                    <Button variant="outline" size="lg" className="w-full">
                      Request help via SwipeStats
                    </Button>
                  }
                />
              </div>

              <p className="mt-5 text-center font-mono text-[10.5px] leading-5 text-gray-400">
                {primaryLink
                  ? "External booking does not require a SwipeStats account."
                  : "Your request stays private and does not require a SwipeStats account."}
                {affiliate
                  ? " SwipeStats may earn from the outbound link."
                  : ""}
              </p>
            </Panel>

            {entry.data.links && entry.data.links.length > 0 && (
              <Panel className="shadow-none">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <Link2 className="h-4 w-4 text-gray-400" />
                  Links
                </h2>
                <div className="mt-4 grid gap-3">
                  {entry.data.links.map((link) => (
                    <a
                      key={link.type + "-" + link.url}
                      href={link.url}
                      target="_blank"
                      rel={
                        link.type === "affiliate"
                          ? "noopener noreferrer sponsored"
                          : "noopener noreferrer"
                      }
                      className="flex items-center justify-between gap-3 text-sm text-gray-600 hover:text-rose-600"
                    >
                      <span>{link.label ?? formatCatalogTag(link.type)}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </Panel>
            )}

            {!entry.claimedAt && (
              <Panel className="border-dashed shadow-none">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck className="h-4 w-4 text-gray-400" />
                  Is this your listing?
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Verified owners can manage provider-supplied details while
                  SwipeStats keeps its editorial notes independent.
                </p>
                <CatalogClaimDialog
                  entryId={entry.id}
                  entryName={entry.name}
                  trigger={
                    <Button variant="outline" className="mt-4 w-full">
                      Claim this listing
                    </Button>
                  }
                />
              </Panel>
            )}

            <div className="flex items-start gap-2 px-1 text-xs leading-5 text-gray-400">
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-none" />
              Listings are reviewed editorially and may not reflect every
              provider&apos;s latest availability.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
