import { XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

import { cn } from "@/components/ui/lib/utils";

interface BannerProps {
  title?: string;
  message?: string | React.ReactNode;
  onDismiss?: () => void;
  showDismiss?: boolean;
  ctaText?: React.ReactNode;
  ctaOnClick?: () => void;
  /** Renders the CTA as a link instead of a button. Takes precedence over ctaOnClick. */
  ctaHref?: string;
  /** Optional pill rendered before the title (e.g. "New"). */
  badge?: string;
  /** Uses a compact two-line mobile composition with an inline CTA. */
  compactMobile?: boolean;
  /** Shorter title used by the compact mobile composition. */
  mobileTitle?: React.ReactNode;
  /** Shorter detail copy used by the compact mobile composition. */
  mobileMessage?: React.ReactNode;
  /** Matches the CTA sizing to the compact badge treatment. */
  compactCta?: boolean;
}

const CTA_CLASSNAME =
  "flex-none rounded-full bg-gray-900 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:py-1";

export function Banner({
  title = "GeneriCon 2023",
  message = "Join us in Denver from June 7 – 9 to see what's coming next.",
  onDismiss,
  showDismiss = false,
  ctaText,
  ctaOnClick,
  ctaHref,
  badge,
  compactMobile = false,
  mobileTitle,
  mobileMessage,
  compactCta = false,
}: BannerProps) {
  return (
    <div
      className={cn(
        "relative isolate z-40 flex items-start gap-3 overflow-hidden bg-gray-50 px-4 py-3 sm:items-center sm:gap-x-6 sm:px-3.5 sm:py-2.5 sm:before:flex-1",
        compactMobile && "items-center gap-1 py-2.5",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
          }}
          className="aspect-[577/310] w-[36rem] bg-linear-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
          }}
          className="aspect-[577/310] w-[36rem] bg-linear-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
        />
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4",
          compactMobile && "gap-0.5",
        )}
      >
        <p
          className={cn(
            "min-w-0 text-[13px]/5 text-gray-900 sm:text-sm/6",
            compactMobile && "w-full sm:w-auto",
          )}
        >
          {badge && (
            <span className="mr-2 inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
              {badge}
            </span>
          )}
          <strong className="block font-semibold sm:inline">
            {compactMobile && (
              <span className="sm:hidden">{mobileTitle ?? title}</span>
            )}
            <span className={cn(compactMobile && "hidden sm:inline")}>
              {title}
            </span>
          </strong>
          <svg
            viewBox="0 0 2 2"
            aria-hidden="true"
            className="mx-2 hidden size-0.5 fill-current sm:inline"
          >
            <circle r={1} cx={1} cy={1} />
          </svg>
          {compactMobile && (
            <span className="block truncate text-gray-600 sm:hidden">
              {mobileMessage ?? message}
              {ctaText && ctaHref && (
                <>
                  <span aria-hidden="true"> · </span>
                  <Link
                    href={ctaHref}
                    className="font-semibold text-rose-600 hover:text-rose-700"
                  >
                    {ctaText} <span aria-hidden="true">&rarr;</span>
                  </Link>
                </>
              )}
            </span>
          )}
          <span
            className={cn(
              "mt-0.5 block text-gray-700 sm:mt-0 sm:inline sm:text-gray-900",
              compactMobile && "hidden sm:inline",
            )}
          >
            {message}
          </span>
        </p>
        {ctaText && ctaHref && (
          <Link
            href={ctaHref}
            className={cn(
              CTA_CLASSNAME,
              compactCta && "px-2 py-0.5 text-xs sm:py-0.5",
              compactMobile && "hidden sm:flex",
            )}
          >
            {ctaText} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
        {ctaText && !ctaHref && ctaOnClick && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              ctaOnClick();
            }}
            className={cn(
              CTA_CLASSNAME,
              compactCta && "px-2 py-0.5 text-xs sm:py-0.5",
            )}
          >
            {ctaText} <span aria-hidden="true">&rarr;</span>
          </a>
        )}
      </div>
      {showDismiss && onDismiss && (
        <div className="flex flex-none sm:flex-1 sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "-m-2 p-2 focus-visible:-outline-offset-4 sm:-m-3 sm:p-3",
              compactMobile && "-mr-3 size-11 p-3 sm:mr-0 sm:size-auto",
            )}
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon aria-hidden="true" className="size-5 text-gray-900" />
          </button>
        </div>
      )}
    </div>
  );
}
