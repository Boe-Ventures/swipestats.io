import Link from "next/link";
import { cn } from "@/components/ui/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Golden APP-SHELL chrome — the functional, solid dialect of the golden
 * design language (NOT the translucent marketing blur header). White surfaces,
 * gray-200 hairlines, rose-600 accent, shadow-xs. A real golden design pass for
 * the authenticated app, pairing with the app.tsx data primitives.
 *
 * Presentational + server-safe (no hooks). Pass an `active` key to light up the
 * current nav item; links and brand are plain anchors so this works anywhere.
 */

/* ---------------------------------------------------------------- brand mark */

/**
 * The flame brand mark — 30px rose-600 rounded square holding the white
 * SwipeStats flame. Path reused from src/components/ui/NewOldLogo (viewBox
 * 25 25 160 160). Kept inline so the shell has no client deps.
 */
function FlameMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-rose-600 text-white shadow-[0_1px_2px_oklch(0.5_0.2_17/0.3)]",
        className,
      )}
    >
      <svg
        viewBox="25 25 160 160"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[18px] w-[18px]"
        fill="currentColor"
      >
        <g transform="matrix(1.702461, 0, 0, 1.702461, 22.997358, 22.997534)">
          <g transform="scale(1 -1)">
            <g transform="translate(0 -96)">
              <path d="M 21.633,34.925 C 24.973,46.855 40.837,53.71 46.922,66.223 C 49.866,72.279 48.49,83.461 43.464,87.939 C 43.197,88.178 42.09,90.326 43.217,89.521 C 54.416,81.327 63.521,70.509 59.309,60.068 C 53.464,45.577 38.409,38.34 38.519,23.585 C 38.566,17.447 43.088,12.523 48.838,7.375 L 49.073,6.299 C 34.143,10.56 17.742,21.028 21.633,34.925 Z M 59.314,18.723 C 67.987,26.524 73.282,31.263 71.043,40.298 C 73.766,36.119 76.295,30.323 74.135,25.806 C 72.203,21.769 70.28,18.956 63.244,15.02 C 59.515,12.935 56.712,10.677 54.37,6.898 C 54.248,10.853 55.011,14.852 59.314,18.723 Z M 49.686,32.153 C 53.003,38.255 57.845,42.622 62.538,48.882 C 65.869,53.325 68.92,60.704 65.731,66.728 L 65.937,67.016 C 70.824,61.556 71.028,52.654 69.495,46.059 C 67.086,35.69 58.5,31.5 53.511,23.918 C 51.557,20.948 50.446,17.311 51,13.5 C 45.461,18.021 46.727,26.69 49.686,32.153 Z" />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}

/** Wordmark + flame, links home. */
function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/app"
      className={cn(
        "flex flex-none items-center gap-2.5 text-gray-900 transition hover:opacity-90",
        className,
      )}
    >
      <FlameMark />
      <span className="text-[17px] font-bold tracking-[-0.02em]">
        SwipeStats
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- nav model */

export type GoldenNavKey = "dashboard" | "photos" | "research";

export type GoldenNavLink = {
  key: GoldenNavKey;
  label: string;
  href: string;
};

export const DEFAULT_GOLDEN_NAV: GoldenNavLink[] = [
  { key: "dashboard", label: "Dashboard", href: "/app" },
  { key: "photos", label: "Photos", href: "/app/photos" },
  { key: "research", label: "Research", href: "/research" },
];

/** Tiny duotone glyphs for the sidebar rows. Inherit currentColor. */
function NavIcon({ icon }: { icon: GoldenNavKey }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px] flex-none",
  };
  if (icon === "dashboard")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    );
  if (icon === "photos")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <circle cx="8.5" cy="8.5" r="1.6" />
        <path d="M21 15.5 16 11l-7 7" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

/* ---------------------------------------------------------------- avatar */

function Avatar({ initials }: { initials?: string }) {
  return (
    <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-gray-200 bg-gray-100 font-mono text-[12px] font-semibold tracking-[0.02em] text-gray-600 uppercase">
      {initials ?? ""}
    </span>
  );
}

/* ---------------------------------------------------------------- top header */

export function GoldenAppHeader({
  active,
  links = DEFAULT_GOLDEN_NAV,
  userInitials,
  upgradeHref = "/app/upgrade",
  className,
}: {
  active?: GoldenNavKey;
  links?: GoldenNavLink[];
  userInitials?: string;
  upgradeHref?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-gray-200 bg-white",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1216px] items-center gap-6 px-6 lg:px-8">
        <Brand />

        {/* pill nav — sits left, after the brand */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive = link.key === active;
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[14px] font-medium tracking-[-0.01em] transition",
                  isActive
                    ? "bg-rose-50 text-rose-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={upgradeHref}>Upgrade</Link>
          </Button>
          <Avatar initials={userInitials} />
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- sidebar */

/**
 * GoldenSidebar — narrow vertical nav for desktop app layouts. Same links as
 * the header, rendered as icon + label rows. Minimal by design; pair it with
 * the header (which carries the brand + account cluster) or drop the brand in
 * via `header`.
 */
export function GoldenSidebar({
  active,
  links = DEFAULT_GOLDEN_NAV,
  header,
  footer,
  className,
}: {
  active?: GoldenNavKey;
  links?: GoldenNavLink[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex w-[224px] flex-none flex-col gap-1 border-r border-gray-200 bg-white p-4",
        className,
      )}
    >
      {header ?? (
        <div className="px-2 pt-1 pb-3">
          <Brand />
        </div>
      )}

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive = link.key === active;
          return (
            <Link
              key={link.key}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] transition",
                isActive
                  ? "bg-rose-50 text-rose-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <NavIcon icon={link.key} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </aside>
  );
}
