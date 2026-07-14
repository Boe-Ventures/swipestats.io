import Link from "next/link";
import { ArrowRight, Globe2, MapPin } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";
import {
  CATALOG_CITIES,
  formatCatalogTag,
  type CatalogEntryData,
  type CatalogCityKey,
} from "@/lib/catalog";
import { CatalogTrustBadges } from "./catalog-trust-badges";

interface CatalogEntryCardProps {
  entry: {
    slug: string;
    name: string;
    verificationStatus: "UNVERIFIED" | "VERIFIED";
    claimedAt: Date | null;
    featured: boolean;
    editorialPick: boolean;
    remote: boolean;
    locationKeys: CatalogCityKey[];
    data: CatalogEntryData;
  };
  className?: string;
}

export function CatalogEntryCard({ entry, className }: CatalogEntryCardProps) {
  const affiliate = entry.data.links?.some((link) => link.type === "affiliate");
  const location = entry.locationKeys[0]
    ? CATALOG_CITIES[entry.locationKeys[0]].shortLabel
    : null;
  const initials = entry.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <article
      className={cn(
        "group relative flex min-h-[360px] flex-col rounded-2xl border bg-white p-6 shadow-[0_1px_2px_oklch(0.2_0.02_286/0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_2px_6px_oklch(0.2_0.02_286/0.05),0_12px_28px_oklch(0.2_0.02_286/0.08)]",
        entry.featured ? "border-amber-300" : "border-gray-200",
        !entry.claimedAt && "border-dashed",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {entry.data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- catalog URLs are editorially curated and may be external
          <img
            src={entry.data.imageUrl}
            alt=""
            className="h-14 w-14 rounded-2xl border border-gray-200 object-cover"
          />
        ) : (
          <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl border border-gray-200 bg-gray-50 font-mono text-sm font-semibold text-gray-500">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[19px] leading-tight font-bold tracking-[-0.02em] text-gray-900">
            <Link
              href={`/dating-services/listing/${entry.slug}`}
              className="after:absolute after:inset-0"
            >
              {entry.name}
            </Link>
          </h2>
          {entry.data.descriptor && (
            <p className="mt-1 text-sm text-gray-500">
              {entry.data.descriptor}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            {entry.remote && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Globe2 className="h-3.5 w-3.5" />
                Remote
              </span>
            )}
          </div>
        </div>
      </div>

      <CatalogTrustBadges
        className="relative z-10 mt-5"
        claimed={!!entry.claimedAt}
        verified={entry.verificationStatus === "VERIFIED"}
        featured={entry.featured}
        editorialPick={entry.editorialPick}
        affiliate={affiliate}
      />

      <p className="mt-5 line-clamp-4 text-[14.5px] leading-6 text-gray-600">
        {entry.data.editorialSummary}
      </p>

      {entry.data.tags && entry.data.tags.length > 0 && (
        <div className="relative z-10 mt-5 flex flex-wrap gap-1.5">
          {entry.data.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600"
            >
              {formatCatalogTag(tag)}
            </span>
          ))}
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 border-t border-gray-100 pt-5">
        <div>
          {entry.data.priceLabel && (
            <div className="text-sm font-semibold text-gray-900">
              {entry.data.priceLabel}
            </div>
          )}
          {!entry.claimedAt && (
            <div className="font-mono text-[11px] text-gray-400">
              Is this you? Claim it
            </div>
          )}
        </div>
        <ButtonLink
          href={`/dating-services/listing/${entry.slug}`}
          variant={entry.featured ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
        >
          View listing
          <ArrowRight className="h-3.5 w-3.5" />
        </ButtonLink>
      </div>
    </article>
  );
}
