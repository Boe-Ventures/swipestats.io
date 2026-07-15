"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

interface CatalogListingBarProps {
  onDismiss: () => void;
}

export function CatalogListingBar({ onDismiss }: CatalogListingBarProps) {
  return (
    <aside
      data-catalog-listing-bar
      aria-label="List a service or product with SwipeStats"
      className="from-primary to-primary sticky top-0 z-40 h-16 bg-linear-to-r via-rose-700 text-white sm:h-11"
    >
      <div className="mx-auto grid h-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center px-3 sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
        <span className="hidden justify-self-start text-xs font-semibold tracking-wide text-white/70 sm:block">
          Dating services catalog
        </span>

        <Link
          href="/dating-services#list-with-us"
          className="group min-w-0 justify-self-start rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rose-700 sm:justify-self-center"
        >
          <span className="block text-[10px] leading-3 font-semibold tracking-wide text-white/70 sm:hidden">
            For providers and builders
          </span>
          <span className="flex items-center gap-1.5 text-sm leading-5 whitespace-nowrap">
            <span className="font-semibold">
              Run a dating service or product?
            </span>
            <span
              aria-hidden="true"
              className="font-semibold text-white/80 transition-transform group-hover:translate-x-0.5 sm:hidden"
            >
              &rarr;
            </span>
            <span className="hidden font-semibold text-white/80 transition-colors group-hover:text-white sm:inline">
              List with SwipeStats <span aria-hidden="true">&rarr;</span>
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 inline-flex size-10 items-center justify-center justify-self-end rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-9"
        >
          <span className="sr-only">Dismiss listing banner</span>
          <XMarkIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
    </aside>
  );
}
